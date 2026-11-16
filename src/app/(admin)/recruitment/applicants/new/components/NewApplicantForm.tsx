'use client'

import { ApiError, createRecruitmentApplicant, type RecruitmentApplicantInput } from '@/lib/api/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Alert, Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Row } from 'react-bootstrap'

type Props = { entities: Array<{ id: number; name: string }> }
const errorMessage = (error: unknown): string => error instanceof ApiError ? Object.values(error.errors ?? {}).flat()[0] ?? error.message : 'Unable to create the applicant.'

const NewApplicantForm = ({ entities }: Props) => {
  const router = useRouter()
  const [form, setForm] = useState<RecruitmentApplicantInput>({ entity_id: entities.length === 1 ? entities[0].id : 0, first_name: '', last_name: '', primary_phone: '', secondary_phone: '', email: '', vehicle_class: 'motorcycle', payment_method: 'mobile_money', district: '', address: '', landmark: '', maps_link: '', has_consent: false })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof RecruitmentApplicantInput>(key: K, value: RecruitmentApplicantInput[K]) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const applicant = await createRecruitmentApplicant(form)
      router.push(`/recruitment/applicants/${applicant.id}`)
      router.refresh()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return <Card><CardHeader><CardTitle as="h4">Register applicant</CardTitle></CardHeader><CardBody><Form onSubmit={submit}><p className="text-muted">Start with the applicant’s real details and consent. The protected profile guides verification, academy, home visit and final review without exposing unsafe status controls.</p>{error && <Alert variant="danger">{error}</Alert>}<Row className="g-3"><Col md={6}><Form.Label>Operating entity</Form.Label><Form.Select required value={form.entity_id || ''} onChange={(event) => set('entity_id', Number(event.target.value))}><option value="">Select entity</option>{entities.map((entity) => <option value={entity.id} key={entity.id}>{entity.name}</option>)}</Form.Select></Col><Col md={6}><Form.Label>Intended vehicle class</Form.Label><Form.Select value={form.vehicle_class} onChange={(event) => set('vehicle_class', event.target.value as RecruitmentApplicantInput['vehicle_class'])}><option value="motorcycle">Motorcycle / boda</option><option value="car">Car</option></Form.Select></Col><Col md={6}><Form.Label>First name</Form.Label><Form.Control required autoComplete="given-name" value={form.first_name} onChange={(event) => set('first_name', event.target.value)} /></Col><Col md={6}><Form.Label>Last name</Form.Label><Form.Control required autoComplete="family-name" value={form.last_name} onChange={(event) => set('last_name', event.target.value)} /></Col><Col md={6}><Form.Label>Primary phone</Form.Label><Form.Control required value={form.primary_phone} onChange={(event) => set('primary_phone', event.target.value)} /></Col><Col md={6}><Form.Label>Secondary phone</Form.Label><Form.Control value={form.secondary_phone ?? ''} onChange={(event) => set('secondary_phone', event.target.value)} /></Col><Col md={6}><Form.Label>Email</Form.Label><Form.Control type="email" value={form.email ?? ''} onChange={(event) => set('email', event.target.value)} /></Col><Col md={6}><Form.Label>Preferred payment method</Form.Label><Form.Select value={form.payment_method ?? ''} onChange={(event) => set('payment_method', event.target.value as RecruitmentApplicantInput['payment_method'])}><option value="mobile_money">Mobile money</option><option value="bank">Bank</option><option value="cash">Cash</option></Form.Select></Col><Col md={6}><Form.Label>District</Form.Label><Form.Control value={form.district ?? ''} onChange={(event) => set('district', event.target.value)} /></Col><Col md={6}><Form.Label>Landmark</Form.Label><Form.Control value={form.landmark ?? ''} onChange={(event) => set('landmark', event.target.value)} /></Col><Col xs={12}><Form.Label>Address</Form.Label><Form.Control value={form.address ?? ''} onChange={(event) => set('address', event.target.value)} /></Col><Col xs={12}><Form.Check required checked={form.has_consent} onChange={(event) => set('has_consent', event.target.checked)} label="Applicant has consented to recruitment checks" /></Col></Row><div className="d-flex gap-2 justify-content-end mt-4"><Button variant="light" type="button" onClick={() => router.back()} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create and continue'}</Button></div></Form></CardBody></Card>
}

export default NewApplicantForm
