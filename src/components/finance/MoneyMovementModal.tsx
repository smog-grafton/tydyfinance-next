'use client'

import { ApiError, recordMoneyMovement, type MoneyMovementInput } from '@/lib/api/client'
import type { FinanceWorkspaceData } from '@/lib/api/types'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap'

type MoneyMovementModalProps = {
  show: boolean
  onHide: () => void
  workspace: FinanceWorkspaceData
  defaultEntityId?: string
  onRecorded: () => void
}

type MovementType = MoneyMovementInput['type']

const kampalaDateTimeInput = (): string => {
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date()).reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {})

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
}

const newIdempotencyKey = (): string => crypto.randomUUID()

const MoneyMovementModal = ({ show, onHide, workspace, defaultEntityId = '', onRecorded }: MoneyMovementModalProps) => {
  const [type, setType] = useState<MovementType>('receive')
  const [entityId, setEntityId] = useState(defaultEntityId)
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [counterpartLedgerId, setCounterpartLedgerId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [incomeSourceId, setIncomeSourceId] = useState('')
  const [transferFee, setTransferFee] = useState('0')
  const [feeCategoryId, setFeeCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [occurredAt, setOccurredAt] = useState(kampalaDateTimeInput())
  const [reference, setReference] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [description, setDescription] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForEntity = (nextEntityId: string) => {
    setEntityId(nextEntityId)
    setFromAccountId('')
    setToAccountId('')
    setCounterpartLedgerId('')
    setCategoryId('')
    setIncomeSourceId('')
    setFeeCategoryId('')
  }

  useEffect(() => {
    if (!show) return

    setType('receive')
    resetForEntity(defaultEntityId)
    setTransferFee('0')
    setAmount('')
    setOccurredAt(kampalaDateTimeInput())
    setReference('')
    setCounterparty('')
    setDescription('')
    setIdempotencyKey(newIdempotencyKey())
    setError(null)
  }, [defaultEntityId, show])

  const entityNumericId = Number(entityId)
  const accounts = useMemo(() => workspace.accounts.filter((account) => account.is_active && account.entity_id === entityNumericId), [entityNumericId, workspace.accounts])
  const ledgers = useMemo(() => workspace.ledger_accounts.filter((account) => account.is_active && account.entity_id === entityNumericId), [entityNumericId, workspace.ledger_accounts])
  const categories = useMemo(() => workspace.categories.filter((category) => category.is_active && category.entity_id === entityNumericId), [entityNumericId, workspace.categories])
  const incomeSources = useMemo(() => workspace.income_sources.filter((source) => source.is_active && source.entity_id === entityNumericId), [entityNumericId, workspace.income_sources])
  const counterpartLedgers = ledgers.filter((ledger) => {
    if (type === 'receive') return ['revenue', 'asset', 'liability', 'equity'].includes(ledger.account_type)
    if (type === 'spend') return ['expense', 'asset', 'liability', 'equity'].includes(ledger.account_type)
    return false
  })
  const matchingCategories = categories.filter((category) => category.category_type === (type === 'receive' ? 'income' : 'expense'))

  const changeType = (nextType: MovementType) => {
    setType(nextType)
    setFromAccountId('')
    setToAccountId('')
    setCounterpartLedgerId('')
    setCategoryId('')
    setIncomeSourceId('')
    setFeeCategoryId('')
    setTransferFee('0')
  }

  const changeCategory = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId)
    const category = matchingCategories.find((item) => item.id === Number(nextCategoryId))
    setCounterpartLedgerId(category ? String(category.ledger_account_id) : '')
  }

  const changeIncomeSource = (nextIncomeSourceId: string) => {
    setIncomeSourceId(nextIncomeSourceId)
    const source = incomeSources.find((item) => item.id === Number(nextIncomeSourceId))
    if (!source) return
    const category = categories.find((item) => item.id === source.financial_category_id)
    setCategoryId(String(source.financial_category_id))
    setCounterpartLedgerId(category ? String(category.ledger_account_id) : '')
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const wholeAmount = Number(amount)
    const fee = Number(transferFee || '0')

    if (!entityNumericId || !Number.isInteger(wholeAmount) || wholeAmount < 1 || !occurredAt || !description.trim()) {
      setError('Choose an entity and enter a whole-UGX amount, Kampala date/time, and purpose.')
      return
    }

    if ((type === 'receive' && (!toAccountId || !counterpartLedgerId)) || (type === 'spend' && (!fromAccountId || !counterpartLedgerId)) || (type === 'transfer' && (!fromAccountId || !toAccountId))) {
      setError('Complete all accounts required for this movement.')
      return
    }

    if (type === 'transfer' && fromAccountId === toAccountId) {
      setError('A transfer needs two different financial accounts.')
      return
    }

    if (!Number.isInteger(fee) || fee < 0 || (fee > 0 && !feeCategoryId)) {
      setError('A transfer fee must be a whole non-negative UGX amount and needs an expense category when present.')
      return
    }

    const input: MoneyMovementInput = {
      type,
      ...(fromAccountId ? { from_financial_account_id: Number(fromAccountId) } : {}),
      ...(toAccountId ? { to_financial_account_id: Number(toAccountId) } : {}),
      ...(counterpartLedgerId ? { counterpart_ledger_account_id: Number(counterpartLedgerId) } : {}),
      ...(categoryId ? { financial_category_id: Number(categoryId) } : {}),
      ...(incomeSourceId ? { income_source_id: Number(incomeSourceId) } : {}),
      ...(type === 'transfer' ? { transfer_fee_amount: fee } : {}),
      ...(feeCategoryId ? { fee_financial_category_id: Number(feeCategoryId) } : {}),
      amount: wholeAmount,
      occurred_at: occurredAt,
      ...(reference.trim() ? { reference: reference.trim() } : {}),
      ...(counterparty.trim() ? { counterparty_name: counterparty.trim() } : {}),
      description: description.trim(),
    }

    setLoading(true)
    try {
      await recordMoneyMovement(input, idempotencyKey)
      onRecorded()
      onHide()
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.errors?.movement?.[0] ?? Object.values(requestError.errors ?? {}).flat()[0] ?? requestError.message)
      } else {
        setError('Unable to record this movement. Retry with the same details to preserve idempotency.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={loading ? undefined : onHide} centered size="lg">
      <Form onSubmit={submit}>
        <Modal.Header closeButton={!loading}><Modal.Title>Record money movement</Modal.Title></Modal.Header>
        <Modal.Body>
          <Alert variant="info">This action posts an immutable, balanced UGX journal entry. Corrections are made through an audited reversal, never by editing or deleting this record.</Alert>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Financial entity</Form.Label>
              <Form.Select value={entityId} onChange={(event) => resetForEntity(event.target.value)} disabled={loading} required>
                <option value="">Select an entity</option>
                {workspace.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label>What happened?</Form.Label>
              <Form.Select value={type} onChange={(event) => changeType(event.target.value as MovementType)} disabled={loading}>
                <option value="receive">Receive money</option><option value="spend">Spend money</option><option value="transfer">Transfer between accounts</option>
              </Form.Select>
            </Col>

            {(type === 'spend' || type === 'transfer') && <Col md={6}><Form.Label>Money came from</Form.Label><Form.Select value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)} disabled={loading} required><option value="">Select account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Form.Select></Col>}
            {(type === 'receive' || type === 'transfer') && <Col md={6}><Form.Label>Money went to</Form.Label><Form.Select value={toAccountId} onChange={(event) => setToAccountId(event.target.value)} disabled={loading} required><option value="">Select account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Form.Select></Col>}

            {type !== 'transfer' && <>
              <Col md={6}><Form.Label>{type === 'receive' ? 'Income source' : 'Expense category'}</Form.Label>{type === 'receive' ? <Form.Select value={incomeSourceId} onChange={(event) => changeIncomeSource(event.target.value)} disabled={loading}><option value="">None</option>{incomeSources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</Form.Select> : <Form.Select value={categoryId} onChange={(event) => changeCategory(event.target.value)} disabled={loading}><option value="">None</option>{matchingCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Form.Select>}</Col>
              <Col md={6}><Form.Label>{type === 'receive' ? 'Received for' : 'Paid for'}</Form.Label><Form.Select value={counterpartLedgerId} onChange={(event) => setCounterpartLedgerId(event.target.value)} disabled={loading} required><option value="">Select ledger account</option>{counterpartLedgers.map((ledger) => <option key={ledger.id} value={ledger.id}>{ledger.code} · {ledger.name}</option>)}</Form.Select></Col>
            </>}

            {type === 'transfer' && <>
              <Col md={6}><Form.Label>Transfer fee (UGX)</Form.Label><Form.Control type="number" min="0" step="1" value={transferFee} onChange={(event) => setTransferFee(event.target.value)} disabled={loading} /></Col>
              <Col md={6}><Form.Label>Fee category</Form.Label><Form.Select value={feeCategoryId} onChange={(event) => setFeeCategoryId(event.target.value)} disabled={loading} required={Number(transferFee) > 0}><option value="">{Number(transferFee) > 0 ? 'Select expense category' : 'No fee'}</option>{categories.filter((category) => category.category_type === 'expense').map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Form.Select></Col>
            </>}

            <Col md={6}><Form.Label>Amount (UGX)</Form.Label><Form.Control type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={loading} required /></Col>
            <Col md={6}><Form.Label>When did it happen? (Kampala)</Form.Label><Form.Control type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} disabled={loading} required /></Col>
            <Col md={6}><Form.Label>Reference</Form.Label><Form.Control value={reference} onChange={(event) => setReference(event.target.value)} disabled={loading} /></Col>
            <Col md={6}><Form.Label>Counterparty</Form.Label><Form.Control value={counterparty} onChange={(event) => setCounterparty(event.target.value)} disabled={loading} /></Col>
            <Col md={12}><Form.Label>Purpose or note</Form.Label><Form.Control as="textarea" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} disabled={loading} required /></Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={loading}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={loading}>{loading && <Spinner animation="border" size="sm" className="me-2" />}Post immutable movement</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default MoneyMovementModal
