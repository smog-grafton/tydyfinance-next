'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { ApiError, fleetFinanceCommand, importFleetFinanceSchedule } from '@/lib/api/client'
import type { FleetFinanceWorkspaceData } from '@/lib/api/types'
import { formatUGX } from '@/lib/formatters'
import LoanRepaymentsWorkspace from './LoanRepaymentsWorkspace'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import Select from 'react-select'
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Modal, Pagination, Row, Spinner, Table } from 'react-bootstrap'

type Section =
  | 'overview'
  | 'acquire-vehicle'
  | 'loan-repayments'
  | 'loan-safety'
  | 'loan-funding'
  | 'lenders'
  | 'vehicles'
  | 'vehicle-faults'
  | 'paid-maintenance'
  | 'maintenance-plans'
  | 'fleet-profitability'
  | 'remittances'
type ModalKind =
  | 'lender'
  | 'acquisition'
  | 'deposit'
  | 'complete'
  | 'activate'
  | 'schedule'
  | 'payment'
  | 'funding'
  | 'fault'
  | 'resolve-fault'
  | 'maintenance'
  | 'service-plan'
  | 'remittance'
  | null
type Props = { workspace: FleetFinanceWorkspaceData; section: Section; title: string }
type Option = { value: string; label: string }
type FormValues = Record<string, string>

const label = (value: string | null | undefined): string =>
  value ? value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()) : '—'
const dateTime = (value: string): string =>
  new Intl.DateTimeFormat('en-UG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Kampala' }).format(new Date(value))
const day = (value: string): string => value.slice(0, 10)
const uuid = () => crypto.randomUUID()
const Empty = ({ columns, message }: { columns: number; message: string }) => (
  <tr>
    <td colSpan={columns} className="py-4 text-center text-muted">
      {message}
    </td>
  </tr>
)
const errorText = (error: unknown) =>
  error instanceof ApiError
    ? (Object.values(error.errors ?? {}).flat()[0] ?? error.message)
    : error instanceof Error
      ? error.message
      : 'Unable to save this record.'
const status = (value: string) => (
  <Badge
    bg={
      ['active', 'paid', 'matched', 'committed', 'resolved', 'completed', 'financially_settled'].includes(value)
        ? 'success'
        : ['overdue', 'in_arrears'].includes(value)
          ? 'danger'
          : ['partial', 'pending', 'needs_review', 'reported'].includes(value)
            ? 'warning'
            : 'light'
    }
    text={
      ['partial', 'pending', 'needs_review', 'reported'].includes(value) ||
      !['active', 'paid', 'matched', 'committed', 'resolved', 'completed', 'financially_settled', 'overdue', 'in_arrears'].includes(value)
        ? 'dark'
        : undefined
    }>
    {label(value)}
  </Badge>
)

const SearchSelect = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder: string
  disabled?: boolean
}) => (
  <Select<Option>
    classNamePrefix="react-select"
    options={options}
    value={options.find((option) => option.value === value) ?? null}
    onChange={(option) => onChange(option?.value ?? '')}
    placeholder={placeholder}
    isDisabled={disabled}
  />
)

