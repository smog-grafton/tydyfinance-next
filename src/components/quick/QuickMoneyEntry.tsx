'use client'

import { ApiError, getQuickAccessContext, recordQuickExpense, recordQuickIncome } from '@/lib/api/client'
import type { QuickAccessContext, QuickAccessOperation } from '@/lib/api/types'
import { formatUGX, kampalaDateInput } from '@/lib/formatters'
import { useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import { Alert, Button, Form } from 'react-bootstrap'
import QuickShell from './QuickShell'

type Option = { value: string; label: string }
const requestError = (error: unknown) => error instanceof ApiError ? (Object.values(error.errors ?? {}).flat()[0] ?? error.message) : 'Unable to record this transaction.'

const QuickMoneyEntry = ({ operation }: { operation: Extract<QuickAccessOperation, 'income' | 'expense'> }) => {
  const [context, setContext] = useState<QuickAccessContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [complete, setComplete] = useState<{ amount: number; account: string; reference: string | null } | null>(null)
  const [form, setForm] = useState({ account: '', category: '', amount: '', occurredAt: kampalaDateInput(), description: '', reference: '', counterparty: '' })

  useEffect(() => {
    void getQuickAccessContext(operation)
      .then((data) => {
        setContext(data)
        if (data.accounts.length === 1) setForm((current) => ({ ...current, account: String(data.accounts[0].id) }))
      })
      .catch((caught) => setError(requestError(caught)))
      .finally(() => setLoading(false))
  }, [operation])

  const accounts = useMemo<Option[]>(() => (context?.accounts ?? []).map((account) => ({ value: String(account.id), label: `${account.name} · ${account.entity}` })), [context])
  const entityId = context?.accounts.find((account) => String(account.id) === form.account)?.entity_id
  const categories = useMemo<Option[]>(() => (context?.categories ?? []).filter((category) => !entityId || category.entity_id === entityId).map((category) => ({ value: String(category.id), label: category.name })), [context, entityId])
  const label = operation === 'income' ? 'Income' : 'Expense'

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = operation === 'income'
        ? await recordQuickIncome({ financial_account_id: Number(form.account), financial_category_id: Number(form.category), amount: Number(form.amount), occurred_at: form.occurredAt, description: form.description || undefined, reference: form.reference || undefined, counterparty_name: form.counterparty || undefined }, crypto.randomUUID())
        : await recordQuickExpense({ financial_account_id: Number(form.account), financial_category_id: Number(form.category), amount: Number(form.amount), occurred_at: form.occurredAt, description: form.description || undefined, reference: form.reference || undefined, counterparty_name: form.counterparty || undefined }, crypto.randomUUID())
      setComplete({ amount: response.data.amount, account: response.data.account, reference: response.data.reference })
    } catch (caught) {
      setError(requestError(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <QuickShell title={`Record ${label}`} subtitle={operation === 'income' ? 'Record an earned cash receipt to a permitted account.' : 'Record a real business or personal expense from a permitted account.'} context={context} loading={loading} error={error}>
      {complete ? (
        <Alert variant="success" className="mb-0">
          <h5 className="alert-heading">{label} recorded</h5>
          <p className="mb-1">{formatUGX(complete.amount)} was recorded against {complete.account}.</p>
          {complete.reference && <small>Reference: {complete.reference}</small>}
          <div><Button className="mt-3" onClick={() => { setComplete(null); setForm((current) => ({ ...current, amount: '', description: '', reference: '', counterparty: '' })) }}>Record another</Button></div>
        </Alert>
      ) : (
        <Form onSubmit={submit}>
          <Form.Group className="mb-3"><Form.Label className="fw-semibold">Amount received (UGX)</Form.Label><Form.Control type="number" inputMode="numeric" min="1" step="1" required autoFocus value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Form.Group>
          <Form.Group className="mb-3"><Form.Label className="fw-semibold">{operation === 'income' ? 'Receiving' : 'Paying'} account</Form.Label><Select classNamePrefix="react-select" options={accounts} value={accounts.find((option) => option.value === form.account) ?? null} onChange={(option) => setForm({ ...form, account: option?.value ?? '', category: '' })} placeholder="Search account" /></Form.Group>
          <Form.Group className="mb-3"><Form.Label className="fw-semibold">{operation === 'income' ? 'Income' : 'Expense'} category</Form.Label><Select classNamePrefix="react-select" options={categories} value={categories.find((option) => option.value === form.category) ?? null} onChange={(option) => setForm({ ...form, category: option?.value ?? '' })} placeholder={form.account ? 'Search category' : 'Choose an account first'} isDisabled={!form.account} /></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Date</Form.Label><Form.Control type="date" required value={form.occurredAt} onChange={(event) => setForm({ ...form, occurredAt: event.target.value })} /></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Description <span className="text-muted">(optional)</span></Form.Label><Form.Control value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={operation === 'income' ? 'What was received for?' : 'What was paid for?'} /></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Reference <span className="text-muted">(optional)</span></Form.Label><Form.Control value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="Receipt, mobile-money or invoice reference" /></Form.Group>
          <Form.Group className="mb-4"><Form.Label>Counterparty <span className="text-muted">(optional)</span></Form.Label><Form.Control value={form.counterparty} onChange={(event) => setForm({ ...form, counterparty: event.target.value })} /></Form.Group>
          <Button type="submit" size="lg" className="w-100" disabled={saving || !form.account || !form.category || !form.amount}>{saving ? 'Saving…' : `Record ${label}`}</Button>
        </Form>
      )}
    </QuickShell>
  )
}

export default QuickMoneyEntry
