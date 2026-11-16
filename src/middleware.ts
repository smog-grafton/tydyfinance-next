import { NextRequest, NextResponse } from 'next/server'

const sessionCookie = process.env.LARAVEL_SESSION_COOKIE ?? 'tydyfinance-session'
const activeAdminRoutes = new Set(['/dashboard/analytics', '/finance/overview', '/finance/setup', '/operations/fleet'])
const laravelUrl = process.env.NEXT_PUBLIC_LARAVEL_URL ?? 'http://localhost:8000'
const quickRoutes = new Map([
  ['quick-income', 'income'],
  ['quick-expense', 'expense'],
  ['quick-loan-repayment', 'loan-payment'],
  ['quick-remittance', 'remittance'],
])

const isActiveAdminRoute = (pathname: string): boolean => activeAdminRoutes.has(pathname)
  || /^\/operations\/fleet\/\d+$/.test(pathname)
  || /^\/operations\/drivers(?:\/\d+)?$/.test(pathname)
  || /^\/planning\/(overview|cash-runway|acquisitions|acquisition-simulations|forecast-scenarios|budgets|obligations|due-events|reserves|cash-availability|alerts)$/.test(pathname)
  || /^\/recruitment\/(operations|academy-evaluations|academy-templates|home-visits)$/.test(pathname)
  || /^\/recruitment\/applicants(?:\/(?:new|\d+))?$/.test(pathname)
  || /^\/management\/(reconciliations|imports|audit-trail)$/.test(pathname)
  || pathname === '/settings/quick-access'
  || /^\/fleet-finance\/(overview|acquire-vehicle|loan-repayments|loan-safety|loan-funding|lenders|vehicles|vehicle-faults|paid-maintenance|maintenance-plans|fleet-profitability|remittances)$/.test(pathname)

const loginRedirect = (request: NextRequest): NextResponse => {
  const loginUrl = new URL('/auth/login', request.url)
  loginUrl.searchParams.set('redirectTo', `${request.nextUrl.pathname}${request.nextUrl.search}`)

  return NextResponse.redirect(loginUrl)
}

const secureQuickResponse = (response: NextResponse): NextResponse => {
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  return response
}

const exchangeQuickLink = async (request: NextRequest, route: string, operation: string, token: string): Promise<NextResponse> => {
  const exchange = await fetch(new URL(`/api/v1/quick-access/exchange/${operation}/${encodeURIComponent(token)}`, laravelUrl), {
    headers: { Accept: 'application/json', 'User-Agent': request.headers.get('user-agent') ?? 'Tydy Quick Access' },
    cache: 'no-store',
  })
  const cleanUrl = new URL(`/${route}`, request.url)
  const response = secureQuickResponse(NextResponse.redirect(cleanUrl))

  if (!exchange.ok) {
    cleanUrl.searchParams.set('access', 'invalid')
    return secureQuickResponse(NextResponse.redirect(cleanUrl))
  }

  const cookieHeaders = exchange.headers as Headers & { getSetCookie?: () => string[] }
  const cookies = cookieHeaders.getSetCookie?.() ?? (exchange.headers.get('set-cookie') ? [exchange.headers.get('set-cookie') as string] : [])
  cookies.forEach((cookie) => response.headers.append('set-cookie', cookie))

  return response
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const quickMatch = pathname.match(/^\/(quick-income|quick-expense|quick-loan-repayment|quick-remittance)\/(TYDY-[A-Za-z0-9_-]{43})$/)
  if (quickMatch) {
    const [, route, token] = quickMatch
    return exchangeQuickLink(request, route, quickRoutes.get(route)!, token)
  }

  if (quickRoutes.has(pathname.slice(1))) {
    return secureQuickResponse(NextResponse.next())
  }

  if (request.nextUrl.pathname.startsWith('/auth')) {
    return request.nextUrl.pathname === '/auth/login' ? NextResponse.next() : NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard/analytics', request.url))
  }

  if (!request.cookies.has(sessionCookie)) {
    return loginRedirect(request)
  }

  // The server-rendered admin layout verifies the Laravel session before it
  // renders any protected content. Middleware only performs the inexpensive
  // cookie gate so a successful browser sign-in does not wait on a second
  // cross-process auth request before navigating to its destination.
  if (!isActiveAdminRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/dashboard/analytics', request.url))
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
