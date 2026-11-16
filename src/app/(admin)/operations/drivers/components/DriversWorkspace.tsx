'use client'

import type { DriverOperationsWorkspaceData } from '@/lib/api/types'
import { formatUGX } from '@/lib/formatters'
import Link from 'next/link'
import { Badge, Card, CardBody, CardHeader, CardTitle, Table } from 'react-bootstrap'

const Empty = () => <tr><td colSpan={7} className="py-5 text-center text-muted">No approved drivers yet. Complete the safeguarded recruitment workflow before a person appears in operational driver management.</td></tr>

const DriversWorkspace = ({ workspace }: { workspace: DriverOperationsWorkspaceData }) => (
  <>
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <div><h4 className="mb-1 fw-bold">Approved drivers</h4><p className="mb-0 text-muted">Operational driver records, separate from recruitment work. Balances come from stored obligations, allocations, waivers and credits.</p></div>
      <Link className="btn btn-light btn-sm" href="/recruitment/applicants">View recruitment pipeline</Link>
    </div>
    <Card>
      <CardHeader><CardTitle as="h4" className="mb-0">Driver operations</CardTitle></CardHeader>
      <CardBody className="pt-0"><div className="table-responsive"><Table hover className="mb-0"><thead className="table-light"><tr><th>Driver</th><th>Entity</th><th>Vehicle</th><th>Active contract</th><th className="text-end">Remittance owed</th><th className="text-end">Arrears</th><th /></tr></thead><tbody>{workspace.drivers.length ? workspace.drivers.map((driver) => <tr key={driver.id}><td><Link className="fw-semibold text-decoration-none" href={`/operations/drivers/${driver.id}`}>{driver.name}</Link><small className="d-block text-muted">{driver.vehicle_class}</small></td><td>{driver.entity}</td><td>{driver.active_vehicle ?? <span className="text-muted">No active custody</span>}</td><td>{driver.active_contract_reference ? <Badge bg="success">{driver.active_contract_reference}</Badge> : <span className="text-muted">No active contract</span>}</td><td className="text-end">{formatUGX(driver.remittance_owed)}</td><td className={`text-end fw-semibold ${driver.arrears > 0 ? 'text-danger' : ''}`}>{formatUGX(driver.arrears)}</td><td className="text-end"><Link className="btn btn-light btn-sm" href={`/operations/drivers/${driver.id}`}>Open profile</Link></td></tr>) : <Empty />}</tbody></Table></div></CardBody>
    </Card>
  </>
)

export default DriversWorkspace
