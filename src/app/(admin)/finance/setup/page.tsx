import FinanceSetupWorkspace from './components/FinanceSetupWorkspace'
import { getFinanceSetup } from '@/lib/api/server'
import type { Metadata } from 'next'
import { Card, CardBody } from 'react-bootstrap'

export const metadata: Metadata = { title: 'Finance Setup | Tydy Finance' }

const FinanceSetupPage = async () => {
  const setup = await getFinanceSetup()

  if (!setup) {
    return (
      <Card>
        <CardBody className="py-5 text-center">
          <h4 className="fw-bold mb-2">Finance setup is restricted</h4>
          <p className="mb-0 text-muted">Only Owners and Finance Administrators can change financial configuration.</p>
        </CardBody>
      </Card>
    )
  }

  return <FinanceSetupWorkspace setup={setup} />
}

export default FinanceSetupPage
