import DriversWorkspace from './components/DriversWorkspace'
import { getApprovedDrivers } from '@/lib/api/server'
import { Card, CardBody } from 'react-bootstrap'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Approved Drivers | Tydy Finance' }

const DriversPage = async () => {
  const workspace = await getApprovedDrivers()
  if (!workspace) return <Card><CardBody className="py-5 text-center"><h4 className="fw-bold mb-2">Driver operations access is restricted</h4><p className="mb-0 text-muted">Only authorized recruitment and fleet roles can view protected driver profiles.</p></CardBody></Card>
  return <DriversWorkspace workspace={workspace} />
}

export default DriversPage
