import { laravelRequest } from './client'
import type { FleetFinanceInstallment } from './types'

export type FleetFinanceInstallmentPage = {
  data: FleetFinanceInstallment[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
  agreement: {
    id: number
    reference: string
    vehicle: string
    lender: string
    summary: {
      contractual_total: number
      contractual_schedule_remaining: number
      allocated_total: number
      historical_review_count: number
      historical_review_amount: number
      confirmed_overdue_count: number
      confirmed_overdue_amount: number
      due_today_amount: number
      due_next_seven_days_amount: number
      verified_principal_balance: number | null
      can_record_current_payment: boolean
      next_uncovered_installment: FleetFinanceInstallment | null
    }
  }
}

export type FleetFinanceInstallmentFilters = {
  view?: 'all' | 'overdue' | 'history'
  status?: string
  from?: string
  until?: string
  sort?: 'due_on' | 'installment_number'
  direction?: 'asc' | 'desc'
  per_page?: number
  page?: number
}

export const getFleetFinanceAgreementInstallments = async (
  agreementId: number,
  filters: FleetFinanceInstallmentFilters,
): Promise<FleetFinanceInstallmentPage> => {
  const search = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value))
  })
  const query = search.toString()
  return laravelRequest<FleetFinanceInstallmentPage>(`/api/v1/fleet-finance/agreements/${agreementId}/installments${query ? `?${query}` : ''}`)
}
