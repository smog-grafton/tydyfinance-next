'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { ApiError, createQuickAccessCredential, getFinanceSetupForClient, getQuickAccessCredentials, revokeQuickAccessCredential, rotateQuickAccessCredential } from '@/lib/api/client'
import type { FinanceSetupData, QuickAccessCredential } from '@/lib/api/types'
import { useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Row, Table } from 'react-bootstrap'

type Option = { value: string; label: string }
const scopes = [
  { value: 'quick:income:create', label: 'Quick Income' },
  { value: 'quick:expense:create', label: 'Quick Expense' },
  { value: 'quick:loan-payment:create', label: 'Quick Loan Repayment' },
  { value: 'quick:remittance:create', label: 'Quick Remittance' },
]
const routeForScope: Record<string, string> = {
  'quick:income:create': 'quick-income',
  'quick:expense:create': 'quick-expense',
  'quick:loan-payment:create': 'quick-loan-repayment',
  'quick:remittance:create': 'quick-remittance',
}
const errorText = (error: unknown) => error instanceof ApiError ? (Object.values(error.errors ?? {}).flat()[0] ?? error.message) : 'Unable to update Quick Access.'
const date = (value: string | null) => value ? new Intl.DateTimeFormat('en-UG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Kampala' }).format(new Date(value)) : 'Never'

