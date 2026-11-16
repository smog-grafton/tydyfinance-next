import { headers } from 'next/headers'
import { cache } from 'react'

import type {
  ApiEnvelope,
  AuthenticatedUser,
  FinanceSetupData,
  FinanceWorkspaceData,
  FleetFinanceWorkspaceData,
  FleetOperationsWorkspaceData,
  FleetVehicleDetailData,
  ManagementWorkspaceData,
  OwnerDashboardData,
  PlanningWorkspaceData,
  RecruitmentWorkspaceData,
  RecruitmentApplicantDetail,
  DriverOperationsWorkspaceData,
  DriverOperationsDriverDetail,
} from './types'

const laravelUrl = process.env.NEXT_PUBLIC_LARAVEL_URL ?? 'http://localhost:8000'
const nextUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const laravelServerRequest = async <T>(path: string): Promise<Response> => {
  const requestHeaders = headers()
  const cookie = requestHeaders.get('cookie')

  return fetch(new URL(path, laravelUrl), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      Referer: `${nextUrl}/`,
      'X-Requested-With': 'XMLHttpRequest',
    },
  })
}

// React scopes this cache to the server render. The protected layout and a
// role-aware page can therefore share one Laravel /auth/me request without
// caching a user's session across requests.
export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const response = await laravelServerRequest<AuthenticatedUser>('/api/v1/auth/me')

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error('Unable to verify the current session.')
  }

  const payload = (await response.json()) as ApiEnvelope<AuthenticatedUser>

  return payload.data
})

export type DashboardQuery = {
  entityId?: string
  from?: string
  until?: string
}

export const getOwnerDashboard = async (query: DashboardQuery = {}): Promise<OwnerDashboardData | null> => {
  const search = new URLSearchParams()

  if (query.entityId) search.set('entity_id', query.entityId)
  if (query.from) search.set('from', query.from)
  if (query.until) search.set('until', query.until)

  const path = `/api/v1/dashboard/overview${search.size ? `?${search.toString()}` : ''}`
  const response = await laravelServerRequest<OwnerDashboardData>(path)

  if (response.status === 401 || response.status === 403) {
    return null
  }

  if (!response.ok) {
    throw new Error('Unable to load the Tydy Finance dashboard.')
  }

  const payload = (await response.json()) as ApiEnvelope<OwnerDashboardData>

  return payload.data
}

export const getFinanceWorkspace = async (query: DashboardQuery = {}): Promise<FinanceWorkspaceData | null> => {
  const search = new URLSearchParams()

  if (query.entityId) search.set('entity_id', query.entityId)
  if (query.from) search.set('from', query.from)
  if (query.until) search.set('until', query.until)

  const path = `/api/v1/finance/workspace${search.size ? `?${search.toString()}` : ''}`
  const response = await laravelServerRequest<FinanceWorkspaceData>(path)

  if (response.status === 401 || response.status === 403) {
    return null
  }

  if (!response.ok) {
    throw new Error('Unable to load the finance workspace.')
  }

  const payload = (await response.json()) as ApiEnvelope<FinanceWorkspaceData>

  return payload.data
}

export const getFinanceSetup = async (): Promise<FinanceSetupData | null> => {
  const response = await laravelServerRequest<FinanceSetupData>('/api/v1/finance/setup')

  if (response.status === 401 || response.status === 403) {
    return null
  }

  if (!response.ok) {
    throw new Error('Unable to load finance setup.')
  }

  const payload = (await response.json()) as ApiEnvelope<FinanceSetupData>

  return payload.data
}

export const getPlanningWorkspace = async (entityId?: string): Promise<PlanningWorkspaceData | null> => {
  const path = entityId ? `/api/v1/planning/workspace?entity_id=${encodeURIComponent(entityId)}` : '/api/v1/planning/workspace'
  const response = await laravelServerRequest<PlanningWorkspaceData>(path)

  if (response.status === 401 || response.status === 403) return null
  if (!response.ok) throw new Error('Unable to load planning data.')

  return ((await response.json()) as ApiEnvelope<PlanningWorkspaceData>).data
}

