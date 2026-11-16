import IconifyIcon from '@/components/wrappers/IconifyIcon'
import VehicleActions from './VehicleActions'
import type { FleetVehicleDetailData } from '@/lib/api/types'
import { formatKampalaDate, formatUGX } from '@/lib/formatters'
import Link from 'next/link'
import { Badge, Card, CardBody, CardHeader, CardTitle, Col, Row, Table } from 'react-bootstrap'

type FleetVehicleDetailProps = {
  workspace: FleetVehicleDetailData
  canManage: boolean
  canDelete: boolean
}

const label = (value: string | null | undefined): string => (value ? value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()) : '—')

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'primary' | 'secondary' => {
  if (['active', 'available', 'assigned', 'completed', 'paid'].includes(status)) return 'success'
  if (['reported', 'scheduled', 'pending_handover', 'maintenance'].includes(status)) return 'warning'
  if (['overdue', 'failed', 'cancelled'].includes(status)) return 'danger'

  return 'primary'
}

const EmptyRows = ({ columns, message }: { columns: number; message: string }) => (
  <tr>
    <td className="py-4 text-center text-muted" colSpan={columns}>
      {message}
    </td>
  </tr>
)

const DetailItem = ({ label: itemLabel, value }: { label: string; value: string | number | null }) => (
  <div className="mb-3">
    <p className="text-muted text-uppercase fs-12 mb-1">{itemLabel}</p>
    <p className="mb-0 fw-semibold">{value ?? '—'}</p>
  </div>
)

