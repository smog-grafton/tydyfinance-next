'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'

import avatar1 from '@/assets/images/users/avatar-1.jpg'
import { useNotificationContext } from '@/context/useNotificationContext'
import { logout } from '@/lib/api/client'
import type { AuthenticatedUser } from '@/lib/api/types'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

type ProfileDropdownProps = {
  user: AuthenticatedUser
}

const ProfileDropdown = ({ user }: ProfileDropdownProps) => {
  const { replace, refresh } = useRouter()
  const { showNotification } = useNotificationContext()

  const handleLogout = async () => {
    try {
      await logout()
      replace('/auth/login')
      refresh()
    } catch {
      showNotification({ message: 'Your session could not be closed. Please try again.', variant: 'danger' })
    }
  }

  return (
    <Dropdown className="topbar-item">
      <DropdownToggle className="nav-link arrow-none nav-icon" role="button" aria-haspopup="false" aria-expanded="false">
        <Image src={avatar1} alt="user" className="thumb-lg rounded-circle" />
      </DropdownToggle>
      <DropdownMenu align={'end'} className="py-0">
        <div className="d-flex align-items-center dropdown-item py-2 bg-secondary-subtle">
          <div className="flex-shrink-0">
            <Image src={avatar1} alt="avatar" className="thumb-md rounded-circle" />
          </div>
          <div className="flex-grow-1 ms-2 text-truncate align-self-center">
            <h6 className="my-0 fw-medium text-dark fs-13">{user.name}</h6>
            <small className="text-muted mb-0">{user.role.replaceAll('_', ' ')}</small>
          </div>
        </div>
        <DropdownDivider className="mt-0" />
        <DropdownDivider className="mb-0" />
        <DropdownItem className="text-danger" as="button" onClick={handleLogout}>
          <IconifyIcon icon="la:power-off" className="fs-18 me-1 align-text-bottom" /> Logout
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}

export default ProfileDropdown
