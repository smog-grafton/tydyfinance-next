'use client'

import type { ApiEnvelope, ApiValidationErrors, AuthenticatedUser, FinanceSetupData, FleetVehicleDetailData, FleetVehicleManageData, OperationalNotification, OperationalNotificationPage, QuickAccessContext, QuickAccessCredential, QuickAccessOperation, QuickDriverSearchResult, QuickRemittanceContext } from './types'

const laravelUrl = process.env.NEXT_PUBLIC_LARAVEL_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: ApiValidationErrors,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const getXsrfToken = (): string | undefined => {
  const token = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
    ?.split('=')
    .slice(1)
    .join('=')

  return token ? decodeURIComponent(token) : undefined
}

const getJson = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => undefined)

  if (!response.ok) {
    const error = body as { message?: string; errors?: ApiValidationErrors } | undefined
    throw new ApiError(error?.message ?? 'The request could not be completed.', response.status, error?.errors)
  }

  return body as T
}

export const initializeCsrfProtection = async (): Promise<void> => {
  const response = await fetch(new URL('/sanctum/csrf-cookie', laravelUrl), {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok && response.status !== 204) {
    throw new ApiError('Unable to initialise secure sign-in.', response.status)
  }
}

export const laravelRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)

  headers.set('Accept', 'application/json')
  headers.set('X-Requested-With', 'XMLHttpRequest')

  if (init.body && !headers.has('Content-Type') && (typeof FormData === 'undefined' || !(init.body instanceof FormData))) {
    headers.set('Content-Type', 'application/json')
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const xsrfToken = getXsrfToken()

    if (xsrfToken) {
      headers.set('X-XSRF-TOKEN', xsrfToken)
    }
  }

  const response = await fetch(new URL(path, laravelUrl), {
    ...init,
    headers,
    credentials: 'include',
  })

  return getJson<T>(response)
}

const quickCsrfToken = (): string | undefined => {
  const token = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('tydy_quick_csrf='))
    ?.split('=')
    .slice(1)
    .join('=')

  return token ? decodeURIComponent(token) : undefined
}

const quickAccessRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  headers.set('X-Requested-With', 'XMLHttpRequest')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = quickCsrfToken()
    if (!csrf) throw new ApiError('Your secure quick-entry session has expired. Reopen the link and try again.', 401)
    headers.set('X-Quick-Access-CSRF', csrf)
  }

  const response = await fetch(new URL(path, laravelUrl), { ...init, headers, credentials: 'include', cache: 'no-store' })
  return getJson<T>(response)
}

export const getQuickAccessContext = async (operation: QuickAccessOperation): Promise<QuickAccessContext> => {
  const response = await quickAccessRequest<ApiEnvelope<QuickAccessContext>>(`/api/v1/quick-access/${operation}/context`)
  return response.data
}

export const recordQuickIncome = async (input: Record<string, unknown>, idempotencyKey: string) =>
  quickAccessRequest<ApiEnvelope<{ id: number; amount: number; reference: string | null; occurred_at: string; account: string }>>('/api/v1/quick-access/income', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(input) })

export const recordQuickExpense = async (input: Record<string, unknown>, idempotencyKey: string) =>
  quickAccessRequest<ApiEnvelope<{ id: number; amount: number; reference: string | null; occurred_at: string; account: string }>>('/api/v1/quick-access/expense', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(input) })

export const recordQuickLoanPayment = async (input: Record<string, unknown>, idempotencyKey: string) =>
  quickAccessRequest<ApiEnvelope<{ id: number; amount: number; status: string; agreement: string; account: string }>>('/api/v1/quick-access/loan-payment', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(input) })

export const searchQuickRemittanceDrivers = async (query: string): Promise<QuickDriverSearchResult[]> => {
  const response = await quickAccessRequest<ApiEnvelope<QuickDriverSearchResult[]>>(`/api/v1/quick-access/remittance/drivers?query=${encodeURIComponent(query)}`)
  return response.data
}

