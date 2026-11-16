'use client'

import {
  ApiError,
  createFinancialAccount,
  createFinancialEntity,
  createLedgerAccount,
  updateFinancialAccount,
  updateFinancialEntity,
  updateLedgerAccount,
} from '@/lib/api/client'
import type { FinanceSetupData } from '@/lib/api/types'
import { useEffect, useState } from 'react'
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap'

type EntityRecord = FinanceSetupData['entities'][number]
type LedgerAccountRecord = FinanceSetupData['ledger_accounts'][number]
type FinancialAccountRecord = FinanceSetupData['financial_accounts'][number]

export type FinanceSetupEditor =
  | { kind: 'entity'; record?: EntityRecord }
  | { kind: 'ledger'; record?: LedgerAccountRecord }
  | { kind: 'account'; record?: FinancialAccountRecord }

type FinanceSetupEditorModalProps = {
  show: boolean
  editor: FinanceSetupEditor | null
  setup: FinanceSetupData
  onHide: () => void
  onSaved: () => void
}

type FormState = {
  entityId: string
  ledgerAccountId: string
  name: string
  entityType: EntityRecord['type']
  accountCode: string
  ledgerAccountType: LedgerAccountRecord['account_type']
  financialAccountType: FinancialAccountRecord['account_type']
  institution: string
  referenceHint: string
  isActive: boolean
}

const initialForm = (editor: FinanceSetupEditor | null): FormState => {
  if (editor?.kind === 'entity') {
    const entity = editor.record

    return {
      entityId: '', ledgerAccountId: '', name: entity?.name ?? '', entityType: entity?.type ?? 'business', accountCode: '', ledgerAccountType: 'asset', financialAccountType: 'cash', institution: '', referenceHint: '', isActive: entity?.is_active ?? true,
    }
  }

  if (editor?.kind === 'ledger') {
    const ledger = editor.record
    return {
      entityId: ledger ? String(ledger.entity_id) : '', ledgerAccountId: '', name: ledger?.name ?? '', entityType: 'business', accountCode: ledger?.code ?? '', ledgerAccountType: ledger?.account_type ?? 'asset', financialAccountType: 'cash', institution: '', referenceHint: '', isActive: ledger?.is_active ?? true,
    }
  }

  const account = editor?.kind === 'account' ? editor.record : undefined
  return {
    entityId: account ? String(account.entity_id) : '', ledgerAccountId: account ? String(account.ledger_account_id) : '', name: account?.name ?? '', entityType: 'business', accountCode: '', ledgerAccountType: 'asset', financialAccountType: account?.account_type ?? 'cash', institution: account?.institution ?? '', referenceHint: account?.reference_hint ?? '', isActive: account?.is_active ?? true,
  }
}

const titleFor = (editor: FinanceSetupEditor): string => {
  const action = editor.record ? 'Edit' : 'Add'
  return `${action} ${editor.kind === 'entity' ? 'financial entity' : editor.kind === 'ledger' ? 'chart account' : 'financial account'}`
}

const optional = (value: string): string | null => (value.trim() === '' ? null : value.trim())

