'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import type { QuickAccessContext } from '@/lib/api/types'
import { Alert, Badge, Card, CardBody } from 'react-bootstrap'

const QuickShell = ({ title, subtitle, context, loading, error, children }: { title: string; subtitle: string; context: QuickAccessContext | null; loading: boolean; error: string | null; children: React.ReactNode }) => (
  <main className="min-vh-100 d-flex align-items-start py-4 py-sm-5 px-3" style={{ background: 'var(--bs-body-bg)' }}>
    <div className="container" style={{ maxWidth: 620 }}>
      <div className="d-flex align-items-center gap-2 mb-4">
        <div className="rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center" style={{ width: 44, height: 44 }}>
          <IconifyIcon icon="solar:bolt-bold-duotone" className="fs-4" />
        </div>
        <div>
          <div className="fw-bold">Tydy Finance</div>
          <small className="text-muted">Secure quick entry</small>
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <CardBody className="p-3 p-sm-4">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-4">
            <div>
              <h2 className="h4 mb-1">{title}</h2>
              <p className="text-muted mb-0">{subtitle}</p>
            </div>
            {context && <Badge bg="light" text="dark" className="py-2 px-3">{context.credential.display_name}</Badge>}
          </div>
          {loading && <div className="py-5 text-center text-muted">Opening secure entry…</div>}
          {error && <Alert variant="danger" className="mb-0">{error}</Alert>}
          {!loading && !error && children}
        </CardBody>
      </Card>
      <p className="small text-muted text-center mt-3 mb-0">This session is limited to its configured operation and financial entities.</p>
    </div>
  </main>
)

export default QuickShell
