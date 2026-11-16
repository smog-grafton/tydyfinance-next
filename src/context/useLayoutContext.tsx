'use client'
import { createContext, use, useEffect, useMemo, useState } from 'react'

import useLocalStorage from '@/hooks/useLocalStorage'
import useQueryParams from '@/hooks/useQueryParams'
import type { ChildrenType } from '@/types/component-props'
import { toggleDocumentAttribute } from '@/utils/layout'
import type { LayoutState, LayoutType, MenuType, ThemeType } from '@/types/context'

const ThemeContext = createContext<LayoutType | undefined>(undefined)

const useLayoutContext = () => {
  const context = use(ThemeContext)
  if (!context) {
    throw new Error('useLayoutContext can only be used within LayoutProvider')
  }
  return context
}

const getPreferredTheme = (): ThemeType => {
  if (typeof window === 'undefined') return 'light'

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const LayoutProvider = ({ children }: ChildrenType) => {
  const queryParams = useQueryParams()
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false)

  const override = !!(queryParams.layout_theme  || queryParams.menu_theme || queryParams.menu_size);

  const INIT_STATE: LayoutState = {
    theme: queryParams['layout_theme'] ? (queryParams['layout_theme'] as ThemeType) : getPreferredTheme(),
    menu: {
      theme: queryParams['menu_theme'] ? (queryParams['menu_theme'] as MenuType['theme']) : 'light',
      size: queryParams['menu_size'] ? (queryParams['menu_size'] as MenuType['size']) : 'default',
    },
  }

  const [settings, setSettings] = useLocalStorage<LayoutState>('__TYDY_FINANCE_CONFIG__', INIT_STATE, override)

  // update settings
  const updateSettings = (_newSettings: Partial<LayoutState>) => setSettings({ ...settings, ..._newSettings })

  // update theme mode
  const changeTheme = (newTheme: ThemeType) => {
    updateSettings({ theme: newTheme })
  }

  // change menu theme
  const changeMenuTheme = (newTheme: MenuType['theme']) => {
    updateSettings({ menu: { ...settings.menu, theme: newTheme } })
  }

  // change menu theme
  const changeMenuSize = (newSize: MenuType['size']) => {
    if (isMobileViewport) {
      setIsMobileNavigationOpen(newSize === 'default')
      return
    }

    updateSettings({ menu: { ...settings.menu, size: newSize } })
  }

  const toggleNavigation = () => {
    if (isMobileViewport) {
      setIsMobileNavigationOpen((open) => !open)
      return
    }

    changeMenuSize(settings.menu.size === 'default' ? 'collapsed' : 'default')
  }

  const closeNavigation = () => setIsMobileNavigationOpen(false)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1199.98px)')
    const syncViewport = () => {
      setIsMobileViewport(query.matches)
      if (!query.matches) setIsMobileNavigationOpen(false)
    }

    syncViewport()
    query.addEventListener('change', syncViewport)
    return () => query.removeEventListener('change', syncViewport)
  }, [])

  useEffect(() => {
    toggleDocumentAttribute('data-bs-theme', settings.theme)
    toggleDocumentAttribute('data-startbar', settings.menu.theme)
    toggleDocumentAttribute('data-sidebar-size', isMobileViewport ? (isMobileNavigationOpen ? 'default' : 'collapsed') : settings.menu.size, false, 'body')
    return () => {
      toggleDocumentAttribute('data-bs-theme', settings.theme, true)
      toggleDocumentAttribute('data-startbar', settings.menu.theme, true)
      toggleDocumentAttribute('data-sidebar-size', settings.menu.size, true, 'body')
    }
  }, [settings, isMobileViewport, isMobileNavigationOpen])

  useEffect(() => {
    if (!isMobileNavigationOpen) return

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNavigation()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isMobileNavigationOpen])

  const resetSettings = () => updateSettings(INIT_STATE)

  return (
    <ThemeContext.Provider
      value={useMemo(
        () => ({
          ...settings,
          themeMode: settings.theme,
          isMobileNavigationOpen,
          changeTheme,
          toggleNavigation,
          closeNavigation,
          changeMenu: {
            theme: changeMenuTheme,
            size: changeMenuSize,
          },
          resetSettings,
        }),
        [settings, isMobileNavigationOpen, isMobileViewport],
      )}>
      {children}
      <button
        type="button"
        className="startbar-overlay d-print-none"
        aria-label="Close navigation"
        aria-hidden={!isMobileNavigationOpen}
        tabIndex={isMobileNavigationOpen ? 0 : -1}
        onClick={closeNavigation}
      />
    </ThemeContext.Provider>
  )
}

export { LayoutProvider, useLayoutContext }
