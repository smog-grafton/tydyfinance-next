import FleetFinanceWorkspace from './components/FleetFinanceWorkspace'
import { getFleetFinanceWorkspace } from '@/lib/api/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, CardBody } from 'react-bootstrap'

const sections = [
  'overview',
  'acquire-vehicle',
  'loan-repayments',
  'loan-safety',
  'loan-funding',
  'lenders',
  'vehicles',
  'vehicle-faults',
  'paid-maintenance',
  'maintenance-plans',
  'fleet-profitability',
  'remittances',
] as const
type Section = (typeof sections)[number]

const titles: Record<Section, string> = {
  overview: 'Fleet Finance',
  'acquire-vehicle': 'Acquire Vehicle',
  'loan-repayments': 'Loan Repayments',
  'loan-safety': 'Loan Safety',
  'loan-funding': 'Loan Funding Rules',
  lenders: 'Lenders',
  vehicles: 'Vehicles',
  'vehicle-faults': 'Vehicle Faults',
  'paid-maintenance': 'Paid Maintenance',
  'maintenance-plans': 'Maintenance Plans',
  'fleet-profitability': 'Fleet Profitability',
  remittances: 'Driver Remittance Collection',
}

export const generateMetadata = ({ params }: { params: { section: string } }): Metadata => ({
  title: `${titles[params.section as Section] ?? 'Fleet Finance'} | Tydy Finance`,
})

const FleetFinancePage = async ({ params }: { params: { section: string } }) => {
  if (!sections.includes(params.section as Section)) notFound()
  const workspace = await getFleetFinanceWorkspace()
  if (!workspace)
    return (
      <Card>
        <CardBody className="py-5 text-center">
          <h4 className="fw-bold mb-2">Fleet finance access is restricted</h4>
          <p className="mb-0 text-muted">Only Owners and Finance Administrators can access acquisition and loan finance records.</p>
        </CardBody>
      </Card>
    )
  const section = params.section as Section
  return <FleetFinanceWorkspace workspace={workspace} section={section} title={titles[section]} />
}

export default FleetFinancePage
