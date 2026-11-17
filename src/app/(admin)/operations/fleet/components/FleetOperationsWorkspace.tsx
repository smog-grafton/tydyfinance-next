'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import VehicleEditorModal from '@/components/fleet/VehicleEditorModal'
import type { FleetOperationsWorkspaceData } from '@/lib/api/types'
import { formatKampalaDate, formatUGX } from '@/lib/formatters'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Badge, Card, CardBody, CardHeader, CardTitle, Col, Form, Row, Table } from 'react-bootstrap'

type FleetOperationsWorkspaceProps = {
  workspace: FleetOperationsWorkspaceData
  selectedEntityId?: string
  canManage: boolean
}

type SummaryCardProps = {
  title: string
  value: string
  detail: string
  icon: string
  variant: 'primary' | 'success' | 'warning' | 'danger'
}

const label = (value: string | null | undefined): string => (value ? value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()) : '—')

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'primary' | 'secondary' => {
  if (['active', 'available', 'assigned', 'completed', 'paid'].includes(status)) return 'success'
  if (['reported', 'scheduled', 'pending_handover'].includes(status)) return 'warning'
  if (['overdue', 'failed', 'cancelled'].includes(status)) return 'danger'

  return 'primary'
}

const SummaryCard = ({ title, value, detail, icon, variant }: SummaryCardProps) => (
  <Card className="h-100">
    <CardBody>
      <Row className="align-items-center border-dashed-bottom pb-3">
        <Col xs={9}>
          <p className="text-dark mb-0 fw-semibold fs-14">{title}</p>
          <h3 className="mt-2 mb-0 fw-bold text-truncate" title={value}>
            {value}
          </h3>
        </Col>
        <Col xs={3}>
          <div className={`d-flex justify-content-center align-items-center thumb-xl bg-${variant}-subtle rounded-circle mx-auto`}>
            <IconifyIcon icon={icon} className={`h2 mb-0 text-${variant}`} />
          </div>
        </Col>
      </Row>
      <p className="text-muted mb-0 mt-3">{detail}</p>
    </CardBody>
  </Card>
)

const EmptyRows = ({ columns, message }: { columns: number; message: string }) => (
  <tr>
    <td className="py-4 text-center text-muted" colSpan={columns}>
      {message}
    </td>
  </tr>
)

