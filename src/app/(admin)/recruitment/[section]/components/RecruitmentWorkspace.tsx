'use client'

import { ApiError, transitionDriverApplication } from '@/lib/api/client'
import type { RecruitmentWorkspaceData } from '@/lib/api/types'
import { formatKampalaDate } from '@/lib/formatters'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Modal, Row, Table } from 'react-bootstrap'

type Section = 'applicants' | 'operations' | 'academy-evaluations' | 'academy-templates' | 'home-visits'
type Props = { workspace: RecruitmentWorkspaceData; section: Section; title: string }
type Applicant = RecruitmentWorkspaceData['applications'][number]

const label = (value: string | null): string => value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—'
const Empty = ({ columns, message }: { columns: number; message: string }) => <tr><td colSpan={columns} className="py-4 text-center text-muted">{message}</td></tr>
const messageFor = (error: unknown, fallback: string): string => error instanceof ApiError ? Object.values(error.errors ?? {}).flat()[0] ?? error.message : fallback

const RecruitmentWorkspace = ({ workspace, section, title }: Props) => {
  const router = useRouter()
  const [application, setApplication] = useState<Applicant | null>(null)
  const [transition, setTransition] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submitTransition = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!application || !transition) return
    setSaving(true)
    setError(null)
    try {
      await transitionDriverApplication(application.id, transition, reason)
      setApplication(null)
      router.refresh()
    } catch (requestError) {
      setError(messageFor(requestError, 'Unable to update the application.'))
    } finally {
      setSaving(false)
    }
  }

  const openProfile = (item: Applicant) => router.push(`/recruitment/applicants/${item.id}`)
  const applicants = (
    <Card>
      <CardHeader className="d-flex align-items-center justify-content-between gap-2">
        <CardTitle as="h4" className="mb-0">Applicant workflow</CardTitle>
        <Button size="sm" onClick={() => router.push('/recruitment/applicants/new')}>Register applicant</Button>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="table-responsive"><Table hover className="mb-0"><thead className="table-light"><tr><th>Applicant</th><th>Entity</th><th>Vehicle</th><th>Status</th><th>Readiness</th><th aria-label="Actions" /></tr></thead><tbody>{workspace.applications.length ? workspace.applications.map((item) => <tr key={item.id}><td><Button variant="link" className="p-0 fw-semibold text-decoration-none" onClick={() => openProfile(item)}>{item.name}</Button></td><td>{item.entity}</td><td>{label(item.vehicle_class)}</td><td><Badge bg="light" text="dark">{label(item.status)}</Badge></td><td><small className="text-muted">{item.outstanding_requirements.length ? `${item.outstanding_requirements.length} requirement${item.outstanding_requirements.length === 1 ? '' : 's'} outstanding` : 'Ready for next workflow step'}</small></td><td className="text-end"><Button size="sm" variant="light" onClick={() => openProfile(item)}>Open</Button>{item.allowed_transitions.length > 0 && <Button size="sm" className="ms-2" variant="outline-primary" onClick={() => { setApplication(item); setTransition(item.allowed_transitions[0]); setReason('') }}>Advance</Button>}</td></tr>) : <Empty columns={6} message="No driver applications are available." />}</tbody></Table></div>
      </CardBody>
    </Card>
  )
  const evaluations = <Card><CardHeader><CardTitle as="h4">Academy evaluations</CardTitle></CardHeader><CardBody className="pt-0"><div className="table-responsive"><Table hover className="mb-0"><thead className="table-light"><tr><th>Applicant</th><th>Template</th><th>Assessed</th><th>Outcome</th><th>Status</th></tr></thead><tbody>{workspace.evaluations.length ? workspace.evaluations.map((item) => <tr key={item.id}><td>{item.applicant}</td><td>{item.template}</td><td>{formatKampalaDate(item.assessed_on)}</td><td>{label(item.outcome)}</td><td><Badge bg="light" text="dark">{label(item.status)}</Badge></td></tr>) : <Empty columns={5} message="No academy evaluations are available." />}</tbody></Table></div></CardBody></Card>
  const templates = <Card><CardHeader><CardTitle as="h4">Academy templates</CardTitle></CardHeader><CardBody className="pt-0"><div className="table-responsive"><Table hover className="mb-0"><thead className="table-light"><tr><th>Template</th><th>Entity</th><th>Vehicle</th><th>Criteria</th><th>Pass mark</th></tr></thead><tbody>{workspace.templates.length ? workspace.templates.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.entity}</td><td>{label(item.vehicle_class)}</td><td>{item.criteria_count}</td><td>{(item.pass_threshold_basis_points / 100).toFixed(2)}%</td></tr>) : <Empty columns={5} message="No assessment templates are available." />}</tbody></Table></div></CardBody></Card>
  const visits = <Card><CardHeader><CardTitle as="h4">Home visits</CardTitle></CardHeader><CardBody className="pt-0"><div className="table-responsive"><Table hover className="mb-0"><thead className="table-light"><tr><th>Applicant</th><th>Entity</th><th>Scheduled</th><th>Visited</th><th>Status</th></tr></thead><tbody>{workspace.home_visits.length ? workspace.home_visits.map((item) => <tr key={item.id}><td>{item.applicant}</td><td>{item.entity}</td><td>{item.scheduled_for ? formatKampalaDate(item.scheduled_for) : '—'}</td><td>{item.visited_at ? formatKampalaDate(item.visited_at) : '—'}</td><td><Badge bg="light" text="dark">{label(item.status)}</Badge></td></tr>) : <Empty columns={5} message="No home visits are available." />}</tbody></Table></div></CardBody></Card>
  const content = section === 'academy-evaluations' ? evaluations : section === 'academy-templates' ? templates : section === 'home-visits' ? visits : section === 'operations' ? <Row><Col xl={12} className="mb-3">{applicants}</Col><Col xl={6} className="mb-3">{evaluations}</Col><Col xl={6} className="mb-3">{visits}</Col></Row> : applicants

  return <><Row className="mb-3"><Col><h4 className="mb-1 fw-bold">{title}</h4><p className="mb-0 text-muted">Create an applicant, then complete each controlled stage from the protected profile. List views never expose contact, location, documents or private evidence.</p></Col></Row>{content}
    <Modal show={application !== null} onHide={saving ? undefined : () => setApplication(null)} centered><Form onSubmit={submitTransition}><Modal.Header closeButton={!saving}><Modal.Title>Advance application</Modal.Title></Modal.Header><Modal.Body>{error && <Alert variant="danger">{error}</Alert>}<p className="text-muted">{application?.name}</p><Form.Label>Next stage</Form.Label><Form.Select value={transition} onChange={(event) => setTransition(event.target.value)} disabled={saving}>{application?.allowed_transitions.map((option) => <option key={option} value={option}>{label(option)}</option>)}</Form.Select><Form.Label className="mt-3">Reason or decision note</Form.Label><Form.Control as="textarea" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} disabled={saving} /><small className="text-muted">Final decisions need a reason. Laravel checks each stage’s evidence and readiness.</small></Modal.Body><Modal.Footer><Button variant="light" onClick={() => setApplication(null)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Advance workflow'}</Button></Modal.Footer></Form></Modal>
  </>
}

export default RecruitmentWorkspace
