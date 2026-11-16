'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { ApiError, fleetFinanceCommand } from '@/lib/api/client'
import { getFleetFinanceAgreementInstallments, type FleetFinanceInstallmentPage } from '@/lib/api/fleetFinance'
import type { FleetFinanceInstallment, FleetFinanceWorkspaceData } from '@/lib/api/types'
import { formatUGX } from '@/lib/formatters'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, CardBody, Col, Form, Modal, Pagination, Row, Spinner, Table } from 'react-bootstrap'

type Props = { workspace: FleetFinanceWorkspaceData }
type View = 'all' | 'overdue' | 'history'
type HistoricalAction = 'payment' | 'confirmed_unpaid' | null

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date())
const uuid = () => crypto.randomUUID()
const badge = (value: string) => {
  const variant =
    value === 'paid'
      ? 'success'
      : value === 'overdue'
        ? 'danger'
        : value === 'due_today'
          ? 'warning'
          : value.includes('historical')
            ? 'info'
            : 'light'
  return (
    <Badge bg={variant} text={variant === 'light' || variant === 'warning' ? 'dark' : undefined}>
      {value.replaceAll('_', ' ')}
    </Badge>
  )
}
const errorText = (error: unknown) =>
  error instanceof ApiError
    ? (Object.values(error.errors ?? {}).flat()[0] ?? error.message)
    : error instanceof Error
      ? error.message
      : 'Unable to complete this action.'

const Metric = ({ label, value, tone }: { label: string; value: number | null; tone?: string }) => (
  <Col sm={6} xl={3} className="mb-3">
    <Card className="h-100">
      <CardBody>
        <p className="text-muted mb-1 small">{label}</p>
        <h5 className={`mb-0 ${tone ?? ''}`}>{value === null ? 'Not verified' : formatUGX(value)}</h5>
      </CardBody>
    </Card>
  </Col>
)

