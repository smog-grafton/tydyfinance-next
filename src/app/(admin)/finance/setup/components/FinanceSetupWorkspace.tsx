'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import type { FinanceSetupData } from '@/lib/api/types'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Col, Row, Table } from 'react-bootstrap'
import FinanceSetupEditorModal, { type FinanceSetupEditor } from './FinanceSetupEditorModal'

type FinanceSetupWorkspaceProps = {
  setup: FinanceSetupData
}

const label = (value: string): string => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())

const EmptyRows = ({ columns, message }: { columns: number; message: string }) => <tr><td className="py-4 text-center text-muted" colSpan={columns}>{message}</td></tr>

const EditButton = ({ onClick, label: actionLabel }: { onClick: () => void; label: string }) => (
  <Button variant="light" size="sm" onClick={onClick} aria-label={actionLabel} title={actionLabel}>
    <IconifyIcon icon="solar:pen-new-square-bold-duotone" /> <span className="d-none d-md-inline ms-1">Edit</span>
  </Button>
)

const FinanceSetupWorkspace = ({ setup }: FinanceSetupWorkspaceProps) => {
  const router = useRouter()
  const [editor, setEditor] = useState<FinanceSetupEditor | null>(null)

  const saved = () => router.refresh()

  return (
    <>
      <Row id="finance-setup" className="align-items-center mb-3">
        <Col>
          <h4 className="mb-1 fw-bold">Finance setup</h4>
          <p className="mb-0 text-muted">Manage financial boundaries and configuration. Posted money remains immutable; deactivate rather than delete historical setup records.</p>
        </Col>
        <Col lg="auto" className="mt-3 mt-lg-0 d-flex flex-wrap gap-2">
          <Button variant="outline-primary" onClick={() => setEditor({ kind: 'entity' })}><IconifyIcon icon="solar:buildings-2-bold-duotone" className="me-1" /> Add entity</Button>
          <Button variant="outline-primary" onClick={() => setEditor({ kind: 'ledger' })} disabled={setup.entities.filter((entity) => entity.is_active).length === 0}><IconifyIcon icon="solar:document-text-bold-duotone" className="me-1" /> Add chart account</Button>
          <Button variant="success" onClick={() => setEditor({ kind: 'account' })} disabled={setup.ledger_accounts.filter((account) => account.is_active && account.account_type === 'asset').length === 0}><IconifyIcon icon="solar:wallet-money-bold-duotone" className="me-1" /> Add money account</Button>
        </Col>
      </Row>
      <Row>
        <Col xl={5} className="mb-3">
          <Card className="h-100">
            <CardHeader><CardTitle as="h4">Financial entities</CardTitle></CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive"><Table className="mb-0" hover responsive>
                <thead className="table-light"><tr><th>Boundary</th><th>Type</th><th>Currency</th><th aria-label="Actions" /></tr></thead>
                <tbody>{setup.entities.length === 0 ? <EmptyRows columns={4} message="Add a personal or business entity before configuring accounts." /> : setup.entities.map((entity) => (
                  <tr key={entity.id}><td><span className="fw-semibold d-block">{entity.name}</span>{!entity.is_active && <Badge bg="light" text="dark">Inactive</Badge>}</td><td><Badge bg="light" text="dark">{label(entity.type)}</Badge></td><td>{entity.currency}</td><td className="text-end"><EditButton label={`Edit ${entity.name}`} onClick={() => setEditor({ kind: 'entity', record: entity })} /></td></tr>
                ))}</tbody>
              </Table></div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={7} className="mb-3">
          <Card className="h-100">
            <CardHeader><CardTitle as="h4">Financial accounts</CardTitle></CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive"><Table className="mb-0" hover responsive>
                <thead className="table-light"><tr><th>Account</th><th>Entity</th><th>Asset ledger</th><th>Type</th><th aria-label="Actions" /></tr></thead>
                <tbody>{setup.financial_accounts.length === 0 ? <EmptyRows columns={5} message="No cash, mobile-money, or bank accounts have been configured." /> : setup.financial_accounts.map((account) => (
                  <tr key={account.id}><td><span className="fw-semibold d-block">{account.name}</span><small className="text-muted">{account.institution ?? account.reference_hint ?? 'No provider detail'}</small>{!account.is_active && <Badge bg="light" text="dark" className="ms-1">Inactive</Badge>}</td><td>{account.entity}</td><td>{account.ledger_account}</td><td><Badge bg="light" text="dark">{label(account.account_type)}</Badge></td><td className="text-end"><EditButton label={`Edit ${account.name}`} onClick={() => setEditor({ kind: 'account', record: account })} /></td></tr>
                ))}</tbody>
              </Table></div>
            </CardBody>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col xs={12} className="mb-3">
          <Card>
            <CardHeader><CardTitle as="h4">Chart of accounts</CardTitle></CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive"><Table className="mb-0" hover responsive>
                <thead className="table-light"><tr><th>Code</th><th>Account</th><th>Entity</th><th>Class</th><th>Normal balance</th><th aria-label="Actions" /></tr></thead>
                <tbody>{setup.ledger_accounts.length === 0 ? <EmptyRows columns={6} message="No chart accounts have been configured." /> : setup.ledger_accounts.map((account) => (
                  <tr key={account.id}><td className="fw-semibold">{account.code}</td><td><span>{account.name}</span>{!account.is_active && <Badge bg="light" text="dark" className="ms-2">Inactive</Badge>}</td><td>{account.entity}</td><td><Badge bg="light" text="dark">{label(account.account_type)}</Badge></td><td>{label(account.normal_balance)}</td><td className="text-end"><EditButton label={`Edit ${account.name}`} onClick={() => setEditor({ kind: 'ledger', record: account })} /></td></tr>
                ))}</tbody>
              </Table></div>
            </CardBody>
          </Card>
        </Col>
      </Row>
      <FinanceSetupEditorModal show={editor !== null} editor={editor} setup={setup} onHide={() => setEditor(null)} onSaved={saved} />
    </>
  )
}

export default FinanceSetupWorkspace
