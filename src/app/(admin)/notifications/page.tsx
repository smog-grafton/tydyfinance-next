import type { Metadata } from 'next'
import NotificationsWorkspace from './components/NotificationsWorkspace'

export const metadata: Metadata = { title: 'Notification Centre' }

const NotificationsPage = () => <NotificationsWorkspace />

export default NotificationsPage
