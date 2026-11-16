import { redirect } from 'next/navigation'

import type { ChildrenType } from '@/types/component-props'
import Footer from '@/components/layout/Footer'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/api/server'
import TopNavigationBar from '@/components/layout/TopNavigationBar'
import VerticalNavigationBar from '@/components/layout/VerticalNavigationBar'

// Auth is verified from the Laravel session for every admin request. Never
// reuse a rendered layout after a login, logout or role change.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const AdminLayout = async ({ children }: ChildrenType) => {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <>
      <TopNavigationBar user={user} />

      <VerticalNavigationBar />

      <div className="page-wrapper">
        <div className="page-content">
          <div className="container-xxl">
            <Suspense>{children}</Suspense>
          </div>
          <Footer />
        </div>
      </div>
    </>
  )
}

export default AdminLayout
