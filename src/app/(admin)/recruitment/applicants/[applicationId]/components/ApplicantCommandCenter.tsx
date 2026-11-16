'use client'

import { ApiError, recruitmentCommand, transitionDriverApplication } from '@/lib/api/client'
import type { RecruitmentApplicantDetail } from '@/lib/api/types'
import { formatKampalaDate } from '@/lib/formatters'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Row, Tab, Table, Tabs } from 'react-bootstrap'

type Props = { profile: RecruitmentApplicantDetail }
type Score = { criterion_id: number; score: string; not_applicable: boolean; critical_failure: boolean; observation: string }
const label = (value: string | null | undefined): string => value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—'
const errorMessage = (error: unknown, fallback: string): string => error instanceof ApiError ? Object.values(error.errors ?? {}).flat()[0] ?? error.message : fallback
const nowInput = (): string => new Date().toISOString().slice(0, 16)

const ApplicantCommandCenter = ({ profile }: Props) => {
  const router = useRouter()
  const { application } = profile
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [transition, setTransition] = useState(application.allowed_transitions[0] ?? '')
  const [reason, setReason] = useState('')
  const [related, setRelated] = useState({ relationship_type: 'next_of_kin', name: '', phone: '', relationship: '' })
  const [documentType, setDocumentType] = useState('national_id')
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [license, setLicense] = useState({ license_number: '', categories: 'A', expires_on: '', file: null as File | null })
  const [evaluationTemplate, setEvaluationTemplate] = useState(String(profile.templates[0]?.id ?? ''))
  const [reviewNotes, setReviewNotes] = useState(profile.review?.reasons ?? '')
  const [visit, setVisit] = useState({ visited_at: nowInput(), address_confirmed: false, parking_confirmed: false, objective_observations: '', follow_up: '' })
  const draft = profile.evaluations.find((evaluation) => evaluation.status === 'draft')
  const [scores, setScores] = useState<Score[]>(() => (draft?.criteria ?? []).map((criterion) => ({ criterion_id: criterion.id, score: '', not_applicable: false, critical_failure: false, observation: '' })))

  const run = async (work: () => Promise<unknown>, success: string) => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await work()
      setNotice(success)
      router.refresh()
    } catch (requestError) {
      setError(errorMessage(requestError, 'This recruitment action could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  const advance = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!transition) return
    await run(() => transitionDriverApplication(application.id, transition, reason), `${label(transition)} recorded.`)
  }
  const addRelated = async (event: React.FormEvent) => {
    event.preventDefault()
    await run(async () => { await recruitmentCommand(`/api/v1/recruitment/applications/${application.id}/related-people`, 'POST', related); setRelated({ relationship_type: 'next_of_kin', name: '', phone: '', relationship: '' }) }, 'Related person recorded.')
  }
  const addDocument = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!documentFile) return setError('Choose the protected document file first.')
    const form = new FormData()
    form.set('document_type', documentType)
    form.set('document', documentFile)
    await run(async () => { await recruitmentCommand(`/api/v1/recruitment/applications/${application.id}/documents`, 'POST', form); setDocumentFile(null) }, 'Document stored for verification.')
  }
  const addLicense = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!license.file) return setError('Choose the driving permit scan first.')
    const form = new FormData()
    form.set('license_number', license.license_number)
    form.set('expires_on', license.expires_on)
    license.categories.split(',').map((category) => category.trim()).filter(Boolean).forEach((category) => form.append('categories[]', category))
    form.set('document', license.file)
    await run(async () => { await recruitmentCommand(`/api/v1/recruitment/applications/${application.id}/licenses`, 'POST', form); setLicense({ license_number: '', categories: 'A', expires_on: '', file: null }) }, 'Driving licence stored for verification.')
  }
  const startEvaluation = async (event: React.FormEvent) => {
    event.preventDefault()
    await run(() => recruitmentCommand(`/api/v1/recruitment/applications/${application.id}/evaluations`, 'POST', { assessment_template_id: Number(evaluationTemplate), assessed_on: new Date().toISOString().slice(0, 10) }), 'Academy evaluation opened. Score every required criterion below.')
  }
  const submitEvaluation = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft) return
    await run(() => recruitmentCommand(`/api/v1/recruitment/evaluations/${draft.id}/submit`, 'POST', { scores: scores.map((score) => ({ ...score, score: score.not_applicable ? null : Number(score.score) })) }), 'Academy evaluation finalized.')
  }
  const submitVisit = async (event: React.FormEvent) => {
    event.preventDefault()
    await run(() => recruitmentCommand(`/api/v1/recruitment/applications/${application.id}/home-visits`, 'POST', visit), 'Home visit completed.')
  }
  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault()
    await run(() => recruitmentCommand(`/api/v1/recruitment/applications/${application.id}/review`, 'POST', { notes: reviewNotes }), 'Final review recorded.')
  }
  const setScore = (index: number, change: Partial<Score>) => setScores((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...change } : item))
  const requirements = useMemo(() => application.outstanding_requirements, [application.outstanding_requirements])

  const overview = <Row className="g-3"><Col lg={7}><Card><CardHeader><CardTitle as="h5">Profile & credentials</CardTitle></CardHeader><CardBody><Row className="g-3"><Col md={6}><div className="text-muted small">Driver</div><div className="fw-semibold">{application.name}</div></Col><Col md={6}><div className="text-muted small">Operational entity</div><div>{application.entity}</div></Col><Col md={6}><div className="text-muted small">Primary phone</div><div>{application.primary_phone}</div></Col><Col md={6}><div className="text-muted small">Vehicle class</div><div>{label(application.vehicle_class)}</div></Col><Col md={6}><div className="text-muted small">Current stage</div><Badge bg="light" text="dark">{label(application.status)}</Badge></Col><Col md={6}><div className="text-muted small">Consent</div><div>{application.has_consent ? 'Recorded' : 'Missing'}</div></Col></Row></CardBody></Card></Col><Col lg={5}><Card><CardHeader><CardTitle as="h5">Workflow readiness</CardTitle></CardHeader><CardBody>{requirements.length ? <ul className="ps-3 mb-3">{requirements.map((item) => <li className="small mb-2" key={item}>{item}</li>)}</ul> : <p className="text-success mb-3">All currently required evidence is recorded.</p>}<Form onSubmit={advance}><Form.Label>Next permitted action</Form.Label><Form.Select value={transition} onChange={(event) => setTransition(event.target.value)} disabled={saving || application.allowed_transitions.length === 0}>{application.allowed_transitions.length ? application.allowed_transitions.map((item) => <option key={item} value={item}>{label(item)}</option>) : <option>No transition available</option>}</Form.Select><Form.Label className="mt-3">Decision or transition reason</Form.Label><Form.Control as="textarea" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /><Button className="mt-3" type="submit" disabled={saving || !transition}>Continue workflow</Button></Form></CardBody></Card></Col><Col xs={12}><Card><CardHeader><CardTitle as="h5">Workflow timeline</CardTitle></CardHeader><CardBody>{profile.timeline.length ? <div className="table-responsive"><Table size="sm" className="mb-0"><thead><tr><th>When</th><th>Transition</th><th>Reason</th><th>Actor</th></tr></thead><tbody>{profile.timeline.map((event) => <tr key={event.id}><td>{formatKampalaDate(event.performed_at)}</td><td>{label(event.from_status)} → {label(event.to_status)}</td><td>{event.reason ?? '—'}</td><td>{event.actor ?? 'System'}</td></tr>)}</tbody></Table></div> : <p className="text-muted mb-0">No workflow transitions have been recorded yet.</p>}</CardBody></Card></Col></Row>

  const verification = <Row className="g-3"><Col lg={6}><Card><CardHeader><CardTitle as="h5">Trusted contact / guarantor</CardTitle></CardHeader><CardBody><Form onSubmit={addRelated}><Row className="g-2"><Col md={6}><Form.Select value={related.relationship_type} onChange={(event) => setRelated({ ...related, relationship_type: event.target.value })}><option value="next_of_kin">Next of kin</option><option value="guarantor">Guarantor</option></Form.Select></Col><Col md={6}><Form.Control required placeholder="Full name" value={related.name} onChange={(event) => setRelated({ ...related, name: event.target.value })} /></Col><Col md={6}><Form.Control required placeholder="Phone" value={related.phone} onChange={(event) => setRelated({ ...related, phone: event.target.value })} /></Col><Col md={6}><Form.Control placeholder="Relationship" value={related.relationship} onChange={(event) => setRelated({ ...related, relationship: event.target.value })} /></Col></Row><Button className="mt-3" type="submit" disabled={saving}>Add person</Button></Form><hr />{profile.related_people.length ? profile.related_people.map((person) => <div className="d-flex justify-content-between border-bottom py-2" key={person.id}><span><span className="fw-semibold d-block">{person.name}</span><small className="text-muted">{label(person.relationship_type)} · {person.phone}</small></span><Badge bg="light" text="dark">{label(person.verification_status)}</Badge></div>) : <p className="text-muted mb-0">Add at least one next of kin or guarantor before submitting.</p>}</CardBody></Card></Col><Col lg={6}><Card><CardHeader><CardTitle as="h5">Protected identity documents</CardTitle></CardHeader><CardBody><Form onSubmit={addDocument}><Row className="g-2"><Col md={6}><Form.Select value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="national_id">National ID</option><option value="lc1_letter">LC1 introduction letter</option><option value="driving_licence">Driving licence</option><option value="other">Other</option></Form.Select></Col><Col md={6}><Form.Control required type="file" accept="image/*,application/pdf" onChange={(event) => setDocumentFile((event.currentTarget as HTMLInputElement).files?.[0] ?? null)} /></Col></Row><Button className="mt-3" type="submit" disabled={saving}>Store document</Button></Form><hr />{profile.documents.map((document) => <div className="d-flex align-items-center justify-content-between border-bottom py-2 gap-2" key={document.id}><span><span className="fw-semibold d-block">{label(document.document_type)}</span><small className="text-muted">{label(document.verification_status)}</small></span>{document.verification_status === 'pending' && <div className="d-flex gap-2"><Button size="sm" variant="outline-success" disabled={saving} onClick={() => run(() => recruitmentCommand(`/api/v1/recruitment/documents/${document.id}/verify`, 'PATCH', { verification_status: 'verified' }), 'Document verified.')}>Verify</Button><Button size="sm" variant="outline-danger" disabled={saving} onClick={() => run(() => recruitmentCommand(`/api/v1/recruitment/documents/${document.id}/verify`, 'PATCH', { verification_status: 'rejected' }), 'Document marked rejected.')}>Reject</Button></div>}</div>)}</CardBody></Card></Col><Col xs={12}><Card><CardHeader><CardTitle as="h5">Driving permit</CardTitle></CardHeader><CardBody><Form onSubmit={addLicense}><Row className="g-2"><Col md={3}><Form.Control required placeholder="Permit number" value={license.license_number} onChange={(event) => setLicense({ ...license, license_number: event.target.value })} /></Col><Col md={3}><Form.Control required placeholder="Categories, e.g. A,B" value={license.categories} onChange={(event) => setLicense({ ...license, categories: event.target.value })} /></Col><Col md={3}><Form.Control required type="date" value={license.expires_on} onChange={(event) => setLicense({ ...license, expires_on: event.target.value })} /></Col><Col md={3}><Form.Control required type="file" accept="image/*,application/pdf" onChange={(event) => setLicense({ ...license, file: (event.currentTarget as HTMLInputElement).files?.[0] ?? null })} /></Col></Row><Button className="mt-3" type="submit" disabled={saving}>Store permit</Button></Form><hr />{profile.licenses.map((item) => <div className="d-flex align-items-center justify-content-between border-bottom py-2 gap-2" key={item.id}><span><span className="fw-semibold d-block">{item.license_number} · {item.categories.join(', ')}</span><small className="text-muted">Expires {formatKampalaDate(item.expires_on)} · {label(item.verification_status)}</small></span>{item.verification_status === 'pending' && <div className="d-flex gap-2"><Button size="sm" variant="outline-success" disabled={saving} onClick={() => run(() => recruitmentCommand(`/api/v1/recruitment/licenses/${item.id}/verify`, 'PATCH', { verification_status: 'verified' }), 'Driving licence verified.')}>Verify</Button><Button size="sm" variant="outline-danger" disabled={saving} onClick={() => run(() => recruitmentCommand(`/api/v1/recruitment/licenses/${item.id}/verify`, 'PATCH', { verification_status: 'rejected' }), 'Driving licence marked rejected.')}>Reject</Button></div>}</div>)}</CardBody></Card></Col></Row>

  const academy = <Row className="g-3"><Col lg={draft ? 12 : 6}><Card><CardHeader><CardTitle as="h5">{draft ? 'Score academy evaluation' : 'Open academy evaluation'}</CardTitle></CardHeader><CardBody>{draft ? <Form onSubmit={submitEvaluation}>{draft.criteria.map((criterion, index) => <Row className="g-2 align-items-end border-bottom py-2" key={criterion.id}><Col md={4}><span className="fw-semibold d-block">{criterion.name}</span><small className="text-muted">0–{criterion.maximum_score}{criterion.is_required ? ' · required' : ''}</small></Col><Col md={2}><Form.Label className="small">Score</Form.Label><Form.Control required={!scores[index]?.not_applicable} disabled={scores[index]?.not_applicable} type="number" min="0" max={criterion.maximum_score} value={scores[index]?.score ?? ''} onChange={(event) => setScore(index, { score: event.target.value })} /></Col><Col md={2}><Form.Check className="mt-4" disabled={criterion.is_required} checked={scores[index]?.not_applicable ?? false} onChange={(event) => setScore(index, { not_applicable: event.target.checked })} label="N/A" /></Col><Col md={2}>{criterion.is_critical_safety && <Form.Check className="mt-4" checked={scores[index]?.critical_failure ?? false} onChange={(event) => setScore(index, { critical_failure: event.target.checked })} label="Critical fail" />}</Col><Col md={2}><Form.Control placeholder="Observation" value={scores[index]?.observation ?? ''} onChange={(event) => setScore(index, { observation: event.target.value })} /></Col></Row>)}<Button className="mt-3" type="submit" disabled={saving}>Finalize assessment</Button></Form> : <Form onSubmit={startEvaluation}><Form.Label>Active template</Form.Label><Form.Select required value={evaluationTemplate} onChange={(event) => setEvaluationTemplate(event.target.value)}>{profile.templates.length ? profile.templates.map((template) => <option key={template.id} value={template.id}>{template.name} · v{template.version_number}</option>) : <option value="">No compatible active template</option>}</Form.Select><Button className="mt-3" type="submit" disabled={saving || !evaluationTemplate}>Open assessment</Button></Form>}</CardBody></Card></Col><Col lg={draft ? 12 : 6}><Card><CardHeader><CardTitle as="h5">Assessment history</CardTitle></CardHeader><CardBody>{profile.evaluations.length ? <div className="table-responsive"><Table size="sm" className="mb-0"><thead><tr><th>Attempt</th><th>Template</th><th>Outcome</th><th>Score</th></tr></thead><tbody>{profile.evaluations.map((evaluation) => <tr key={evaluation.id}><td>{evaluation.attempt_number}</td><td>{evaluation.template}</td><td>{label(evaluation.outcome ?? evaluation.status)}</td><td>{evaluation.aggregate_basis_points === null ? '—' : `${(evaluation.aggregate_basis_points / 100).toFixed(2)}%`}</td></tr>)}</tbody></Table></div> : <p className="text-muted mb-0">No academy assessment has been started.</p>}</CardBody></Card></Col></Row>

  const visitAndReview = <Row className="g-3"><Col lg={6}><Card><CardHeader><CardTitle as="h5">Complete home visit</CardTitle></CardHeader><CardBody><Form onSubmit={submitVisit}><Row className="g-2"><Col md={6}><Form.Label>Actual visit time</Form.Label><Form.Control required type="datetime-local" value={visit.visited_at} onChange={(event) => setVisit({ ...visit, visited_at: event.target.value })} /></Col><Col md={6} className="d-flex align-items-end gap-3"><Form.Check checked={visit.address_confirmed} onChange={(event) => setVisit({ ...visit, address_confirmed: event.target.checked })} label="Address confirmed" /><Form.Check checked={visit.parking_confirmed} onChange={(event) => setVisit({ ...visit, parking_confirmed: event.target.checked })} label="Parking confirmed" /></Col><Col xs={12}><Form.Label>Objective observations</Form.Label><Form.Control required as="textarea" rows={4} value={visit.objective_observations} onChange={(event) => setVisit({ ...visit, objective_observations: event.target.value })} /></Col><Col xs={12}><Form.Label>Follow-up</Form.Label><Form.Control as="textarea" rows={2} value={visit.follow_up} onChange={(event) => setVisit({ ...visit, follow_up: event.target.value })} /></Col></Row><Button className="mt-3" type="submit" disabled={saving}>Confirm home visit</Button></Form><hr />{profile.home_visits.map((item) => <div className="border-bottom py-2" key={item.id}><span className="fw-semibold">Attempt {item.attempt_number}: {label(item.status)}</span><small className="d-block text-muted">{item.objective_observations}</small></div>)}</CardBody></Card></Col><Col lg={6}><Card><CardHeader><CardTitle as="h5">Final review</CardTitle></CardHeader><CardBody><Form onSubmit={submitReview}><Form.Label>Reviewer notes</Form.Label><Form.Control required as="textarea" rows={6} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} /><Button className="mt-3" type="submit" disabled={saving || application.status !== 'review'}>Record final review</Button></Form>{profile.review && <div className="mt-3 pt-3 border-top"><Badge bg={profile.review.status === 'ready' ? 'success' : 'warning'}>{label(profile.review.status)}</Badge><p className="small mt-2 mb-0">{profile.review.outstanding_conditions ?? 'No outstanding conditions recorded.'}</p></div>}</CardBody></Card></Col></Row>

  return <><Row className="align-items-center mb-3"><Col><div className="d-flex align-items-center gap-2"><h4 className="mb-0 fw-bold">{application.name}</h4><Badge bg="light" text="dark">{label(application.status)}</Badge></div><p className="mb-0 text-muted">Protected applicant command centre. Each stage is authorized and validated by Laravel before the workflow can advance.</p></Col><Col xs="auto"><Button variant="light" onClick={() => router.push('/recruitment/applicants')}>All applicants</Button></Col></Row>{error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}{notice && <Alert variant="success" dismissible onClose={() => setNotice(null)}>{notice}</Alert>}<Tabs defaultActiveKey="overview" className="mb-3" justify><Tab eventKey="overview" title="Overview">{overview}</Tab><Tab eventKey="verification" title="Verification">{verification}</Tab><Tab eventKey="academy" title="Academy">{academy}</Tab><Tab eventKey="home-visit" title="Home visit">{visitAndReview}</Tab></Tabs></>
}

export default ApplicantCommandCenter
