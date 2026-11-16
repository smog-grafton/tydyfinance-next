import PlanningWorkspace from './components/PlanningWorkspace'
import { getPlanningWorkspace } from '@/lib/api/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, CardBody } from 'react-bootstrap'

const sections = ['overview', 'cash-runway', 'forecast-scenarios', 'acquisitions', 'acquisition-simulations', 'budgets', 'obligations', 'due-events', 'reserves', 'cash-availability', 'alerts'] as const
type Section = (typeof sections)[number]

const titles: Record<Section, string> = {
  overview: 'Planning Overview', 'cash-runway': 'Cash Runway', 'forecast-scenarios': 'Forecast Scenarios', acquisitions: 'Acquisition Decisions', 'acquisition-simulations': 'Acquisition Simulations', budgets: 'Budgets', obligations: 'Obligations', 'due-events': 'Due Events', reserves: 'Reserves', 'cash-availability': 'Cash Availability', alerts: 'Planning Alerts',
}

export const generateMetadata = ({ params }: { params: { section: string } }): Metadata => ({ title: `${titles[params.section as Section] ?? 'Planning'} | Tydy Finance` })

const PlanningPage = async ({ params, searchParams }: { params: { section: string }; searchParams: { entityId?: string } }) => {
  if (!sections.includes(params.section as Section)) notFound()
  const section = params.section as Section
  const entityId = typeof searchParams.entityId === 'string' && searchParams.entityId ? searchParams.entityId : undefined
  const workspace = await getPlanningWorkspace(entityId)

  if (!workspace) return <Card><CardBody className="py-5 text-center"><h4 className="fw-bold mb-2">Planning access is restricted</h4><p className="mb-0 text-muted">Only Owners and Finance Administrators can access planning data.</p></CardBody></Card>

  return <PlanningWorkspace workspace={workspace} section={section} title={titles[section]} selectedEntityId={entityId} />
}

export default PlanningPage
