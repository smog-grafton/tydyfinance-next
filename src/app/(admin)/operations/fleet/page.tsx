import FleetOperationsWorkspace from './components/FleetOperationsWorkspace'
import { getCurrentUser, getFleetOperationsWorkspace } from '@/lib/api/server'
import type { Metadata } from 'next'
import { Card, CardBody } from 'react-bootstrap'

export const metadata: Metadata = { title: 'Fleet Operations | Tydy Finance' }

type FleetOperationsPageProps = {
  searchParams: {
    entityId?: string
    from?: string
    until?: string
  }
}

const value = (input: string | undefined): string | undefined => (typeof input === 'string' && input.length > 0 ? input : undefined)

const FleetOperationsPage = async ({ searchParams }: FleetOperationsPageProps) => {
  const entityId = value(searchParams.entityId)
  const [workspace, user] = await Promise.all([
    getFleetOperationsWorkspace({
      entityId,
      from: value(searchParams.from),
      until: value(searchParams.until),
    }),
    getCurrentUser(),
  ])

  if (!workspace) {
    return (
      <Card>
        <CardBody className="py-5 text-center">
          <h4 className="fw-bold mb-2">Fleet access is restricted</h4>
          <p className="mb-0 text-muted">Your account does not have permission to view fleet operational read models.</p>
        </CardBody>
      </Card>
    )
  }

  return <FleetOperationsWorkspace workspace={workspace} selectedEntityId={entityId} canManage={user?.role === 'owner' || user?.role === 'fleet_manager'} />
}

export default FleetOperationsPage
