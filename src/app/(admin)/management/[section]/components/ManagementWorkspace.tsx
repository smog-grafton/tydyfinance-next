'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { ApiError, commitCashReceiptCsvImport, createAccountReconciliation, stageCashReceiptCsvImport } from '@/lib/api/client'
import type { ManagementWorkspaceData } from '@/lib/api/types'
import { formatUGX } from '@/lib/formatters'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import ReactSelect from 'react-select'
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap'

type Section = 'reconciliations' | 'imports' | 'audit-trail'
type Props = { workspace: ManagementWorkspaceData; section: Section; title: string }
type Option = { value: string; label: string }
type ModalKind = 'reconciliation' | 'import' | null

const label = (value: string): string => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
const day = (value: string): string => value.slice(0, 10)
const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('en-UG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Kampala',
  }).format(new Date(value))
const kampalaToday = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date())
const EmptyRows = ({ columns, message }: { columns: number; message: string }) => (
  <tr>
    <td colSpan={columns} className="py-4 text-center text-muted">
      {message}
    </td>
  </tr>
)
const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? (Object.values(error.errors ?? {}).flat()[0] ?? error.message) : error instanceof Error ? error.message : fallback

const badge = (status: string) => {
  const variant =
    status === 'matched' || status === 'committed'
      ? 'success'
      : status === 'validated'
        ? 'primary'
        : status === 'needs_review'
          ? 'warning'
          : status === 'staged'
            ? 'secondary'
            : 'light'
  return (
    <Badge bg={variant} text={variant === 'light' || variant === 'warning' ? 'dark' : undefined}>
      {label(status)}
    </Badge>
  )
}

