'use client'

import { ApiError, createFleetVehicle, getFleetVehicleForManagement, type FleetVehicleInput, updateFleetVehicle } from '@/lib/api/client'
import type { FleetVehicleDetailData } from '@/lib/api/types'
import { useEffect, useState } from 'react'
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap'

type EntityOption = {
  id: number
  name: string
}

type VehicleEditorModalProps = {
  show: boolean
  onHide: () => void
  vehicleId?: number
  entities: EntityOption[]
  defaultEntityId?: string
  onSaved: (vehicle: FleetVehicleDetailData) => void
}

type VehicleForm = {
  entityId: string
  manufacturer: string
  model: string
  modelYear: string
  vehicleType: FleetVehicleInput['vehicle_type']
  propulsionType: FleetVehicleInput['propulsion_type']
  usageType: FleetVehicleInput['usage_type']
  registrationNumber: string
  vin: string
  engineNumber: string
  currentOdometer: string
  purchaseDate: string
}

const initialForm = (entityId = ''): VehicleForm => ({
  entityId,
  manufacturer: '',
  model: '',
  modelYear: '',
  vehicleType: 'motorcycle',
  propulsionType: 'petrol',
  usageType: 'commercial',
  registrationNumber: '',
  vin: '',
  engineNumber: '',
  currentOdometer: '',
  purchaseDate: '',
})

const optionalInteger = (value: string): number | null => (value.trim() === '' ? null : Number(value))
const optionalString = (value: string): string | null => (value.trim() === '' ? null : value.trim())