const LoanRepaymentsWorkspace = ({ workspace }: Props) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedAgreementId = Number(searchParams.get('agreement') ?? 0)
  const selectedAgreement = workspace.agreements.find((agreement) => agreement.id === requestedAgreementId) ?? null
  const selectedAgreementId = selectedAgreement?.id ?? null
  const view = (['all', 'overdue', 'history'].includes(searchParams.get('view') ?? '') ? searchParams.get('view') : 'all') as View
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const perPage = [10, 25, 50, 100].includes(Number(searchParams.get('per_page'))) ? Number(searchParams.get('per_page')) : 25
  const highlightedInstallment = Number(searchParams.get('installment') ?? 0)
  const statusFilter = searchParams.get('status') ?? undefined
  const fromFilter = searchParams.get('from') ?? undefined
  const untilFilter = searchParams.get('until') ?? undefined
  const sort = (searchParams.get('sort') as 'due_on' | 'installment_number' | null) ?? 'due_on'
  const direction = (searchParams.get('direction') as 'asc' | 'desc' | null) ?? 'asc'
  const [result, setResult] = useState<FleetFinanceInstallmentPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<number[]>([])
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [paymentDate, setPaymentDate] = useState(today())
  const [historicalAction, setHistoricalAction] = useState<HistoricalAction>(null)
  const [historicalAmount, setHistoricalAmount] = useState('')
  const [historicalDate, setHistoricalDate] = useState(today())
  const [evidenceReference, setEvidenceReference] = useState('')
  const [historicalNotes, setHistoricalNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const updateQuery = (updates: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key)
      else next.set(key, String(value))
    })
    const query = next.toString()
    router.replace(`/fleet-finance/loan-repayments${query ? `?${query}` : ''}`, { scroll: false })
  }

  useEffect(() => {
    setSelectedHistoryIds([])
    if (!selectedAgreementId) {
      setResult(null)
      setLoadError(null)
      return
    }
    let live = true
    setLoading(true)
    setLoadError(null)
    void getFleetFinanceAgreementInstallments(selectedAgreementId, {
      view,
      status: statusFilter,
      from: fromFilter,
      until: untilFilter,
      sort,
      direction,
      per_page: perPage,
      page,
    })
      .then((data) => live && setResult(data))
      .catch((error: unknown) => live && setLoadError(errorText(error)))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [selectedAgreementId, view, page, perPage, statusFilter, fromFilter, untilFilter, sort, direction, reloadKey])

  const accounts = useMemo(
    () => (selectedAgreement ? workspace.financial_accounts.filter((account) => account.entity_id === selectedAgreement.entity_id) : []),
    [selectedAgreement, workspace.financial_accounts],
  )
  const historicalRows = result?.data.filter((row) => row.is_historical_review) ?? []
  const selectedHistoryRows = historicalRows.filter((row) => selectedHistoryIds.includes(row.id))
  const selectedHistoricalAmount = selectedHistoryRows.reduce((total, row) => total + row.outstanding, 0)

  const openPayment = (amount?: number) => {
    if (!selectedAgreement) return
    setActionError(null)
    setPaymentAmount(amount ? String(amount) : '')
    setPaymentAccountId(String(accounts[0]?.id ?? ''))
    setPaymentDate(today())
    setPaymentOpen(true)
  }

  const openHistorical = (action: HistoricalAction, rowId?: number) => {
    const selected = rowId ? [rowId] : selectedHistoryIds
    if (!selected.length || !action) return
    const amount = historicalRows.filter((row) => selected.includes(row.id)).reduce((total, row) => total + row.outstanding, 0)
    setSelectedHistoryIds(selected)
    setHistoricalAction(action)
    setHistoricalAmount(String(amount))
    setHistoricalDate(today())
    setEvidenceReference('')
    setHistoricalNotes('')
    setActionError(null)
  }

  const afterMutation = () => {
    setReloadKey((value) => value + 1)
    router.refresh()
  }

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedAgreement) return
    setSaving(true)
    setActionError(null)
    try {
      await fleetFinanceCommand(
        '/api/v1/fleet-finance/payments',
        'POST',
        {
          finance_agreement_id: selectedAgreement.id,
          financial_account_id: Number(paymentAccountId),
          amount: Number(paymentAmount),
          paid_at: paymentDate,
        },
        uuid(),
      )
      setPaymentOpen(false)
      afterMutation()
    } catch (error) {
      setActionError(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  const submitHistorical = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedAgreement || !historicalAction) return
    setSaving(true)
    setActionError(null)
    try {
      await fleetFinanceCommand(
        `/api/v1/fleet-finance/agreements/${selectedAgreement.id}/historical-reconciliations`,
        'POST',
        {
          kind: historicalAction,
          installment_ids: selectedHistoryIds,
          ...(historicalAction === 'payment' ? { amount: Number(historicalAmount), recorded_on: historicalDate } : {}),
          evidence_reference: evidenceReference,
          notes: historicalNotes || undefined,
        },
        uuid(),
      )
      setHistoricalAction(null)
      setSelectedHistoryIds([])
      afterMutation()
    } catch (error) {
      setActionError(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Row className="align-items-center mb-3">
        <Col>
          <h4 className="mb-1 fw-bold">Loan repayments</h4>
          <p className="mb-0 text-muted">
            Prioritise one finance agreement at a time. A schedule total is not represented as a lender settlement balance unless components are
            verified.
          </p>
        </Col>
      </Row>

      <Card className="mb-3">
        <CardBody className="pb-0">
          <div className="d-flex gap-2 overflow-auto flex-nowrap border-bottom" style={{ whiteSpace: 'nowrap' }}>
            <Button
              variant={!selectedAgreement ? 'primary' : 'light'}
              className="rounded-bottom-0"
              onClick={() => updateQuery({ agreement: null, installment: null, page: null, view: null })}>
              All loans
            </Button>
            {workspace.agreements.map((agreement) => (
              <Button
                key={agreement.id}
                variant={selectedAgreement?.id === agreement.id ? 'primary' : 'light'}
                className="rounded-bottom-0"
                onClick={() => updateQuery({ agreement: agreement.id, view: 'all', page: 1, installment: null })}>
                {agreement.vehicle} · {agreement.reference}
                {agreement.repayment_summary.confirmed_overdue_count > 0 && (
                  <Badge bg="danger" className="ms-2">
                    {agreement.repayment_summary.confirmed_overdue_count}
                  </Badge>
                )}
                {agreement.repayment_summary.historical_review_count > 0 && (
                  <Badge bg="info" className="ms-2">
                    {agreement.repayment_summary.historical_review_count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>

      {!selectedAgreement ? (
        <>
          <Row>
            <Metric label="Contractual schedule remaining" value={workspace.repayment_portfolio.contractual_schedule_remaining} />
            <Metric label="Confirmed overdue dues" value={workspace.repayment_portfolio.confirmed_overdue_amount} tone="text-danger" />
            <Metric label="Due today" value={workspace.repayment_portfolio.due_today_amount} tone="text-warning" />
            <Metric label="History awaiting evidence" value={workspace.repayment_portfolio.historical_review_amount} tone="text-info" />
          </Row>
          <Card>
            <CardBody className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Vehicle / lender</th>
                      <th>Terms</th>
                      <th className="text-end">Schedule remaining</th>
                      <th className="text-end">Confirmed overdue</th>
                      <th className="text-end">History review</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.agreements.length ? (
                      workspace.agreements.map((agreement) => (
                        <tr key={agreement.id}>
                          <td>
                            <span className="fw-semibold d-block">{agreement.vehicle}</span>
                            <small>
                              {agreement.lender} · {agreement.reference}
                            </small>
                          </td>
                          <td>
                            <small>
                              {agreement.payment_frequency ?? '—'} · {agreement.first_due_on ?? '—'} to {agreement.last_due_on ?? '—'}
                            </small>
                          </td>
                          <td className="text-end">{formatUGX(agreement.repayment_summary.contractual_schedule_remaining)}</td>
                          <td className="text-end text-danger">{formatUGX(agreement.repayment_summary.confirmed_overdue_amount)}</td>
                          <td className="text-end text-info">{formatUGX(agreement.repayment_summary.historical_review_amount)}</td>
                          <td className="text-end">
                            <Button
                              size="sm"
                              onClick={() =>
                                updateQuery({
                                  agreement: agreement.id,
                                  view: agreement.repayment_summary.historical_review_count ? 'history' : 'all',
                                  page: 1,
                                })
                              }>
                              Open loan
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-muted">
                          No finance agreements have been created.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </>
      ) : (
        <>
          <Card className="mb-3">
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <h5 className="mb-1">{selectedAgreement.vehicle}</h5>
                  <p className="mb-0 text-muted">
                    {selectedAgreement.lender} · {selectedAgreement.reference} ·{' '}
                    {selectedAgreement.payment_frequency ?? 'payment frequency not recorded'}
                  </p>
                </div>
                {selectedAgreement.repayment_summary.can_record_current_payment ? (
                  <Button onClick={() => openPayment(selectedAgreement.repayment_summary.next_uncovered_installment?.outstanding)}>
                    <IconifyIcon icon="solar:wallet-money-bold-duotone" className="me-1" /> Quick pay
                  </Button>
                ) : (
                  <Button onClick={() => updateQuery({ view: 'history', page: 1 })}>
                    <IconifyIcon icon="solar:document-text-bold-duotone" className="me-1" /> Reconcile history
                  </Button>
                )}
              </div>
              <Row>
                <Metric label="Schedule remaining" value={selectedAgreement.repayment_summary.contractual_schedule_remaining} />
                <Metric label="Confirmed overdue" value={selectedAgreement.repayment_summary.confirmed_overdue_amount} tone="text-danger" />
                <Metric label="Due today" value={selectedAgreement.repayment_summary.due_today_amount} tone="text-warning" />
                <Metric label="Verified principal remaining" value={selectedAgreement.repayment_summary.verified_principal_balance} />
              </Row>
              {selectedAgreement.repayment_summary.historical_review_count > 0 && (
                <Alert variant="info" className="mb-0">
                  <strong>
                    {selectedAgreement.repayment_summary.historical_review_count} earlier due
                    {selectedAgreement.repayment_summary.historical_review_count === 1 ? '' : 's'} need evidence.
                  </strong>{' '}
                  Their {formatUGX(selectedAgreement.repayment_summary.historical_review_amount)} scheduled amount is not included in confirmed
                  arrears or treated as a current cash payment.
                </Alert>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-0">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-bottom">
                <div className="btn-group" role="tablist">
                  <Button
                    size="sm"
                    variant={view === 'all' ? 'primary' : 'light'}
                    onClick={() => updateQuery({ view: 'all', page: 1, status: null })}>
                    Contractual schedule
                  </Button>
                  <Button
                    size="sm"
                    variant={view === 'overdue' ? 'primary' : 'light'}
                    onClick={() => updateQuery({ view: 'overdue', page: 1, status: null })}>
                    Confirmed overdue ({selectedAgreement.repayment_summary.confirmed_overdue_count})
                  </Button>
                  <Button
                    size="sm"
                    variant={view === 'history' ? 'primary' : 'light'}
                    onClick={() => updateQuery({ view: 'history', page: 1, status: null })}>
                    Reconcile history ({selectedAgreement.repayment_summary.historical_review_count})
                  </Button>
                </div>
                <div className="d-flex gap-2">
                  <Form.Select
                    size="sm"
                    aria-label="Rows per page"
                    value={perPage}
                    onChange={(event) => updateQuery({ per_page: event.target.value, page: 1 })}
                    style={{ width: 105 }}>
                    {[10, 25, 50, 100].map((value) => (
                      <option key={value} value={value}>
                        {value} rows
                      </option>
                    ))}
                  </Form.Select>
                  <Button
                    size="sm"
                    variant="light"
                    onClick={() => updateQuery({ direction: searchParams.get('direction') === 'desc' ? 'asc' : 'desc', page: 1 })}>
                    Due {searchParams.get('direction') === 'desc' ? 'newest' : 'oldest'}
                  </Button>
                </div>
              </div>
              {loadError && (
                <Alert variant="danger" className="m-3">
                  {loadError}
                </Alert>
              )}
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      {view === 'history' && <th aria-label="Select" />}
                      <th>Due</th>
                      <th>Installment</th>
                      <th>Verification</th>
                      <th>Status</th>
                      <th className="text-end">Expected</th>
                      <th className="text-end">Outstanding</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={view === 'history' ? 8 : 7} className="py-5 text-center">
                          <Spinner size="sm" className="me-2" />
                          Loading schedule…
                        </td>
                      </tr>
                    ) : result?.data.length ? (
                      result.data.map((row) => (
                        <tr key={row.id} className={row.id === highlightedInstallment ? 'table-warning' : undefined}>
                          {view === 'history' && (
                            <td>
                              <Form.Check
                                aria-label={`Select installment ${row.number}`}
                                checked={selectedHistoryIds.includes(row.id)}
                                onChange={(event) =>
                                  setSelectedHistoryIds((ids) => (event.target.checked ? [...ids, row.id] : ids.filter((id) => id !== row.id)))
                                }
                              />
                            </td>
                          )}
                          <td className={row.operational_status === 'overdue' ? 'text-danger fw-semibold' : undefined}>{row.due_on}</td>
                          <td>#{row.number}</td>
                          <td>
                            <small>{row.verification_status?.replaceAll('_', ' ') ?? '—'}</small>
                          </td>
                          <td>{badge(row.operational_status ?? row.status)}</td>
                          <td className="text-end">{formatUGX(row.total_expected)}</td>
                          <td className="text-end fw-semibold">{formatUGX(row.outstanding)}</td>
                          <td className="text-end">
                            {row.is_historical_review ? (
                              <Button size="sm" variant="light" onClick={() => openHistorical('payment', row.id)}>
                                Reconcile
                              </Button>
                            ) : row.is_actionable && row.outstanding > 0 ? (
                              <Button size="sm" variant="light" onClick={() => openPayment(row.outstanding)}>
                                Pay now
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={view === 'history' ? 8 : 7} className="py-5 text-center text-muted">
                          {view === 'history'
                            ? 'No historical schedule rows need reconciliation.'
                            : view === 'overdue'
                              ? 'No confirmed overdue loan dues.'
                              : 'No contractual schedule rows match this view.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
              {view === 'history' && selectedHistoryIds.length > 0 && (
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top bg-light">
                  <small>
                    <strong>{selectedHistoryIds.length}</strong> selected · scheduled amount {formatUGX(selectedHistoricalAmount)}
                  </small>
                  <div className="d-flex gap-2">
                    <Button size="sm" variant="light" onClick={() => openHistorical('confirmed_unpaid')}>
                      Confirm unpaid with evidence
                    </Button>
                    <Button size="sm" onClick={() => openHistorical('payment')}>
                      Record historical payment
                    </Button>
                  </div>
                </div>
              )}
              {result && result.meta.total > 0 && (
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top">
                  <small className="text-muted">
                    Server page {result.meta.current_page} of {result.meta.last_page} · {result.meta.total} schedule rows
                  </small>
                  <Pagination className="pagination-rounded mb-0">
                    <Pagination.Prev disabled={result.meta.current_page === 1} onClick={() => updateQuery({ page: result.meta.current_page - 1 })} />
                    <Pagination.Item active>{result.meta.current_page}</Pagination.Item>
                    <Pagination.Next
                      disabled={result.meta.current_page === result.meta.last_page}
                      onClick={() => updateQuery({ page: result.meta.current_page + 1 })}
                    />
                  </Pagination>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      <Modal show={paymentOpen} onHide={() => !saving && setPaymentOpen(false)} centered>
        <Form onSubmit={(event) => void submitPayment(event)}>
          <Modal.Header closeButton={!saving}>
            <Modal.Title>Quick loan payment</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {actionError && <Alert variant="danger">{actionError}</Alert>}
            {!selectedAgreement?.repayment_summary.can_record_current_payment && (
              <Alert variant="warning">Historical payment history must be reconciled before current cash can be allocated.</Alert>
            )}
            <p className="small text-muted">
              This records one real cash movement from the selected financial account and applies it oldest-first to the confirmed contractual
              schedule. It never marks an installment paid merely because cash is available.
            </p>
            <Form.Group className="mb-3">
              <Form.Label>Financial account</Form.Label>
              <Form.Select required value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)}>
                <option value="">Choose account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.account_type}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Amount (UGX)</Form.Label>
              <Form.Control
                required
                min="1"
                type="number"
                step="1"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Paid on</Form.Label>
              <Form.Control required type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" disabled={saving} onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !selectedAgreement?.repayment_summary.can_record_current_payment}>
              {saving && <Spinner size="sm" className="me-2" />}Post payment
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={historicalAction !== null} onHide={() => !saving && setHistoricalAction(null)} centered>
        <Form onSubmit={(event) => void submitHistorical(event)}>
          <Modal.Header closeButton={!saving}>
            <Modal.Title>{historicalAction === 'payment' ? 'Record evidenced historical payment' : 'Confirm historical unpaid state'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {actionError && <Alert variant="danger">{actionError}</Alert>}
            <Alert variant="info">
              This creates an immutable reconciliation record, not a current cash movement. It applies only to the selected historical schedule rows.
            </Alert>
            {historicalAction === 'payment' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Historical amount (UGX)</Form.Label>
                  <Form.Control
                    required
                    min="1"
                    max={selectedHistoricalAmount}
                    type="number"
                    step="1"
                    value={historicalAmount}
                    onChange={(event) => setHistoricalAmount(event.target.value)}
                  />
                  <Form.Text>Selected scheduled amount: {formatUGX(selectedHistoricalAmount)}.</Form.Text>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Payment date shown by evidence</Form.Label>
                  <Form.Control required type="date" value={historicalDate} onChange={(event) => setHistoricalDate(event.target.value)} />
                </Form.Group>
              </>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Evidence or lender-statement reference</Form.Label>
              <Form.Control
                required
                value={evidenceReference}
                onChange={(event) => setEvidenceReference(event.target.value)}
                placeholder="Receipt, statement or authorized opening-basis reference"
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>{historicalAction === 'confirmed_unpaid' ? 'Reason / confirmation note' : 'Notes (optional)'}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                required={historicalAction === 'confirmed_unpaid'}
                value={historicalNotes}
                onChange={(event) => setHistoricalNotes(event.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" disabled={saving} onClick={() => setHistoricalAction(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner size="sm" className="me-2" />}
              {historicalAction === 'payment' ? 'Record reconciliation' : 'Confirm unpaid'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

export default LoanRepaymentsWorkspace