const FleetVehicleDetail = ({ workspace, canManage, canDelete }: FleetVehicleDetailProps) => {
  const { vehicle } = workspace
  const model = [vehicle.manufacturer, vehicle.model].filter(Boolean).join(' ') || label(vehicle.vehicle_type)

  return (
    <>
      <Row className="align-items-center mb-3">
        <Col>
          <Link href="/operations/fleet" className="text-decoration-none fs-13">
            <IconifyIcon icon="solar:arrow-left-linear" className="me-1" /> Fleet Operations
          </Link>
          <h4 className="mb-1 mt-2 fw-bold">{vehicle.asset_reference}</h4>
          <p className="mb-0 text-muted">{model} · {vehicle.entity}</p>
        </Col>
        <Col xs="auto" className="d-flex gap-2 align-items-center flex-wrap justify-content-end">
          <Badge bg={statusVariant(vehicle.operational_status)} className="px-3 py-2">
            {label(vehicle.operational_status)}
          </Badge>
          <Badge bg="light" text="dark" className="px-3 py-2">
            {label(vehicle.finance_status)}
          </Badge>
          <VehicleActions workspace={workspace} canManage={canManage} canDelete={canDelete} />
        </Col>
      </Row>

      <Row>
        <Col xl={4} className="mb-3">
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Vehicle profile</CardTitle>
              <p className="mb-0 mt-1 text-muted fs-13">Operational asset facts only. Private identifiers and documents stay in Laravel.</p>
            </CardHeader>
            <CardBody className="pt-0">
              <Row>
                <Col sm={6}><DetailItem label="Type" value={label(vehicle.vehicle_type)} /></Col>
                <Col sm={6}><DetailItem label="Model year" value={vehicle.model_year} /></Col>
                <Col sm={6}><DetailItem label="Usage" value={label(vehicle.usage_type)} /></Col>
                <Col sm={6}><DetailItem label="Propulsion" value={label(vehicle.propulsion_type)} /></Col>
                <Col sm={6}><DetailItem label="Acquisition" value={label(vehicle.acquisition_type)} /></Col>
                <Col sm={6}><DetailItem label="Odometer" value={vehicle.current_odometer === null ? null : `${vehicle.current_odometer.toLocaleString('en-UG')} ${vehicle.odometer_unit}`} /></Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
        <Col xl={4} className="mb-3">
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Current custody</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              {workspace.current_assignment ? (
                <Row>
                  <Col sm={6}><DetailItem label="Driver" value={workspace.current_assignment.driver} /></Col>
                  <Col sm={6}><DetailItem label="Contract" value={workspace.current_assignment.contract_reference} /></Col>
                  <Col sm={6}><DetailItem label="Started" value={formatKampalaDate(workspace.current_assignment.starts_at.slice(0, 10))} /></Col>
                  <Col sm={6}>
                    <p className="text-muted text-uppercase fs-12 mb-1">Status</p>
                    <Badge bg={statusVariant(workspace.current_assignment.status)}>{label(workspace.current_assignment.status)}</Badge>
                  </Col>
                </Row>
              ) : (
                <div className="py-4 text-center text-muted">No current custody assignment.</div>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col xl={4} className="mb-3">
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Operational safeguards</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="d-flex gap-3 align-items-start mb-3">
                <div className="avatar-sm bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"><IconifyIcon icon="solar:danger-triangle-bold-duotone" className="fs-4" /></div>
                <div><p className="mb-1 fw-semibold">{workspace.faults.filter((fault) => fault.status !== 'resolved').length} open fault{workspace.faults.filter((fault) => fault.status !== 'resolved').length === 1 ? '' : 's'}</p><p className="mb-0 text-muted fs-13">Fault evidence remains private.</p></div>
              </div>
              <div className="d-flex gap-3 align-items-start">
                <div className="avatar-sm bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"><IconifyIcon icon="solar:clipboard-check-bold-duotone" className="fs-4" /></div>
                <div><p className="mb-1 fw-semibold">{workspace.handovers.length} recorded handover{workspace.handovers.length === 1 ? '' : 's'}</p><p className="mb-0 text-muted fs-13">Condition notes and custody evidence remain private.</p></div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={7} className="mb-3">
          <Card className="h-100">
            <CardHeader><CardTitle as="h4">Fault history</CardTitle></CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive"><Table className="mb-0" hover responsive>
                <thead className="table-light"><tr><th>Reported</th><th>Issue</th><th>Status</th></tr></thead>
                <tbody>{workspace.faults.length === 0 ? <EmptyRows columns={3} message="No fault records." /> : workspace.faults.map((fault) => (
                  <tr key={fault.id}><td>{formatKampalaDate(fault.reported_at.slice(0, 10))}</td><td className="text-break">{fault.description}</td><td><Badge bg={statusVariant(fault.status)}>{label(fault.status)}</Badge></td></tr>
                ))}</tbody>
              </Table></div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={5} className="mb-3">
          <Card className="h-100">
            <CardHeader><CardTitle as="h4">Custody handovers</CardTitle></CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive"><Table className="mb-0" hover responsive>
                <thead className="table-light"><tr><th>Driver</th><th>Accepted</th><th>Completed</th></tr></thead>
                <tbody>{workspace.handovers.length === 0 ? <EmptyRows columns={3} message="No recorded handovers." /> : workspace.handovers.map((handover) => (
                  <tr key={handover.id}><td>{handover.driver}</td><td>{handover.driver_accepted_at ? formatKampalaDate(handover.driver_accepted_at.slice(0, 10)) : 'Pending'}</td><td>{handover.completed_at ? formatKampalaDate(handover.completed_at.slice(0, 10)) : 'Pending'}</td></tr>
                ))}</tbody>
              </Table></div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={7} className="mb-3">
          <Card className="h-100">
            <CardHeader><CardTitle as="h4">Maintenance history</CardTitle></CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive"><Table className="mb-0" hover responsive>
                <thead className="table-light"><tr><th>Date</th><th>Vendor</th><th>Responsibility</th><th>Status</th><th className="text-end">Cost</th></tr></thead>
                <tbody>{workspace.maintenance.length === 0 ? <EmptyRows columns={5} message="No maintenance records." /> : workspace.maintenance.map((record) => (
                  <tr key={record.id}><td>{formatKampalaDate(record.performed_on)}</td><td>{record.vendor ?? '—'}</td><td>{label(record.responsibility)}</td><td><Badge bg={statusVariant(record.status)}>{label(record.status)}</Badge></td><td className="text-end">{record.actual_cost === null ? '—' : formatUGX(record.actual_cost)}</td></tr>
                ))}</tbody>
              </Table></div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={5} className="mb-3">
          <Card className="h-100">
            <CardHeader><CardTitle as="h4">Service plans</CardTitle></CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive"><Table className="mb-0" hover responsive>
                <thead className="table-light"><tr><th>Plan</th><th>Rule</th><th>Priority</th><th className="text-end">Estimate</th></tr></thead>
                <tbody>{workspace.service_plans.length === 0 ? <EmptyRows columns={4} message="No service plans." /> : workspace.service_plans.map((plan) => (
                  <tr key={plan.id}><td><span className="d-block">{plan.category}</span><small className="text-muted">{plan.is_active ? 'Active' : 'Inactive'}</small></td><td>{label(plan.rule_type)}</td><td><Badge bg={plan.priority === 'high' || plan.priority === 'urgent' ? 'warning' : 'light'} text={plan.priority === 'high' || plan.priority === 'urgent' ? undefined : 'dark'}>{label(plan.priority)}</Badge></td><td className="text-end">{plan.estimated_cost === null ? '—' : formatUGX(plan.estimated_cost)}</td></tr>
                ))}</tbody>
              </Table></div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={12} className="mb-3">
          <Card>
            <CardHeader><CardTitle as="h4">Remittance obligation history</CardTitle></CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive"><Table className="mb-0" hover responsive>
                <thead className="table-light"><tr><th>Due</th><th>Driver</th><th>Status</th><th className="text-end">Expected</th><th className="text-end">Waived</th><th className="text-end">Allocated</th><th className="text-end">Outstanding</th></tr></thead>
                <tbody>{workspace.remittances.length === 0 ? <EmptyRows columns={7} message="No remittance obligations for this vehicle." /> : workspace.remittances.map((remittance) => (
                  <tr key={remittance.id}><td>{formatKampalaDate(remittance.due_on)}</td><td>{remittance.driver}</td><td><Badge bg={statusVariant(remittance.status)}>{label(remittance.status)}</Badge></td><td className="text-end">{formatUGX(remittance.expected_amount)}</td><td className="text-end">{formatUGX(remittance.waived_amount)}</td><td className="text-end">{formatUGX(remittance.allocated_amount)}</td><td className={`text-end fw-semibold ${remittance.outstanding > 0 ? 'text-danger' : ''}`}>{formatUGX(remittance.outstanding)}</td></tr>
                ))}</tbody>
              </Table></div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default FleetVehicleDetail