const FleetFinanceWorkspace = ({ workspace, section, title }: Props) => {
  const router = useRouter()
  const [modal, setModal] = useState<ModalKind>(null)
  const [form, setForm] = useState<FormValues>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [scheduleFile, setScheduleFile] = useState<File | null>(null)
  const [installmentPage, setInstallmentPage] = useState(1)
  const installmentsPerPage = 20
  const installmentPages = Math.max(1, Math.ceil(workspace.installments.length / installmentsPerPage))
  const visibleInstallments = workspace.installments.slice((installmentPage - 1) * installmentsPerPage, installmentPage * installmentsPerPage)

  const entities = useMemo<Option[]>(() => workspace.entities.map((item) => ({ value: String(item.id), label: item.name })), [workspace.entities])
  const vehicles = useMemo<Option[]>(
    () =>
      workspace.vehicles.map((item) => ({
        value: String(item.id),
        label: `${item.asset_reference} · ${[item.manufacturer, item.model].filter(Boolean).join(' ')}`,
      })),
    [workspace.vehicles],
  )
  const lenders = useMemo<Option[]>(
    () => workspace.lenders.map((item) => ({ value: String(item.id), label: `${item.name} · ${item.entity}` })),
    [workspace.lenders],
  )
  const agreements = useMemo<Option[]>(
    () => workspace.agreements.map((item) => ({ value: String(item.id), label: `${item.vehicle} · ${item.reference}` })),
    [workspace.agreements],
  )
  const plans = useMemo<Option[]>(
    () => workspace.acquisition_plans.map((item) => ({ value: String(item.id), label: `${item.reference} · ${item.vehicle}` })),
    [workspace.acquisition_plans],
  )
  const contracts = useMemo<Option[]>(
    () => workspace.driver_contracts.map((item) => ({ value: String(item.id), label: `${item.reference} · ${item.driver}` })),
    [workspace.driver_contracts],
  )
  const reserves = useMemo<Option[]>(() => workspace.reserves.map((item) => ({ value: String(item.id), label: item.name })), [workspace.reserves])
  const faults = useMemo<Option[]>(
    () =>
      workspace.faults
        .filter((item) => item.status !== 'resolved')
        .map((item) => ({ value: String(item.id), label: `${item.vehicle} · ${item.description.slice(0, 50)}` })),
    [workspace.faults],
  )
  const servicePlans = useMemo<Option[]>(
    () =>
      workspace.maintenance_plans
        .filter((item) => item.is_active)
        .map((item) => ({ value: String(item.id), label: `${item.vehicle} · ${item.category}` })),
    [workspace.maintenance_plans],
  )
  if (section === 'loan-repayments') {
    return <LoanRepaymentsWorkspace workspace={workspace} />
  }
  const accountsFor = (entityId: string) =>
    workspace.financial_accounts
      .filter((item) => !entityId || item.entity_id === Number(entityId))
      .map((item) => ({ value: String(item.id), label: `${item.name} · ${item.entity}` }))
  const ledgersFor = (entityId: string, kind?: string) =>
    workspace.ledger_accounts
      .filter((item) => (!entityId || item.entity_id === Number(entityId)) && (!kind || item.account_type === kind))
      .map((item) => ({ value: String(item.id), label: `${item.code} · ${item.name}` }))
  const set = (name: string, value: string) => setForm((current) => ({ ...current, [name]: value }))
  const open = (kind: ModalKind, values: FormValues = {}, id: number | null = null) => {
    setModal(kind)
    setForm(values)
    setEditingId(id)
    setScheduleFile(null)
    setError(null)
  }
  const close = () => {
    if (!saving) {
      setModal(null)
      setScheduleFile(null)
    }
  }
  const currentAgreement = workspace.agreements.find((item) => String(item.id) === form.finance_agreement_id)
  const currentPlan = workspace.acquisition_plans.find((item) => String(item.id) === form.plan_id)
  const currentVehicle = workspace.vehicles.find((item) => String(item.id) === form.vehicle_id)

  const command = async (path: string, method: 'POST' | 'PATCH' | 'DELETE', input?: Record<string, unknown>, needsKey = false) => {
    setSaving(true)
    setError(null)
    try {
      await fleetFinanceCommand(path, method, input, needsKey ? uuid() : undefined)
      setModal(null)
      router.refresh()
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setSaving(false)
    }
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const n = (key: string) => Number(form[key] || 0)
    if (modal === 'schedule') {
      if (!scheduleFile) {
        setError('Choose the lender CSV first.')
        return
      }
      setSaving(true)
      setError(null)
      try {
        await importFleetFinanceSchedule(n('finance_agreement_id'), scheduleFile, (form.mode ?? 'verified') as 'verified' | 'provisional')
        setModal(null)
        setScheduleFile(null)
        router.refresh()
      } catch (requestError) {
        setError(errorText(requestError))
      } finally {
        setSaving(false)
      }
      return
    }
    if (modal === 'lender')
      return command(
        editingId ? `/api/v1/fleet-finance/lenders/${editingId}` : '/api/v1/fleet-finance/lenders',
        editingId ? 'PATCH' : 'POST',
        editingId
          ? {
              name: form.name,
              institution_type: form.institution_type,
              reference: form.reference || null,
              contact_person: form.contact_person || null,
            }
          : {
              entity_id: n('entity_id'),
              name: form.name,
              institution_type: form.institution_type,
              reference: form.reference || null,
              contact_person: form.contact_person || null,
            },
      )
    if (modal === 'acquisition')
      return command('/api/v1/fleet-finance/acquisitions', 'POST', {
        entity_id: n('entity_id'),
        lender_id: form.lender_id ? n('lender_id') : null,
        funding_financial_account_id: form.funding_financial_account_id ? n('funding_financial_account_id') : null,
        deposit_ledger_account_id: form.deposit_ledger_account_id ? n('deposit_ledger_account_id') : null,
        asset_ledger_account_id: form.asset_ledger_account_id ? n('asset_ledger_account_id') : null,
        liability_ledger_account_id: form.liability_ledger_account_id ? n('liability_ledger_account_id') : null,
        interest_expense_ledger_account_id: form.interest_expense_ledger_account_id ? n('interest_expense_ledger_account_id') : null,
        fee_expense_ledger_account_id: form.fee_expense_ledger_account_id ? n('fee_expense_ledger_account_id') : null,
        vehicle_type: form.vehicle_type,
        manufacturer: form.manufacturer,
        model: form.model,
        purpose: form.purpose,
        propulsion_type: form.propulsion_type || null,
        model_year: form.model_year ? n('model_year') : null,
        expected_cash_price: n('expected_cash_price'),
        expected_deposit: n('expected_deposit'),
        expected_additional_charges: n('expected_additional_charges'),
        expected_financed_additional_charges: n('expected_financed_additional_charges'),
        expected_weekly_collections: n('expected_weekly_collections'),
        expected_weekly_maintenance: n('expected_weekly_maintenance'),
        expected_weekly_insurance: n('expected_weekly_insurance'),
        proposed_weekly_installment: n('proposed_weekly_installment'),
        proposed_installment_count: form.proposed_installment_count ? n('proposed_installment_count') : null,
        first_installment_due_on: form.first_installment_due_on || null,
        notes: form.notes || null,
      })
    if (modal === 'deposit')
      return command(
        `/api/v1/fleet-finance/acquisitions/${form.plan_id}/deposits`,
        'POST',
        {
          financial_account_id: n('financial_account_id'),
          ledger_account_id: n('ledger_account_id'),
          amount: n('amount'),
          paid_at: form.paid_at,
          reference: form.reference || null,
          notes: form.notes || null,
        },
        true,
      )
    if (modal === 'complete')
      return command(
        `/api/v1/fleet-finance/acquisitions/${form.plan_id}/complete`,
        'POST',
        {
          purchased_on: form.purchased_on,
          cash_price: form.cash_price ? n('cash_price') : null,
          additional_charges: n('additional_charges'),
          financed_additional_charges: n('financed_additional_charges'),
          cash_at_completion: n('cash_at_completion'),
          financial_account_id: form.financial_account_id ? n('financial_account_id') : null,
          lender_id: form.lender_id ? n('lender_id') : null,
          asset_ledger_account_id: form.asset_ledger_account_id ? n('asset_ledger_account_id') : null,
          liability_ledger_account_id: form.liability_ledger_account_id ? n('liability_ledger_account_id') : null,
          interest_expense_ledger_account_id: form.interest_expense_ledger_account_id ? n('interest_expense_ledger_account_id') : null,
          fee_expense_ledger_account_id: form.fee_expense_ledger_account_id ? n('fee_expense_ledger_account_id') : null,
          registration_number: form.registration_number || null,
          engine_number: form.engine_number || null,
          vin: form.vin || null,
          current_odometer: form.current_odometer ? n('current_odometer') : null,
          invoice_reference: form.invoice_reference || null,
          notes: form.notes || null,
        },
        true,
      )
    if (modal === 'activate')
      return command(`/api/v1/fleet-finance/agreements/${form.finance_agreement_id}/activate`, 'POST', {
        principal: n('principal'),
        first_due_on: form.first_due_on,
        installment_count: n('installment_count'),
        weekly_amount: n('weekly_amount'),
      })
    if (modal === 'payment')
      return command(
        '/api/v1/fleet-finance/payments',
        'POST',
        {
          finance_agreement_id: n('finance_agreement_id'),
          financial_account_id: n('financial_account_id'),
          amount: n('amount'),
          paid_at: form.paid_at,
        },
        true,
      )
    if (modal === 'funding')
      return command('/api/v1/fleet-finance/funding-policies', 'POST', {
        vehicle_id: n('vehicle_id'),
        finance_agreement_id: n('finance_agreement_id'),
        driver_contract_id: n('driver_contract_id'),
        reserve_envelope_id: n('reserve_envelope_id'),
        funding_method: form.funding_method,
        fixed_amount: form.fixed_amount ? n('fixed_amount') : null,
        percentage_basis_points: form.percentage_basis_points ? n('percentage_basis_points') : null,
        minimum_unrestricted_cash_buffer: n('minimum_unrestricted_cash_buffer'),
        priority: n('priority'),
        effective_on: form.effective_on,
        status: form.status,
        paused_reason: form.paused_reason || null,
      })
    if (modal === 'fault')
      return command('/api/v1/fleet-finance/faults', 'POST', {
        vehicle_id: n('vehicle_id'),
        reported_at: form.reported_at,
        description: form.description,
        takes_vehicle_out_of_service: form.takes_vehicle_out_of_service === 'true',
      })
    if (modal === 'resolve-fault')
      return command(`/api/v1/fleet-finance/faults/${form.fault_id}/resolve`, 'POST', { resolved_at: form.resolved_at, resolution: form.resolution })
    if (modal === 'maintenance')
      return command(
        '/api/v1/fleet-finance/maintenance',
        'POST',
        {
          vehicle_id: n('vehicle_id'),
          vehicle_service_plan_id: form.vehicle_service_plan_id ? n('vehicle_service_plan_id') : null,
          financial_account_id: n('financial_account_id'),
          expense_ledger_account_id: n('expense_ledger_account_id'),
          amount: n('amount'),
          performed_on: form.performed_on,
          odometer: form.odometer ? n('odometer') : null,
          vendor: form.vendor,
          notes: form.notes || null,
        },
        true,
      )
    if (modal === 'service-plan')
      return command(
        editingId ? `/api/v1/fleet-finance/service-plans/${editingId}` : '/api/v1/fleet-finance/service-plans',
        editingId ? 'PATCH' : 'POST',
        {
          ...(editingId ? {} : { vehicle_id: n('vehicle_id') }),
          category: form.category,
          description: form.description,
          rule_type: form.rule_type,
          odometer_interval: form.odometer_interval ? n('odometer_interval') : null,
          calendar_interval_days: form.calendar_interval_days ? n('calendar_interval_days') : null,
          estimated_cost: form.estimated_cost ? n('estimated_cost') : null,
          expected_duration_hours: form.expected_duration_hours ? n('expected_duration_hours') : null,
          priority: form.priority,
          is_active: form.is_active === 'true',
          notes: form.notes || null,
        },
      )
    if (modal === 'remittance')
      return command(
        '/api/v1/fleet-finance/remittances/collect',
        'POST',
        {
          driver_contract_id: n('driver_contract_id'),
          financial_account_id: n('financial_account_id'),
          amount: n('amount'),
          received_at: form.received_at,
          reference: form.reference || null,
        },
        true,
      )
  }

  const select = (name: string, options: Option[], placeholder: string, disabled = false) => (
    <SearchSelect value={form[name] ?? ''} onChange={(value) => set(name, value)} options={options} placeholder={placeholder} disabled={disabled} />
  )
  const input = (name: string, title: string, type = 'text', required = false) => (
    <Form.Group className="mb-3">
      <Form.Label>{title}</Form.Label>
      <Form.Control type={type} value={form[name] ?? ''} onChange={(event) => set(name, event.target.value)} required={required} disabled={saving} />
    </Form.Group>
  )

  const modalFields = () => {
    if (modal === 'lender')
      return (
        <Row className="g-3">
          <Col xs={12}>
            {!editingId && (
              <>
                <Form.Label>Financial entity</Form.Label>
                {select('entity_id', entities, 'Search financial entity')}
              </>
            )}
          </Col>
          <Col md={7}>{input('name', 'Lender name', 'text', true)}</Col>
          <Col md={5}>
            <Form.Label>Institution type</Form.Label>
            <Form.Select value={form.institution_type ?? 'other'} onChange={(event) => set('institution_type', event.target.value)}>
              <option value="bank">Bank</option>
              <option value="sacco">SACCO</option>
              <option value="dealer">Dealer finance</option>
              <option value="individual">Individual</option>
              <option value="other">Other</option>
            </Form.Select>
          </Col>
          <Col md={6}>{input('reference', 'Safe reference')}</Col>
          <Col md={6}>{input('contact_person', 'Contact person')}</Col>
        </Row>
      )
    if (modal === 'acquisition')
      return (
        <Row className="g-3">
          <Col md={6}>
            <Form.Label>Financial entity</Form.Label>
            {select('entity_id', entities, 'Search entity')}
          </Col>
          <Col md={6}>
            <Form.Label>Lender (required for finance)</Form.Label>
            {select('lender_id', lenders, 'Search lender')}
          </Col>
          <Col md={4}>{input('manufacturer', 'Make', 'text', true)}</Col>
          <Col md={4}>{input('model', 'Model', 'text', true)}</Col>
          <Col md={4}>{input('model_year', 'Model year', 'number')}</Col>
          <Col md={4}>
            <Form.Label>Vehicle type</Form.Label>
            <Form.Select value={form.vehicle_type ?? 'motorcycle'} onChange={(event) => set('vehicle_type', event.target.value)}>
              <option value="motorcycle">Motorcycle</option>
              <option value="car">Car</option>
            </Form.Select>
          </Col>
          <Col md={4}>
            <Form.Label>Purpose</Form.Label>
            <Form.Select value={form.purpose ?? 'commercial'} onChange={(event) => set('purpose', event.target.value)}>
              <option value="commercial">Commercial</option>
              <option value="personal">Personal</option>
            </Form.Select>
          </Col>
          <Col md={4}>
            <Form.Label>Propulsion</Form.Label>
            <Form.Select value={form.propulsion_type ?? 'petrol'} onChange={(event) => set('propulsion_type', event.target.value)}>
              <option value="petrol">Petrol</option>
              <option value="electric">Electric</option>
              <option value="hybrid">Hybrid</option>
              <option value="other">Other</option>
            </Form.Select>
          </Col>
          <Col md={4}>{input('expected_cash_price', 'Cash price (UGX)', 'number', true)}</Col>
          <Col md={4}>{input('expected_deposit', 'Required deposit (UGX)', 'number', true)}</Col>
          <Col md={4}>{input('expected_additional_charges', 'Additional charges (UGX)', 'number', true)}</Col>
          <Col md={4}>{input('expected_financed_additional_charges', 'Financed charges (UGX)', 'number', true)}</Col>
          <Col md={4}>{input('proposed_weekly_installment', 'Weekly installment (UGX)', 'number', true)}</Col>
          <Col md={4}>{input('proposed_installment_count', 'Installment count', 'number')}</Col>
          <Col md={4}>{input('expected_weekly_collections', 'Expected weekly collections', 'number', true)}</Col>
          <Col md={4}>{input('expected_weekly_maintenance', 'Weekly maintenance', 'number', true)}</Col>
          <Col md={4}>{input('expected_weekly_insurance', 'Weekly insurance', 'number', true)}</Col>
          <Col md={6}>
            <Form.Label>Funding account</Form.Label>
            {select('funding_financial_account_id', accountsFor(form.entity_id ?? ''), 'Search payment account')}
          </Col>
          <Col md={6}>
            <Form.Label>Deposit asset ledger</Form.Label>
            {select('deposit_ledger_account_id', ledgersFor(form.entity_id ?? '', 'asset'), 'Search deposit ledger')}
          </Col>
          <Col md={6}>
            <Form.Label>Vehicle asset ledger</Form.Label>
            {select('asset_ledger_account_id', ledgersFor(form.entity_id ?? '', 'asset'), 'Search asset ledger')}
          </Col>
          <Col md={6}>
            <Form.Label>Loan liability ledger</Form.Label>
            {select('liability_ledger_account_id', ledgersFor(form.entity_id ?? '', 'liability'), 'Search liability ledger')}
          </Col>
          <Col md={6}>
            <Form.Label>Interest expense ledger</Form.Label>
            {select('interest_expense_ledger_account_id', ledgersFor(form.entity_id ?? '', 'expense'), 'Search interest ledger')}
          </Col>
          <Col md={6}>
            <Form.Label>Fee expense ledger</Form.Label>
            {select('fee_expense_ledger_account_id', ledgersFor(form.entity_id ?? '', 'expense'), 'Search fee ledger')}
          </Col>
          <Col md={6}>{input('first_installment_due_on', 'First due date', 'date')}</Col>
        </Row>
      )
    if (modal === 'deposit')
      return (
        <Row className="g-3">
          <Col xs={12}>
            <Form.Label>Acquisition plan</Form.Label>
            {select('plan_id', plans, 'Search acquisition plan')}
          </Col>
          <Col md={6}>
            <Form.Label>Paid from</Form.Label>
            {select('financial_account_id', accountsFor(currentPlan ? String(currentPlan.entity_id) : ''), 'Search cash account')}
          </Col>
          <Col md={6}>
            <Form.Label>Deposit asset ledger</Form.Label>
            {select('ledger_account_id', ledgersFor(currentPlan ? String(currentPlan.entity_id) : '', 'asset'), 'Search deposit ledger')}
          </Col>
          <Col md={6}>{input('amount', 'Deposit amount (UGX)', 'number', true)}</Col>
          <Col md={6}>{input('paid_at', 'Paid at', 'datetime-local', true)}</Col>
          <Col xs={12}>{input('reference', 'Provider reference')}</Col>
        </Row>
      )
    if (modal === 'complete')
      return (
        <Row className="g-3">
          <Col xs={12}>
            <Form.Label>Acquisition plan</Form.Label>
            {select('plan_id', plans, 'Search acquisition plan')}
          </Col>
          <Col md={6}>{input('purchased_on', 'Purchased on', 'date', true)}</Col>
          <Col md={6}>{input('cash_price', 'Final cash price (UGX)', 'number')}</Col>
          <Col md={4}>{input('additional_charges', 'Additional charges', 'number', true)}</Col>
          <Col md={4}>{input('financed_additional_charges', 'Financed charges', 'number', true)}</Col>
          <Col md={4}>{input('cash_at_completion', 'Final cash paid', 'number', true)}</Col>
          <Col md={6}>
            <Form.Label>Funding account</Form.Label>
            {select('financial_account_id', accountsFor(currentPlan ? String(currentPlan.entity_id) : ''), 'Search account')}
          </Col>
          <Col md={6}>
            <Form.Label>Lender</Form.Label>
            {select(
              'lender_id',
              lenders.filter((item) => !currentPlan || item.label.endsWith(currentPlan.entity)),
              'Search lender',
            )}
          </Col>
          <Col md={6}>
            <Form.Label>Vehicle asset ledger</Form.Label>
            {select('asset_ledger_account_id', ledgersFor(currentPlan ? String(currentPlan.entity_id) : '', 'asset'), 'Search asset ledger')}
          </Col>
          <Col md={6}>
            <Form.Label>Liability ledger</Form.Label>
            {select(
              'liability_ledger_account_id',
              ledgersFor(currentPlan ? String(currentPlan.entity_id) : '', 'liability'),
              'Search liability ledger',
            )}
          </Col>
          <Col md={6}>
            <Form.Label>Interest expense ledger</Form.Label>
            {select(
              'interest_expense_ledger_account_id',
              ledgersFor(currentPlan ? String(currentPlan.entity_id) : '', 'expense'),
              'Search expense ledger',
            )}
          </Col>
          <Col md={6}>
            <Form.Label>Fee expense ledger</Form.Label>
            {select(
              'fee_expense_ledger_account_id',
              ledgersFor(currentPlan ? String(currentPlan.entity_id) : '', 'expense'),
              'Search expense ledger',
            )}
          </Col>
          <Col md={6}>{input('registration_number', 'Registration')}</Col>
          <Col md={6}>{input('current_odometer', 'Odometer', 'number')}</Col>
        </Row>
      )
    if (modal === 'activate')
      return (
        <Row className="g-3">
          <Col xs={12}>
            <Form.Label>Pending agreement</Form.Label>
            {select('finance_agreement_id', agreements, 'Search agreement')}
          </Col>
          <Col md={6}>{input('principal', 'Financed principal (UGX)', 'number', true)}</Col>
          <Col md={6}>{input('weekly_amount', 'Weekly installment (UGX)', 'number', true)}</Col>
          <Col md={6}>{input('installment_count', 'Installment count', 'number', true)}</Col>
          <Col md={6}>{input('first_due_on', 'First due date', 'date', true)}</Col>
        </Row>
      )
    if (modal === 'schedule')
      return (
        <Row className="g-3">
          <Col xs={12}>
            <Form.Label>Finance agreement</Form.Label>
            {select('finance_agreement_id', agreements, 'Search lender agreement')}
          </Col>
          <Col md={6}>
            <Form.Label>Schedule type</Form.Label>
            <Form.Select value={form.mode ?? 'verified'} onChange={(event) => set('mode', event.target.value)} disabled={saving}>
              <option value="verified">Verified components</option>
              <option value="provisional">Contractual totals only</option>
            </Form.Select>
          </Col>
          <Col md={6}>
            <Form.Label>Lender CSV</Form.Label>
            <Form.Control
              type="file"
              accept=".csv,text/csv,text/plain"
              required
              disabled={saving}
              onChange={(event) => setScheduleFile((event.target as HTMLInputElement).files?.[0] ?? null)}
            />
          </Col>
          <Col xs={12}>
            <Alert variant="light" className="mb-0">
              Verified CSV headings: <code>due_on, principal, interest, total</code>; optional <code>number, fees, other</code>. Contractual-only CSVs
              use <code>due_on, total</code> and are clearly marked provisional.
            </Alert>
          </Col>
        </Row>
      )
    if (modal === 'payment')
      return (
        <Row className="g-3">
          <Col xs={12}>
            <Form.Label>Lender agreement</Form.Label>
            {select('finance_agreement_id', agreements, 'Search agreement')}
          </Col>
          <Col md={6}>
            <Form.Label>Paid from account</Form.Label>
            {select('financial_account_id', accountsFor(currentAgreement ? String(currentAgreement.entity_id) : ''), 'Search payment account')}
          </Col>
          <Col md={6}>{input('amount', 'Lender-confirmed amount (UGX)', 'number', true)}</Col>
          <Col xs={12}>{input('paid_at', 'Paid at', 'datetime-local', true)}</Col>
        </Row>
      )
    if (modal === 'funding')
      return (
        <Row className="g-3">
          <Col md={6}>
            <Form.Label>Agreement</Form.Label>
            {select('finance_agreement_id', agreements, 'Search agreement')}
          </Col>
          <Col md={6}>
            <Form.Label>Vehicle</Form.Label>
            {select('vehicle_id', vehicles, 'Search vehicle')}
          </Col>
          <Col md={6}>
            <Form.Label>Remittance contract</Form.Label>
            {select('driver_contract_id', contracts, 'Search active contract')}
          </Col>
          <Col md={6}>
            <Form.Label>Reserve</Form.Label>
            {select('reserve_envelope_id', reserves, 'Search reserve')}
          </Col>
          <Col md={6}>
            <Form.Label>Method</Form.Label>
            <Form.Select value={form.funding_method ?? 'next_installment_shortfall'} onChange={(event) => set('funding_method', event.target.value)}>
              <option value="next_installment_shortfall">Next installment shortfall</option>
              <option value="fixed_per_receipt">Fixed per receipt</option>
              <option value="percentage_of_receipt">Percentage of receipt</option>
              <option value="manual">Manual only</option>
            </Form.Select>
          </Col>
          <Col md={6}>
            <Form.Label>Status</Form.Label>
            <Form.Select value={form.status ?? 'paused'} onChange={(event) => set('status', event.target.value)}>
              <option value="paused">Paused draft</option>
              <option value="active">Activate (Owner only)</option>
            </Form.Select>
          </Col>
          <Col md={4}>{input('fixed_amount', 'Fixed amount (UGX)', 'number')}</Col>
          <Col md={4}>{input('percentage_basis_points', 'Percentage (bps)', 'number')}</Col>
          <Col md={4}>{input('minimum_unrestricted_cash_buffer', 'Cash buffer (UGX)', 'number', true)}</Col>
          <Col md={6}>{input('priority', 'Priority', 'number', true)}</Col>
          <Col md={6}>{input('effective_on', 'Effective on', 'date', true)}</Col>
        </Row>
      )
    if (modal === 'fault')
      return (
        <Row className="g-3">
          <Col xs={12}>
            <Form.Label>Vehicle</Form.Label>
            {select('vehicle_id', vehicles, 'Search vehicle')}
          </Col>
          <Col xs={12}>{input('reported_at', 'Reported at', 'datetime-local', true)}</Col>
          <Col xs={12}>
            <Form.Label>Objective description</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={form.description ?? ''}
              onChange={(event) => set('description', event.target.value)}
              required
            />
          </Col>
          <Col xs={12}>
            <Form.Check
              type="switch"
              label="Take vehicle out of service"
              checked={(form.takes_vehicle_out_of_service ?? 'true') === 'true'}
              onChange={(event) => set('takes_vehicle_out_of_service', String(event.target.checked))}
            />
          </Col>
        </Row>
      )
    if (modal === 'resolve-fault')
      return (
        <Row className="g-3">
          <Col xs={12}>
            <Form.Label>Open fault</Form.Label>
            {select('fault_id', faults, 'Search reported fault')}
          </Col>
          <Col xs={12}>{input('resolved_at', 'Resolved at', 'datetime-local', true)}</Col>
          <Col xs={12}>
            <Form.Label>Resolution</Form.Label>
            <Form.Control as="textarea" rows={4} value={form.resolution ?? ''} onChange={(event) => set('resolution', event.target.value)} required />
          </Col>
        </Row>
      )
    if (modal === 'maintenance')
      return (
        <Row className="g-3">
          <Col md={6}>
            <Form.Label>Vehicle</Form.Label>
            {select('vehicle_id', vehicles, 'Search vehicle')}
          </Col>
          <Col md={6}>
            <Form.Label>Service plan (optional)</Form.Label>
            {select('vehicle_service_plan_id', servicePlans, 'Search active plan')}
          </Col>
          <Col md={6}>
            <Form.Label>Paid from account</Form.Label>
            {select('financial_account_id', accountsFor(currentVehicle ? String(currentVehicle.entity_id) : ''), 'Search account')}
          </Col>
          <Col md={6}>
            <Form.Label>Expense ledger</Form.Label>
            {select(
              'expense_ledger_account_id',
              ledgersFor(currentVehicle ? String(currentVehicle.entity_id) : '', 'expense'),
              'Search expense ledger',
            )}
          </Col>
          <Col md={4}>{input('amount', 'Actual cost (UGX)', 'number', true)}</Col>
          <Col md={4}>{input('performed_on', 'Performed on', 'date', true)}</Col>
          <Col md={4}>{input('odometer', 'Odometer', 'number')}</Col>
          <Col xs={12}>{input('vendor', 'Vendor', 'text', true)}</Col>
        </Row>
      )
    if (modal === 'service-plan')
      return (
        <Row className="g-3">
          <Col xs={12}>
            {!editingId && (
              <>
                <Form.Label>Vehicle</Form.Label>
                {select('vehicle_id', vehicles, 'Search vehicle')}
              </>
            )}
          </Col>
          <Col md={6}>{input('category', 'Category', 'text', true)}</Col>
          <Col md={6}>{input('description', 'Description', 'text', true)}</Col>
          <Col md={4}>
            <Form.Label>Rule</Form.Label>
            <Form.Select value={form.rule_type ?? 'calendar'} onChange={(event) => set('rule_type', event.target.value)}>
              <option value="odometer">Odometer</option>
              <option value="calendar">Calendar</option>
              <option value="either">Either</option>
              <option value="one_time">One-time</option>
            </Form.Select>
          </Col>
          <Col md={4}>{input('odometer_interval', 'Odometer interval', 'number')}</Col>
          <Col md={4}>{input('calendar_interval_days', 'Calendar days', 'number')}</Col>
          <Col md={6}>{input('estimated_cost', 'Estimated cost (UGX)', 'number')}</Col>
          <Col md={6}>
            <Form.Label>Priority</Form.Label>
            <Form.Select value={form.priority ?? 'normal'} onChange={(event) => set('priority', event.target.value)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Form.Select>
          </Col>
          <Col xs={12}>
            <Form.Check
              type="switch"
              label="Active for new work"
              checked={(form.is_active ?? 'true') === 'true'}
              onChange={(event) => set('is_active', String(event.target.checked))}
            />
          </Col>
        </Row>
      )
    if (modal === 'remittance')
      return (
        <Row className="g-3">
          <Col xs={12}>
            <Form.Label>Active driver contract</Form.Label>
            {select('driver_contract_id', contracts, 'Search contract')}
          </Col>
          <Col md={6}>
            <Form.Label>Receipt account</Form.Label>
            {select('financial_account_id', accountsFor(''), 'Search cash account')}
          </Col>
          <Col md={6}>{input('amount', 'Received amount (UGX)', 'number', true)}</Col>
          <Col md={6}>{input('received_at', 'Received at', 'datetime-local', true)}</Col>
          <Col md={6}>{input('reference', 'Provider reference')}</Col>
        </Row>
      )
    return null
  }

  const toolbar = (kind: ModalKind, text: string, icon = 'solar:add-circle-bold-duotone', values: FormValues = {}) => (
    <Button size="sm" onClick={() => open(kind, values)}>
      <IconifyIcon icon={icon} className="me-1" />
      {text}
    </Button>
  )
  const table = (heading: string, body: React.ReactNode, action?: React.ReactNode, note?: string) => (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">{heading}</CardTitle>
            {note && <p className="mb-0 mt-1 text-muted fs-13">{note}</p>}
          </Col>
          {action && <Col xs="auto">{action}</Col>}
        </Row>
      </CardHeader>
      <CardBody className="pt-0">{body}</CardBody>
    </Card>
  )

  const lendersView = table(
    'Lenders',
    <div className="table-responsive">
      <Table hover className="mb-0">
        <thead className="table-light">
          <tr>
            <th>Lender</th>
            <th>Entity</th>
            <th>Type</th>
            <th>Reference</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {workspace.lenders.length ? (
            workspace.lenders.map((item) => (
              <tr key={item.id}>
                <td className="fw-semibold">{item.name}</td>
                <td>{item.entity}</td>
                <td>{label(item.institution_type)}</td>
                <td>{item.reference ?? '—'}</td>
                <td className="text-end">
                  <Button
                    size="sm"
                    variant="light"
                    onClick={() =>
                      open(
                        'lender',
                        { name: item.name, institution_type: item.institution_type, reference: item.reference ?? '', contact_person: '' },
                        item.id,
                      )
                    }>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    className="ms-1"
                    onClick={() => void command(`/api/v1/fleet-finance/lenders/${item.id}`, 'DELETE')}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <Empty columns={5} message="No lenders configured." />
          )}
        </tbody>
      </Table>
    </div>,
    toolbar('lender', 'Add lender'),
    'Lender payment instructions and contacts stay private; this workspace shows only safe operating references.',
  )
  const acquisitionView = (
    <Row>
      <Col xl={7} className="mb-3">
        {table(
          'Acquisition plans',
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Plan</th>
                  <th>Entity</th>
                  <th>Status</th>
                  <th className="text-end">Deposit left</th>
                  <th className="text-end">Proposed finance</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {workspace.acquisition_plans.length ? (
                  workspace.acquisition_plans.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="fw-semibold d-block">{item.reference}</span>
                        <small>{item.vehicle}</small>
                      </td>
                      <td>{item.entity}</td>
                      <td>{status(item.status)}</td>
                      <td className="text-end">{formatUGX(item.deposit_remaining)}</td>
                      <td className="text-end">{formatUGX(item.proposed_total_financing)}</td>
                      <td className="text-end">
                        {item.status !== 'acquired' && (
                          <>
                            <Link className="btn btn-light btn-sm" href="/fleet-finance/acquire-vehicle">
                              Continue lifecycle
                            </Link>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <Empty columns={6} message="No acquisition plans." />
                )}
              </tbody>
            </Table>
          </div>,
          <Link href="/fleet-finance/acquire-vehicle" className="btn btn-primary btn-sm">
            <IconifyIcon icon="solar:add-circle-bold-duotone" className="me-1" />
            Plan acquisition
          </Link>,
          'Plans are non-financial until a deposit or completion is posted.',
        )}
      </Col>
      <Col xl={5} className="mb-3">
        {table(
          'Financing readiness',
          <div className="p-2">
            <p className="mb-2">Acquisition completion creates the vehicle and a pending agreement only after all entity/account checks pass.</p>
            <p className="mb-0 text-muted">
              Activate a contractual calendar or import the lender’s detailed schedule before treating repayments as settled loan components.
            </p>
          </div>,
        )}
      </Col>
    </Row>
  )
  const repaymentView = (
    <Row>
      <Col xl={12} className="mb-3">
        {table(
          'Missed loan dues',
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Due</th>
                  <th>Installment</th>
                  <th>Vehicle / lender</th>
                  <th className="text-end">Outstanding</th>
                  <th aria-label="Action" />
                </tr>
              </thead>
              <tbody>
                {workspace.missed_installments.length ? (
                  workspace.missed_installments.map((item) => (
                    <tr key={item.id}>
                      <td className="text-danger fw-semibold">{item.due_on}</td>
                      <td>#{item.number}</td>
                      <td>
                        <span className="fw-semibold d-block">{item.vehicle}</span>
                        <small>{item.lender}</small>
                      </td>
                      <td className="text-end fw-semibold text-danger">{formatUGX(item.outstanding)}</td>
                      <td className="text-end">
                        <Button
                          size="sm"
                          onClick={() =>
                            open('payment', {
                              finance_agreement_id: String(item.agreement_id),
                              financial_account_id: '',
                              amount: String(item.outstanding),
                              paid_at: new Date().toISOString().slice(0, 16),
                            })
                          }>
                          Pay now
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <Empty columns={5} message="No missed loan dues. Paid-off or future schedules remain in the contractual schedule below." />
                )}
              </tbody>
            </Table>
          </div>,
          undefined,
          'Quick Pay prefills this due amount. Confirmation posts one actual cash movement and allocates it oldest-first; sufficient account balance alone never marks a lender installment paid.',
        )}
      </Col>
      <Col xl={12} className="mb-3">
        {table(
          'Finance agreements',
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Vehicle / lender</th>
                  <th>Status</th>
                  <th>First due</th>
                  <th className="text-end">Principal</th>
                  <th className="text-end">Unpaid</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {workspace.agreements.length ? (
                  workspace.agreements.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="fw-semibold d-block">{item.vehicle}</span>
                        <small>
                          {item.lender} · {item.reference}
                        </small>
                      </td>
                      <td>{status(item.status)}</td>
                      <td>{item.first_due_on ?? '—'}</td>
                      <td className="text-end">{formatUGX(item.original_principal)}</td>
                      <td className="text-end">{formatUGX(item.unpaid_total)}</td>
                      <td className="text-end">
                        {item.status === 'pending_activation' && (
                          <Button
                            size="sm"
                            variant="light"
                            onClick={() =>
                              open('activate', {
                                finance_agreement_id: String(item.id),
                                principal: String(item.original_principal),
                                weekly_amount: '',
                                installment_count: '',
                                first_due_on: '',
                              })
                            }>
                            Activate calendar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="light"
                          className="ms-1"
                          onClick={() => open('schedule', { finance_agreement_id: String(item.id), mode: 'verified' })}>
                          Import CSV
                        </Button>
                        <Button
                          size="sm"
                          className="ms-1"
                          onClick={() =>
                            open('payment', {
                              finance_agreement_id: String(item.id),
                              financial_account_id: '',
                              amount: '',
                              paid_at: new Date().toISOString().slice(0, 16),
                            })
                          }>
                          Quick pay
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <Empty columns={6} message="No finance agreements." />
                )}
              </tbody>
            </Table>
          </div>,
          <div className="d-flex gap-2">
            {toolbar('schedule', 'Import lender CSV', 'solar:document-add-bold-duotone', { finance_agreement_id: '', mode: 'verified' })}
            {toolbar('payment', 'Record lender payment', 'solar:banknote-bold-duotone')}
          </div>,
          'Payments are idempotent and allocate oldest contractual amounts first. An amount may cover partial, missed, and future installment rows; surplus and principal curtailment require lender-confirmed treatment.',
        )}
      </Col>
      <Col xl={12} className="mb-3">
        {table(
          'Lender schedule imports',
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Agreement</th>
                  <th>Version</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th className="text-end">Rows expected</th>
                  <th className="text-end">Declared total</th>
                </tr>
              </thead>
              <tbody>
                {workspace.schedule_versions.length ? (
                  workspace.schedule_versions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="fw-semibold d-block">{item.vehicle}</span>
                        <small>{item.reference}</small>
                      </td>
                      <td>v{item.version_number}</td>
                      <td>{label(item.source)}</td>
                      <td>{status(item.status)}</td>
                      <td className="text-end">{item.expected_installment_count ?? '—'}</td>
                      <td className="text-end">{item.declared_total === null ? '—' : formatUGX(item.declared_total)}</td>
                    </tr>
                  ))
                ) : (
                  <Empty columns={6} message="No lender schedule has been imported." />
                )}
              </tbody>
            </Table>
          </div>,
          undefined,
          'Only reconciled schedules activate principal, interest, and fee allocation. Earlier unallocated contractual calendars remain visible as superseded history.',
        )}
      </Col>
      <Col xl={12} className="mb-3">
        {table(
          'Contractual installments',
          <>
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Due</th>
                    <th>Vehicle</th>
                    <th>Verification</th>
                    <th>Status</th>
                    <th className="text-end">Expected</th>
                    <th className="text-end">Outstanding</th>
                    <th aria-label="Action" />
                  </tr>
                </thead>
                <tbody>
                  {workspace.installments.length ? (
                    visibleInstallments.map((item) => (
                      <tr key={item.id}>
                        <td>{item.due_on}</td>
                        <td>{item.vehicle}</td>
                        <td>{label(item.verification_status)}</td>
                        <td>{status(item.status)}</td>
                        <td className="text-end">{formatUGX(item.total_expected)}</td>
                        <td className="text-end">{formatUGX(item.outstanding)}</td>
                        <td className="text-end">
                          {['scheduled', 'partial', 'overdue'].includes(item.status) && item.outstanding > 0 && (
                            <Button
                              size="sm"
                              variant="light"
                              onClick={() =>
                                open('payment', {
                                  finance_agreement_id: String(item.agreement_id),
                                  financial_account_id: '',
                                  amount: String(item.outstanding),
                                  paid_at: new Date().toISOString().slice(0, 16),
                                })
                              }>
                              Pay now
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <Empty columns={7} message="No lender schedule rows." />
                  )}
                </tbody>
              </Table>
            </div>
            {workspace.installments.length > 0 && (
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-3 border-top">
                <small className="text-muted">
                  Showing {Math.min((installmentPage - 1) * installmentsPerPage + 1, workspace.installments.length)}–
                  {Math.min(installmentPage * installmentsPerPage, workspace.installments.length)} of {workspace.installments.length} installments
                </small>
                {installmentPages > 1 && (
                  <Pagination className="pagination-rounded mb-0">
                    <Pagination.Prev disabled={installmentPage === 1} onClick={() => setInstallmentPage((page) => Math.max(1, page - 1))} />
                    {Array.from({ length: installmentPages }, (_, index) => index + 1)
                      .filter((page) => page === 1 || page === installmentPages || Math.abs(page - installmentPage) <= 1)
                      .map((page, index, pages) => (
                        <span key={page} className="d-flex">
                          {index > 0 && page - pages[index - 1] > 1 && <Pagination.Ellipsis disabled />}
                          <Pagination.Item active={page === installmentPage} onClick={() => setInstallmentPage(page)}>
                            {page}
                          </Pagination.Item>
                        </span>
                      ))}
                    <Pagination.Next
                      disabled={installmentPage === installmentPages}
                      onClick={() => setInstallmentPage((page) => Math.min(installmentPages, page + 1))}
                    />
                  </Pagination>
                )}
              </div>
            )}
          </>,
        )}
      </Col>
    </Row>
  )
  const safetyView = (
    <Row>
      <Col md={6} xl={3} className="mb-3">
        <Card>
          <CardBody>
            <p className="text-muted mb-1">Available cash</p>
            <h3>{formatUGX(workspace.loan_safety.available_cash)}</h3>
          </CardBody>
        </Card>
      </Col>
      <Col md={6} xl={3} className="mb-3">
        <Card>
          <CardBody>
            <p className="text-muted mb-1">Overdue installments</p>
            <h3 className="text-danger">{workspace.loan_safety.overdue_count}</h3>
            <small>{formatUGX(workspace.loan_safety.overdue_amount)}</small>
          </CardBody>
        </Card>
      </Col>
      <Col md={6} xl={3} className="mb-3">
        <Card>
          <CardBody>
            <p className="text-muted mb-1">Due in 7 days</p>
            <h3>{formatUGX(workspace.loan_safety.due_next_seven_days)}</h3>
          </CardBody>
        </Card>
      </Col>
      <Col md={6} xl={3} className="mb-3">
        <Card>
          <CardBody>
            <p className="text-muted mb-1">Next Friday</p>
            <h3>{workspace.loan_safety.next_friday ? formatUGX(workspace.loan_safety.next_friday.amount) : '—'}</h3>
            <small>{workspace.loan_safety.next_friday?.due_on ?? 'No scheduled Friday installment'}</small>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
  const fundingView = table(
    'Loan funding rules',
    <div className="table-responsive">
      <Table hover className="mb-0">
        <thead className="table-light">
          <tr>
            <th>Vehicle</th>
            <th>Contract</th>
            <th>Reserve</th>
            <th>Method</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {workspace.funding_policies.length ? (
            workspace.funding_policies.map((item) => (
              <tr key={item.id}>
                <td>{item.vehicle}</td>
                <td>{item.contract}</td>
                <td>{item.reserve}</td>
                <td>{label(item.funding_method)}</td>
                <td>{status(item.status)}</td>
                <td className="text-end">
                  {item.status === 'active' && (
                    <Button
                      size="sm"
                      variant="light"
                      onClick={() =>
                        void command(`/api/v1/fleet-finance/funding-policies/${item.id}`, 'PATCH', {
                          status: 'paused',
                          paused_reason: 'Paused from the Next finance workspace.',
                        })
                      }>
                      Pause
                    </Button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <Empty columns={6} message="No remittance-to-loan funding rules." />
          )}
        </tbody>
      </Table>
    </div>,
    toolbar('funding', 'Add funding rule'),
    'A funding rule reserves eligible collected cash. It never pays the lender itself.',
  )
  const vehiclesView = table(
    'Vehicles',
    <div className="table-responsive">
      <Table hover className="mb-0">
        <thead className="table-light">
          <tr>
            <th>Asset</th>
            <th>Entity</th>
            <th>Status</th>
            <th>Finance</th>
            <th className="text-end">Odometer</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {workspace.vehicles.length ? (
            workspace.vehicles.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="fw-semibold">{item.asset_reference}</span>
                  <small className="d-block">{[item.manufacturer, item.model].filter(Boolean).join(' ')}</small>
                </td>
                <td>{item.entity}</td>
                <td>{status(item.operational_status)}</td>
                <td>{status(item.finance_status)}</td>
                <td className="text-end">{item.current_odometer?.toLocaleString('en-UG') ?? '—'}</td>
                <td className="text-end">
                  <Link className="btn btn-light btn-sm" href={`/operations/fleet/${item.id}`}>
                    Open vehicle
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <Empty columns={6} message="No vehicles." />
          )}
        </tbody>
      </Table>
    </div>,
    <Link href="/operations/fleet" className="btn btn-primary btn-sm">
      <IconifyIcon icon="solar:add-circle-bold-duotone" className="me-1" />
      Register vehicle
    </Link>,
    'Vehicle registration links to the working Fleet Operations register; financed purchases are completed through Acquire Vehicle.',
  )
  const faultsView = table(
    'Vehicle faults',
    <div className="table-responsive">
      <Table hover className="mb-0">
        <thead className="table-light">
          <tr>
            <th>Reported</th>
            <th>Vehicle</th>
            <th>Issue</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {workspace.faults.length ? (
            workspace.faults.map((item) => (
              <tr key={item.id}>
                <td>{dateTime(item.reported_at)}</td>
                <td>{item.vehicle}</td>
                <td>{item.description}</td>
                <td>{status(item.status)}</td>
                <td className="text-end">
                  {item.status !== 'resolved' && (
                    <Button
                      size="sm"
                      variant="light"
                      onClick={() => open('resolve-fault', { fault_id: String(item.id), resolved_at: '', resolution: '' })}>
                      Resolve
                    </Button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <Empty columns={5} message="No reported vehicle faults." />
          )}
        </tbody>
      </Table>
    </div>,
    toolbar('fault', 'Report fault'),
    'A documented resolution restores a maintenance-held vehicle to available only when appropriate.',
  )
  const maintenanceView = table(
    'Paid maintenance',
    <div className="table-responsive">
      <Table hover className="mb-0">
        <thead className="table-light">
          <tr>
            <th>Date</th>
            <th>Vehicle</th>
            <th>Vendor</th>
            <th>Status</th>
            <th className="text-end">Actual cost</th>
          </tr>
        </thead>
        <tbody>
          {workspace.maintenance.length ? (
            workspace.maintenance.map((item) => (
              <tr key={item.id}>
                <td>{item.performed_on}</td>
                <td>{item.vehicle}</td>
                <td>{item.vendor ?? '—'}</td>
                <td>{status(item.status)}</td>
                <td className="text-end">{item.actual_cost === null ? '—' : formatUGX(item.actual_cost)}</td>
              </tr>
            ))
          ) : (
            <Empty columns={5} message="No paid maintenance records." />
          )}
        </tbody>
      </Table>
    </div>,
    toolbar('maintenance', 'Record paid maintenance'),
    'Completed maintenance is ledger-backed and immutable; corrections are handled through financial reversals, not edits.',
  )
  const plansView = table(
    'Maintenance plans',
    <div className="table-responsive">
      <Table hover className="mb-0">
        <thead className="table-light">
          <tr>
            <th>Vehicle</th>
            <th>Category</th>
            <th>Rule</th>
            <th>Priority</th>
            <th className="text-end">Estimate</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {workspace.maintenance_plans.length ? (
            workspace.maintenance_plans.map((item) => (
              <tr key={item.id}>
                <td>{item.vehicle}</td>
                <td>
                  <span className="fw-semibold">{item.category}</span>
                  <small className="d-block">{item.description}</small>
                </td>
                <td>{label(item.rule_type)}</td>
                <td>{status(item.priority)}</td>
                <td className="text-end">{item.estimated_cost === null ? '—' : formatUGX(item.estimated_cost)}</td>
                <td className="text-end">
                  <Button
                    size="sm"
                    variant="light"
                    onClick={() =>
                      open(
                        'service-plan',
                        {
                          category: item.category,
                          description: item.description,
                          rule_type: item.rule_type,
                          odometer_interval: item.odometer_interval ? String(item.odometer_interval) : '',
                          calendar_interval_days: item.calendar_interval_days ? String(item.calendar_interval_days) : '',
                          estimated_cost: item.estimated_cost ? String(item.estimated_cost) : '',
                          priority: item.priority,
                          is_active: String(item.is_active),
                        },
                        item.id,
                      )
                    }>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    className="ms-1"
                    onClick={() => void command(`/api/v1/fleet-finance/service-plans/${item.id}`, 'DELETE')}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <Empty columns={6} message="No maintenance plans." />
          )}
        </tbody>
      </Table>
    </div>,
    toolbar('service-plan', 'Add maintenance plan'),
  )
  const profitabilityView = table(
    'Fleet profitability',
    <div className="table-responsive">
      <Table hover className="mb-0">
        <thead className="table-light">
          <tr>
            <th>Vehicle</th>
            <th>Entity</th>
            <th className="text-end">Collections</th>
            <th className="text-end">Maintenance</th>
            <th className="text-end">Interest + fees</th>
            <th className="text-end">Post-debt cash flow</th>
          </tr>
        </thead>
        <tbody>
          {workspace.profitability.length ? (
            workspace.profitability.map((item) => (
              <tr key={item.vehicle_id}>
                <td className="fw-semibold">{item.vehicle}</td>
                <td>{item.entity}</td>
                <td className="text-end">{formatUGX(item.actual_collections)}</td>
                <td className="text-end">{formatUGX(item.operating_expenses)}</td>
                <td className="text-end">{formatUGX(item.finance_interest + item.finance_fees)}</td>
                <td className={`text-end fw-semibold ${item.post_debt_service_cash_flow < 0 ? 'text-danger' : 'text-success'}`}>
                  {formatUGX(item.post_debt_service_cash_flow)}
                </td>
              </tr>
            ))
          ) : (
            <Empty columns={6} message="No vehicles available for profitability analysis." />
          )}
        </tbody>
      </Table>
    </div>,
    undefined,
    'Principal repayment remains debt service—not an expense—so it is shown separately by the underlying calculation.',
  )
  const remittancesView = (
    <Row>
      <Col xl={7} className="mb-3">
        {table(
          'Due remittances',
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Due</th>
                  <th>Driver / vehicle</th>
                  <th>Status</th>
                  <th className="text-end">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {workspace.remittance_obligations.length ? (
                  workspace.remittance_obligations.map((item) => (
                    <tr key={item.id}>
                      <td>{item.due_on}</td>
                      <td>
                        <span className="fw-semibold d-block">{item.driver}</span>
                        <small>{item.vehicle}</small>
                      </td>
                      <td>{status(item.status)}</td>
                      <td className="text-end">{formatUGX(item.outstanding)}</td>
                    </tr>
                  ))
                ) : (
                  <Empty columns={4} message="No outstanding remittance obligations." />
                )}
              </tbody>
            </Table>
          </div>,
          toolbar('remittance', 'Collect remittance', 'solar:cash-out-bold-duotone'),
        )}
      </Col>
      <Col xl={5} className="mb-3">
        {table(
          'Active remittance contracts',
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Contract</th>
                  <th>Driver</th>
                  <th className="text-end">Rate</th>
                </tr>
              </thead>
              <tbody>
                {workspace.driver_contracts.length ? (
                  workspace.driver_contracts.map((item) => (
                    <tr key={item.id}>
                      <td>{item.reference}</td>
                      <td>{item.driver}</td>
                      <td className="text-end">{formatUGX(item.remittance_amount)}</td>
                    </tr>
                  ))
                ) : (
                  <Empty columns={3} message="No active contracts." />
                )}
              </tbody>
            </Table>
          </div>,
        )}
      </Col>
    </Row>
  )
  const overview = (
    <>
      <Row className="mb-1">
        <Col xl={6} className="mb-3">
          {safetyView}
        </Col>
        <Col xl={6} className="mb-3">
          {fundingView}
        </Col>
      </Row>
      <Row>
        <Col xl={6} className="mb-3">
          {acquisitionView}
        </Col>
        <Col xl={6} className="mb-3">
          {repaymentView}
        </Col>
      </Row>
    </>
  )
  const content =
    section === 'acquire-vehicle'
      ? acquisitionView
      : section === 'loan-safety'
        ? safetyView
        : section === 'loan-funding'
          ? fundingView
          : section === 'lenders'
            ? lendersView
            : section === 'vehicles'
              ? vehiclesView
              : section === 'vehicle-faults'
                ? faultsView
                : section === 'paid-maintenance'
                  ? maintenanceView
                  : section === 'maintenance-plans'
                    ? plansView
                    : section === 'fleet-profitability'
                      ? profitabilityView
                      : section === 'remittances'
                        ? remittancesView
                        : overview
  const modalTitle: Record<Exclude<ModalKind, null>, string> = {
    lender: editingId ? 'Edit lender' : 'Add lender',
    acquisition: 'Plan vehicle acquisition',
    deposit: 'Record acquisition deposit',
    complete: 'Complete acquisition',
    activate: 'Activate contractual calendar',
    schedule: 'Import lender schedule',
    payment: 'Record lender payment',
    funding: 'Create loan funding rule',
    fault: 'Report vehicle fault',
    'resolve-fault': 'Resolve vehicle fault',
    maintenance: 'Record paid maintenance',
    'service-plan': editingId ? 'Edit maintenance plan' : 'Add maintenance plan',
    remittance: 'Collect driver remittance',
  }

  return (
    <>
      <Row className="align-items-center mb-3">
        <Col>
          <h4 className="mb-1 fw-bold">{title}</h4>
          <p className="mb-0 text-muted">
            Real acquisition, lending, maintenance and collection workflows. Posted cash and allocations remain immutable and auditable.
          </p>
        </Col>
      </Row>
      {error && !modal && <Alert variant="danger">{error}</Alert>}
      {content}
      <Modal show={modal !== null} onHide={close} centered size={modal === 'acquisition' || modal === 'complete' ? 'xl' : 'lg'}>
        <Form onSubmit={(event) => void submit(event)}>
          <Modal.Header closeButton={!saving}>
            <Modal.Title>{modal ? modalTitle[modal] : ''}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            {modalFields()}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner size="sm" className="me-2" />}
              {modal === 'payment'
                ? 'Post payment'
                : modal === 'complete'
                  ? 'Complete acquisition'
                  : modal === 'remittance'
                    ? 'Post receipt'
                    : modal === 'schedule'
                      ? 'Import schedule'
                      : 'Save'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

export default FleetFinanceWorkspace
