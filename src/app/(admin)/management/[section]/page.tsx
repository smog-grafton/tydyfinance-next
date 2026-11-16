import ManagementWorkspace from './components/ManagementWorkspace'
import { getManagementWorkspace } from '@/lib/api/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, CardBody } from 'react-bootstrap'

const sections = ['reconciliations', 'imports', 'audit-trail'] as const
type Section = (typeof sections)[number]

const titles: Record<Section, string> = {
  reconciliations: 'Account Reconciliations',
  imports: 'CSV Imports',
  'audit-trail': 'Audit Trail',
}

export const generateMetadata = ({ params }: { params: { section: string } }): Metadata => ({
  title: `${titles[params.section as Section] ?? 'Management'} | Tydy Finance`,
})

const ManagementPage = async ({ params }: { params: { section: string } }) => {
  if (!sections.includes(params.section as Section)) notFound()

  const workspace = await getManagementWorkspace()

  if (!workspace) {
    return (
      <Card>
        <CardBody className="py-5 text-center">
          <h4 className="fw-bold mb-2">Management access is restricted</h4>
          <p className="mb-0 text-muted">Only Owners and Finance Administrators can work with reconciliations, imports, and audit records.</p>
        </CardBody>
      </Card>
    )
  }

  const section = params.section as Section

  return <ManagementWorkspace workspace={workspace} section={section} title={titles[section]} />
}

export default ManagementPage
