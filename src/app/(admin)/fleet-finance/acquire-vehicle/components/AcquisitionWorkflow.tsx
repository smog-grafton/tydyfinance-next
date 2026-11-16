'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { ApiError, fleetFinanceCommand } from '@/lib/api/client'
import type { FleetFinanceWorkspaceData } from '@/lib/api/types'
import { formatUGX } from '@/lib/formatters'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import Select from 'react-select'
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Row } from 'react-bootstrap'

type AcquisitionMode = 'financed' | 'personal'
type Option = { value: string; label: string }
type Values = Record<string, string>
type SchedulePreview = { count: number; total: number; first: string; last: string; firstWeekTotal: number; error?: string }

const uuid = () => crypto.randomUUID()
const today = () => new Date().toISOString().slice(0, 10)
const errorMessage = (error: unknown) =>
  error instanceof ApiError ? (Object.values(error.errors ?? {}).flat()[0] ?? error.message) : 'The request could not be completed.'

const dateValue = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3])
    ? date
    : null
}
const isoDate = (date: Date) => date.toISOString().slice(0, 10)
const shortDate = (value: string) =>
  new Intl.DateTimeFormat('en-UG', { dateStyle: 'medium', timeZone: 'Africa/Kampala' }).format(new Date(`${value}T12:00:00+03:00`))

const schedulePreview = (frequency: string, firstDueOn: string, lastDueOn: string, amount: number): SchedulePreview | null => {
  if (!firstDueOn && !lastDueOn && !amount) return null
  const first = dateValue(firstDueOn)
  const last = dateValue(lastDueOn)
  if (!first || !last || amount < 1)
    return {
      count: 0,
      total: 0,
      first: firstDueOn,
      last: lastDueOn,
      firstWeekTotal: 0,
      error: 'Enter a positive amount plus both due dates to calculate the contractual calendar.',
    }
  if (last < first)
    return { count: 0, total: 0, first: firstDueOn, last: lastDueOn, firstWeekTotal: 0, error: 'Final due date cannot be before first due date.' }
  const interval = frequency === 'weekly' ? 7 : 1
  const days = Math.round((last.getTime() - first.getTime()) / 86_400_000)
  if (frequency === 'weekly' && days % 7 !== 0)
    return {
      count: 0,
      total: 0,
      first: firstDueOn,
      last: lastDueOn,
      firstWeekTotal: 0,
      error: 'The final due date must fall on the same weekday as the first weekly payment.',
    }
  const count = Math.floor(days / interval) + 1
  return {
    count,
    total: count * amount,
    first: isoDate(first),
    last: isoDate(last),
    firstWeekTotal: frequency === 'daily' ? Math.min(7, count) * amount : amount,
  }
}

