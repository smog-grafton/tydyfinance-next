'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { getOperationalNotifications, markAllOperationalNotificationsRead, markOperationalNotificationRead } from '@/lib/api/client'
import type { OperationalNotification } from '@/lib/api/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Dropdown, DropdownMenu, DropdownToggle } from 'react-bootstrap'

const iconFor = (notification: OperationalNotification): string => {
  if (notification.category === 'finance') return 'solar:wallet-money-bold-duotone'
  if (notification.category === 'operations') return 'solar:steering-wheel-bold-duotone'
  return 'solar:chart-2-bold-duotone'
}

const colourFor = (notification: OperationalNotification): string =>
  notification.severity === 'critical' ? 'text-danger bg-danger-subtle' : notification.severity === 'warning' ? 'text-warning bg-warning-subtle' : 'text-primary bg-primary-subtle'

const relativeTime = (value: string): string => {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'Recently'
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
  return `${Math.floor(minutes / 1440)}d ago`
}

const Notifications = () => {
  const router = useRouter()
  const [items, setItems] = useState<OperationalNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const page = await getOperationalNotifications({ perPage: 6 })
      setItems(page.items)
      setUnreadCount(page.meta.unread_count)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => void refresh(), 60000)
    return () => window.clearInterval(interval)
  }, [refresh])

  const openNotification = async (notification: OperationalNotification) => {
    if (!notification.read_at) {
      try {
        await markOperationalNotificationRead(notification.id)
        setItems((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item))
        setUnreadCount((count) => Math.max(0, count - 1))
      } catch {
        // Navigation remains available if a transient read-state update fails.
      }
    }
    if (notification.action_path) router.push(notification.action_path)
  }

  const markAllRead = async () => {
    setBusy(true)
    try {
      await markAllOperationalNotificationsRead()
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })))
      setUnreadCount(0)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dropdown className="topbar-item" onToggle={(show) => { if (show) void refresh() }}>
      <DropdownToggle as="button" className="nav-link arrow-none nav-icon border-0 bg-transparent" aria-label="Open notifications">
        <i className="icofont-bell-alt" />
        {unreadCount > 0 && <span className="alert-badge" aria-label={`${unreadCount} unread notifications`} />}
      </DropdownToggle>
      <DropdownMenu className="stop dropdown-menu-end py-0" style={{ width: 'min(360px, calc(100vw - 24px))', maxWidth: 'calc(100vw - 24px)', overflow: 'hidden' }}>
        <div className="dropdown-item-text m-0 py-3 d-flex justify-content-between align-items-center gap-3">
          <div>
            <h5 className="mb-0">Notifications</h5>
            <small className="text-muted">{unreadCount ? `${unreadCount} unread` : 'You are up to date'}</small>
          </div>
          {unreadCount > 0 && <button type="button" className="btn btn-light btn-sm" onClick={() => void markAllRead()} disabled={busy}>Mark all read</button>}
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto', overflowX: 'hidden' }}>
          {loading ? <div className="text-center text-muted py-4">Loading notifications…</div> : null}
          {!loading && items.length === 0 ? <div className="text-center text-muted py-4 px-3">No current operational notifications.</div> : null}
          {items.map((notification) => (
            <button
              type="button"
              className={`dropdown-item py-3 text-wrap ${notification.read_at ? '' : 'bg-primary-subtle'}`}
              key={notification.id}
              onClick={() => void openNotification(notification)}
              style={{ maxWidth: '100%', overflow: 'hidden', whiteSpace: 'normal' }}>
              <div className="d-flex align-items-start">
                <div className={`flex-shrink-0 thumb-md rounded-circle d-flex align-items-center justify-content-center ${colourFor(notification)}`}>
                  <IconifyIcon icon={iconFor(notification)} className="fs-4" />
                </div>
                <div className="flex-grow-1 ms-2" style={{ minWidth: 0 }}>
                  <div className="d-flex justify-content-between gap-2"><h6 className="my-0 fw-semibold text-dark fs-13 text-truncate">{notification.title}</h6><small className="text-muted" style={{ flexShrink: 0 }}>{relativeTime(notification.created_at)}</small></div>
                  <small className="text-muted d-block mt-1" style={{ overflowWrap: 'anywhere' }}>{notification.body}</small>
                </div>
              </div>
            </button>
          ))}
        </div>
        <Link href="/notifications" className="dropdown-item text-center text-dark fs-13 py-2 border-top">View notification centre <IconifyIcon icon="fi:arrow-right" /></Link>
      </DropdownMenu>
    </Dropdown>
  )
}

export default Notifications
