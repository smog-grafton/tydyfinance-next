import FleetVehicleDetail from './components/FleetVehicleDetail'
import { getCurrentUser, getFleetVehicleDetail } from '@/lib/api/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardBody } from 'react-bootstrap'

export const metadata: Metadata = { title: 'Vehicle Operations | Tydy Finance' }

type FleetVehicleDetailPageProps = {
  params: { vehicleId: string }
}

const FleetVehicleDetailPage = async ({ params }: FleetVehicleDetailPageProps) => {
  const [workspace, user] = await Promise.all([
    /^\d+$/.test(params.vehicleId) ? getFleetVehicleDetail(params.vehicleId) : null,
    getCurrentUser(),
  ])

  if (!workspace) {
    return (
      <Card>
        <CardBody className="py-5 text-center">
          <h4 className="fw-bold mb-2">Vehicle history is unavailable</h4>
          <p className="mb-3 text-muted">The selected vehicle does not exist or your account cannot view its operational history.</p>
          <Link href="/operations/fleet" className="btn btn-primary">
            Back to Fleet Operations
          </Link>
        </CardBody>
      </Card>
    )
  }

  return <FleetVehicleDetail workspace={workspace} canManage={user?.role === 'owner' || user?.role === 'fleet_manager'} canDelete={user?.role === 'owner'} />
}

export default FleetVehicleDetailPage