const QuickAccessSettings = () => {
  const [credentials, setCredentials] = useState<QuickAccessCredential[]>([])
  const [setup, setSetup] = useState<FinanceSetupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newCredential, setNewCredential] = useState<QuickAccessCredential | null>(null)
  const [form, setForm] = useState({ displayName: '', scopes: [] as string[], entityIds: [] as string[], expiresAt: '', dailyLimit: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [nextCredentials, nextSetup] = await Promise.all([getQuickAccessCredentials(), getFinanceSetupForClient()])
      setCredentials(nextCredentials)
      setSetup(nextSetup)
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  const entityOptions = useMemo<Option[]>(() => (setup?.entities ?? []).filter((entity) => entity.is_active).map((entity) => ({ value: String(entity.id), label: `${entity.name} · ${entity.type}` })), [setup])
  const links = newCredential?.token ? newCredential.scopes.map((scope) => `${window.location.origin}/${routeForScope[scope]}/${newCredential.token}`) : []

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true); setError(null)
    try {
      const credential = await createQuickAccessCredential({ display_name: form.displayName, scopes: form.scopes, entity_ids: form.entityIds.map(Number), expires_at: form.expiresAt || null, daily_transaction_limit: form.dailyLimit ? Number(form.dailyLimit) : null })
      setNewCredential(credential)
      setForm({ displayName: '', scopes: [], entityIds: [], expiresAt: '', dailyLimit: '' })
      await load()
    } catch (caught) { setError(errorText(caught)) } finally { setSaving(false) }
  }
  const rotate = async (credentialId: number) => {
    setSaving(true); setError(null)
    try { setNewCredential(await rotateQuickAccessCredential(credentialId)); await load() } catch (caught) { setError(errorText(caught)) } finally { setSaving(false) }
  }
  const revoke = async (credentialId: number) => {
    if (!window.confirm('Revoke this link and all sessions created from it? This cannot be undone.')) return
    setSaving(true); setError(null)
    try { await revokeQuickAccessCredential(credentialId); await load() } catch (caught) { setError(errorText(caught)) } finally { setSaving(false) }
  }

  return <>
    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4"><div><h3 className="mb-1">Quick Access</h3><p className="text-muted mb-0">Create narrow, revocable phone-entry links without granting dashboard access.</p></div><Badge bg="light" text="dark" className="p-2">Owner-only security setting</Badge></div>
    {error && <Alert variant="danger">{error}</Alert>}
    {newCredential?.token && <Alert variant="success"><h5 className="alert-heading">Copy the secure link now</h5><p className="mb-2">For security, the full credential cannot be viewed again after this screen closes. Rotation replaces the old link and ends its active quick sessions.</p>{links.map((link) => <div className="input-group mb-2" key={link}><Form.Control readOnly value={link} aria-label="New quick access link" /><Button variant="outline-success" onClick={() => void navigator.clipboard.writeText(link)}>Copy</Button></div>)}<Button size="sm" variant="link" className="px-0" onClick={() => setNewCredential(null)}>I have copied the link</Button></Alert>}
    <Row className="g-4"><Col xl={5}><Card><CardHeader><CardTitle as="h4" className="mb-0">Create secure link</CardTitle></CardHeader><CardBody><Form onSubmit={create}><Form.Group className="mb-3"><Form.Label>Display name</Form.Label><Form.Control required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="e.g. Owner’s income phone" /></Form.Group><Form.Group className="mb-3"><Form.Label>Allowed quick pages</Form.Label><Select classNamePrefix="react-select" isMulti options={scopes} value={scopes.filter((scope) => form.scopes.includes(scope.value))} onChange={(options) => setForm({ ...form, scopes: options.map((option) => option.value) })} placeholder="Choose permitted actions" /></Form.Group><Form.Group className="mb-3"><Form.Label>Permitted financial entities</Form.Label><Select classNamePrefix="react-select" isMulti options={entityOptions} value={entityOptions.filter((entity) => form.entityIds.includes(entity.value))} onChange={(options) => setForm({ ...form, entityIds: options.map((option) => option.value) })} placeholder="Search entities" /></Form.Group><Row><Col md={6}><Form.Group className="mb-3"><Form.Label>Expires at <span className="text-muted">(optional)</span></Form.Label><Form.Control type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></Form.Group></Col><Col md={6}><Form.Group className="mb-3"><Form.Label>Daily cap (UGX) <span className="text-muted">(optional)</span></Form.Label><Form.Control type="number" inputMode="numeric" min="1" step="1" value={form.dailyLimit} onChange={(event) => setForm({ ...form, dailyLimit: event.target.value })} /></Form.Group></Col></Row><Alert variant="info" className="small">The link is a bearer credential: share it only through a safe channel. It exchanges into an eight-hour limited cookie session and never exposes the admin navigation.</Alert><Button type="submit" disabled={saving || !form.displayName || form.scopes.length === 0 || form.entityIds.length === 0}><IconifyIcon icon="solar:link-circle-bold-duotone" className="me-1" />{saving ? 'Creating…' : 'Create quick link'}</Button></Form></CardBody></Card></Col>
      <Col xl={7}><Card><CardHeader><CardTitle as="h4" className="mb-0">Issued links</CardTitle></CardHeader><CardBody className="pt-0">{loading ? <div className="py-5 text-center text-muted">Loading credentials…</div> : <div className="table-responsive"><Table hover className="mb-0"><thead className="table-light"><tr><th>Link</th><th>Scopes</th><th>Last used</th><th>Expires</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{credentials.length ? credentials.map((credential) => <tr key={credential.id}><td><span className="fw-semibold d-block">{credential.display_name}</span><small className="text-muted">{credential.token_hint}</small></td><td>{credential.scopes.map((scope) => <Badge bg="light" text="dark" className="me-1 mb-1" key={scope}>{scopes.find((item) => item.value === scope)?.label ?? scope}</Badge>)}</td><td>{date(credential.last_used_at)}</td><td>{date(credential.expires_at)}</td><td>{credential.revoked_at ? <Badge bg="secondary">Revoked</Badge> : <Badge bg="success">Active</Badge>}</td><td className="text-end">{!credential.revoked_at && <><Button size="sm" variant="light" onClick={() => void rotate(credential.id)} disabled={saving}>Rotate</Button><Button size="sm" variant="light" className="ms-1 text-danger" onClick={() => void revoke(credential.id)} disabled={saving}>Revoke</Button></>}</td></tr>) : <tr><td colSpan={6} className="py-5 text-center text-muted">No Quick Access links have been issued.</td></tr>}</tbody></Table></div>}</CardBody></Card></Col></Row>
  </>
}

export default QuickAccessSettings
