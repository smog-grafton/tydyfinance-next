'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import MoneyMovementModal from '@/components/finance/MoneyMovementModal'
import type { FinanceSetupData, FinanceWorkspaceData } from '@/lib/api/types'
import { formatKampalaDate, formatUGX } from '@/lib/formatters'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Badge, Card, CardBody, CardHeader, CardTitle, Col, Form, Row, Table } from 'react-bootstrap'
import FinanceSetupEditorModal, { type FinanceSetupEditor } from '../../setup/components/FinanceSetupEditorModal'

type FinanceWorkspaceProps = {
  workspace: FinanceWorkspaceData
  setup?: FinanceSetupData
  selectedEntityId?: string
  canManage: boolean
}

type SummaryCardProps = {
  title: string
  amount: number
  detail: string
  icon: string
  variant: 'primary' | 'success' | 'warning' | 'danger'
}

const label = (value: string | null): string => (value ? value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()) : '—')

const SummaryCard = ({ title, amount, detail, icon, variant }: SummaryCardProps) => (
  <Card className="h-100">
    <CardBody>
      <Row className="align-items-center border-dashed-bottom pb-3">
        <Col xs={9}>
          <p className="text-dark mb-0 fw-semibold fs-14">{title}</p>
          <h3 className="mt-2 mb-0 fw-bold text-truncate" title={formatUGX(amount)}>
            {formatUGX(amount)}
          </h3>
        </Col>
        <Col xs={3}>
          <div className={`d-flex justify-content-center align-items-center thumb-xl bg-${variant}-subtle rounded-circle mx-auto`}>
            <IconifyIcon icon={icon} className={`h2 mb-0 text-${variant}`} />
          </div>
        </Col>
      </Row>
      <p className="text-muted mb-0 mt-3">{detail}</p>
    </CardBody>
  </Card>
)

const EmptyRows = ({ columns, message }: { columns: number; message: string }) => (
  <tr>
    <td className="py-4 text-center text-muted" colSpan={columns}>
      {message}
    </td>
  </tr>
)

