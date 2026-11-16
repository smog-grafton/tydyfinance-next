'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useLayoutContext } from '@/context/useLayoutContext'

const LeftSideBarToggle = () => {
  const { isMobileNavigationOpen, toggleNavigation } = useLayoutContext()

  return (
    <li>
      <button
        className="nav-link mobile-menu-btn nav-icon"
        id="togglemenu"
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={isMobileNavigationOpen}
        onClick={toggleNavigation}>
        <IconifyIcon height={20} width={20} icon="iconoir:menu-scale" />
      </button>
    </li>
  )
}

export default LeftSideBarToggle