const FinanceSetupEditorModal = ({ show, editor, setup, onHide, onSaved }: FinanceSetupEditorModalProps) => {
  const [form, setForm] = useState<FormState>(() => initialForm(editor))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!show) return
    setForm(initialForm(editor))
    setError(null)
  }, [editor, show])

  if (!editor) return null

  const isEdit = Boolean(editor.record)
  const setValue = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => setForm((current) => ({ ...current, [key]: value }))
  const activeEntities = setup.entities.filter((entity) => entity.is_active || entity.id === Number(form.entityId))
  const eligibleLedgers = setup.ledger_accounts.filter((account) => account.entity_id === Number(form.entityId) && account.account_type === 'asset' && (account.is_active || account.id === Number(form.ledgerAccountId)))

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      if (editor.kind === 'entity') {
        if (!form.name.trim()) throw new Error('Enter the financial entity name.')
        if (editor.record) {
          await updateFinancialEntity(editor.record.id, { name: form.name.trim(), is_active: form.isActive })
        } else {
          await createFinancialEntity({ name: form.name.trim(), type: form.entityType, is_active: form.isActive })
        }
      }

      if (editor.kind === 'ledger') {
        if (!form.name.trim() || (!editor.record && (!form.entityId || !form.accountCode.trim()))) {
          throw new Error('Choose an entity and enter an account code and name.')
        }
        if (editor.record) {
          await updateLedgerAccount(editor.record.id, { name: form.name.trim(), is_active: form.isActive })
        } else {
          await createLedgerAccount({
            entity_id: Number(form.entityId),
            code: form.accountCode.trim(),
            name: form.name.trim(),
            account_type: form.ledgerAccountType,
            is_active: form.isActive,
          })
        }
      }

      if (editor.kind === 'account') {
        if (!form.name.trim() || (!editor.record && (!form.entityId || !form.ledgerAccountId))) {
          throw new Error('Choose an entity, an asset ledger account, and an account name.')
        }
        if (editor.record) {
          await updateFinancialAccount(editor.record.id, {
            name: form.name.trim(), institution: optional(form.institution), reference_hint: optional(form.referenceHint), is_active: form.isActive,
          })
        } else {
          await createFinancialAccount({
            entity_id: Number(form.entityId), ledger_account_id: Number(form.ledgerAccountId), name: form.name.trim(), account_type: form.financialAccountType,
            institution: optional(form.institution), reference_hint: optional(form.referenceHint), is_active: form.isActive,
          })
        }
      }

      onSaved()
      onHide()
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(Object.values(requestError.errors ?? {}).flat()[0] ?? requestError.message)
      } else {
        setError(requestError instanceof Error ? requestError.message : 'Unable to save this finance setup record.')
      }
    } finally {
      setLoading(false)
    }
  }

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    setLoading(true)
    await submit(event)
  }

  return (
    <Modal show={show} onHide={loading ? undefined : onHide} centered>
      <Form onSubmit={save}>
        <Modal.Header closeButton={!loading}>
          <Modal.Title>{titleFor(editor)}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {editor.kind === 'entity' && (
            <Row className="g-3">
              <Col xs={12}><Form.Label>Entity name</Form.Label><Form.Control value={form.name} onChange={(event) => setValue('name', event.target.value)} disabled={loading} required /></Col>
              <Col md={6}>
                <Form.Label>Financial boundary</Form.Label>
                <Form.Select value={form.entityType} onChange={(event) => setValue('entityType', event.target.value as EntityRecord['type'])} disabled={loading || isEdit}>
                  <option value="business">Business</option><option value="personal">Personal</option>
                </Form.Select>
              </Col>
              <Col md={6}><Form.Label>Currency</Form.Label><Form.Control value="UGX" disabled /></Col>
              {isEdit && <Col xs={12}><Alert variant="light" className="mb-0">Financial boundary and currency are fixed after creation. Create a separate entity instead of changing financial history.</Alert></Col>}
            </Row>
          )}
          {editor.kind === 'ledger' && (
            <Row className="g-3">
              <Col xs={12}>
                <Form.Label>Financial entity</Form.Label>
                <Form.Select value={form.entityId} onChange={(event) => setValue('entityId', event.target.value)} disabled={loading || isEdit} required>
                  <option value="">Select an active entity</option>{activeEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                </Form.Select>
              </Col>
              <Col md={5}><Form.Label>Account code</Form.Label><Form.Control value={form.accountCode} onChange={(event) => setValue('accountCode', event.target.value)} disabled={loading || isEdit} maxLength={40} required /></Col>
              <Col md={7}><Form.Label>Account name</Form.Label><Form.Control value={form.name} onChange={(event) => setValue('name', event.target.value)} disabled={loading} required /></Col>
              <Col xs={12}>
                <Form.Label>Account class</Form.Label>
                <Form.Select value={form.ledgerAccountType} onChange={(event) => setValue('ledgerAccountType', event.target.value as LedgerAccountRecord['account_type'])} disabled={loading || isEdit}>
                  <option value="asset">Asset</option><option value="liability">Liability</option><option value="equity">Equity</option><option value="revenue">Revenue</option><option value="expense">Expense</option>
                </Form.Select>
              </Col>
              {isEdit && <Col xs={12}><Alert variant="light" className="mb-0">Code, class and entity are financial identity; they cannot be changed here.</Alert></Col>}
            </Row>
          )}
          {editor.kind === 'account' && (
            <Row className="g-3">
              <Col xs={12}>
                <Form.Label>Financial entity</Form.Label>
                <Form.Select value={form.entityId} onChange={(event) => { setValue('entityId', event.target.value); setValue('ledgerAccountId', '') }} disabled={loading || isEdit} required>
                  <option value="">Select an active entity</option>{activeEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                </Form.Select>
              </Col>
              <Col xs={12}>
                <Form.Label>Asset ledger account</Form.Label>
                <Form.Select value={form.ledgerAccountId} onChange={(event) => setValue('ledgerAccountId', event.target.value)} disabled={loading || isEdit || !form.entityId} required>
                  <option value="">Select an asset account</option>{eligibleLedgers.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
                </Form.Select>
              </Col>
              <Col md={7}><Form.Label>Account name</Form.Label><Form.Control value={form.name} onChange={(event) => setValue('name', event.target.value)} disabled={loading} required /></Col>
              <Col md={5}>
                <Form.Label>Account type</Form.Label>
                <Form.Select value={form.financialAccountType} onChange={(event) => setValue('financialAccountType', event.target.value as FinancialAccountRecord['account_type'])} disabled={loading || isEdit}>
                  <option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option>
                </Form.Select>
              </Col>
              <Col md={6}><Form.Label>Provider or bank</Form.Label><Form.Control value={form.institution} onChange={(event) => setValue('institution', event.target.value)} disabled={loading} /></Col>
              <Col md={6}><Form.Label>Safe identifier hint</Form.Label><Form.Control value={form.referenceHint} onChange={(event) => setValue('referenceHint', event.target.value)} disabled={loading} placeholder="e.g. ending 041" /></Col>
              <Col xs={12}><Alert variant="light" className="mb-0">Never enter a PIN, secret, or full account credential. Account linkage and type are fixed after creation.</Alert></Col>
            </Row>
          )}
          <Form.Check className="mt-3" type="switch" id="finance-setup-active" label="Active for new records" checked={form.isActive} onChange={(event) => setValue('isActive', event.target.checked)} disabled={loading} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={loading}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={loading}>{loading && <Spinner animation="border" size="sm" className="me-2" />}Save changes</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default FinanceSetupEditorModal
