'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { formatKampalaDate, formatUGX } from '@/lib/formatters'
import type { OwnerDashboardData } from '@/lib/api/types'
import type { ApexOptions } from 'apexcharts'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import ReactApexChart from 'react-apexcharts'
import { Card, CardBody, CardHeader, CardTitle, Col, Form, Row, Table } from 'react-bootstrap'

type OwnerDashboardProps = {
  dashboard: OwnerDashboardData
  selectedEntityId?: string
}

type MetricCardProps = {
  title: string
  amount: number
  detail: string
  icon: string
  tone: 'primary' | 'success' | 'warning' | 'danger'
}

const chartDate = (date: string): string =>
  new Intl.DateTimeFormat('en-UG', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Kampala',
  }).format(new Date(`${date}T00:00:00+03:00`))

const MetricCard = ({ title, amount, detail, icon, tone }: MetricCardProps) => (
  <Card className="h-100">
    <CardBody>
      <Row className="d-flex justify-content-center border-dashed-bottom pb-3">
        <Col xs={9}>
          <p className="text-dark mb-0 fw-semibold fs-14">{title}</p>
          <h3 className="mt-2 mb-0 fw-bold text-truncate" title={formatUGX(amount)}>
            {formatUGX(amount)}
          </h3>
        </Col>
        <Col xs={3} className="align-self-center">
          <div className={`d-flex justify-content-center align-items-center thumb-xl bg-${tone}-subtle rounded-circle mx-auto`}>
            <IconifyIcon icon={icon} className={`h2 align-self-center mb-0 text-${tone}`} />
          </div>
        </Col>
      </Row>

      <Card className="mb-3">
        <CardBody className="d-flex flex-wrap align-items-center gap-2">
          <span className="fw-semibold me-md-2">Quick operational actions</span>
          <Link className="btn btn-primary btn-sm" href="/fleet-finance/loan-repayments">
            <IconifyIcon icon="solar:banknote-bold-duotone" className="me-1" />
            Record loan repayment
          </Link>
          <Link className="btn btn-light btn-sm" href="/fleet-finance/remittances">
            <IconifyIcon icon="solar:cash-out-bold-duotone" className="me-1" />
            Collect remittance
          </Link>
          <Link className="btn btn-light btn-sm" href="/recruitment/applicants/new">
            <IconifyIcon icon="solar:user-plus-bold-duotone" className="me-1" />
            Recruit driver
          </Link>
          <Link className="btn btn-light btn-sm" href="/fleet-finance/acquire-vehicle">
            <IconifyIcon icon="solar:cart-large-2-bold-duotone" className="me-1" />
            Acquire vehicle
          </Link>
          <Link className="btn btn-light btn-sm" href="/planning/acquisition-simulations">
            <IconifyIcon icon="solar:target-bold-duotone" className="me-1" />
            Plan fleet goal
          </Link>
        </CardBody>
      </Card>
      <p className="mb-0 text-truncate text-muted mt-3">{detail}</p>
    </CardBody>
  </Card>
)

const EmptyState = ({ message }: { message: string }) => <p className="mb-0 py-4 text-center text-muted">{message}</p>

