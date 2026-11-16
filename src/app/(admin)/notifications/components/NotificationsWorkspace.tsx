'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { dismissOperationalNotification, getOperationalNotifications, markAllOperationalNotificationsRead, markOperationalNotificationRead } from '@/lib/api/client'
import type { OperationalNotification } from '@/lib/api/types'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'

type Status = 'all' | 'unread' | 'read' | 'dismissed'
type Category = '' | 'planning' | 'finance' | 'operations'

const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

const timeLabel = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-UG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Kampala' }).format(date)
}

const severityVariant = (severity: OperationalNotification['severity']): 'danger' | 'warning' | 'primary' =>
  severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'primary'

const NotificationsWorkspace = () => {
  const router = useRouter()
  const [items, setItems] = useState<OperationalNotification[]>([])
  const [status, setStatus] = useState<Status>('all')
  const [category, setCategory] = useState<Category>('')
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | 'all' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await getOperationalNotifications({ status, category: category || undefined, perPage: 100 })
      setItems(page.items)
      setUnread(page.meta.unread_count)
    } catch {
      setError('Notifications could not be loaded. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }, [category, status])

  useEffect(() => { void load() }, [load])

  const markAllRead = async () => {
    setBusyId('all')
    try {
      await markAllOperationalNotificationsRead()
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })))
      setUnread(0)
    } catch {
      setError('Unable to update the read state. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  const open = async (notification: OperationalNotification) => {
    setBusyId(notification.id)
    try {
      if (!notification.read_at) {
        await markOperationalNotificationRead(notification.id)
        setUnread((value) => Math.max(0, value - 1))
      }
      if (notification.action_path) router.push(notification.action_path)
    } catch {
      setError('Unable to open this notification. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  const dismiss = async (notification: OperationalNotification) => {
    setBusyId(notification.id)
    try {
      await dismissOperationalNotification(notification.id)
      setItems((current) => current.filter((item) => item.id !== notification.id))
      if (!notification.read_at) setUnread((value) => Math.max(0, value - 1))
    } catch {
      setError('Unable to dismiss this notification. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Row className="justify-content-center">
      <Col xl={10}>
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
          <div><h3 className="mb-1">Notification centre</h3><p className="text-muted mb-0">Live alerts from your approved planning, finance, remittance, and fleet records.</p></div>
          <Button variant="light" onClick={() => void markAllRead()} disabled={unread === 0 || busyId === 'all'}>{busyId === 'all' ? 'Updating…' : 'Mark all read'}</Button>
        </div>
        <Card>
          <CardHeader className="border-bottom d-flex flex-wrap justify-content-between gap-3 align-items-center">
            <CardTitle as="h4" className="mb-0">Current inbox <Badge bg="primary" className="ms-2">{unread} unread</Badge></CardTitle>
            <div className="d-flex gap-2 flex-wrap">
              <select className="form-select form-select-sm" aria-label="Notification state" value={status} onChange={(event) => setStatus(event.target.value as Status)}>
                <option value="all">Current</option><option value="unread">Unread</option><option value="read">Read</option><option value="dismissed">Dismissed</option>
              </select>
              <select className="form-select form-select-sm" aria-label="Notification category" value={category} onChange={(event) => setCategory(event.target.value as Category)}>
                <option value="">All areas</option><option value="planning">Planning</option><option value="finance">Finance</option><option value="operations">Operations</option>
              </select>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
            {loading ? <div className="text-center text-muted py-5">Loading notifications…</div> : null}
            {!loading && items.length === 0 ? <div className="text-center text-muted py-5">No notifications match these filters.</div> : null}
            {!loading && items.map((notification) => (
              <div key={notification.id} className={`d-flex flex-column flex-md-row gap-3 py-3 border-bottom ${notification.read_at ? '' : 'bg-primary-subtle px-2 rounded'}`}>
                <div className={`thumb-md rounded-circle d-flex align-items-center justify-content-center text-${severityVariant(notification.severity)} bg-${severityVariant(notification.severity)}-subtle flex-shrink-0`}><IconifyIcon icon={notification.category === 'finance' ? 'solar:wallet-money-bold-duotone' : notification.category === 'operations' ? 'solar:steering-wheel-bold-duotone' : 'solar:chart-2-bold-duotone'} className="fs-4" /></div>
                <div className="flex-grow-1"><div className="d-flex flex-wrap justify-content-between gap-2"><h5 className="mb-1 fs-15">{notification.title}</h5><small className="text-muted">{timeLabel(notification.created_at)}</small></div><p className="text-muted mb-2">{notification.body}</p><Badge bg={severityVariant(notification.severity)} className="me-2">{label(notification.severity)}</Badge><Badge bg="light" text="dark">{label(notification.category)}</Badge></div>
                <div className="d-flex gap-2 align-self-md-center flex-shrink-0">
                  {notification.action_path && <Button size="sm" variant="primary" onClick={() => void open(notification)} disabled={busyId === notification.id}>{busyId === notification.id ? 'Opening…' : notification.action_label ?? 'Open'}</Button>}
                  {!notification.dismissed_at && <Button size="sm" variant="light" onClick={() => void dismiss(notification)} disabled={busyId === notification.id} aria-label={`Dismiss ${notification.title}`}><IconifyIcon icon="solar:trash-bin-trash-bold-duotone" /></Button>}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default NotificationsWorkspace
