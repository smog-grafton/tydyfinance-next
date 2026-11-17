import FleetOperationsRegister from './components/FleetOperationsRegister'
import { getFleetOperationsWorkspace, getCurrentUser } from '@/lib/api/server'
import type { Metadata } from 'next'
import { Card, CardBody } from 'react-bootstrap'

export const metadata: Metadata = { title: 'Fleet Operations Register | Tydy Finance' }

type Props = { searchParams: { entityId?: string } }

const FleetOperationsRegisterPage = async ({ searchParams }: Props) => {
  const entityId = typeof searchParams.entityId === 'string' && searchParams.entityId ? searchParams.entityId : undefined
  const [workspace, user] = await Promise.all([getFleetOperationsWorkspace({ entityId }), getCurrentUser()])

  if (!workspace) return <Card><CardBody className="py-5 text-center"><h4 className="fw-bold mb-2">Fleet access is restricted</h4><p className="mb-0 text-muted">Your account does not have permission to view fleet operational records.</p></CardBody></Card>

  return <FleetOperationsRegister entities={workspace.entities} initialEntityId={entityId} canManage={user?.role === 'owner' || user?.role === 'fleet_manager'} />
}

export default FleetOperationsRegisterPage
