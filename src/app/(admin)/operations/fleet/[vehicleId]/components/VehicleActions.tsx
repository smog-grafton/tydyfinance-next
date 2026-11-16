'use client'

import VehicleEditorModal from '@/components/fleet/VehicleEditorModal'
import { ApiError, deleteFleetVehicle } from '@/lib/api/client'
import type { FleetVehicleDetailData } from '@/lib/api/types'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Alert, Button, Modal, Spinner } from 'react-bootstrap'

type VehicleActionsProps = {
  workspace: FleetVehicleDetailData
  canManage: boolean
  canDelete: boolean
}

const VehicleActions = ({ workspace, canManage, canDelete }: VehicleActionsProps) => {
  const router = useRouter()
  const [showEditor, setShowEditor] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (!canManage) return null

  const confirmDelete = async () => {
    setDeleteError(null)
    setDeleting(true)

    try {
      await deleteFleetVehicle(workspace.vehicle.id)
      router.replace('/operations/fleet')
    } catch (error) {
      if (error instanceof ApiError) {
        setDeleteError(error.errors?.vehicle?.[0] ?? error.message)
      } else {
        setDeleteError('Unable to delete this vehicle.')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="d-flex gap-2">
        <Button size="sm" variant="primary" onClick={() => setShowEditor(true)}>
          <IconifyIcon icon="solar:pen-new-square-bold-duotone" className="me-1" /> Edit vehicle
        </Button>
        {canDelete && (
          <Button size="sm" variant="outline-danger" onClick={() => { setDeleteError(null); setShowDelete(true) }}>
            <IconifyIcon icon="solar:trash-bin-trash-bold-duotone" className="me-1" /> Delete
          </Button>
        )}
      </div>

      <VehicleEditorModal
        show={showEditor}
        onHide={() => setShowEditor(false)}
        vehicleId={workspace.vehicle.id}
        entities={[]}
        onSaved={() => router.refresh()}
      />

      <Modal show={showDelete} onHide={deleting ? undefined : () => setShowDelete(false)} centered>
        <Modal.Header closeButton={!deleting}><Modal.Title>Delete {workspace.vehicle.asset_reference}?</Modal.Title></Modal.Header>
        <Modal.Body>
          <p>This is permanent. Deletion is allowed only when the vehicle has no financial or operational history.</p>
          <p className="mb-0 text-muted">Vehicles with assignments, remittances, maintenance, faults, documents, acquisition or finance records are preserved for audit history.</p>
          {deleteError && <Alert variant="danger" className="mt-3 mb-0">{deleteError}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowDelete(false)} disabled={deleting}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting && <Spinner animation="border" size="sm" className="me-2" />} Delete vehicle
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default VehicleActions