const ManagementWorkspace = ({ workspace, section, title }: Props) => {
  const router = useRouter()
  const [modal, setModal] = useState<ModalKind>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [committingId, setCommittingId] = useState<number | null>(null)
  const [reconciliation, setReconciliation] = useState({
    accountId: '',
    statementBalance: '',
    reconciledThrough: kampalaToday(),
    reference: '',
    notes: '',
  })
  const [csvImport, setCsvImport] = useState({
    entityId: '',
    source: 'manual_csv' as 'narabox_csv' | 'zuriride_csv' | 'manual_csv',
    accountId: '',
    revenueLedgerId: '',
    file: null as File | null,
    dateColumn: 'date',
    amountColumn: 'amount',
    referenceColumn: 'reference',
    descriptionColumn: 'description',
    counterpartyColumn: 'counterparty',
  })

  const entityOptions = useMemo<Option[]>(
    () => workspace.entities.map((entity) => ({ value: String(entity.id), label: entity.name })),
    [workspace.entities],
  )
  const reconciliationAccountOptions = useMemo<Option[]>(
    () => workspace.financial_accounts.map((account) => ({ value: String(account.id), label: `${account.name} · ${account.entity}` })),
    [workspace.financial_accounts],
  )
  const importAccounts = useMemo<Option[]>(
    () =>
      workspace.financial_accounts
        .filter((account) => account.entity_id === Number(csvImport.entityId))
        .map((account) => ({ value: String(account.id), label: account.name })),
    [csvImport.entityId, workspace.financial_accounts],
  )
  const importRevenueLedgers = useMemo<Option[]>(
    () =>
      workspace.revenue_ledger_accounts
        .filter((account) => account.entity_id === Number(csvImport.entityId))
        .map((account) => ({ value: String(account.id), label: `${account.code} · ${account.name}` })),
    [csvImport.entityId, workspace.revenue_ledger_accounts],
  )

  useEffect(() => {
    if (modal === 'reconciliation') {
      setReconciliation({ accountId: '', statementBalance: '', reconciledThrough: kampalaToday(), reference: '', notes: '' })
    }
    if (modal === 'import') {
      setCsvImport({
        entityId: '',
        source: 'manual_csv',
        accountId: '',
        revenueLedgerId: '',
        file: null,
        dateColumn: 'date',
        amountColumn: 'amount',
        referenceColumn: 'reference',
        descriptionColumn: 'description',
        counterpartyColumn: 'counterparty',
      })
    }
    setError(null)
  }, [modal])

  const closeModal = () => {
    if (!saving) setModal(null)
  }

  const submitReconciliation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reconciliation.accountId || !reconciliation.reconciledThrough || !/^-?\d+$/.test(reconciliation.statementBalance.trim())) {
      setError('Choose an account, enter a whole-UGX statement balance, and select the statement date.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await createAccountReconciliation(
        {
          financial_account_id: Number(reconciliation.accountId),
          statement_ending_balance: Number(reconciliation.statementBalance),
          reconciled_through: reconciliation.reconciledThrough,
          statement_reference: reconciliation.reference.trim() || undefined,
          notes: reconciliation.notes.trim() || undefined,
        },
        crypto.randomUUID(),
      )
      setModal(null)
      router.refresh()
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to save the reconciliation.'))
    } finally {
      setSaving(false)
    }
  }

  const readCsvHeaders = async (file: File | null) => {
    if (!file) return
    const [header] = (await file.text()).replace(/^\uFEFF/, '').split(/\r?\n/)
    const columns =
      header
        ?.split(',')
        .map((column) => column.trim())
        .filter(Boolean) ?? []
    const first = (...preferred: string[]) => preferred.find((value) => columns.includes(value)) ?? ''
    setCsvImport((current) => ({
      ...current,
      file,
      dateColumn: first('date', 'transaction_date', 'occurred_at') || current.dateColumn,
      amountColumn: first('amount', 'value', 'credit') || current.amountColumn,
      referenceColumn: first('reference', 'transaction_reference', 'ref') || current.referenceColumn,
      descriptionColumn: first('description', 'narration', 'details') || current.descriptionColumn,
      counterpartyColumn: first('counterparty', 'payer', 'customer') || current.counterpartyColumn,
    }))
  }

  const submitImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      !csvImport.entityId ||
      !csvImport.accountId ||
      !csvImport.revenueLedgerId ||
      !csvImport.file ||
      !csvImport.dateColumn ||
      !csvImport.amountColumn ||
      !csvImport.referenceColumn
    ) {
      setError('Choose an entity, cash account, revenue ledger, CSV file, and the required column mappings.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await stageCashReceiptCsvImport({
        entity_id: Number(csvImport.entityId),
        source: csvImport.source,
        csv: csvImport.file,
        financial_account_id: Number(csvImport.accountId),
        credit_ledger_account_id: Number(csvImport.revenueLedgerId),
        date_column: csvImport.dateColumn.trim(),
        amount_column: csvImport.amountColumn.trim(),
        reference_column: csvImport.referenceColumn.trim(),
        description_column: csvImport.descriptionColumn.trim() || undefined,
        counterparty_column: csvImport.counterpartyColumn.trim() || undefined,
      })
      setModal(null)
      router.refresh()
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to stage this CSV import.'))
    } finally {
      setSaving(false)
    }
  }

  const commitImport = async (importId: number) => {
    setCommittingId(importId)
    setError(null)
    try {
      await commitCashReceiptCsvImport(importId)
      router.refresh()
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to commit this import.'))
    } finally {
      setCommittingId(null)
    }
  }

  const reconciliations = (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">Immutable reconciliation snapshots</CardTitle>
            <p className="mb-0 mt-1 text-muted fs-13">A variance highlights a statement difference; it never creates an automatic adjustment.</p>
          </Col>
          <Col xs="auto">
            <Button size="sm" onClick={() => setModal('reconciliation')}>
              <IconifyIcon icon="solar:check-circle-bold-duotone" className="me-1" />
              Reconcile account
            </Button>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Through</th>
                <th>Account</th>
                <th>Entity</th>
                <th>Reference</th>
                <th>Status</th>
                <th className="text-end">Statement</th>
                <th className="text-end">Ledger</th>
                <th className="text-end">Variance</th>
              </tr>
            </thead>
            <tbody>
              {workspace.reconciliations.length ? (
                workspace.reconciliations.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDateTime(record.reconciled_through_at)}</td>
                    <td className="fw-semibold">{record.account}</td>
                    <td>{record.entity}</td>
                    <td>{record.reference ?? '—'}</td>
                    <td>{badge(record.status)}</td>
                    <td className="text-end">{formatUGX(record.statement_ending_balance)}</td>
                    <td className="text-end">{formatUGX(record.ledger_ending_balance)}</td>
                    <td className={`text-end fw-semibold ${record.variance === 0 ? 'text-success' : 'text-danger'}`}>{formatUGX(record.variance)}</td>
                  </tr>
                ))
              ) : (
                <EmptyRows columns={8} message="No reconciliation snapshots have been recorded." />
              )}
            </tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  )

  const imports = (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">Cash-receipt CSV imports</CardTitle>
            <p className="mb-0 mt-1 text-muted fs-13">
              Stage and validate first. Commit creates one idempotent, ledger-backed receipt for every valid row.
            </p>
          </Col>
          <Col xs="auto">
            <Button size="sm" onClick={() => setModal('import')}>
              <IconifyIcon icon="solar:upload-minimalistic-bold-duotone" className="me-1" />
              Stage CSV
            </Button>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        {error && (
          <Alert variant="danger" className="py-2">
            {error}
          </Alert>
        )}
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>File</th>
                <th>Entity</th>
                <th>Source</th>
                <th>Preview</th>
                <th>Status</th>
                <th>Committed</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {workspace.imports.length ? (
                workspace.imports.map((item) => (
                  <tr key={item.id}>
                    <td className="fw-semibold text-break">{item.filename}</td>
                    <td>{item.entity}</td>
                    <td>{label(item.source)}</td>
                    <td>
                      <small>
                        {item.summary
                          ? `${item.summary.valid} valid · ${item.summary.invalid} invalid · ${item.summary.duplicate} duplicate`
                          : 'Preparing preview'}
                      </small>
                    </td>
                    <td>{badge(item.status)}</td>
                    <td>{item.committed_at ? formatDateTime(item.committed_at) : '—'}</td>
                    <td className="text-end">
                      {['validated', 'needs_review'].includes(item.status) && (
                        <Button size="sm" variant="success" disabled={committingId === item.id} onClick={() => void commitImport(item.id)}>
                          {committingId === item.id ? 'Committing…' : 'Authorize commit'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRows columns={7} message="No cash-receipt CSV batches have been staged." />
              )}
            </tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  )

  const audit = (
    <Card>
      <CardHeader>
        <CardTitle as="h4">Audit trail</CardTitle>
        <p className="mb-0 mt-1 text-muted fs-13">
          These append-only events explain finalized financial and operational changes. They cannot be edited or deleted here.
        </p>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Occurred</th>
                <th>Event</th>
                <th>Entity</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              {workspace.audit_events.length ? (
                workspace.audit_events.map((event) => (
                  <tr key={event.id}>
                    <td>{formatDateTime(event.occurred_at)}</td>
                    <td className="fw-semibold">{label(event.event)}</td>
                    <td>{event.entity ?? 'System'}</td>
                    <td>{event.actor ?? 'System'}</td>
                  </tr>
                ))
              ) : (
                <EmptyRows columns={4} message="No authorized audit events are available." />
              )}
            </tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  )

  const content = section === 'reconciliations' ? reconciliations : section === 'imports' ? imports : audit

  return (
    <>
      <Row className="align-items-center mb-3">
        <Col>
          <h4 className="mb-1 fw-bold">{title}</h4>
          <p className="mb-0 text-muted">
            Controlled finance operations backed by Laravel policies, transactions, idempotency, and immutable records.
          </p>
        </Col>
      </Row>
      {section !== 'imports' && error && (
        <Alert variant="danger" className="py-2">
          {error}
        </Alert>
      )}
      {content}
      <Modal show={modal === 'reconciliation'} onHide={closeModal} centered>
        <Form onSubmit={submitReconciliation}>
          <Modal.Header closeButton={!saving}>
            <Modal.Title>Reconcile account</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group>
              <Form.Label>Financial account</Form.Label>
              <ReactSelect<Option>
                inputId="reconciliation-account"
                classNamePrefix="react-select"
                placeholder="Search cash, mobile-money, or bank account"
                options={reconciliationAccountOptions}
                value={reconciliationAccountOptions.find((option) => option.value === reconciliation.accountId) ?? null}
                onChange={(option) => setReconciliation((current) => ({ ...current, accountId: option?.value ?? '' }))}
                isDisabled={saving}
              />
            </Form.Group>
            <Row className="g-3 mt-0">
              <Col md={6}>
                <Form.Label>Statement ending balance (UGX)</Form.Label>
                <Form.Control
                  inputMode="numeric"
                  value={reconciliation.statementBalance}
                  onChange={(event) => setReconciliation((current) => ({ ...current, statementBalance: event.target.value }))}
                  placeholder="e.g. 250000"
                  disabled={saving}
                  required
                />
                <small className="text-muted">Whole UGX; negative balances are allowed.</small>
              </Col>
              <Col md={6}>
                <Form.Label>Reconciled through</Form.Label>
                <Form.Control
                  type="date"
                  max={kampalaToday()}
                  value={reconciliation.reconciledThrough}
                  onChange={(event) => setReconciliation((current) => ({ ...current, reconciledThrough: event.target.value }))}
                  disabled={saving}
                  required
                />
              </Col>
            </Row>
            <Form.Group className="mt-3">
              <Form.Label>Statement reference</Form.Label>
              <Form.Control
                value={reconciliation.reference}
                maxLength={255}
                onChange={(event) => setReconciliation((current) => ({ ...current, reference: event.target.value }))}
                disabled={saving}
              />
            </Form.Group>
            <Form.Group className="mt-3">
              <Form.Label>Investigation note</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                maxLength={1000}
                value={reconciliation.notes}
                onChange={(event) => setReconciliation((current) => ({ ...current, notes: event.target.value }))}
                disabled={saving}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner size="sm" className="me-2" />}Save snapshot
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      <Modal show={modal === 'import'} onHide={closeModal} centered size="lg">
        <Form onSubmit={submitImport}>
          <Modal.Header closeButton={!saving}>
            <Modal.Title>Stage cash-receipt CSV</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Entity</Form.Label>
                <ReactSelect<Option>
                  inputId="import-entity"
                  classNamePrefix="react-select"
                  placeholder="Search financial entity"
                  options={entityOptions}
                  value={entityOptions.find((option) => option.value === csvImport.entityId) ?? null}
                  onChange={(option) =>
                    setCsvImport((current) => ({ ...current, entityId: option?.value ?? '', accountId: '', revenueLedgerId: '' }))
                  }
                  isDisabled={saving}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Source</Form.Label>
                <Form.Select
                  value={csvImport.source}
                  onChange={(event) => setCsvImport((current) => ({ ...current, source: event.target.value as typeof current.source }))}
                  disabled={saving}>
                  <option value="manual_csv">Authorized cash-receipt CSV</option>
                  <option value="narabox_csv">Narabox settlement CSV</option>
                  <option value="zuriride_csv">ZuriRide report CSV</option>
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>Cash received into</Form.Label>
                <ReactSelect<Option>
                  inputId="import-account"
                  classNamePrefix="react-select"
                  placeholder={csvImport.entityId ? 'Search destination account' : 'Choose an entity first'}
                  options={importAccounts}
                  value={importAccounts.find((option) => option.value === csvImport.accountId) ?? null}
                  onChange={(option) => setCsvImport((current) => ({ ...current, accountId: option?.value ?? '' }))}
                  isDisabled={saving || !csvImport.entityId}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Revenue ledger</Form.Label>
                <ReactSelect<Option>
                  inputId="import-revenue-ledger"
                  classNamePrefix="react-select"
                  placeholder={csvImport.entityId ? 'Search revenue ledger' : 'Choose an entity first'}
                  options={importRevenueLedgers}
                  value={importRevenueLedgers.find((option) => option.value === csvImport.revenueLedgerId) ?? null}
                  onChange={(option) => setCsvImport((current) => ({ ...current, revenueLedgerId: option?.value ?? '' }))}
                  isDisabled={saving || !csvImport.entityId}
                />
              </Col>
              <Col xs={12}>
                <Form.Label>CSV file</Form.Label>
                <Form.Control
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  onChange={(event) => {
                    const input = event.currentTarget as HTMLInputElement
                    void readCsvHeaders(input.files?.[0] ?? null)
                  }}
                  disabled={saving}
                  required
                />
                <small className="text-muted">The first row must be column headings. File contents are validated before any money is posted.</small>
              </Col>
              <Col md={4}>
                <Form.Label>Date column</Form.Label>
                <Form.Control
                  value={csvImport.dateColumn}
                  onChange={(event) => setCsvImport((current) => ({ ...current, dateColumn: event.target.value }))}
                  disabled={saving}
                  required
                />
              </Col>
              <Col md={4}>
                <Form.Label>Amount column</Form.Label>
                <Form.Control
                  value={csvImport.amountColumn}
                  onChange={(event) => setCsvImport((current) => ({ ...current, amountColumn: event.target.value }))}
                  disabled={saving}
                  required
                />
              </Col>
              <Col md={4}>
                <Form.Label>Reference column</Form.Label>
                <Form.Control
                  value={csvImport.referenceColumn}
                  onChange={(event) => setCsvImport((current) => ({ ...current, referenceColumn: event.target.value }))}
                  disabled={saving}
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>Description column</Form.Label>
                <Form.Control
                  value={csvImport.descriptionColumn}
                  onChange={(event) => setCsvImport((current) => ({ ...current, descriptionColumn: event.target.value }))}
                  disabled={saving}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Counterparty column</Form.Label>
                <Form.Control
                  value={csvImport.counterpartyColumn}
                  onChange={(event) => setCsvImport((current) => ({ ...current, counterpartyColumn: event.target.value }))}
                  disabled={saving}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner size="sm" className="me-2" />}Validate and stage
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

export default ManagementWorkspace
