'use client'

import { ApiError, planningCommand } from '@/lib/api/client'
import type { PlanningWorkspaceData } from '@/lib/api/types'
import { useMemo, useState } from 'react'
import Select from 'react-select'
import { Button, Form, Modal } from 'react-bootstrap'

type Action = 'budget-create' | 'budget-adjust' | 'obligation-create' | 'reserve-create' | 'reserve-fund' | 'reserve-release' | 'due-pay' | 'due-reschedule' | 'due-skip' | 'scenario-create' | 'scenario-edit' | 'simulation-create' | 'simulation-edit'
type Target = { id: number; entity_id: number; [key: string]: unknown }
type Props = { workspace: PlanningWorkspaceData; action: Action; target?: Target; onSuccess: () => void }
type FormValues = Record<string, string | boolean>

const today = () => new Date().toISOString().slice(0, 10)
const title: Record<Action, string> = {
  'budget-create': 'Create budget', 'budget-adjust': 'Append budget adjustment', 'obligation-create': 'Create recurring obligation', 'reserve-create': 'Create reserve', 'reserve-fund': 'Protect cash in reserve', 'reserve-release': 'Release protected cash', 'due-pay': 'Pay due event', 'due-reschedule': 'Reschedule due event', 'due-skip': 'Skip due event', 'scenario-create': 'Create forecast scenario', 'scenario-edit': 'Edit forecast scenario', 'simulation-create': 'Create acquisition simulation', 'simulation-edit': 'Edit acquisition simulation',
}

const initial = (action: Action, target?: Target): FormValues => {
  const entityId = target?.entity_id ?? ''
  if (action === 'budget-create') return { entity_id: '', financial_category_id: '', name: '', period_type: 'monthly', amount: '', starts_on: today(), ends_on: '' }
  if (action === 'budget-adjust') return { amount_delta: '', effective_on: today(), reason: '' }
  if (action === 'obligation-create') return { entity_id: '', financial_category_id: '', default_financial_account_id: '', title: '', payee_name: '', amount: '', priority: 'normal', frequency: 'monthly', interval_count: '1', initial_due_on: today(), starts_on: today(), grace_days: '0', month_day_policy: 'last_valid_day', weekend_policy: 'keep', reference: '', description: '' }
  if (action === 'reserve-create') return { entity_id: '', recurring_obligation_id: '', name: '', purpose: '', target_amount: '', target_on: '', priority: 'normal', status: 'active', notes: '' }
  if (action === 'reserve-fund' || action === 'reserve-release') return { financial_account_id: '', amount: '', note: '' }
  if (action === 'due-pay') return { financial_account_id: '', amount: String(target?.outstanding ?? ''), occurred_at: `${today()}T12:00`, note: '' }
  if (action === 'due-reschedule') return { due_on: String(target?.due_on ?? today()), reason: '' }
  if (action === 'due-skip') return { reason: '' }
  if (action === 'scenario-create') return { entity_id: '', name: '', kind: 'expected', collection_reliability_basis_points: '10000', irregular_income_daily: '0', repair_buffer_daily: '0', emergency_reserve: '0', is_active: true }
  if (action === 'scenario-edit') return { entity_id: String(entityId), name: String(target?.name ?? ''), kind: String(target?.kind ?? 'expected'), collection_reliability_basis_points: String(target?.collection_reliability_basis_points ?? 10000), irregular_income_daily: String(target?.irregular_income_daily ?? 0), repair_buffer_daily: String(target?.repair_buffer_daily ?? 0), emergency_reserve: String(target?.emergency_reserve ?? 0), is_active: Boolean(target?.is_active) }
  if (action === 'simulation-create') return { entity_id: '', name: '', deposit: '', weekly_loan_payment: '', expected_weekly_collections: '', repair_buffer_weekly: '0', lender_settlement_quote: '', quote_valid_until: '' }
  return { entity_id: String(entityId), name: String(target?.name ?? ''), deposit: String(target?.deposit ?? ''), weekly_loan_payment: target?.weekly_loan_payment === null ? '' : String(target?.weekly_loan_payment ?? ''), expected_weekly_collections: target?.expected_weekly_collections === null ? '' : String(target?.expected_weekly_collections ?? ''), repair_buffer_weekly: String(target?.repair_buffer_weekly ?? 0), lender_settlement_quote: target?.lender_settlement_quote === null ? '' : String(target?.lender_settlement_quote ?? ''), quote_valid_until: String(target?.quote_valid_until ?? '') }
}

