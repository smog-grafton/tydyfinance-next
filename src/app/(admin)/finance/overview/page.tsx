import FinanceWorkspace from './components/FinanceWorkspace'
import { getCurrentUser, getFinanceSetup, getFinanceWorkspace } from '@/lib/api/server'
import type { Metadata } from 'next'
import { Card, CardBody } from 'react-bootstrap'

export const metadata: Metadata = { title: 'Finance Workspace | Tydy Finance' }

type FinanceWorkspacePageProps = {
  searchParams: {
    entityId?: string
    from?: string
    until?: string
  }
}

const value = (input: string | undefined): string | undefined => (typeof input === 'string' && input.length > 0 ? input : undefined)

const FinanceWorkspacePage = async ({ searchParams }: FinanceWorkspacePageProps) => {
  const entityId = value(searchParams.entityId)
  const [workspace, user, setup] = await Promise.all([
    getFinanceWorkspace({ entityId, from: value(searchParams.from), until: value(searchParams.until) }),
    getCurrentUser(),
    getFinanceSetup(),
  ])

  if (!workspace) {
    return (
      <Card>
        <CardBody className="py-5 text-center">
          <h4 className="fw-bold mb-2">Finance access is restricted</h4>
          <p className="mb-0 text-muted">Your account does not have permission to view financial read models.</p>
        </CardBody>
      </Card>
    )
  }

  const canManage = user?.role === 'owner' || user?.role === 'finance_administrator'

  return (
    <FinanceWorkspace workspace={workspace} setup={canManage ? (setup ?? undefined) : undefined} selectedEntityId={entityId} canManage={canManage} />
  )
}

export default FinanceWorkspacePage