const VehicleEditorModal = ({ show, onHide, vehicleId, entities: suppliedEntities, defaultEntityId, onSaved }: VehicleEditorModalProps) => {
  const [entities, setEntities] = useState<EntityOption[]>(suppliedEntities)
  const [form, setForm] = useState<VehicleForm>(() => initialForm(defaultEntityId))
  const [loading, setLoading] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = vehicleId !== undefined

  useEffect(() => {
    if (!show) return

    let active = true
    setError(null)

    if (!isEdit) {
      setEntities(suppliedEntities)
      setForm(initialForm(defaultEntityId))
      return () => {
        active = false
      }
    }

    setLoadingDetails(true)
    void getFleetVehicleForManagement(vehicleId)
      .then((vehicle) => {
        if (!active) return

        setEntities(vehicle.entities)
        setForm({
          entityId: String(vehicle.entity_id),
          manufacturer: vehicle.manufacturer,
          model: vehicle.model,
          modelYear: vehicle.model_year === null ? '' : String(vehicle.model_year),
          vehicleType: vehicle.vehicle_type,
          propulsionType: vehicle.propulsion_type,
          usageType: vehicle.usage_type,
          registrationNumber: vehicle.registration_number ?? '',
          vin: vehicle.vin ?? '',
          engineNumber: vehicle.engine_number ?? '',
          currentOdometer: vehicle.current_odometer === null ? '' : String(vehicle.current_odometer),
          purchaseDate: vehicle.purchase_date ?? '',
        })
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load the secure vehicle edit form.')
      })
      .finally(() => {
        if (active) setLoadingDetails(false)
      })

    return () => {
      active = false
    }
  }, [defaultEntityId, isEdit, show, suppliedEntities, vehicleId])

  const setValue = <Key extends keyof VehicleForm>(key: Key, value: VehicleForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const entityId = Number(form.entityId)
    const modelYear = optionalInteger(form.modelYear)
    const currentOdometer = optionalInteger(form.currentOdometer)

    if (!entityId || !form.manufacturer.trim() || !form.model.trim() || Number.isNaN(modelYear ?? 0) || Number.isNaN(currentOdometer ?? 0)) {
      setError('Choose an entity and provide valid vehicle details.')
      return
    }

    const input: FleetVehicleInput = {
      entity_id: entityId,
      manufacturer: form.manufacturer.trim(),
      model: form.model.trim(),
      model_year: modelYear,
      vehicle_type: form.vehicleType,
      propulsion_type: form.propulsionType,
      usage_type: form.usageType,
      registration_number: optionalString(form.registrationNumber),
      vin: optionalString(form.vin),
      engine_number: optionalString(form.engineNumber),
      current_odometer: currentOdometer,
      purchase_date: optionalString(form.purchaseDate),
    }

    setLoading(true)
    try {
      const vehicle = isEdit ? await updateFleetVehicle(vehicleId, input) : await createFleetVehicle(input)
      onSaved(vehicle)
      onHide()
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.errors?.vehicle?.[0] ?? Object.values(requestError.errors ?? {}).flat()[0] ?? requestError.message)
      } else {
        setError('Unable to save this vehicle. Please retry.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={loading ? undefined : onHide} centered size="lg">
      <Form onSubmit={submit}>
        <Modal.Header closeButton={!loading}>
          <Modal.Title>{isEdit ? 'Edit vehicle profile' : 'Register vehicle'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!isEdit && <Alert variant="info">Direct registration creates an available, outright, non-financed vehicle. Use the acquisition workflow for financed purchases so ledger evidence and schedules remain correct.</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          {loadingDetails ? (
            <div className="py-5 text-center"><Spinner animation="border" /><p className="text-muted mt-2 mb-0">Loading secure vehicle details…</p></div>
          ) : (
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Operating entity</Form.Label>
                <Form.Select value={form.entityId} onChange={(event) => setValue('entityId', event.target.value)} required disabled={loading}>
                  <option value="">Select an entity</option>
                  {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>Usage</Form.Label>
                <Form.Select value={form.usageType} onChange={(event) => setValue('usageType', event.target.value as VehicleForm['usageType'])} disabled={loading}>
                  <option value="commercial">Commercial</option><option value="personal">Personal</option><option value="mixed">Mixed</option><option value="inactive">Inactive</option>
                </Form.Select>
              </Col>
              <Col md={6}><Form.Label>Make</Form.Label><Form.Control value={form.manufacturer} onChange={(event) => setValue('manufacturer', event.target.value)} required disabled={loading} /></Col>
              <Col md={6}><Form.Label>Model</Form.Label><Form.Control value={form.model} onChange={(event) => setValue('model', event.target.value)} required disabled={loading} /></Col>
              <Col md={4}>
                <Form.Label>Vehicle type</Form.Label>
                <Form.Select value={form.vehicleType} onChange={(event) => setValue('vehicleType', event.target.value as VehicleForm['vehicleType'])} disabled={loading}>
                  <option value="motorcycle">Motorcycle</option><option value="car">Car</option>
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>Propulsion</Form.Label>
                <Form.Select value={form.propulsionType} onChange={(event) => setValue('propulsionType', event.target.value as VehicleForm['propulsionType'])} disabled={loading}>
                  <option value="petrol">Petrol</option><option value="electric">Electric</option><option value="hybrid">Hybrid</option><option value="other">Other</option>
                </Form.Select>
              </Col>
              <Col md={4}><Form.Label>Model year</Form.Label><Form.Control type="number" min="1900" max="2100" value={form.modelYear} onChange={(event) => setValue('modelYear', event.target.value)} disabled={loading} /></Col>
              <Col md={6}><Form.Label>Current odometer</Form.Label><Form.Control type="number" min="0" value={form.currentOdometer} onChange={(event) => setValue('currentOdometer', event.target.value)} disabled={loading} /></Col>
              <Col md={6}><Form.Label>Purchase date</Form.Label><Form.Control type="date" value={form.purchaseDate} onChange={(event) => setValue('purchaseDate', event.target.value)} disabled={loading} /></Col>
              <Col md={6}><Form.Label>Registration number</Form.Label><Form.Control value={form.registrationNumber} onChange={(event) => setValue('registrationNumber', event.target.value)} disabled={loading} /></Col>
              <Col md={6}><Form.Label>VIN</Form.Label><Form.Control value={form.vin} onChange={(event) => setValue('vin', event.target.value)} disabled={loading} /></Col>
              <Col md={12}><Form.Label>Engine number</Form.Label><Form.Control value={form.engineNumber} onChange={(event) => setValue('engineNumber', event.target.value)} disabled={loading} /></Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={loading}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={loading || loadingDetails}>
            {loading && <Spinner animation="border" size="sm" className="me-2" />} {isEdit ? 'Save changes' : 'Register vehicle'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default VehicleEditorModal
