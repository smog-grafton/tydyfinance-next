/**
 * Runtime configuration boundary for the Next application.
 *
 * Only `NEXT_PUBLIC_*` values may be consumed by browser code. Keep secrets
 * and deployment-specific values in `.env.local` or the host environment;
 * commit their names and safe defaults only in `.env.example`.
 */
export const publicEnvironment = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  apiUrl: process.env.NEXT_PUBLIC_LARAVEL_URL ?? 'http://localhost:8000',
} as const

export const serverEnvironment = {
  sessionCookie: process.env.LARAVEL_SESSION_COOKIE ?? 'tydyfinance-session',
} as const