const OwnerDashboard = ({ dashboard, selectedEntityId = '' }: OwnerDashboardProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const [entityId, setEntityId] = useState(selectedEntityId)
  const [from, setFrom] = useState(dashboard.period.from)
  const [until, setUntil] = useState(dashboard.period.until)

  useEffect(() => {
    setEntityId(selectedEntityId)
    setFrom(dashboard.period.from)
    setUntil(dashboard.period.until)
  }, [dashboard.period.from, dashboard.period.until, selectedEntityId])

  const activityOptions = useMemo<ApexOptions>(
    () => ({
      chart: { height: 300, type: 'area', toolbar: { show: false } },
      colors: ['#22c55e', 'rgba(106, 155, 155, 0.55)'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: [3, 3], lineCap: 'round' },
      xaxis: {
        categories: dashboard.activity_trend.map((point) => chartDate(point.date)),
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { formatter: (value: number) => formatUGX(value) },
      },
      grid: { strokeDashArray: 3, yaxis: { lines: { show: false } } },
      legend: { position: 'top', horizontalAlign: 'right' },
      tooltip: { y: { formatter: (value: number) => formatUGX(value) } },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.22, opacityTo: 0.03, stops: [0, 100] } },
    }),
    [dashboard.activity_trend],
  )

  const remittanceOptions = useMemo<ApexOptions>(
    () => ({
      chart: { height: 250, type: 'bar', toolbar: { show: false } },
      colors: ['rgba(106, 155, 155, 0.48)', '#22c55e'],
      plotOptions: { bar: { columnWidth: '58%', borderRadius: 4 } },
      dataLabels: { enabled: false },
      xaxis: {
        categories: dashboard.remittances.trend.map((point) => chartDate(point.date)),
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { formatter: (value: number) => formatUGX(value) } },
      grid: { strokeDashArray: 3, yaxis: { lines: { show: false } } },
      legend: { position: 'top', horizontalAlign: 'right' },
      tooltip: { y: { formatter: (value: number) => formatUGX(value) } },
    }),
    [dashboard.remittances.trend],
  )

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
      <Row className="align-items-center mb-3">
        <Col>
          <h4 className="mb-1 fw-bold">Owner command centre</h4>
          <p className="mb-0 text-muted">Ledger-backed financial, fleet, remittance and financing position.</p>
        </Col>
        <Col lg="auto" className="mt-3 mt-lg-0">
          <Form onSubmit={applyFilters} className="d-flex flex-wrap gap-2 justify-content-lg-end">
            <Form.Select
              aria-label="Operating entity"
              value={entityId}
              onChange={(event) => setEntityId(event.target.value)}
              style={{ minWidth: 180 }}>
              <option value="">All active entities</option>
              {dashboard.entities.map((entity) => (
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

      <Row className="justify-content-center">
        <Col md={6} xl={3} className="mb-3">
          <MetricCard
            title="Available Cash"
            amount={dashboard.financial.available_cash}
            detail="After restricted and reserved cash"
            icon="solar:wallet-money-bold-duotone"
            tone="success"
          />
        </Col>
        <Col md={6} xl={3} className="mb-3">
          <MetricCard
            title="Cash Held"
            amount={dashboard.financial.cash_held}
            detail={`${dashboard.financial.account_count} active financial account${dashboard.financial.account_count === 1 ? '' : 's'}`}
            icon="solar:hand-money-bold-duotone"
            tone="primary"
          />
        </Col>
        <Col md={6} xl={3} className="mb-3">
          <MetricCard
            title="Reserved Cash"
            amount={dashboard.financial.reserved_cash}
            detail="Held against approved reserves"
            icon="solar:shield-check-bold-duotone"
            tone="warning"
          />
        </Col>
        <Col md={6} xl={3} className="mb-3">
          <MetricCard
            title="Net Cash Flow"
            amount={dashboard.financial.net_cash_flow}
            detail={`${formatKampalaDate(dashboard.period.from)} – ${formatKampalaDate(dashboard.period.until)}`}
            icon="solar:chart-2-bold-duotone"
            tone={dashboard.financial.net_cash_flow < 0 ? 'danger' : 'primary'}
          />
        </Col>
      </Row>

      <Row>
        <Col xl={8} className="mb-3">
          <Card className="h-100">
            <CardHeader>
              <Row className="align-items-center">
                <Col>
                  <CardTitle as="h4">Recognized income and expenses</CardTitle>
                  <p className="mb-0 mt-1 text-muted fs-13">Posted ledger activity for the selected period.</p>
                </Col>
                <Col xs="auto" className="text-end">
                  <span className="badge bg-light text-dark">UGX</span>
                </Col>
              </Row>
            </CardHeader>
            <CardBody className="pt-0">
              <ReactApexChart
                height={300}
                options={activityOptions}
                series={[
                  { name: 'Income', data: dashboard.activity_trend.map((point) => point.income) },
                  { name: 'Expenses', data: dashboard.activity_trend.map((point) => point.expenses) },
                ]}
                type="area"
              />
            </CardBody>
          </Card>
        </Col>
        <Col xl={4} className="mb-3">
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Remittances today</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="d-flex justify-content-between border-dashed-bottom py-3">
                <span className="text-muted">Expected</span>
                <span className="fw-semibold">{formatUGX(dashboard.remittances.expected_today)}</span>
              </div>
              <div className="d-flex justify-content-between border-dashed-bottom py-3">
                <span className="text-muted">Collected</span>
                <span className="fw-semibold text-success">{formatUGX(dashboard.remittances.collected_today)}</span>
              </div>
              <div className="d-flex justify-content-between border-dashed-bottom py-3">
                <span className="text-muted">Outstanding</span>
                <span className={`fw-semibold ${dashboard.remittances.outstanding_today > 0 ? 'text-danger' : 'text-success'}`}>
                  {formatUGX(dashboard.remittances.outstanding_today)}
                </span>
              </div>
              <div className="d-flex justify-content-between pt-3">
                <span className="text-muted">Historic arrears</span>
                <span className={`fw-semibold ${dashboard.remittances.arrears > 0 ? 'text-danger' : 'text-success'}`}>
                  {formatUGX(dashboard.remittances.arrears)}
                </span>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={5} className="mb-3">
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Driver remittance performance</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <ReactApexChart
                height={250}
                options={remittanceOptions}
                series={[
                  { name: 'Expected', data: dashboard.remittances.trend.map((point) => point.expected) },
                  { name: 'Collected', data: dashboard.remittances.trend.map((point) => point.collected) },
                ]}
                type="bar"
              />
            </CardBody>
          </Card>
        </Col>
        <Col xl={3} className="mb-3">
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Fleet position</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="d-flex align-items-end gap-2 mb-3">
                <h2 className="mb-0 fw-bold">{dashboard.fleet.active_vehicles}</h2>
                <span className="text-muted mb-1">active vehicles</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Assigned</span>
                <span className="fw-semibold">{dashboard.fleet.assigned_vehicles}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Available commercial</span>
                <span className="fw-semibold">{dashboard.fleet.unassigned_commercial_vehicles}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Under maintenance</span>
                <span className="fw-semibold">{dashboard.fleet.vehicles_under_maintenance}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Open faults</span>
                <span className={dashboard.fleet.open_faults > 0 ? 'fw-semibold text-danger' : 'fw-semibold text-success'}>
                  {dashboard.fleet.open_faults}
                </span>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={4} className="mb-3">
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Financing commitments</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="d-flex justify-content-between border-dashed-bottom py-2">
                <span className="text-muted">Active agreements</span>
                <span className="fw-semibold">{dashboard.financing.active_loans}</span>
              </div>
              <div className="d-flex justify-content-between border-dashed-bottom py-2">
                <span className="text-muted">Agreements in arrears</span>
                <span className={dashboard.financing.overdue_loans > 0 ? 'fw-semibold text-danger' : 'fw-semibold text-success'}>
                  {dashboard.financing.overdue_loans}
                </span>
              </div>
              <div className="d-flex justify-content-between border-dashed-bottom py-2">
                <span className="text-muted">Due in seven days</span>
                <span className="fw-semibold">{formatUGX(dashboard.financing.due_within_seven_days)}</span>
              </div>
              <div className="d-flex justify-content-between border-dashed-bottom py-2">
                <span className="text-muted">Scheduled repayments remaining</span>
                <span className="fw-semibold">{formatUGX(dashboard.financing.scheduled_repayments_remaining)}</span>
              </div>
              <div className="pt-3">
                <p className="text-muted mb-1 fs-13">Next installment</p>
                {dashboard.financing.next_installment ? (
                  <>
                    <h5 className="mb-1">{formatUGX(dashboard.financing.next_installment.amount_due)}</h5>
                    <span className="text-muted fs-13">Due {formatKampalaDate(dashboard.financing.next_installment.due_on)}</span>
                  </>
                ) : (
                  <span className="text-muted">No scheduled installment.</span>
                )}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={6} className="mb-3">
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Cash controls</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="d-flex justify-content-between border-dashed-bottom py-2">
                <span className="text-muted">Receivables outstanding</span>
                <span className="fw-semibold">{formatUGX(dashboard.financial.receivables)}</span>
              </div>
              <div className="d-flex justify-content-between border-dashed-bottom py-2">
                <span className="text-muted">Third-party restricted cash</span>
                <span className="fw-semibold">{formatUGX(dashboard.financial.third_party_restricted)}</span>
              </div>
              <div className="d-flex justify-content-between pt-2">
                <span className="text-muted">Accounts needing reconciliation</span>
                <span className={dashboard.financial.unreconciled_accounts > 0 ? 'fw-semibold text-warning' : 'fw-semibold text-success'}>
                  {dashboard.financial.unreconciled_accounts}
                </span>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={6} className="mb-3">
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Upcoming commitments</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              {dashboard.planning.upcoming_commitments.length === 0 ? (
                <EmptyState message="No scheduled commitments in the selected period." />
              ) : (
                <div className="table-responsive">
                  <Table className="mb-0" responsive>
                    <thead className="table-light">
                      <tr>
                        <th>Commitment</th>
                        <th>Due</th>
                        <th className="text-end">Funding gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.planning.upcoming_commitments.map((commitment) => (
                        <tr key={commitment.id}>
                          <td>
                            <span className="fw-semibold">{commitment.title}</span>
                          </td>
                          <td>{formatKampalaDate(commitment.due_on)}</td>
                          <td className="text-end">{formatUGX(commitment.funding_gap)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default OwnerDashboard
