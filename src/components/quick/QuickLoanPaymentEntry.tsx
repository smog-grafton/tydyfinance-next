'use client'

import { ApiError, getQuickAccessContext, recordQuickLoanPayment } from '@/lib/api/client'
import type { QuickAccessContext } from '@/lib/api/types'
import { formatUGX, kampalaDateInput } from '@/lib/formatters'
import { useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import { Alert, Button, Form } from 'react-bootstrap'
import QuickShell from './QuickShell'

type Option = { value: string; label: string }
const requestError = (error: unknown) => error instanceof ApiError ? (Object.values(error.errors ?? {}).flat()[0] ?? error.message) : 'Unable to record the lender payment.'

const QuickLoanPaymentEntry = () => {
  const [context, setContext] = useState<QuickAccessContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [complete, setComplete] = useState<{ amount: number; agreement: string; account: string; status: string } | null>(null)
  const [form, setForm] = useState({ agreement: '', account: '', amount: '', paidAt: kampalaDateInput() })

  useEffect(() => {
    void getQuickAccessContext('loan-payment').then(setContext).catch((caught) => setError(requestError(caught))).finally(() => setLoading(false))
  }, [])

  const agreements = useMemo<Option[]>(() => (context?.agreements ?? []).map((agreement) => ({ value: String(agreement.id), label: `${agreement.vehicle} · ${agreement.reference} · ${agreement.lender}` })), [context])
  const selected = context?.agreements?.find((agreement) => String(agreement.id) === form.agreement)
  const accounts = useMemo<Option[]>(() => (context?.accounts ?? []).filter((account) => !selected || account.entity_id === selected.entity_id).map((account) => ({ value: String(account.id), label: `${account.name} · ${account.entity}` })), [context, selected])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const result = await recordQuickLoanPayment({ finance_agreement_id: Number(form.agreement), financial_account_id: Number(form.account), amount: Number(form.amount), paid_at: form.paidAt }, crypto.randomUUID())
      setComplete(result.data)
    } catch (caught) {
      setError(requestError(caught))
    } finally {
      setSaving(false)
    }
  }

  return <QuickShell title="Record loan repayment" subtitle="Post an actual lender payment against a permitted contractual agreement." context={context} loading={loading} error={error}>
    {complete ? <Alert variant="success" className="mb-0"><h5 className="alert-heading">Lender payment recorded</h5><p className="mb-1">{formatUGX(complete.amount)} was posted from {complete.account} to {complete.agreement}.</p><small>Status: {complete.status.replaceAll('_', ' ')}</small><div><Button className="mt-3" onClick={() => { setComplete(null); setForm((current) => ({ ...current, amount: '' })) }}>Record another</Button></div></Alert> : <Form onSubmit={submit}>
      <Form.Group className="mb-3"><Form.Label className="fw-semibold">Loan agreement</Form.Label><Select classNamePrefix="react-select" options={agreements} value={agreements.find((option) => option.value === form.agreement) ?? null} onChange={(option) => setForm({ ...form, agreement: option?.value ?? '', account: '', amount: '' })} placeholder="Search vehicle or lender" /></Form.Group>
      {selected && <Alert variant="light" className="border small"><div className="fw-semibold">{selected.vehicle} · {selected.lender}</div>{selected.next_installment ? <><div className="mt-1">Next due: {selected.next_installment.due_on}</div><div>Outstanding: {formatUGX(selected.next_installment.outstanding)}</div></> : <div className="mt-1">No unpaid contractual installment is available.</div>}</Alert>}
      <Form.Group className="mb-3"><Form.Label className="fw-semibold">Paying account</Form.Label><Select classNamePrefix="react-select" options={accounts} value={accounts.find((option) => option.value === form.account) ?? null} onChange={(option) => setForm({ ...form, account: option?.value ?? '' })} placeholder={selected ? 'Search payment account' : 'Choose an agreement first'} isDisabled={!selected} /></Form.Group>
      <Form.Group className="mb-3"><Form.Label className="fw-semibold">Actual payment (UGX)</Form.Label><Form.Control type="number" inputMode="numeric" min="1" step="1" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Form.Group>
      <Form.Group className="mb-4"><Form.Label>Payment date</Form.Label><Form.Control type="date" required value={form.paidAt} onChange={(event) => setForm({ ...form, paidAt: event.target.value })} /></Form.Group>
      <Alert variant="info" className="small">Tydy allocates a verified schedule oldest-first. If the lender has not supplied component details, the payment stays in the approved pending-allocation treatment rather than inventing principal or interest.</Alert>
      <Button type="submit" size="lg" className="w-100" disabled={saving || !selected || !form.account || !form.amount}>{saving ? 'Posting…' : 'Confirm loan payment'}</Button>
    </Form>}
  </QuickShell>
}

export default QuickLoanPaymentEntry
