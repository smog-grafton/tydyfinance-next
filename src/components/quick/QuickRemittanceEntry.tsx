'use client'

import { ApiError, getQuickAccessContext, getQuickRemittanceContext, recordQuickRemittance, searchQuickRemittanceDrivers } from '@/lib/api/client'
import type { QuickAccessContext, QuickDriverSearchResult, QuickRemittanceContext } from '@/lib/api/types'
import { formatUGX, kampalaDateInput } from '@/lib/formatters'
import { useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import QuickShell from './QuickShell'

type Option = { value: string; label: string }
const requestError = (error: unknown) => error instanceof ApiError ? (Object.values(error.errors ?? {}).flat()[0] ?? error.message) : 'Unable to record this remittance.'

const QuickRemittanceEntry = () => {
  const [context, setContext] = useState<QuickAccessContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [drivers, setDrivers] = useState<QuickDriverSearchResult[]>([])
  const [selectedDriver, setSelectedDriver] = useState<QuickDriverSearchResult | null>(null)
  const [driverContext, setDriverContext] = useState<QuickRemittanceContext | null>(null)
  const [saving, setSaving] = useState(false)
  const [complete, setComplete] = useState<{ amount: number; driver: string; account: string; status: string } | null>(null)
  const [form, setForm] = useState({ account: '', amount: '', receivedAt: kampalaDateInput(), reference: '' })

  useEffect(() => { void getQuickAccessContext('remittance').then((data) => { setContext(data); if (data.accounts.length === 1) setForm((current) => ({ ...current, account: String(data.accounts[0].id) })) }).catch((caught) => setError(requestError(caught))).finally(() => setLoading(false)) }, [])
  const accounts = useMemo<Option[]>(() => (context?.accounts ?? []).filter((account) => !driverContext || account.entity_id === driverContext.entity_id).map((account) => ({ value: String(account.id), label: `${account.name} · ${account.entity}` })), [context, driverContext])
  const driverOptions = drivers.map((driver) => ({ value: String(driver.id), label: `${driver.driver} · ${driver.vehicle ?? 'No active vehicle'} · ${driver.contract}` }))

  const search = async (value: string) => {
    if (value.trim().length < 2) { setDrivers([]); return }
    setSearching(true)
    try { setDrivers(await searchQuickRemittanceDrivers(value)) } catch (caught) { setError(requestError(caught)) } finally { setSearching(false) }
  }
  const chooseDriver = async (id: string) => {
    const driver = drivers.find((item) => String(item.id) === id) ?? null
    setSelectedDriver(driver)
    setDriverContext(null)
    if (!driver) return
    try {
      const data = await getQuickRemittanceContext(driver.id)
      const receiptAccounts = (context?.accounts ?? []).filter((account) => account.entity_id === data.entity_id)
      setDriverContext(data)
      setForm((current) => ({
        ...current,
        account: receiptAccounts.some((account) => String(account.id) === current.account) ? current.account : String(receiptAccounts[0]?.id ?? ''),
        amount: current.amount || String(data.today_due || data.expected_remittance),
      }))
      if (!receiptAccounts.length) setError('No active receipt account is configured for this driver contract. Add one to its operating entity, then reopen this link.')
    } catch (caught) { setError(requestError(caught)) }
  }
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedDriver || !accounts.some((account) => account.value === form.account)) {
      setError('Choose an active receipt account for this driver contract.')
      return
    }
    setSaving(true); setError(null)
    try { const result = await recordQuickRemittance({ driver_contract_id: selectedDriver.id, financial_account_id: Number(form.account), amount: Number(form.amount), received_at: form.receivedAt, reference: form.reference || undefined }, crypto.randomUUID()); setComplete(result.data) } catch (caught) { setError(requestError(caught)) } finally { setSaving(false) }
  }

  return <QuickShell title="Record driver remittance" subtitle="Find an active driver, review current dues, then record the actual cash received." context={context} loading={loading} error={error}>
    {complete ? <Alert variant="success" className="mb-0"><h5 className="alert-heading">Remittance recorded</h5><p className="mb-1">{formatUGX(complete.amount)} from {complete.driver} was received into {complete.account}.</p><small>Status: {complete.status.replaceAll('_', ' ')}</small><div><Button className="mt-3" onClick={() => { setComplete(null); setSelectedDriver(null); setDriverContext(null); setForm((current) => ({ ...current, amount: '', reference: '' })) }}>Record another payment</Button></div></Alert> : <Form onSubmit={submit}>
      <Form.Group className="mb-3"><Form.Label className="fw-semibold">Search driver</Form.Label><Select classNamePrefix="react-select" options={driverOptions} value={selectedDriver ? driverOptions.find((option) => option.value === String(selectedDriver.id)) ?? null : null} onInputChange={(value, meta) => { if (meta.action === 'input-change') void search(value) }} onChange={(option) => void chooseDriver(option?.value ?? '')} placeholder="Name, phone, contract or vehicle" noOptionsMessage={() => searching ? 'Searching…' : 'Type at least two characters'} /></Form.Group>
      {searching && <div className="text-center py-2"><Spinner size="sm" /> <small className="text-muted ms-1">Searching permitted active drivers…</small></div>}
      {driverContext && <Alert variant="light" className="border small"><div className="fw-semibold">{driverContext.driver}</div><div>{driverContext.vehicle ?? 'No active vehicle'} · {driverContext.contract}</div><hr /><div className="d-flex justify-content-between"><span>Expected remittance</span><strong>{formatUGX(driverContext.expected_remittance)}</strong></div><div className="d-flex justify-content-between"><span>Today due</span><strong>{formatUGX(driverContext.today_due)}</strong></div><div className="d-flex justify-content-between text-danger"><span>Arrears</span><strong>{formatUGX(driverContext.arrears)}</strong></div><div className="d-flex justify-content-between"><span>Unapplied credit</span><strong>{formatUGX(driverContext.unapplied_credit)}</strong></div>{driverContext.last_payment && <div className="mt-2 text-muted">Last receipt: {formatUGX(driverContext.last_payment.amount)} · {driverContext.last_payment.received_at.slice(0, 10)}</div>}</Alert>}
      <Form.Group className="mb-3"><Form.Label className="fw-semibold">Receiving account</Form.Label><Select classNamePrefix="react-select" options={accounts} value={accounts.find((option) => option.value === form.account) ?? null} onChange={(option) => setForm({ ...form, account: option?.value ?? '' })} placeholder="Search receipt account" /></Form.Group>
      <Form.Group className="mb-3"><Form.Label className="fw-semibold">Amount received (UGX)</Form.Label><Form.Control type="number" inputMode="numeric" min="1" step="1" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Form.Group>
      <Form.Group className="mb-3"><Form.Label>Received on</Form.Label><Form.Control type="date" required value={form.receivedAt} onChange={(event) => setForm({ ...form, receivedAt: event.target.value })} /></Form.Group>
      <Form.Group className="mb-4"><Form.Label>Payment reference <span className="text-muted">(optional)</span></Form.Label><Form.Control value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="Mobile-money or receipt reference" /></Form.Group>
      <Alert variant="info" className="small">Tydy posts the cash once, allocates due remittances oldest-first, then runs any approved vehicle-loan reserve policy. A reserve allocation is not another income or lender payment.</Alert>
      <Button type="submit" size="lg" className="w-100" disabled={saving || !selectedDriver || !driverContext || !accounts.some((account) => account.value === form.account) || !form.amount}>{saving ? 'Recording…' : 'Record remittance'}</Button>
    </Form>}
  </QuickShell>
}

export default QuickRemittanceEntry