export const getRecruitmentWorkspace = async (): Promise<RecruitmentWorkspaceData | null> => {
  const response = await laravelServerRequest<RecruitmentWorkspaceData>('/api/v1/recruitment/workspace')
  if (response.status === 401 || response.status === 403) return null
  if (!response.ok) throw new Error('Unable to load recruitment data.')
  return ((await response.json()) as ApiEnvelope<RecruitmentWorkspaceData>).data
}

export const getRecruitmentApplicant = async (applicationId: string): Promise<RecruitmentApplicantDetail | null> => {
  const response = await laravelServerRequest<RecruitmentApplicantDetail>(`/api/v1/recruitment/applications/${encodeURIComponent(applicationId)}`)
  if (response.status === 401 || response.status === 403 || response.status === 404) return null
  if (!response.ok) throw new Error('Unable to load the protected applicant profile.')

  return ((await response.json()) as ApiEnvelope<RecruitmentApplicantDetail>).data
}

export const getApprovedDrivers = async (): Promise<DriverOperationsWorkspaceData | null> => {
  const response = await laravelServerRequest<DriverOperationsWorkspaceData>('/api/v1/operations/drivers')
  if (response.status === 401 || response.status === 403) return null
  if (!response.ok) throw new Error('Unable to load approved driver operations.')
  return ((await response.json()) as ApiEnvelope<DriverOperationsWorkspaceData>).data
}

export const getApprovedDriver = async (driverId: string): Promise<DriverOperationsDriverDetail | null> => {
  const response = await laravelServerRequest<DriverOperationsDriverDetail>(`/api/v1/operations/drivers/${encodeURIComponent(driverId)}`)
  if (response.status === 401 || response.status === 403 || response.status === 404) return null
  if (!response.ok) throw new Error('Unable to load the protected driver profile.')
  return ((await response.json()) as ApiEnvelope<DriverOperationsDriverDetail>).data
}

export const getManagementWorkspace = async (): Promise<ManagementWorkspaceData | null> => {
  const response = await laravelServerRequest<ManagementWorkspaceData>('/api/v1/management/workspace')

  if (response.status === 401 || response.status === 403) return null
  if (!response.ok) throw new Error('Unable to load management records.')

  return ((await response.json()) as ApiEnvelope<ManagementWorkspaceData>).data
}

export const getFleetFinanceWorkspace = async (): Promise<FleetFinanceWorkspaceData | null> => {
  const response = await laravelServerRequest<FleetFinanceWorkspaceData>('/api/v1/fleet-finance/workspace')

  if (response.status === 401 || response.status === 403) return null
  if (!response.ok) throw new Error('Unable to load fleet finance records.')

  return ((await response.json()) as ApiEnvelope<FleetFinanceWorkspaceData>).data
}

export const getFleetOperationsWorkspace = async (query: DashboardQuery = {}): Promise<FleetOperationsWorkspaceData | null> => {
  const search = new URLSearchParams()

  if (query.entityId) search.set('entity_id', query.entityId)
  if (query.from) search.set('from', query.from)
  if (query.until) search.set('until', query.until)

  const path = `/api/v1/fleet/workspace${search.size ? `?${search.toString()}` : ''}`
  const response = await laravelServerRequest<FleetOperationsWorkspaceData>(path)

  if (response.status === 401 || response.status === 403) {
    return null
  }

  if (!response.ok) {
    throw new Error('Unable to load the fleet operations workspace.')
  }

  const payload = (await response.json()) as ApiEnvelope<FleetOperationsWorkspaceData>

  return payload.data
}

export const getFleetVehicleDetail = async (vehicleId: string): Promise<FleetVehicleDetailData | null> => {
  const response = await laravelServerRequest<FleetVehicleDetailData>(`/api/v1/fleet/vehicles/${encodeURIComponent(vehicleId)}`)

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Unable to load the vehicle operations history.')
  }

  const payload = (await response.json()) as ApiEnvelope<FleetVehicleDetailData>

  return payload.data
}