export const getQuickRemittanceContext = async (contractId: number): Promise<QuickRemittanceContext> => {
  const response = await quickAccessRequest<ApiEnvelope<QuickRemittanceContext>>(`/api/v1/quick-access/remittance/contracts/${contractId}`)
  return response.data
}

export const recordQuickRemittance = async (input: Record<string, unknown>, idempotencyKey: string) =>
  quickAccessRequest<ApiEnvelope<{ id: number; amount: number; status: string; driver: string; contract: string; account: string }>>('/api/v1/quick-access/remittance', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(input) })

export const getQuickAccessCredentials = async (): Promise<QuickAccessCredential[]> => {
  const response = await laravelRequest<ApiEnvelope<QuickAccessCredential[]>>('/api/v1/settings/quick-access')
  return response.data
}

export const getFinanceSetupForClient = async (): Promise<FinanceSetupData> => {
  const response = await laravelRequest<ApiEnvelope<FinanceSetupData>>('/api/v1/finance/setup')
  return response.data
}

export const createQuickAccessCredential = async (input: Record<string, unknown>): Promise<QuickAccessCredential> => {
  const response = await laravelRequest<ApiEnvelope<QuickAccessCredential>>('/api/v1/settings/quick-access', { method: 'POST', body: JSON.stringify(input) })
  return response.data
}

export const rotateQuickAccessCredential = async (credentialId: number): Promise<QuickAccessCredential> => {
  const response = await laravelRequest<ApiEnvelope<QuickAccessCredential>>(`/api/v1/settings/quick-access/${credentialId}/rotate`, { method: 'POST' })
  return response.data
}

export const revokeQuickAccessCredential = async (credentialId: number): Promise<void> => {
  await laravelRequest(`/api/v1/settings/quick-access/${credentialId}`, { method: 'DELETE' })
}

export const loginWithLaravel = async (credentials: { email: string; password: string; remember: boolean }): Promise<AuthenticatedUser> => {
  await initializeCsrfProtection()

  const response = await laravelRequest<ApiEnvelope<AuthenticatedUser>>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })

  return response.data
}

export const logout = async (): Promise<void> => {
  await laravelRequest<undefined>('/api/v1/auth/logout', { method: 'POST' })
}

export const getOperationalNotifications = async (input: {
  status?: 'all' | 'unread' | 'read' | 'dismissed'
  category?: 'planning' | 'finance' | 'operations'
  perPage?: number
} = {}): Promise<OperationalNotificationPage> => {
  const search = new URLSearchParams()
  if (input.status) search.set('status', input.status)
  if (input.category) search.set('category', input.category)
  if (input.perPage) search.set('per_page', String(input.perPage))

  const response = await laravelRequest<ApiEnvelope<OperationalNotification[]>>(`/api/v1/notifications${search.size ? `?${search.toString()}` : ''}`)
  const meta = response.meta as OperationalNotificationPage['meta'] | undefined

  return {
    items: response.data,
    meta: meta ?? { current_page: 1, last_page: 1, per_page: input.perPage ?? 30, total: response.data.length, unread_count: 0 },
  }
}

export const markOperationalNotificationRead = async (notificationId: number): Promise<OperationalNotification> => {
  const response = await laravelRequest<ApiEnvelope<OperationalNotification>>(`/api/v1/notifications/${notificationId}/read`, { method: 'PATCH' })
  return response.data
}

export const markAllOperationalNotificationsRead = async (): Promise<number> => {
  const response = await laravelRequest<ApiEnvelope<{ marked_read: number }>>('/api/v1/notifications/read-all', { method: 'PATCH' })
  return response.data.marked_read
}

export const dismissOperationalNotification = async (notificationId: number): Promise<OperationalNotification> => {
  const response = await laravelRequest<ApiEnvelope<OperationalNotification>>(`/api/v1/notifications/${notificationId}/dismiss`, { method: 'PATCH' })
  return response.data
}

export type FleetVehicleInput = {
  entity_id: number
  manufacturer: string
  model: string
  model_year: number | null
  vehicle_type: 'motorcycle' | 'car'
  propulsion_type: 'petrol' | 'electric' | 'hybrid' | 'other'
  usage_type: 'personal' | 'commercial' | 'mixed' | 'inactive'
  registration_number: string | null
  vin: string | null
  engine_number: string | null
  current_odometer: number | null
  purchase_date: string | null
}

