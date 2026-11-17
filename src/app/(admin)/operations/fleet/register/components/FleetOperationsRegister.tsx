'use client'

import VehicleEditorModal from '@/components/fleet/VehicleEditorModal'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { ApiError, getFleetOperationsTable } from '@/lib/api/client'
import type { DashboardEntity, FleetOperationsTable, FleetOperationsTablePage } from '@/lib/api/types'
import { formatKampalaDate, formatUGX } from '@/lib/formatters'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap'

type Props = {
  entities: DashboardEntity[]
  initialEntityId?: string
  canManage: boolean
}

const tables: Array<{ value: FleetOperationsTable; label: string }> = [
  { value: 'vehicles', label: 'Vehicle register' },
  { value: 'assignments', label: 'Custody' },
  { value: 'handovers', label: 'Handovers' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'remittances', label: 'Remittances' },
]

const text = (value: string | number | null | undefined): string => (value === null || value === undefined || value === '' ? '—' : String(value))
const label = (value: string | number | null | undefined): string => text(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const date = (value: string | number | null | undefined): string => (typeof value === 'string' && value ? formatKampalaDate(value.slice(0, 10)) : '—')
const amount = (value: string | number | null | undefined): string => formatUGX(Number(value ?? 0))

const badge = (value: string | number | null | undefined) => {
  const status = String(value ?? '')
  const variant = ['active', 'available', 'assigned', 'completed', 'paid'].includes(status)
    ? 'success'
    : ['overdue', 'failed', 'cancelled'].includes(status)
      ? 'danger'
      : ['scheduled', 'pending_handover', 'reported'].includes(status)
        ? 'warning'
        : 'secondary'

  return <Badge bg={variant} text={variant === 'warning' ? 'dark' : undefined}>{label(status)}</Badge>
}

const requestError = (error: unknown): string =>
  error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Unable to load these operational records.'

const FleetOperationsRegister = ({ entities, initialEntityId = '', canManage }: Props) => {
  const [table, setTable] = useState<FleetOperationsTable>('vehicles')
  const [entityId, setEntityId] = useState(initialEntityId)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [perPage, setPerPage] = useState(25)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<FleetOperationsTablePage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showVehicleEditor, setShowVehicleEditor] = useState(false)

  useEffect(() => {
    setEntityId(initialEntityId)
  }, [initialEntityId])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void getFleetOperationsTable(table, {
      entity_id: entityId || undefined,
      search: search.trim() || undefined,
      status: status || undefined,
      per_page: perPage,
      page,
    })
      .then((payload) => active && setResult(payload))
      .catch((caught: unknown) => active && setError(requestError(caught)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [entityId, page, perPage, search, status, table])

  const switchTable = (next: FleetOperationsTable) => {
    setTable(next)
    setSearch('')
    setStatus('')
    setPage(1)
  }

  const headers = table === 'vehicles'
    ? ['Asset', 'Entity', 'Vehicle', 'Status', 'Assigned driver', 'Odometer', '']
    : table === 'assignments'
      ? ['Vehicle', 'Driver', 'Contract', 'Started', 'Status', '']
      : table === 'handovers'
        ? ['Vehicle', 'Driver', 'Contract', 'Accepted', 'Completed', '']
        : table === 'contracts'
          ? ['Contract', 'Driver', 'Starts', 'Ends', 'Rate', 'Status', '']
          : ['Due', 'Vehicle / driver', 'Status', 'Expected', 'Outstanding', '']

  const renderRow = (row: Record<string, string | number | null>) => {
    if (table === 'vehicles') {
      return <tr key={row.id}>
        <td className="fw-semibold">{text(row.asset_reference)}</td><td>{text(row.entity)}</td>
        <td><span className="d-block">{[row.manufacturer, row.model].filter(Boolean).join(' ') || label(row.vehicle_type)}</span><small className="text-muted">{label(row.vehicle_type)} · {label(row.usage_type)}</small></td>
        <td>{badge(row.operational_status)}</td><td>{text(row.assigned_driver)}</td><td className="text-end">{row.current_odometer === null ? '—' : `${Number(row.current_odometer).toLocaleString('en-UG')} km`}</td>
        <td className="text-end"><Link className="btn btn-sm btn-light" href={`/operations/fleet/${row.id}`}>Manage</Link></td>
      </tr>
    }
    if (table === 'assignments') {
      return <tr key={row.id}><td className="fw-semibold">{text(row.vehicle)}</td><td>{text(row.driver)}</td><td>{text(row.contract_reference)}</td><td>{date(row.starts_at)}</td><td>{badge(row.status)}</td><td className="text-end"><Link className="btn btn-sm btn-light" href={`/operations/fleet/${row.vehicle_id}`}>View custody</Link></td></tr>
    }
    if (table === 'handovers') {
      return <tr key={row.id}><td className="fw-semibold">{text(row.vehicle)}</td><td>{text(row.driver)}</td><td>{text(row.contract_reference)}</td><td>{date(row.driver_accepted_at)}</td><td>{date(row.completed_at)}</td><td className="text-end"><Link className="btn btn-sm btn-light" href={`/operations/fleet/${row.vehicle_id}`}>View handover</Link></td></tr>
    }
    if (table === 'contracts') {
      return <tr key={row.id}><td className="fw-semibold">{text(row.reference)}</td><td>{text(row.driver)}</td><td>{date(row.starts_on)}</td><td>{date(row.ends_on)}</td><td className="text-end">{amount(row.remittance_amount)}</td><td>{badge(row.status)}</td><td className="text-end"><Link className="btn btn-sm btn-light" href={`/operations/drivers/${row.driver_id}`}>Open driver</Link></td></tr>
    }
    return <tr key={row.id}><td>{date(row.due_on)}</td><td><span className="d-block fw-semibold">{text(row.vehicle)}</span><small className="text-muted">{text(row.driver)}</small></td><td>{badge(row.status)}</td><td className="text-end">{amount(row.expected_amount)}</td><td className={Number(row.outstanding) > 0 ? 'text-end fw-semibold text-danger' : 'text-end fw-semibold'}>{amount(row.outstanding)}</td><td className="text-end"><Link className="btn btn-sm btn-primary" href={`/operations/drivers/${row.driver_id}?record=remittance`}>Record remittance</Link></td></tr>
  }

  return <>
    <Row className="align-items-center mb-3">
      <Col>
        <h4 className="mb-1 fw-bold">Fleet operations register</h4>
        <p className="mb-0 text-muted">Searchable, server-paginated operational records. Open a vehicle or driver to take an authorised action.</p>
      </Col>
      <Col xs="auto"><Link href="/operations/fleet" className="btn btn-light">Fleet overview</Link></Col>
    </Row>

    <Card>
      <CardHeader className="pb-0">
        <div className="d-flex flex-wrap justify-content-between gap-2">
          <div className="btn-group flex-wrap" role="tablist">
            {tables.map((option) => <Button key={option.value} size="sm" variant={table === option.value ? 'primary' : 'light'} onClick={() => switchTable(option.value)}>{option.label}</Button>)}
          </div>
          {canManage && table === 'vehicles' && <Button size="sm" onClick={() => setShowVehicleEditor(true)}><IconifyIcon icon="solar:add-circle-bold-duotone" className="me-1" /> Register vehicle</Button>}
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <Form className="p-3 border-bottom" onSubmit={(event) => { event.preventDefault(); setPage(1) }}>
          <Row className="g-2">
            <Col md={4}><Form.Control aria-label="Search records" placeholder={table === 'vehicles' ? 'Search asset, registration, make or model' : 'Search vehicle, driver or contract'} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></Col>
            <Col md={3}><Form.Select aria-label="Entity" value={entityId} onChange={(event) => { setEntityId(event.target.value); setPage(1) }}><option value="">All active entities</option>{entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</Form.Select></Col>
            <Col md={2}><Form.Control aria-label="Status" placeholder="Status filter" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} /></Col>
            <Col md={2}><Form.Select aria-label="Rows per page" value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1) }}>{[10, 25, 50, 100].map((count) => <option key={count} value={count}>{count} rows</option>)}</Form.Select></Col>
            <Col md={1} className="d-grid"><Button type="submit" variant="light">Find</Button></Col>
          </Row>
        </Form>
        {error && <Alert variant="danger" className="m-3 mb-0">{error}</Alert>}
        <div className="table-responsive"><Table hover className="mb-0"><thead className="table-light"><tr>{headers.map((header, index) => <th key={`${header}-${index}`} className={index >= headers.length - 2 ? 'text-end' : undefined}>{header}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={headers.length} className="py-5 text-center"><Spinner size="sm" className="me-2" /> Loading records…</td></tr> : result?.items.length ? result.items.map(renderRow) : <tr><td colSpan={headers.length} className="py-5 text-center text-muted">No {tables.find((option) => option.value === table)?.label.toLowerCase()} match these filters.</td></tr>}</tbody></Table></div>
        {result && <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-top"><small className="text-muted">Server page {result.meta.current_page} of {result.meta.last_page} · {result.meta.total} records</small><Pagination className="pagination-rounded mb-0"><Pagination.Prev disabled={loading || result.meta.current_page === 1} onClick={() => setPage(result.meta.current_page - 1)} /><Pagination.Item active>{result.meta.current_page}</Pagination.Item><Pagination.Next disabled={loading || result.meta.current_page === result.meta.last_page} onClick={() => setPage(result.meta.current_page + 1)} /></Pagination></div>}
      </CardBody>
    </Card>

    {canManage && <VehicleEditorModal show={showVehicleEditor} onHide={() => setShowVehicleEditor(false)} entities={entities} defaultEntityId={entityId} onSaved={(vehicle) => window.location.assign(`/operations/fleet/${vehicle.vehicle.id}`)} />}
  </>
}

export default FleetOperationsRegister