const FinanceWorkspace = ({ workspace, setup, selectedEntityId = '', canManage }: FinanceWorkspaceProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const [entityId, setEntityId] = useState(selectedEntityId)
  const [from, setFrom] = useState(workspace.period.from)
  const [until, setUntil] = useState(workspace.period.until)
  const [showMoneyMovementModal, setShowMoneyMovementModal] = useState(false)
  const [setupEditor, setSetupEditor] = useState<FinanceSetupEditor | null>(null)
  const canAddFinancialAccount = Boolean(setup?.ledger_accounts.some((account) => account.is_active && account.account_type === 'asset'))

  useEffect(() => {
    setEntityId(selectedEntityId)
    setFrom(workspace.period.from)
    setUntil(workspace.period.until)
  }, [selectedEntityId, workspace.period.from, workspace.period.until])

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = new URLSearchParams()

    if (entityId) query.set('entityId', entityId)
    if (from) query.set('from', from)
    if (until) query.set('until', until)

    router.push(`${pathname}${query.size ? `?${query.toString()}` : ''}`)
  }

  return (
    <>
      <Row id="finance-overview" className="align-items-center mb-3">
        <Col>
          <h4 className="mb-1 fw-bold">Finance workspace</h4>
          <p className="mb-0 text-muted">Authoritative accounts, movements, claims, budgets and reconciliation state.</p>
        </Col>
        <Col lg="auto" className="mt-3 mt-lg-0">
          <Form onSubmit={applyFilters} className="d-flex flex-wrap gap-2 justify-content-lg-end">
            <Form.Select
              aria-label="Financial entity"
              value={entityId}
              onChange={(event) => setEntityId(event.target.value)}
              style={{ minWidth: 180 }}>
              <option value="">All active entities</option>
              {workspace.entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </Form.Select>
            <Form.Control aria-label="Period start" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Form.Control aria-label="Period end" type="date" value={until} onChange={(event) => setUntil(event.target.value)} />
            <button className="btn btn-primary" type="submit">
              Apply
            </button>
            {canManage && (
              <button className="btn btn-success" type="button" onClick={() => setShowMoneyMovementModal(true)}>
                <IconifyIcon icon="solar:add-circle-bold-duotone" className="me-1" /> Record money
              </button>
            )}
          </Form>
        </Col>
      </Row>

      <Row className="mb-1">
        <Col md={6} xl={3} className="mb-3">
          <SummaryCard
            title="Cash Held"
            amount={workspace.summary.cash_held}
            detail="Derived from posted ledger balances"
            icon="solar:wallet-money-bold-duotone"
            variant="primary"
          />
        </Col>
        <Col md={6} xl={3} className="mb-3">
          <SummaryCard
            title="Recognized Income"
            amount={workspace.summary.income_recognized}
            detail={`${formatKampalaDate(workspace.period.from)} – ${formatKampalaDate(workspace.period.until)}`}
            icon="solar:chart-square-bold-duotone"
            variant="success"
          />
        </Col>
        <Col md={6} xl={3} className="mb-3">
          <SummaryCard
            title="Recognized Expenses"
            amount={workspace.summary.expenses_recognized}
            detail="Posted expense-ledger activity"
            icon="solar:chart-2-bold-duotone"
            variant="warning"
          />
        </Col>
        <Col md={6} xl={3} className="mb-3">
          <SummaryCard
            title="Open Receivables"
            amount={workspace.summary.receivables}
            detail={`${workspace.summary.unreconciled_accounts} account${workspace.summary.unreconciled_accounts === 1 ? '' : 's'} need reconciliation`}
            icon="solar:bill-list-bold-duotone"
            variant="danger"
          />
        </Col>
      </Row>

      <Row>
        <Col xl={12} className="mb-3">
          <Card id="financial-accounts">
            <CardHeader>
              <Row className="align-items-center">
                <Col>
                  <CardTitle as="h4">Financial accounts</CardTitle>
                  <p className="mb-0 mt-1 text-muted fs-13">Balances are calculated from posted ledger entries as at the selected end date.</p>
                </Col>
                {canManage && setup && (
                  <Col xs="auto" className="mt-2 mt-sm-0">
                    {canAddFinancialAccount ? (
                      <button className="btn btn-success btn-sm" type="button" onClick={() => setSetupEditor({ kind: 'account' })}>
                        <IconifyIcon icon="solar:wallet-money-bold-duotone" className="me-1" /> Add money account
                      </button>
                    ) : (
                      <a className="btn btn-outline-primary btn-sm" href="/finance/setup">
                        Set up an asset account first
                      </a>
                    )}
                  </Col>
                )}
              </Row>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Account</th>
                      <th>Entity</th>
                      <th>Type</th>
                      <th>Reconciliation</th>
                      <th className="text-end">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.accounts.length === 0 ? (
                      <EmptyRows columns={5} message="No financial accounts match this selection." />
                    ) : (
                      workspace.accounts.map((account) => (
                        <tr key={account.id}>
                          <td>
                            <span className="fw-semibold">{account.name}</span>
                            {!account.is_active && (
                              <Badge bg="light" text="dark" className="ms-2">
                                Inactive
                              </Badge>
                            )}
                          </td>
                          <td>{account.entity}</td>
                          <td>
                            <Badge bg="light" text="dark">
                              {label(account.account_type)}
                            </Badge>
                          </td>
                          <td>
                            {account.reconciliation ? (
                              <>
                                <Badge bg={account.reconciliation.status === 'matched' ? 'success' : 'danger'}>
                                  {label(account.reconciliation.status)}
                                </Badge>
                                <small className="d-block text-muted mt-1">{formatKampalaDate(account.reconciliation.reconciled_through)}</small>
                              </>
                            ) : (
                              <span className="text-muted">Not reconciled</span>
                            )}
                          </td>
                          <td className="text-end fw-semibold">{formatUGX(account.balance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={6} className="mb-3">
          <Card id="ledger-accounts" className="h-100">
            <CardHeader>
              <CardTitle as="h4">Chart of accounts</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Code</th>
                      <th>Account</th>
                      <th>Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.ledger_accounts.length === 0 ? (
                      <EmptyRows columns={3} message="No chart-of-account records match this selection." />
                    ) : (
                      workspace.ledger_accounts.map((account) => (
                        <tr key={account.id}>
                          <td className="fw-semibold">{account.code}</td>
                          <td>
                            <span className="d-block">{account.name}</span>
                            <small className="text-muted">{account.entity}</small>
                          </td>
                          <td>
                            <Badge bg="light" text="dark">
                              {label(account.account_type)}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={6} className="mb-3">
          <Card id="income-sources" className="h-100">
            <CardHeader>
              <CardTitle as="h4">Income sources</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Source</th>
                      <th>Category</th>
                      <th>Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.income_sources.length === 0 ? (
                      <EmptyRows columns={3} message="No income sources match this selection." />
                    ) : (
                      workspace.income_sources.map((source) => (
                        <tr key={source.id}>
                          <td>
                            <span className="fw-semibold d-block">{source.name}</span>
                            <small className="text-muted">{label(source.source_type)}</small>
                          </td>
                          <td>{source.category}</td>
                          <td>{source.expected_payment_frequency ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={12} className="mb-3">
          <Card id="financial-categories">
            <CardHeader>
              <CardTitle as="h4">Income and expense categories</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Category</th>
                      <th>Entity</th>
                      <th>Type</th>
                      <th>Posting account</th>
                      <th>Parent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.categories.length === 0 ? (
                      <EmptyRows columns={5} message="No financial categories match this selection." />
                    ) : (
                      workspace.categories.map((category) => (
                        <tr key={category.id}>
                          <td>
                            <span className="fw-semibold">{category.name}</span>
                            {!category.is_active && (
                              <Badge bg="light" text="dark" className="ms-2">
                                Inactive
                              </Badge>
                            )}
                          </td>
                          <td>{category.entity}</td>
                          <td>
                            <Badge bg={category.category_type === 'income' ? 'success' : 'warning'}>{label(category.category_type)}</Badge>
                          </td>
                          <td>{category.ledger_account}</td>
                          <td>{category.parent_name ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={7} className="mb-3">
          <Card id="money-movements" className="h-100">
            <CardHeader>
              <CardTitle as="h4">Recent money movements</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Movement</th>
                      <th>Account</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.recent_movements.length === 0 ? (
                      <EmptyRows columns={4} message="No posted movements in this period." />
                    ) : (
                      workspace.recent_movements.map((movement) => (
                        <tr key={movement.id}>
                          <td>{formatKampalaDate(movement.occurred_at.slice(0, 10))}</td>
                          <td>
                            <span className="fw-semibold d-block">{label(movement.type)}</span>
                            <small className="text-muted">{label(movement.classification)}</small>
                          </td>
                          <td>
                            <span className="d-block">{movement.to_account ?? movement.from_account ?? 'Ledger only'}</span>
                            <small className="text-muted">{movement.entity}</small>
                          </td>
                          <td className="text-end fw-semibold">{formatUGX(movement.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={5} className="mb-3">
          <Card id="claims" className="h-100">
            <CardHeader>
              <CardTitle as="h4">Claims and settlements</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Counterparty</th>
                      <th>Type</th>
                      <th className="text-end">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.claims.length === 0 ? (
                      <EmptyRows columns={3} message="No receivable or payable claims." />
                    ) : (
                      workspace.claims.map((claim) => (
                        <tr key={claim.id}>
                          <td>
                            <span className="fw-semibold d-block">{claim.counterparty_name ?? 'Unspecified'}</span>
                            <small className="text-muted">{claim.entity}</small>
                          </td>
                          <td>
                            <Badge bg={claim.claim_type === 'receivable' ? 'primary' : 'warning'}>{label(claim.claim_type)}</Badge>
                          </td>
                          <td className="text-end fw-semibold">{formatUGX(claim.outstanding)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={12} className="mb-3">
          <Card id="budgets">
            <CardHeader>
              <CardTitle as="h4">Active budgets</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Budget</th>
                      <th>Category</th>
                      <th>Period</th>
                      <th className="text-end">Limit</th>
                      <th className="text-end">Actual</th>
                      <th className="text-end">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.budgets.length === 0 ? (
                      <EmptyRows columns={6} message="No active budgets overlap this period." />
                    ) : (
                      workspace.budgets.map((budget) => (
                        <tr key={budget.id}>
                          <td>
                            <span className="fw-semibold d-block">{budget.name}</span>
                            <small className="text-muted">{budget.entity}</small>
                          </td>
                          <td>{budget.category}</td>
                          <td>
                            {formatKampalaDate(budget.starts_on)} – {formatKampalaDate(budget.ends_on)}
                          </td>
                          <td className="text-end">{formatUGX(budget.budgeted)}</td>
                          <td className="text-end">{formatUGX(budget.spent)}</td>
                          <td className={`text-end fw-semibold ${budget.remaining < 0 ? 'text-danger' : ''}`}>{formatUGX(budget.remaining)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {canManage && (
        <MoneyMovementModal
          show={showMoneyMovementModal}
          onHide={() => setShowMoneyMovementModal(false)}
          workspace={workspace}
          defaultEntityId={selectedEntityId}
          onRecorded={() => router.refresh()}
        />
      )}
      {setup && (
        <FinanceSetupEditorModal
          show={setupEditor !== null}
          editor={setupEditor}
          setup={setup}
          onHide={() => setSetupEditor(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  )
}

export default FinanceWorkspace