const AcquisitionWorkflow = ({ workspace }: { workspace: FleetFinanceWorkspaceData }) => {
  const router = useRouter()
  const initialPlan = workspace.acquisition_plans.find((plan) => plan.status !== 'acquired') ?? null
  const [planningMode, setPlanningMode] = useState<AcquisitionMode>('financed')
  const [completionMode, setCompletionMode] = useState<AcquisitionMode>(initialPlan?.proposed_total_financing ? 'financed' : 'personal')
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(initialPlan?.id ?? null)
  const [form, setForm] = useState<Values>({
    vehicle_type: 'motorcycle',
    purpose: 'commercial',
    propulsion_type: 'petrol',
    expected_deposit: '0',
    expected_additional_charges: '0',
    expected_financed_additional_charges: '0',
    expected_weekly_collections: '0',
    expected_weekly_maintenance: '0',
    expected_weekly_insurance: '0',
    repayment_frequency: 'weekly',
    proposed_installment_amount: '0',
  })
  const [deposit, setDeposit] = useState<Values>({ paid_at: `${today()}T12:00` })
  const [completion, setCompletion] = useState<Values>({
    purchased_on: today(),
    cash_price: initialPlan ? String(initialPlan.expected_cash_price) : '',
    additional_charges: initialPlan ? String(initialPlan.expected_additional_charges) : '0',
    financed_additional_charges: initialPlan ? String(initialPlan.expected_financed_additional_charges) : '0',
    cash_at_completion:
      initialPlan && !initialPlan.proposed_total_financing ? String(Math.max(0, initialPlan.expected_cash_price - initialPlan.deposit_paid)) : '0',
    financial_account_id: initialPlan?.funding_financial_account_id ? String(initialPlan.funding_financial_account_id) : '',
    asset_ledger_account_id: initialPlan?.asset_ledger_account_id ? String(initialPlan.asset_ledger_account_id) : '',
    lender_id: initialPlan?.lender_id ? String(initialPlan.lender_id) : '',
    liability_ledger_account_id: initialPlan?.liability_ledger_account_id ? String(initialPlan.liability_ledger_account_id) : '',
    interest_expense_ledger_account_id: initialPlan?.interest_expense_ledger_account_id ? String(initialPlan.interest_expense_ledger_account_id) : '',
    fee_expense_ledger_account_id: initialPlan?.fee_expense_ledger_account_id ? String(initialPlan.fee_expense_ledger_account_id) : '',
  })
  const [showActualTerms, setShowActualTerms] = useState(false)
  const [showDeliveryDetails, setShowDeliveryDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selectedPlan = workspace.acquisition_plans.find((plan) => plan.id === selectedPlanId) ?? null
  const number = (values: Values, field: string) => Number(values[field] || 0)
  const plannedCashPrice = selectedPlan?.expected_cash_price ?? 0
  const completionCashPrice = showActualTerms ? number(completion, 'cash_price') : plannedCashPrice
  const completionAdditionalCharges = showActualTerms ? number(completion, 'additional_charges') : (selectedPlan?.expected_additional_charges ?? 0)
  const completionFinancedAdditionalCharges =
    completionMode === 'personal'
      ? 0
      : showActualTerms
        ? number(completion, 'financed_additional_charges')
        : (selectedPlan?.expected_financed_additional_charges ?? 0)
  const completionCashAt =
    completionMode === 'personal'
      ? Math.max(0, completionCashPrice - (selectedPlan?.deposit_paid ?? 0))
      : showActualTerms
        ? number(completion, 'cash_at_completion')
        : 0
  const finalCashTotal = completionCashAt + Math.max(0, completionAdditionalCharges - completionFinancedAdditionalCharges)
  const preview = useMemo(
    () =>
      schedulePreview(
        form.repayment_frequency ?? 'weekly',
        form.first_installment_due_on ?? '',
        form.last_installment_due_on ?? '',
        number(form, 'proposed_installment_amount'),
      ),
    [form.repayment_frequency, form.first_installment_due_on, form.last_installment_due_on, form.proposed_installment_amount],
  )
  const entityOptions = useMemo<Option[]>(
    () => workspace.entities.map((entity) => ({ value: String(entity.id), label: entity.name })),
    [workspace.entities],
  )
  const accountsFor = (entityId?: number) =>
    workspace.financial_accounts
      .filter((account) => !entityId || account.entity_id === entityId)
      .map((account) => ({ value: String(account.id), label: `${account.name} · ${account.entity}` }))
  const ledgersFor = (entityId: number | undefined, accountType: string) =>
    workspace.ledger_accounts
      .filter((account) => account.entity_id === entityId && account.account_type === accountType)
      .map((account) => ({ value: String(account.id), label: `${account.code} · ${account.name}` }))
  const lendersFor = (entityId?: number) =>
    workspace.lenders
      .filter((lender) => !entityId || lender.entity_id === entityId)
      .map((lender) => ({ value: String(lender.id), label: lender.name }))

  const set = (setter: React.Dispatch<React.SetStateAction<Values>>, field: string, value: string) =>
    setter((current) => ({ ...current, [field]: value }))
  const select = (value: string, onChange: (value: string) => void, options: Option[], placeholder: string) => (
    <Select<Option>
      classNamePrefix="react-select"
      options={options}
      value={options.find((option) => option.value === value) ?? null}
      onChange={(option) => onChange(option?.value ?? '')}
      placeholder={placeholder}
      isClearable
    />
  )
  const input = (
    values: Values,
    setter: React.Dispatch<React.SetStateAction<Values>>,
    field: string,
    label: string,
    type = 'text',
    required = false,
  ) => (
    <Form.Group className="mb-3">
      <Form.Label>{label}</Form.Label>
      <Form.Control
        type={type}
        required={required}
        value={values[field] ?? ''}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 1 : undefined}
        onChange={(event) => set(setter, field, event.target.value)}
      />
    </Form.Group>
  )

  const run = async (path: string, data: Record<string, unknown>, keyed = false) => {
    setSaving(true)
    setError(null)
    try {
      await fleetFinanceCommand(path, 'POST', data, keyed ? uuid() : undefined)
      router.refresh()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  const choosePlan = (value: string) => {
    const plan = workspace.acquisition_plans.find((item) => item.id === Number(value)) ?? null
    setSelectedPlanId(plan?.id ?? null)
    if (!plan) return
    const financed = plan.proposed_total_financing > 0
    const unpaidVehicleCash = Math.max(0, plan.expected_cash_price - plan.deposit_paid)
    setCompletionMode(financed ? 'financed' : 'personal')
    setShowActualTerms(false)
    setShowDeliveryDetails(false)
    setDeposit((current) => ({
      ...current,
      financial_account_id: plan.funding_financial_account_id ? String(plan.funding_financial_account_id) : '',
      ledger_account_id: plan.deposit_ledger_account_id ? String(plan.deposit_ledger_account_id) : '',
    }))
    setCompletion((current) => ({
      ...current,
      cash_price: String(plan.expected_cash_price),
      additional_charges: String(plan.expected_additional_charges),
      financed_additional_charges: String(plan.expected_financed_additional_charges),
      cash_at_completion: financed ? '0' : String(unpaidVehicleCash),
      financial_account_id: plan.funding_financial_account_id ? String(plan.funding_financial_account_id) : '',
      asset_ledger_account_id: plan.asset_ledger_account_id ? String(plan.asset_ledger_account_id) : '',
      lender_id: plan.lender_id ? String(plan.lender_id) : '',
      liability_ledger_account_id: plan.liability_ledger_account_id ? String(plan.liability_ledger_account_id) : '',
      interest_expense_ledger_account_id: plan.interest_expense_ledger_account_id ? String(plan.interest_expense_ledger_account_id) : '',
      fee_expense_ledger_account_id: plan.fee_expense_ledger_account_id ? String(plan.fee_expense_ledger_account_id) : '',
    }))
  }

  const chooseCompletionMode = (mode: AcquisitionMode) => {
    setCompletionMode(mode)
    if (!selectedPlan) return

    const cashPrice = showActualTerms ? number(completion, 'cash_price') : selectedPlan.expected_cash_price
    setCompletion((current) => ({
      ...current,
      cash_at_completion:
        mode === 'personal' ? String(Math.max(0, cashPrice - selectedPlan.deposit_paid)) : showActualTerms ? current.cash_at_completion : '0',
      lender_id: mode === 'personal' ? '' : selectedPlan.lender_id ? String(selectedPlan.lender_id) : current.lender_id,
      liability_ledger_account_id:
        mode === 'personal'
          ? ''
          : selectedPlan.liability_ledger_account_id
            ? String(selectedPlan.liability_ledger_account_id)
            : current.liability_ledger_account_id,
      interest_expense_ledger_account_id:
        mode === 'personal'
          ? ''
          : selectedPlan.interest_expense_ledger_account_id
            ? String(selectedPlan.interest_expense_ledger_account_id)
            : current.interest_expense_ledger_account_id,
      fee_expense_ledger_account_id:
        mode === 'personal'
          ? ''
          : selectedPlan.fee_expense_ledger_account_id
            ? String(selectedPlan.fee_expense_ledger_account_id)
            : current.fee_expense_ledger_account_id,
    }))
  }

  const createPlan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const personal = planningMode === 'personal'
    if (!personal && (!preview || preview.error)) {
      setError(preview?.error ?? 'Enter repayment amount, frequency, and both due dates before saving the financed acquisition.')
      return
    }
    await run('/api/v1/fleet-finance/acquisitions', {
      entity_id: number(form, 'entity_id'),
      lender_id: personal ? null : number(form, 'lender_id') || null,
      vehicle_type: form.vehicle_type,
      manufacturer: form.manufacturer,
      model: form.model,
      model_year: number(form, 'model_year') || null,
      purpose: form.purpose,
      propulsion_type: form.propulsion_type || null,
      expected_cash_price: number(form, 'expected_cash_price'),
      expected_deposit: number(form, 'expected_deposit'),
      expected_additional_charges: number(form, 'expected_additional_charges'),
      expected_financed_additional_charges: personal ? 0 : number(form, 'expected_financed_additional_charges'),
      expected_weekly_collections: personal ? 0 : number(form, 'expected_weekly_collections'),
      expected_weekly_maintenance: personal ? 0 : number(form, 'expected_weekly_maintenance'),
      expected_weekly_insurance: personal ? 0 : number(form, 'expected_weekly_insurance'),
      agreement_on: personal ? null : form.agreement_on || null,
      repayment_frequency: personal ? null : form.repayment_frequency,
      proposed_installment_amount: personal ? null : number(form, 'proposed_installment_amount'),
      proposed_weekly_installment: personal ? 0 : (preview?.firstWeekTotal ?? 0),
      proposed_installment_count: null,
      first_installment_due_on: personal ? null : form.first_installment_due_on || null,
      last_installment_due_on: personal ? null : form.last_installment_due_on || null,
      installment_excluded_weekdays: [],
      notes: form.notes || null,
    })
  }

  const recordDeposit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedPlan) return
    await run(
      `/api/v1/fleet-finance/acquisitions/${selectedPlan.id}/deposits`,
      {
        financial_account_id: number(deposit, 'financial_account_id'),
        ledger_account_id: number(deposit, 'ledger_account_id'),
        amount: number(deposit, 'amount'),
        paid_at: deposit.paid_at,
        reference: deposit.reference || null,
        notes: deposit.notes || null,
      },
      true,
    )
  }

  const complete = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedPlan) return
    const financed = completionMode === 'financed'
    await run(
      `/api/v1/fleet-finance/acquisitions/${selectedPlan.id}/complete`,
      {
        purchased_on: completion.purchased_on,
        ...(showActualTerms
          ? {
              cash_price: completionCashPrice,
              additional_charges: completionAdditionalCharges,
              ...(financed ? { financed_additional_charges: completionFinancedAdditionalCharges } : {}),
            }
          : {}),
        ...(financed ? {} : { financed_additional_charges: 0 }),
        cash_at_completion: completionCashAt,
        financial_account_id: finalCashTotal > 0 ? number(completion, 'financial_account_id') || null : null,
        lender_id: financed ? number(completion, 'lender_id') || null : null,
        asset_ledger_account_id: number(completion, 'asset_ledger_account_id') || null,
        liability_ledger_account_id: financed ? number(completion, 'liability_ledger_account_id') || null : null,
        interest_expense_ledger_account_id: financed ? number(completion, 'interest_expense_ledger_account_id') || null : null,
        fee_expense_ledger_account_id: financed ? number(completion, 'fee_expense_ledger_account_id') || null : null,
        ...(showDeliveryDetails
          ? {
              registration_number: completion.registration_number || null,
              engine_number: completion.engine_number || null,
              vin: completion.vin || null,
              current_odometer: number(completion, 'current_odometer') || null,
              invoice_reference: completion.invoice_reference || null,
              notes: completion.notes || null,
            }
          : {}),
      },
      true,
    )
  }

  const selectedEntityId = selectedPlan?.entity_id
  const plannedEntityId = Number(form.entity_id) || undefined
  const remainingVehicleCash = selectedPlan ? Math.max(0, selectedPlan.expected_cash_price - selectedPlan.deposit_paid) : 0

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h3 className="mb-1">Acquire a vehicle</h3>
          <p className="text-muted mb-0">Plan, fund and capitalise a purchase without inventing lender terms or payments.</p>
        </div>
        <Badge bg="light" text="dark" className="p-2">
          Guided acquisition lifecycle
        </Badge>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-4">
        <Col xl={8}>
          <Card>
            <CardHeader>
              <CardTitle as="h4" className="mb-0">
                1. Plan the acquisition
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Form onSubmit={createPlan}>
                <div className="btn-group mb-4" role="group" aria-label="Acquisition funding type">
                  <Button type="button" variant={planningMode === 'financed' ? 'primary' : 'light'} onClick={() => setPlanningMode('financed')}>
                    Financed vehicle
                  </Button>
                  <Button
                    type="button"
                    variant={planningMode === 'personal' ? 'primary' : 'light'}
                    onClick={() => {
                      setPlanningMode('personal')
                      setForm((current) => ({ ...current, purpose: 'personal', lender_id: '', proposed_installment_amount: '0' }))
                    }}>
                    Personal cash purchase
                  </Button>
                </div>
                <Alert variant="info" className="small">
                  {planningMode === 'personal'
                    ? 'An outright purchase creates a vehicle asset only. It does not create driver remittance, a lender agreement, or a lender repayment schedule.'
                    : 'When the fixed terms are known, completion generates a contractual calendar automatically. A lender CSV remains optional for verified principal, interest, fee, or irregular rows.'}
                </Alert>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label>Financial entity</Form.Label>
                    {select(form.entity_id ?? '', (value) => set(setForm, 'entity_id', value), entityOptions, 'Search entity')}
                  </Col>
                  {planningMode === 'financed' && (
                    <Col md={6}>
                      <Form.Label>Lender</Form.Label>
                      {select(form.lender_id ?? '', (value) => set(setForm, 'lender_id', value), lendersFor(plannedEntityId), 'Search lender')}
                    </Col>
                  )}
                  <Col md={4}>{input(form, setForm, 'manufacturer', 'Make', 'text', true)}</Col>
                  <Col md={4}>{input(form, setForm, 'model', 'Model', 'text', true)}</Col>
                  <Col md={4}>{input(form, setForm, 'model_year', 'Model year', 'number')}</Col>
                  <Col md={4}>
                    <Form.Label>Vehicle type</Form.Label>
                    <Form.Select value={form.vehicle_type} onChange={(event) => set(setForm, 'vehicle_type', event.target.value)}>
                      <option value="motorcycle">Motorcycle</option>
                      <option value="car">Car</option>
                    </Form.Select>
                  </Col>
                  <Col md={4}>
                    <Form.Label>Purpose</Form.Label>
                    <Form.Select value={form.purpose} onChange={(event) => set(setForm, 'purpose', event.target.value)}>
                      <option value="personal">Personal</option>
                      <option value="commercial">Commercial</option>
                    </Form.Select>
                  </Col>
                  <Col md={4}>
                    <Form.Label>Propulsion</Form.Label>
                    <Form.Select value={form.propulsion_type} onChange={(event) => set(setForm, 'propulsion_type', event.target.value)}>
                      <option value="petrol">Petrol</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="other">Other</option>
                    </Form.Select>
                  </Col>
                  <Col md={4}>{input(form, setForm, 'expected_cash_price', 'Cash price (UGX)', 'number', true)}</Col>
                  <Col md={4}>{input(form, setForm, 'expected_deposit', 'Planned deposit (UGX)', 'number', true)}</Col>
                  <Col md={4}>{input(form, setForm, 'expected_additional_charges', 'Additional charges (UGX)', 'number', true)}</Col>
                  {planningMode === 'financed' && (
                    <>
                      <Col md={4}>{input(form, setForm, 'expected_financed_additional_charges', 'Financed charges (UGX)', 'number', true)}</Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Repayment frequency</Form.Label>
                          <Form.Select
                            value={form.repayment_frequency ?? 'weekly'}
                            onChange={(event) => set(setForm, 'repayment_frequency', event.target.value)}>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        {input(
                          form,
                          setForm,
                          'proposed_installment_amount',
                          `${form.repayment_frequency === 'daily' ? 'Daily' : 'Weekly'} installment (UGX)`,
                          'number',
                          true,
                        )}
                      </Col>
                      <Col md={4}>{input(form, setForm, 'agreement_on', 'Agreement date', 'date')}</Col>
                      <Col md={6}>{input(form, setForm, 'first_installment_due_on', 'First due date', 'date', true)}</Col>
                      <Col md={6}>{input(form, setForm, 'last_installment_due_on', 'Final due date', 'date', true)}</Col>
                      <Col xs={12}>
                        <Alert variant="light" className="border small py-2 mb-0">
                          {form.repayment_frequency === 'daily'
                            ? 'Due-day policy: every calendar day, including Sundays.'
                            : 'Due-day policy: the same weekday every seven days from the first due date.'}
                        </Alert>
                      </Col>
                      {preview && (
                        <Col xs={12}>
                          {preview.error ? (
                            <Alert variant="danger" className="mb-0">
                              {preview.error}
                            </Alert>
                          ) : (
                            <Row className="g-2">
                              <Col sm={6} lg={3}>
                                <Card className="border h-100">
                                  <CardBody className="py-2">
                                    <small className="text-muted d-block">Installment count</small>
                                    <span className="fw-semibold">{preview.count.toLocaleString()}</span>
                                  </CardBody>
                                </Card>
                              </Col>
                              <Col sm={6} lg={3}>
                                <Card className="border h-100">
                                  <CardBody className="py-2">
                                    <small className="text-muted d-block">Scheduled repayments</small>
                                    <span className="fw-semibold">{formatUGX(preview.total)}</span>
                                  </CardBody>
                                </Card>
                              </Col>
                              <Col sm={6} lg={3}>
                                <Card className="border h-100">
                                  <CardBody className="py-2">
                                    <small className="text-muted d-block">Total cash outlay</small>
                                    <span className="fw-semibold">
                                      {formatUGX(
                                        number(form, 'expected_deposit') +
                                          preview.total +
                                          Math.max(
                                            0,
                                            number(form, 'expected_additional_charges') - number(form, 'expected_financed_additional_charges'),
                                          ),
                                      )}
                                    </span>
                                  </CardBody>
                                </Card>
                              </Col>
                              <Col sm={6} lg={3}>
                                <Card className="border h-100">
                                  <CardBody className="py-2">
                                    <small className="text-muted d-block">Financing premium</small>
                                    <span className="fw-semibold">
                                      {formatUGX(
                                        number(form, 'expected_deposit') +
                                          preview.total +
                                          Math.max(
                                            0,
                                            number(form, 'expected_additional_charges') - number(form, 'expected_financed_additional_charges'),
                                          ) -
                                          (number(form, 'expected_cash_price') + number(form, 'expected_additional_charges')),
                                      )}
                                    </span>
                                  </CardBody>
                                </Card>
                              </Col>
                              <Col xs={12}>
                                <small className="text-muted">
                                  Calendar preview: #{1} {shortDate(preview.first)} · #{preview.count} {shortDate(preview.last)}. Count and totals are
                                  derived; they are not editable fields.
                                </small>
                              </Col>
                            </Row>
                          )}
                        </Col>
                      )}
                      <Col md={6}>{input(form, setForm, 'expected_weekly_collections', 'Expected weekly collections (UGX)', 'number', true)}</Col>
                      <Col md={6}>{input(form, setForm, 'expected_weekly_maintenance', 'Weekly maintenance (UGX)', 'number', true)}</Col>
                      <Col md={6}>{input(form, setForm, 'expected_weekly_insurance', 'Weekly insurance (UGX)', 'number', true)}</Col>
                    </>
                  )}
                  <Col xs={12}>
                    <Form.Label>Planning notes</Form.Label>
                    <Form.Control as="textarea" rows={2} value={form.notes ?? ''} onChange={(event) => set(setForm, 'notes', event.target.value)} />
                  </Col>
                </Row>
                <Button type="submit" className="mt-4" disabled={saving}>
                  <IconifyIcon icon="solar:map-point-add-bold-duotone" className="me-1" />
                  {saving ? 'Saving…' : 'Save acquisition plan'}
                </Button>
              </Form>
            </CardBody>
          </Card>
        </Col>
        <Col xl={4}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4" className="mb-0">
                Lifecycle guidance
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ol className="ps-3 mb-0">
                <li className="mb-3">
                  <strong>Plan</strong>
                  <br />
                  <small className="text-muted">Compare an actual lender-backed purchase or an outright purchase.</small>
                </li>
                <li className="mb-3">
                  <strong>Deposit</strong>
                  <br />
                  <small className="text-muted">Post only money that has left a selected real account.</small>
                </li>
                <li>
                  <strong>Complete</strong>
                  <br />
                  <small className="text-muted">Capitalise the asset and create a finance agreement only where funding actually remains.</small>
                </li>
              </ol>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mt-1">
        <Col xl={4}>
          <Card>
            <CardHeader>
              <CardTitle as="h4" className="mb-0">
                2. Select a plan
              </CardTitle>
            </CardHeader>
            <CardBody>
              {select(
                String(selectedPlanId ?? ''),
                choosePlan,
                workspace.acquisition_plans
                  .filter((plan) => plan.status !== 'acquired')
                  .map((plan) => ({ value: String(plan.id), label: `${plan.reference} · ${plan.vehicle} · ${plan.status}` })),
                'Search planned acquisition',
              )}
              {selectedPlan && (
                <div className="mt-3 small">
                  <div className="fw-semibold">{selectedPlan.vehicle}</div>
                  <div className="text-muted">Planned price: {formatUGX(selectedPlan.expected_cash_price)}</div>
                  <div className="text-muted">Deposits posted: {formatUGX(selectedPlan.deposit_paid)}</div>
                  <div className="text-muted">Vehicle cash remaining: {formatUGX(remainingVehicleCash)}</div>
                  {selectedPlan.installment_count && (
                    <>
                      <hr />
                      <div className="text-muted text-capitalize">
                        {selectedPlan.repayment_frequency} · {selectedPlan.installment_count.toLocaleString()} installments
                      </div>
                      <div className="text-muted">
                        Scheduled repayments:{' '}
                        {selectedPlan.scheduled_repayment_total === null ? '—' : formatUGX(selectedPlan.scheduled_repayment_total)}
                      </div>
                      <div className="text-muted">
                        Projected cash outlay: {selectedPlan.projected_cash_outlay === null ? '—' : formatUGX(selectedPlan.projected_cash_outlay)}
                      </div>
                      {selectedPlan.historical_schedule_review_required && (
                        <Alert variant="warning" className="mt-2 mb-0 py-2">
                          Past due dates will remain under historical payment review. The system will not invent arrears or prior payments.
                        </Alert>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col xl={4}>
          <Card>
            <CardHeader>
              <CardTitle as="h4" className="mb-0">
                3. Record an actual deposit
              </CardTitle>
            </CardHeader>
            <CardBody>
              {selectedPlan ? (
                <Form onSubmit={recordDeposit}>
                  <Form.Label>Cash account</Form.Label>
                  {select(
                    deposit.financial_account_id ?? '',
                    (value) => set(setDeposit, 'financial_account_id', value),
                    accountsFor(selectedEntityId),
                    'Search funding account',
                  )}
                  <div className="mt-3">
                    <Form.Label>Deposit asset ledger</Form.Label>
                    {select(
                      deposit.ledger_account_id ?? '',
                      (value) => set(setDeposit, 'ledger_account_id', value),
                      ledgersFor(selectedEntityId, 'asset'),
                      'Search deposit ledger',
                    )}
                  </div>
                  {input(deposit, setDeposit, 'amount', 'Deposit amount (UGX)', 'number', true)}
                  {input(deposit, setDeposit, 'paid_at', 'Paid at', 'datetime-local', true)}
                  {input(deposit, setDeposit, 'reference', 'Payment reference')}
                  <Button type="submit" disabled={saving}>
                    Record deposit
                  </Button>
                </Form>
              ) : (
                <p className="text-muted mb-0">Select a plan to post a real deposit.</p>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col xl={4}>
          <Card>
            <CardHeader>
              <CardTitle as="h4" className="mb-0">
                4. Complete acquisition
              </CardTitle>
            </CardHeader>
            <CardBody>
              {selectedPlan ? (
                <Form onSubmit={complete}>
                  <div className="btn-group mb-3 w-100" role="group" aria-label="Completion funding type">
                    <Button
                      type="button"
                      size="sm"
                      variant={completionMode === 'financed' ? 'primary' : 'light'}
                      onClick={() => chooseCompletionMode('financed')}>
                      Lender finance remains
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={completionMode === 'personal' ? 'primary' : 'light'}
                      onClick={() => chooseCompletionMode('personal')}>
                      Pay in full from cash
                    </Button>
                  </div>
                  {completionMode === 'personal' && (
                    <Alert variant="info" className="small py-2">
                      The remaining vehicle price is calculated from the plan and recorded from the selected account. This creates an outright asset
                      with no loan balance, lender, or repayment schedule.
                    </Alert>
                  )}
                  <div className="border rounded p-3 mb-3 small bg-light-subtle">
                    <div className="fw-semibold mb-1">Plan terms used for completion</div>
                    <div className="text-muted">
                      Vehicle price {formatUGX(completionCashPrice)} · Additional charges {formatUGX(completionAdditionalCharges)} · Deposits posted{' '}
                      {formatUGX(selectedPlan.deposit_paid)}
                    </div>
                    <div className="text-muted">
                      Final cash to post now {formatUGX(finalCashTotal)} ·{' '}
                      {completionMode === 'personal'
                        ? 'No lender balance will remain.'
                        : 'The remaining balance will be recorded against the lender.'}
                    </div>
                  </div>
                  {input(completion, setCompletion, 'purchased_on', 'Actual purchase date', 'date', true)}
                  <div className="mt-3">
                    <Form.Label>Vehicle asset ledger</Form.Label>
                    {select(
                      completion.asset_ledger_account_id ?? '',
                      (value) => set(setCompletion, 'asset_ledger_account_id', value),
                      ledgersFor(selectedEntityId, 'asset'),
                      'Search vehicle asset ledger',
                    )}
                  </div>
                  {finalCashTotal > 0 && (
                    <div className="mt-3">
                      <Form.Label>Funding account</Form.Label>
                      {select(
                        completion.financial_account_id ?? '',
                        (value) => set(setCompletion, 'financial_account_id', value),
                        accountsFor(selectedEntityId),
                        'Search personal or business account',
                      )}
                    </div>
                  )}
                  {completionMode === 'financed' && (
                    <>
                      <div className="mt-3">
                        <Form.Label>Lender</Form.Label>
                        {select(
                          completion.lender_id ?? '',
                          (value) => set(setCompletion, 'lender_id', value),
                          lendersFor(selectedEntityId),
                          'Search lender',
                        )}
                      </div>
                      <div className="mt-3">
                        <Form.Label>Loan liability ledger</Form.Label>
                        {select(
                          completion.liability_ledger_account_id ?? '',
                          (value) => set(setCompletion, 'liability_ledger_account_id', value),
                          ledgersFor(selectedEntityId, 'liability'),
                          'Search liability ledger',
                        )}
                      </div>
                    </>
                  )}
                  <div className="border-top mt-3 pt-3">
                    <Button type="button" variant="outline-secondary" size="sm" onClick={() => setShowActualTerms((current) => !current)}>
                      {showActualTerms ? 'Use plan terms' : 'Record different actual terms'}
                    </Button>
                  </div>
                  {showActualTerms && (
                    <>
                      <Alert variant="warning" className="small py-2 mt-3">
                        Only use these fields when the seller invoice or cash split truly differs from the saved plan. The original plan stays
                        visible; the completed acquisition records the confirmed actual terms.
                      </Alert>
                      {input(completion, setCompletion, 'cash_price', 'Actual vehicle price (UGX)', 'number', true)}
                      {input(completion, setCompletion, 'additional_charges', 'Actual additional charges (UGX)', 'number', true)}
                      {completionMode === 'financed' && (
                        <>
                          {input(completion, setCompletion, 'financed_additional_charges', 'Actual financed charges (UGX)', 'number', true)}
                          {input(completion, setCompletion, 'cash_at_completion', 'Additional vehicle cash paid now (UGX)', 'number', true)}
                        </>
                      )}
                    </>
                  )}
                  <div className="border-top mt-3 pt-3">
                    <Button type="button" variant="outline-secondary" size="sm" onClick={() => setShowDeliveryDetails((current) => !current)}>
                      {showDeliveryDetails ? 'Hide delivery details' : 'Add delivery and invoice details (optional)'}
                    </Button>
                  </div>
                  {showDeliveryDetails && (
                    <div className="mt-3">
                      {input(completion, setCompletion, 'registration_number', 'Registration number')}
                      {input(completion, setCompletion, 'engine_number', 'Engine number')}
                      {input(completion, setCompletion, 'vin', 'VIN / chassis number')}
                      {input(completion, setCompletion, 'current_odometer', 'Opening odometer', 'number')}
                      {input(completion, setCompletion, 'invoice_reference', 'Invoice reference')}
                      <Form.Group className="mb-3">
                        <Form.Label>Completion notes</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={completion.notes ?? ''}
                          onChange={(event) => set(setCompletion, 'notes', event.target.value)}
                        />
                      </Form.Group>
                    </div>
                  )}
                  <Button type="submit" variant="success" disabled={saving}>
                    <IconifyIcon icon="solar:check-circle-bold-duotone" className="me-1" />
                    {saving ? 'Posting…' : 'Complete acquisition'}
                  </Button>
                </Form>
              ) : (
                <p className="text-muted mb-0">Select a plan after real funding is ready.</p>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default AcquisitionWorkflow
