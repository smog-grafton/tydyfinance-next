import AcquisitionWorkflow from './components/AcquisitionWorkflow'
import { getFleetFinanceWorkspace } from '@/lib/api/server'
import { Card, CardBody } from 'react-bootstrap'

export const dynamic = 'force-dynamic'

const AcquireVehiclePage = async () => {
  const workspace = await getFleetFinanceWorkspace()

  if (!workspace) return <Card><CardBody className="py-5 text-center"><h4 className="fw-bold mb-2">Fleet finance access is restricted</h4><p className="mb-0 text-muted">Only Owners and Finance Administrators can acquire a vehicle.</p></CardBody></Card>

  return <AcquisitionWorkflow workspace={workspace} />
}

export default AcquireVehiclePage
