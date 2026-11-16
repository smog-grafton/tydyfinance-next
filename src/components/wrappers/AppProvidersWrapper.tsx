'use client'
import { Suspense, useEffect } from 'react'

import { LayoutProvider } from '@/context/useLayoutContext'
import { NotificationProvider } from '@/context/useNotificationContext'
import type { ChildrenType } from '@/types/component-props'
import { Toaster } from 'sonner'

const AppProvidersWrapper = ({ children }: ChildrenType) => {
  useEffect(() => {
    if (document) {
      const e = document.querySelector<HTMLDivElement>('#__next_splash')
      if (e?.hasChildNodes()) {
        document.querySelector('#splash-screen')?.classList.add('remove')
      }
      e?.addEventListener('DOMNodeInserted', () => {
        document.querySelector('#splash-screen')?.classList.add('remove')
      })
    }
  }, [])

  return <Suspense fallback={null}><LayoutProvider><NotificationProvider>{children}<Toaster richColors /></NotificationProvider></LayoutProvider></Suspense>
}
export default AppProvidersWrapper