const PlanningCommandModal = ({ workspace, action, target, onSuccess }: Props) => {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormValues>(() => initial(action, target))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const entityId = Number(form.entity_id || target?.entity_id || 0)
  const entities = useMemo(() => workspace.entities.map((entity) => ({ value: String(entity.id), label: entity.name })), [workspace.entities])
  const categories = useMemo(() => workspace.expense_categories.filter((category) => !entityId || category.entity_id === entityId).map((category) => ({ value: String(category.id), label: `${category.name} — ${category.entity}` })), [workspace.expense_categories, entityId])
  const accounts = useMemo(() => workspace.financial_accounts.filter((account) => !entityId || account.entity_id === entityId).map((account) => ({ value: String(account.id), label: `${account.name} — ${account.entity}` })), [workspace.financial_accounts, entityId])
  const obligations = useMemo(() => workspace.obligations.filter((obligation) => !entityId || obligation.entity_id === entityId).map((obligation) => ({ value: String(obligation.id), label: `${obligation.title} — ${obligation.entity}` })), [workspace.obligations, entityId])

  const set = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value, ...(key === 'entity_id' ? { financial_category_id: '', default_financial_account_id: '', recurring_obligation_id: '' } : {}) }))
  const searchable = (key: string, options: Array<{ value: string; label: string }>, required = true) => <Form.Group className="mb-3"><Form.Label>{key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</Form.Label><Select options={options} value={options.find((option) => option.value === String(form[key] ?? '')) ?? null} onChange={(option) => set(key, option?.value ?? '')} isClearable={!required} placeholder={`Select ${key.replaceAll('_', ' ')}`} /></Form.Group>
  const input = (key: string, label: string, type = 'text', required = true, help?: string) => <Form.Group className="mb-3"><Form.Label>{label}</Form.Label><Form.Control type={type} required={required} value={String(form[key] ?? '')} onChange={(event) => set(key, event.target.value)} min={type === 'number' && key !== 'amount_delta' ? 0 : undefined} step={type === 'number' ? 1 : undefined} />{help && <Form.Text className="text-muted">{help}</Form.Text>}</Form.Group>
  const select = (key: string, label: string, options: Array<[string, string]>) => <Form.Group className="mb-3"><Form.Label>{label}</Form.Label><Form.Select value={String(form[key] ?? '')} onChange={(event) => set(key, event.target.value)}>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</Form.Select></Form.Group>

  const payload = (): Record<string, unknown> => {
    const normalized: Record<string, unknown> = { ...form }
    for (const key of ['entity_id', 'financial_category_id', 'default_financial_account_id', 'recurring_obligation_id', 'financial_account_id', 'amount', 'amount_delta', 'interval_count', 'grace_days', 'collection_reliability_basis_points', 'irregular_income_daily', 'repair_buffer_daily', 'emergency_reserve', 'deposit', 'weekly_loan_payment', 'expected_weekly_collections', 'repair_buffer_weekly', 'lender_settlement_quote']) {
      if (key in normalized) normalized[key] = normalized[key] === '' ? null : Number(normalized[key])
    }
    for (const key of ['ends_on', 'target_on', 'quote_valid_until', 'reference', 'description', 'purpose', 'notes', 'note']) if (normalized[key] === '') normalized[key] = null
    if (action === 'scenario-edit' || action === 'simulation-edit') delete normalized.entity_id
    return normalized
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaving(true)
    const key = crypto.randomUUID()
    const data = payload()
    const command: Record<Action, [string, 'POST' | 'PATCH', boolean]> = {
      'budget-create': ['/api/v1/planning/budgets', 'POST', false], 'budget-adjust': [`/api/v1/planning/budgets/${target?.id}/adjustments`, 'POST', false], 'obligation-create': ['/api/v1/planning/obligations', 'POST', false], 'reserve-create': ['/api/v1/planning/reserves', 'POST', false], 'reserve-fund': [`/api/v1/planning/reserves/${target?.id}/fund`, 'POST', true], 'reserve-release': [`/api/v1/planning/reserves/${target?.id}/release`, 'POST', true], 'due-pay': [`/api/v1/planning/due-events/${target?.id}/pay`, 'POST', true], 'due-reschedule': [`/api/v1/planning/due-events/${target?.id}/reschedule`, 'POST', false], 'due-skip': [`/api/v1/planning/due-events/${target?.id}/skip`, 'POST', false], 'scenario-create': ['/api/v1/planning/scenarios', 'POST', false], 'scenario-edit': [`/api/v1/planning/scenarios/${target?.id}`, 'PATCH', false], 'simulation-create': ['/api/v1/planning/simulations', 'POST', false], 'simulation-edit': [`/api/v1/planning/simulations/${target?.id}`, 'PATCH', false],
    }
    try {
      await planningCommand(command[action][0], command[action][1], data, command[action][2] ? key : undefined)
      setOpen(false)
      onSuccess()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The change could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const fields = () => {
    if (action === 'budget-create') return <><>{searchable('entity_id', entities)}{searchable('financial_category_id', categories)}</>{input('name', 'Budget name')}{select('period_type', 'Period', [['weekly', 'Weekly'], ['monthly', 'Monthly'], ['custom', 'Custom']])}{input('amount', 'Initial limit (UGX)', 'number', true, 'Whole shillings. Spending stays ledger-derived.')}{input('starts_on', 'Starts on', 'date')}{input('ends_on', 'Ends on', 'date')}</>
    if (action === 'budget-adjust') return <>{input('amount_delta', 'Adjustment (UGX)', 'number', true, 'Use a positive amount to add room or a negative amount to reduce it.')}{input('effective_on', 'Effective on', 'date')}<Form.Group className="mb-3"><Form.Label>Reason</Form.Label><Form.Control as="textarea" required rows={3} value={String(form.reason ?? '')} onChange={(event) => set('reason', event.target.value)} /></Form.Group></>
    if (action === 'obligation-create') return <><>{searchable('entity_id', entities)}{searchable('financial_category_id', categories)}{searchable('default_financial_account_id', accounts, false)}</>{input('title', 'Obligation title')}{input('payee_name', 'Payee or lender')}{input('amount', 'Expected amount (UGX)', 'number', true, 'This creates a forecast, not a cash movement.')}{select('priority', 'Priority', [['essential', 'Essential'], ['high', 'High'], ['normal', 'Normal'], ['optional', 'Optional']])}{select('frequency', 'Frequency', [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['quarterly', 'Quarterly'], ['yearly', 'Yearly']])}{input('interval_count', 'Every N periods', 'number')}{input('initial_due_on', 'First due date', 'date')}{input('starts_on', 'Generate from', 'date')}{input('grace_days', 'Grace days', 'number')}{select('month_day_policy', 'Short-month rule', [['last_valid_day', 'Last valid day'], ['last_day', 'Month end']])}{select('weekend_policy', 'Weekend rule', [['keep', 'Keep exact date'], ['previous_business_day', 'Previous business day'], ['next_business_day', 'Next business day']])}{input('reference', 'Reference', 'text', false)}<Form.Group className="mb-3"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} value={String(form.description ?? '')} onChange={(event) => set('description', event.target.value)} /></Form.Group></>
    if (action === 'reserve-create') return <><>{searchable('entity_id', entities)}{searchable('recurring_obligation_id', obligations, false)}</>{input('name', 'Reserve name')}{input('target_amount', 'Target amount (UGX)', 'number', false)}{input('target_on', 'Target date', 'date', false)}{select('priority', 'Priority', [['essential', 'Essential'], ['high', 'High'], ['normal', 'Normal'], ['optional', 'Optional']])}{select('status', 'Status', [['active', 'Active'], ['paused', 'Paused']])}<Form.Group className="mb-3"><Form.Label>Purpose</Form.Label><Form.Control as="textarea" rows={2} value={String(form.purpose ?? '')} onChange={(event) => set('purpose', event.target.value)} /></Form.Group></>
    if (action === 'reserve-fund' || action === 'reserve-release' || action === 'due-pay') return <>{searchable('financial_account_id', accounts)}{input('amount', 'Amount (UGX)', 'number', true, 'Whole shillings only.')}{action === 'due-pay' && input('occurred_at', 'Paid at', 'datetime-local')}<Form.Group className="mb-3"><Form.Label>Note</Form.Label><Form.Control as="textarea" rows={2} value={String(form.note ?? '')} onChange={(event) => set('note', event.target.value)} /></Form.Group></>
    if (action === 'due-reschedule') return <>{input('due_on', 'New due date', 'date')}<Form.Group className="mb-3"><Form.Label>Reason</Form.Label><Form.Control as="textarea" required rows={3} value={String(form.reason ?? '')} onChange={(event) => set('reason', event.target.value)} /></Form.Group></>
    if (action === 'due-skip') return <Form.Group className="mb-3"><Form.Label>Reason</Form.Label><Form.Control as="textarea" required rows={3} value={String(form.reason ?? '')} onChange={(event) => set('reason', event.target.value)} /></Form.Group>
    if (action === 'scenario-create' || action === 'scenario-edit') return <><>{action === 'scenario-create' && searchable('entity_id', entities)}</>{input('name', 'Scenario name')}{select('kind', 'Scenario type', [['expected', 'Expected'], ['conservative', 'Conservative'], ['optimistic', 'Optimistic']])}{input('collection_reliability_basis_points', 'Collection reliability (basis points)', 'number')}{input('irregular_income_daily', 'Daily irregular income (UGX)', 'number')}{input('repair_buffer_daily', 'Daily repair buffer (UGX)', 'number')}{input('emergency_reserve', 'Emergency reserve (UGX)', 'number')}<Form.Check type="switch" label="Use as active scenario" checked={Boolean(form.is_active)} onChange={(event) => set('is_active', event.target.checked)} /></>
    return <><>{action === 'simulation-create' && searchable('entity_id', entities)}</>{input('name', 'Simulation name')}{input('deposit', 'Deposit (UGX)', 'number')}{input('weekly_loan_payment', 'Weekly loan payment (UGX)', 'number', false)}{input('expected_weekly_collections', 'Expected weekly collections (UGX)', 'number', false)}{input('repair_buffer_weekly', 'Weekly repair buffer (UGX)', 'number')}{input('lender_settlement_quote', 'Lender settlement quote (UGX)', 'number', false)}{input('quote_valid_until', 'Quote valid until', 'date', false)}</>
  }

  return <><Button size="sm" variant={action.includes('skip') || action.includes('release') ? 'light' : 'primary'} onClick={() => { setForm(initial(action, target)); setError(null); setOpen(true) }}>{action.includes('create') ? 'Create' : action.includes('adjust') ? 'Adjust' : action.includes('fund') ? 'Fund' : action.includes('release') ? 'Release' : action.includes('pay') ? 'Pay' : action.includes('reschedule') ? 'Reschedule' : action.includes('skip') ? 'Skip' : 'Edit'}</Button><Modal show={open} onHide={() => !saving && setOpen(false)} centered><Form onSubmit={submit}><Modal.Header closeButton><Modal.Title>{title[action]}</Modal.Title></Modal.Header><Modal.Body>{error && <div className="alert alert-danger">{error}</div>}{fields()}</Modal.Body><Modal.Footer><Button variant="light" type="button" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></Modal.Footer></Form></Modal></>
}

export default PlanningCommandModal
