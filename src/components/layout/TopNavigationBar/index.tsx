'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import type { AuthenticatedUser } from '@/lib/api/types'
import React from 'react'
import ThemeModeToggle from './components/ThemeModeToggle'
import Notifications from './components/Notifications'
import ProfileDropdown from './components/ProfileDropdown'
import LeftSideBarToggle from './components/LeftSideBarToggle'
import clsx from 'clsx'
import useScrollEvent from '@/hooks/useScrollEvent'

type TopNavigationBarProps = {
  user: AuthenticatedUser
}

const TopNavigationBar = ({ user }: TopNavigationBarProps) => {
  const { scrollY } = useScrollEvent()
  return (
    <div className="topbar d-print-none">
      <div className="container-xxl">
        <nav className={clsx('topbar-custom d-flex justify-content-between', { 'nav-sticky': scrollY >= 50 })} id="topbar-custom">
          <ul className="topbar-item list-unstyled d-inline-flex align-items-center mb-0">
            <LeftSideBarToggle />

            <li className="mx-3 welcome-text">
              <h3 className="mb-0 fw-bold text-truncate">Welcome back, {user.name.split(' ')[0]}!</h3>
            </li>
          </ul>
          <ul className="topbar-item list-unstyled d-inline-flex align-items-center mb-0">
            <Notifications />
            <ThemeModeToggle />
            <ProfileDropdown user={user} />
          </ul>
        </nav>
      </div>
    </div>
  )
}

export default TopNavigationBar