export const getFleetVehicleForManagement = async (vehicleId: number): Promise<FleetVehicleManageData> => {
  const response = await laravelRequest<ApiEnvelope<FleetVehicleManageData>>(`/api/v1/fleet/vehicles/${vehicleId}/manage`)

  return response.data
}

export const createFleetVehicle = async (input: FleetVehicleInput): Promise<FleetVehicleDetailData> => {
  const response = await laravelRequest<ApiEnvelope<FleetVehicleDetailData>>('/api/v1/fleet/vehicles', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  return response.data
}

export const updateFleetVehicle = async (vehicleId: number, input: FleetVehicleInput): Promise<FleetVehicleDetailData> => {
  const response = await laravelRequest<ApiEnvelope<FleetVehicleDetailData>>(`/api/v1/fleet/vehicles/${vehicleId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

  return response.data
}

export const deleteFleetVehicle = async (vehicleId: number): Promise<void> => {
  await laravelRequest<undefined>(`/api/v1/fleet/vehicles/${vehicleId}`, { method: 'DELETE' })
}

export type MoneyMovementInput = {
  type: 'receive' | 'spend' | 'transfer'
  from_financial_account_id?: number
  to_financial_account_id?: number
  counterpart_ledger_account_id?: number
  financial_category_id?: number
  income_source_id?: number
  transfer_fee_amount?: number
  fee_financial_category_id?: number
  amount: number
  occurred_at: string
  reference?: string
  counterparty_name?: string
  description: string
}

export const recordMoneyMovement = async (input: MoneyMovementInput, idempotencyKey: string): Promise<void> => {
  await laravelRequest('/api/v1/finance/movements', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  })
}

export type FinancialEntityInput = {
  name: string
  type: 'personal' | 'business'
  is_active: boolean
}

export type LedgerAccountInput = {
  entity_id: number
  code: string
  name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  is_active: boolean
}

export type FinancialAccountInput = {
  entity_id: number
  ledger_account_id: number
  name: string
  account_type: 'cash' | 'mobile_money' | 'bank'
  institution: string | null
  reference_hint: string | null
  is_active: boolean
}

export const createFinancialEntity = async (input: FinancialEntityInput): Promise<FinanceSetupData['entities'][number]> => {
  const response = await laravelRequest<ApiEnvelope<FinanceSetupData['entities'][number]>>('/api/v1/finance/entities', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  return response.data
}

export const updateFinancialEntity = async (
  entityId: number,
  input: Pick<FinancialEntityInput, 'name' | 'is_active'>,
): Promise<FinanceSetupData['entities'][number]> => {
  const response = await laravelRequest<ApiEnvelope<FinanceSetupData['entities'][number]>>(`/api/v1/finance/entities/${entityId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

  return response.data
}

export const createLedgerAccount = async (input: LedgerAccountInput): Promise<FinanceSetupData['ledger_accounts'][number]> => {
  const response = await laravelRequest<ApiEnvelope<FinanceSetupData['ledger_accounts'][number]>>('/api/v1/finance/ledger-accounts', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  return response.data
}

export const updateLedgerAccount = async (
  accountId: number,
  input: Pick<LedgerAccountInput, 'name' | 'is_active'>,
): Promise<FinanceSetupData['ledger_accounts'][number]> => {
  const response = await laravelRequest<ApiEnvelope<FinanceSetupData['ledger_accounts'][number]>>(`/api/v1/finance/ledger-accounts/${accountId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

  return response.data
}

export const createFinancialAccount = async (input: FinancialAccountInput): Promise<FinanceSetupData['financial_accounts'][number]> => {
  const response = await laravelRequest<ApiEnvelope<FinanceSetupData['financial_accounts'][number]>>('/api/v1/finance/accounts', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  return response.data
}

export const updateFinancialAccount = async (
  accountId: number,
  input: Pick<FinancialAccountInput, 'name' | 'institution' | 'reference_hint' | 'is_active'>,
): Promise<FinanceSetupData['financial_accounts'][number]> => {
  const response = await laravelRequest<ApiEnvelope<FinanceSetupData['financial_accounts'][number]>>(`/api/v1/finance/accounts/${accountId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

  return response.data
}

export const dismissPlanningAlert = async (alertId: number): Promise<void> => {
  await laravelRequest(`/api/v1/planning/alerts/${alertId}/dismiss`, { method: 'PATCH' })
}

export const planningCommand = async (
  path: string,
  method: 'POST' | 'PATCH',
  input: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<void> => {
  await laravelRequest(path, {
    method,
    ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
    body: JSON.stringify(input),
  })
}

export const transitionDriverApplication = async (applicationId: number, to: string, reason?: string): Promise<void> => {
  await laravelRequest(`/api/v1/recruitment/applications/${applicationId}/transition`, {
    method: 'POST',
    body: JSON.stringify({ to, reason: reason || null }),
  })
}

export type RecruitmentApplicantInput = {
  entity_id: number
  first_name: string
  last_name: string
  primary_phone: string
  vehicle_class: 'motorcycle' | 'car'
  has_consent: boolean
  secondary_phone?: string
  email?: string
  payment_method?: 'mobile_money' | 'bank' | 'cash'
  district?: string
  address?: string
  landmark?: string
  maps_link?: string
}

export const recruitmentCommand = async <T>(path: string, method: 'POST' | 'PATCH', input: Record<string, unknown> | FormData): Promise<T> => {
  const response = await laravelRequest<ApiEnvelope<T>>(path, {
    method,
    body: input instanceof FormData ? input : JSON.stringify(input),
  })

  return response.data
}

export const createRecruitmentApplicant = async (input: RecruitmentApplicantInput): Promise<{ id: number; name: string; status: string }> =>
  recruitmentCommand('/api/v1/recruitment/applications', 'POST', input)

export type AccountReconciliationInput = {
  financial_account_id: number
  statement_ending_balance: number
  reconciled_through: string
  statement_reference?: string
  notes?: string
}

export const createAccountReconciliation = async (input: AccountReconciliationInput, idempotencyKey: string): Promise<void> => {
  await laravelRequest('/api/v1/finance/reconciliations', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  })
}

export type CashReceiptCsvImportInput = {
  entity_id: number
  source: 'narabox_csv' | 'zuriride_csv' | 'manual_csv'
  csv: File
  financial_account_id: number
  credit_ledger_account_id: number
  date_column: string
  amount_column: string
  reference_column: string
  description_column?: string
  counterparty_column?: string
}

export const stageCashReceiptCsvImport = async (input: CashReceiptCsvImportInput): Promise<void> => {
  const body = new FormData()
  body.set('entity_id', String(input.entity_id))
  body.set('source', input.source)
  body.set('csv', input.csv)
  body.set('financial_account_id', String(input.financial_account_id))
  body.set('credit_ledger_account_id', String(input.credit_ledger_account_id))
  body.set('date_column', input.date_column)
  body.set('amount_column', input.amount_column)
  body.set('reference_column', input.reference_column)
  if (input.description_column) body.set('description_column', input.description_column)
  if (input.counterparty_column) body.set('counterparty_column', input.counterparty_column)

  await laravelRequest('/api/v1/management/imports', { method: 'POST', body })
}

export const commitCashReceiptCsvImport = async (importId: number): Promise<void> => {
  await laravelRequest(`/api/v1/management/imports/${importId}/commit`, { method: 'POST' })
}

export const fleetFinanceCommand = async (
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  input?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<void> => {
  await laravelRequest(path, {
    method,
    ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
    ...(input ? { body: JSON.stringify(input) } : {}),
  })
}

export const importFleetFinanceSchedule = async (agreementId: number, schedule: File, mode: 'verified' | 'provisional'): Promise<void> => {
  const body = new FormData()
  body.append('schedule', schedule)
  body.append('mode', mode)

  await laravelRequest(`/api/v1/fleet-finance/agreements/${agreementId}/schedule`, { method: 'POST', body })
}
