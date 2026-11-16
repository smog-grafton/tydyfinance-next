import OwnerDashboard from './components/OwnerDashboard'
import { getOwnerDashboard } from '@/lib/api/server'
import { Card, CardBody } from 'react-bootstrap'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Owner Command Centre | Tydy Finance' }

type DashboardPageProps = {
  searchParams: {
    entityId?: string
    from?: string
    until?: string
  }
}

const value = (input: string | undefined): string | undefined => (typeof input === 'string' && input.length > 0 ? input : undefined)

const AnalyticDashboard = async ({ searchParams }: DashboardPageProps) => {
  const entityId = value(searchParams.entityId)
  const dashboard = await getOwnerDashboard({
    entityId,
    from: value(searchParams.from),
    until: value(searchParams.until),
  })

  if (!dashboard) {
    return (
      <Card>
        <CardBody className="py-5 text-center">
          <h4 className="fw-bold mb-2">Dashboard access is restricted</h4>
          <p className="mb-0 text-muted">Your account does not have permission to view owner financial read models.</p>
        </CardBody>
      </Card>
    )
  }

  return <OwnerDashboard dashboard={dashboard} selectedEntityId={entityId} />
}

export default AnalyticDashboard