const FleetOperationsWorkspace = ({ workspace, selectedEntityId = '', canManage }: FleetOperationsWorkspaceProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const [entityId, setEntityId] = useState(selectedEntityId)
  const [from, setFrom] = useState(workspace.period.from)
  const [until, setUntil] = useState(workspace.period.until)
  const [showVehicleEditor, setShowVehicleEditor] = useState(false)

  useEffect(() => {
    setEntityId(selectedEntityId)
    setFrom(workspace.period.from)
    setUntil(workspace.period.until)
  }, [selectedEntityId, workspace.period.from, workspace.period.until])

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = new URLSearchParams()

    if (entityId) query.set('entityId', entityId)
    if (from) query.set('from', from)
    if (until) query.set('until', until)

    router.push(`${pathname}${query.size ? `?${query.toString()}` : ''}`)
  }

  return (
    <>
      <Row id="fleet-overview" className="align-items-center mb-3">
        <Col>
          <h4 className="mb-1 fw-bold">Fleet operations</h4>
          <p className="mb-0 text-muted">Current vehicles, custody, maintenance, faults and remittance obligations from Tydy operational records.</p>
        </Col>
        <Col lg="auto" className="mt-3 mt-lg-0">
          <div className="d-flex flex-wrap gap-2 justify-content-lg-end mb-2">
            <Link className="btn btn-light btn-sm" href="/operations/fleet/register">Open operations register</Link>
          </div>
          <Form onSubmit={applyFilters} className="d-flex flex-wrap gap-2 justify-content-lg-end">
            <Form.Select aria-label="Fleet entity" value={entityId} onChange={(event) => setEntityId(event.target.value)} style={{ minWidth: 180 }}>
              <option value="">All active entities</option>
              {workspace.entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </Form.Select>
            <Form.Control aria-label="Period start" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Form.Control aria-label="Period end" type="date" value={until} onChange={(event) => setUntil(event.target.value)} />
            <button className="btn btn-primary" type="submit">
              Apply
            </button>
          </Form>
        </Col>
      </Row>

      <Row className="mb-1">
        <Col md={6} xl={3} className="mb-3">
          <SummaryCard
            title="Active Fleet"
            value={workspace.summary.active_vehicles.toLocaleString('en-UG')}
            detail={`${workspace.summary.vehicles_under_maintenance} vehicle${workspace.summary.vehicles_under_maintenance === 1 ? '' : 's'} in maintenance`}
            icon="solar:wheel-angle-bold-duotone"
            variant="primary"
          />
        </Col>
        <Col md={6} xl={3} className="mb-3">
          <SummaryCard
            title="Assigned Vehicles"
            value={workspace.summary.assigned_vehicles.toLocaleString('en-UG')}
            detail="Active custody assignments"
            icon="solar:steering-wheel-bold-duotone"
            variant="success"
          />
        </Col>
        <Col md={6} xl={3} className="mb-3">
          <SummaryCard
            title="Open Faults"
            value={workspace.summary.open_faults.toLocaleString('en-UG')}
            detail="Reported faults awaiting resolution"
            icon="solar:danger-triangle-bold-duotone"
            variant="warning"
          />
        </Col>
        <Col md={6} xl={3} className="mb-3">
          <SummaryCard
            title="Remittance Outstanding"
            value={formatUGX(workspace.summary.remittance_outstanding)}
            detail={`${formatUGX(workspace.summary.remittance_expected)} due in selected period`}
            icon="solar:bill-list-bold-duotone"
            variant="danger"
          />
        </Col>
      </Row>

      <Row>
        <Col xl={12} className="mb-3">
          <Card id="vehicle-register">
            <CardHeader>
              <Row className="align-items-center">
                <Col>
                  <CardTitle as="h4">Vehicle register</CardTitle>
                  <p className="mb-0 mt-1 text-muted fs-13">Operational status and assigned driver name only; no vehicle documents or driver contact information is exposed here.</p>
                </Col>
                {canManage && (
                  <Col xs="auto">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowVehicleEditor(true)}>
                      <IconifyIcon icon="solar:add-circle-bold-duotone" className="me-1" /> Register vehicle
                    </button>
                  </Col>
                )}
              </Row>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Asset</th>
                      <th>Entity</th>
                      <th>Vehicle</th>
                      <th>Operational status</th>
                      <th>Assigned driver</th>
                      <th className="text-end">Odometer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.vehicles.length === 0 ? (
                      <EmptyRows columns={6} message="No vehicles match this selection." />
                    ) : (
                      workspace.vehicles.map((vehicle) => (
                        <tr key={vehicle.id}>
                          <td>
                            <Link href={`/operations/fleet/${vehicle.id}`} className="fw-semibold text-decoration-none">
                              {vehicle.asset_reference}
                            </Link>
                          </td>
                          <td>{vehicle.entity}</td>
                          <td>
                            <span className="d-block">{[vehicle.manufacturer, vehicle.model].filter(Boolean).join(' ') || label(vehicle.vehicle_type)}</span>
                            <small className="text-muted">{label(vehicle.vehicle_type)} · {label(vehicle.usage_type)}</small>
                          </td>
                          <td>
                            <Badge bg={statusVariant(vehicle.operational_status)}>{label(vehicle.operational_status)}</Badge>
                          </td>
                          <td>{vehicle.assigned_driver ?? <span className="text-muted">Unassigned</span>}</td>
                          <td className="text-end">{vehicle.current_odometer === null ? '—' : `${vehicle.current_odometer.toLocaleString('en-UG')} km`}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={7} className="mb-3">
          <Card id="custody" className="h-100">
            <CardHeader>
              <CardTitle as="h4">Vehicle custody assignments</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Vehicle</th>
                      <th>Driver</th>
                      <th>Contract</th>
                      <th>Started</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.assignments.length === 0 ? (
                      <EmptyRows columns={5} message="No vehicle custody assignments." />
                    ) : (
                      workspace.assignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td className="fw-semibold">{assignment.vehicle}</td>
                          <td>{assignment.driver}</td>
                          <td>{assignment.contract_reference}</td>
                          <td>{formatKampalaDate(assignment.starts_at.slice(0, 10))}</td>
                          <td><Badge bg={statusVariant(assignment.status)}>{label(assignment.status)}</Badge></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={5} className="mb-3">
          <Card id="handovers" className="h-100">
            <CardHeader>
              <CardTitle as="h4">Completed handovers</CardTitle>
              <p className="mb-0 mt-1 text-muted fs-13">Custody confirmation only; evidence and condition records remain private.</p>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Vehicle</th>
                      <th>Driver</th>
                      <th>Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.handovers.length === 0 ? (
                      <EmptyRows columns={3} message="No completed custody handovers." />
                    ) : (
                      workspace.handovers.map((handover) => (
                        <tr key={handover.id}>
                          <td className="fw-semibold">{handover.vehicle}</td>
                          <td>{handover.driver}</td>
                          <td>{handover.completed_at ? formatKampalaDate(handover.completed_at.slice(0, 10)) : 'Pending'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={7} className="mb-3">
          <Card id="remittances" className="h-100">
            <CardHeader>
              <CardTitle as="h4">Remittance obligations</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Due</th>
                      <th>Vehicle / driver</th>
                      <th>Status</th>
                      <th className="text-end">Expected</th>
                      <th className="text-end">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.remittances.length === 0 ? (
                      <EmptyRows columns={5} message="No remittance obligations are due in this period." />
                    ) : (
                      workspace.remittances.map((remittance) => (
                        <tr key={remittance.id}>
                          <td>{formatKampalaDate(remittance.due_on)}</td>
                          <td>
                            <span className="fw-semibold d-block">{remittance.vehicle}</span>
                            <small className="text-muted">{remittance.driver}</small>
                          </td>
                          <td><Badge bg={statusVariant(remittance.status)}>{label(remittance.status)}</Badge></td>
                          <td className="text-end">{formatUGX(remittance.expected_amount)}</td>
                          <td className={`text-end fw-semibold ${remittance.outstanding > 0 ? 'text-danger' : ''}`}>{formatUGX(remittance.outstanding)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={5} className="mb-3">
          <Card id="active-driver-contracts" className="h-100">
            <CardHeader>
              <CardTitle as="h4">Active contracts</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Contract</th>
                      <th>Driver</th>
                      <th>Ends</th>
                      <th className="text-end">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.contracts.length === 0 ? (
                      <EmptyRows columns={4} message="No active driver contracts." />
                    ) : (
                      workspace.contracts.map((contract) => (
                        <tr key={contract.id}>
                          <td>
                            <span className="fw-semibold d-block">{contract.reference}</span>
                            <small className="text-muted">{label(contract.frequency)}</small>
                          </td>
                          <td>{contract.driver}</td>
                          <td>{formatKampalaDate(contract.ends_on)}</td>
                          <td className="text-end">{formatUGX(contract.remittance_amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={6} className="mb-3">
          <Card id="faults" className="h-100">
            <CardHeader>
              <CardTitle as="h4">Open faults</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Reported</th>
                      <th>Vehicle</th>
                      <th>Issue</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.faults.length === 0 ? (
                      <EmptyRows columns={4} message="No open vehicle faults." />
                    ) : (
                      workspace.faults.map((fault) => (
                        <tr key={fault.id}>
                          <td>{formatKampalaDate(fault.reported_at.slice(0, 10))}</td>
                          <td className="fw-semibold">{fault.vehicle}</td>
                          <td className="text-break">{fault.description}</td>
                          <td><Badge bg={statusVariant(fault.status)}>{label(fault.status)}</Badge></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={6} className="mb-3">
          <Card id="maintenance" className="h-100">
            <CardHeader>
              <CardTitle as="h4">Maintenance completed</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Vehicle</th>
                      <th>Vendor</th>
                      <th>Status</th>
                      <th className="text-end">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.maintenance.length === 0 ? (
                      <EmptyRows columns={5} message="No maintenance records in this period." />
                    ) : (
                      workspace.maintenance.map((record) => (
                        <tr key={record.id}>
                          <td>{formatKampalaDate(record.performed_on)}</td>
                          <td className="fw-semibold">{record.vehicle}</td>
                          <td>{record.vendor ?? '—'}</td>
                          <td><Badge bg={statusVariant(record.status)}>{label(record.status)}</Badge></td>
                          <td className="text-end">{record.actual_cost === null ? '—' : formatUGX(record.actual_cost)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={12} className="mb-3">
          <Card id="service-plans">
            <CardHeader>
              <CardTitle as="h4">Active service plans</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <Table className="mb-0" hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th>Vehicle</th>
                      <th>Category</th>
                      <th>Rule</th>
                      <th>Priority</th>
                      <th>Last completed</th>
                      <th className="text-end">Estimated cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.service_plans.length === 0 ? (
                      <EmptyRows columns={6} message="No active service plans." />
                    ) : (
                      workspace.service_plans.map((plan) => (
                        <tr key={plan.id}>
                          <td className="fw-semibold">{plan.vehicle}</td>
                          <td>{plan.category}</td>
                          <td>{label(plan.rule_type)}</td>
                          <td><Badge bg={plan.priority === 'high' || plan.priority === 'urgent' ? 'warning' : 'light'} text={plan.priority === 'high' || plan.priority === 'urgent' ? undefined : 'dark'}>{label(plan.priority)}</Badge></td>
                          <td>{plan.last_completed_on ? formatKampalaDate(plan.last_completed_on) : 'Not recorded'}</td>
                          <td className="text-end">{plan.estimated_cost === null ? '—' : formatUGX(plan.estimated_cost)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {canManage && (
        <VehicleEditorModal
          show={showVehicleEditor}
          onHide={() => setShowVehicleEditor(false)}
          entities={workspace.entities}
          defaultEntityId={selectedEntityId}
          onSaved={(vehicle) => router.push(`/operations/fleet/${vehicle.vehicle.id}`)}
        />
      )}
    </>
  )
}

export default FleetOperationsWorkspace
