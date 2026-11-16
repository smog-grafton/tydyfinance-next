export type AuthenticatedUser = {
  id: number
  name: string
  email: string
  role: string
}

export type ApiEnvelope<T> = {
  data: T
  meta?: Record<string, unknown>
}

export type ApiValidationErrors = Record<string, string[]>

export type OperationalNotification = {
  id: number
  category: 'planning' | 'finance' | 'operations'
  severity: 'info' | 'warning' | 'critical'
  title: string
  body: string
  action_path: string | null
  action_label: string | null
  read_at: string | null
  dismissed_at: string | null
  resolved_at: string | null
  created_at: string
}

export type OperationalNotificationPage = {
  items: OperationalNotification[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    unread_count: number
  }
}

export type QuickAccessOperation = 'income' | 'expense' | 'loan-payment' | 'remittance'

export type QuickAccessCredential = {
  id: number
  display_name: string
  token_hint: string
  scopes: string[]
  entity_ids: number[]
  daily_transaction_limit: number | null
  expires_at: string | null
  revoked_at: string | null
  last_used_at: string | null
  created_at: string
  usage_count: number
  token?: string
}

export type QuickAccessContext = {
  operation: QuickAccessOperation
  credential: { display_name: string; expires_at: string }
  entities: Array<{ id: number; name: string }>
  accounts: Array<{ id: number; entity_id: number; entity: string; name: string; type: string }>
  categories?: Array<{ id: number; entity_id: number; entity: string; name: string }>
  agreements?: Array<{
    id: number
    entity_id: number
    reference: string
    vehicle: string
    lender: string
    status: string
    next_installment: { due_on: string; expected: number; outstanding: number } | null
  }>
}

export type QuickDriverSearchResult = { id: number; driver: string; contract: string; vehicle: string | null }

export type QuickRemittanceContext = {
  id: number
  entity_id: number
  driver: string
  contract: string
  vehicle: string | null
  expected_remittance: number
  today_due: number
  arrears: number
  unapplied_credit: number
  last_payment: { amount: number; received_at: string; reference: string | null } | null
}

export type DashboardEntity = {
  id: number
  name: string
  type: string
}

export type DashboardTrendPoint = {
  date: string
  income: number
  expenses: number
}

export type RemittanceTrendPoint = {
  date: string
  expected: number
  collected: number
}

export type OwnerDashboardData = {
  period: {
    from: string
    until: string
  }
  entities: DashboardEntity[]
  financial: {
    cash_held: number
    available_cash: number
    reserved_cash: number
    third_party_restricted: number
    income_recognized: number
    expenses_recognized: number
    net_cash_flow: number
    receivables: number
    unreconciled_accounts: number
    account_count: number
    account_balances: Array<{
      name: string
      entity: string
      balance: number
    }>
  }
  activity_trend: DashboardTrendPoint[]
  fleet: {
    active_vehicles: number
    active_motorcycles: number
    active_cars: number
    assigned_vehicles: number
    unassigned_commercial_vehicles: number
    vehicles_under_maintenance: number
    open_faults: number
  }
  remittances: {
    expected_today: number
    collected_today: number
    outstanding_today: number
    arrears: number
    trend: RemittanceTrendPoint[]
  }
  financing: {
    active_loans: number
    overdue_loans: number
    next_installment: {
      due_on: string
      amount_due: number
    } | null
    due_within_seven_days: number
    installments_due_within_seven_days: number
    scheduled_repayments_remaining: number
    principal_outstanding: number
  }
  planning: {
    upcoming_commitments: Array<{
      id: number
      title: string
      due_on: string
      outstanding: number
      reserved: number
      funding_gap: number
      daily_funding_recommendation: number
    }>
    budgets: Array<{
      name: string
      category: string
      budgeted: number
      spent: number
      remaining: number
      usage_percentage: number
    }>
  }
}

export type FinanceWorkspaceData = {
  period: {
    from: string
    until: string
  }
  entities: DashboardEntity[]
  summary: {
    cash_held: number
    income_recognized: number
    expenses_recognized: number
    receivables: number
    payables: number
    unreconciled_accounts: number
  }
  accounts: Array<{
    id: number
    name: string
    entity_id: number
    entity: string
    account_type: string
    is_active: boolean
    balance: number
    reconciliation: {
      status: string
      reconciled_through: string
      variance: number
    } | null
  }>
  ledger_accounts: Array<{
    id: number
    code: string
    name: string
    entity_id: number
    entity: string
    account_type: string
    normal_balance: string
    is_active: boolean
  }>
  categories: Array<{
    id: number
    name: string
    entity_id: number
    entity: string
    category_type: string
    ledger_account_id: number
    ledger_account: string
    parent_name: string | null
    is_recurring: boolean
    is_active: boolean
  }>
  income_sources: Array<{
    id: number
    name: string
    entity_id: number
    entity: string
    source_type: string
    financial_category_id: number
    category: string
    preferred_account: string | null
    expected_payment_frequency: string | null
    is_active: boolean
  }>
  recent_movements: Array<{
    id: number
    occurred_at: string
    entity: string
    type: string
    classification: string | null
    amount: number
    from_account: string | null
    to_account: string | null
    reference: string | null
    description: string | null
  }>
  claims: Array<{
    id: number
    entity: string
    claim_type: string
    origin: string
    counterparty_name: string | null
    original_amount: number
    outstanding: number
    issued_at: string
    due_at: string | null
  }>
  budgets: Array<{
    id: number
    name: string
    entity: string
    category: string
    starts_on: string
    ends_on: string
    budgeted: number
    spent: number
    remaining: number
    usage_percentage: number
  }>
}

export type FinanceSetupData = {
  entities: Array<{
    id: number
    name: string
    type: 'personal' | 'business'
    currency: 'UGX'
    is_active: boolean
  }>
  ledger_accounts: Array<{
    id: number
    entity_id: number
    entity: string
    code: string
    name: string
    account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
    normal_balance: 'debit' | 'credit'
    is_active: boolean
  }>
  financial_accounts: Array<{
    id: number
    entity_id: number
    entity: string
    ledger_account_id: number
    ledger_account: string
    name: string
    account_type: 'cash' | 'mobile_money' | 'bank'
    institution: string | null
    reference_hint: string | null
    is_active: boolean
  }>
}

export type PlanningWorkspaceData = {
  entities: DashboardEntity[]
  financial_accounts: Array<{ id: number; entity_id: number; name: string; entity: string }>
  expense_categories: Array<{ id: number; entity_id: number; name: string; entity: string }>
  cash_availability: Array<{
    entity_id: number
    entity: string
    cash_held: number
    third_party_restricted: number
    reserved_cash: number
    available_cash: number
    upcoming: Array<{
      id: number
      title: string
      due_on: string
      outstanding: number
      reserved: number
      funding_gap: number
      daily_funding_recommendation: number
    }>
  }>
  obligations: Array<{
    id: number
    entity_id: number
    financial_category_id: number
    default_financial_account_id: number | null
    entity: string
    title: string
    payee_name: string
    amount: number
    frequency: string
    priority: string
    initial_due_on: string
    is_active: boolean
  }>
  due_events: Array<{
    id: number
    entity_id: number
    entity: string
    title: string
    due_on: string
    expected_amount: number
    paid_amount: number
    outstanding: number
    status: string
  }>
  reserves: Array<{
    id: number
    entity_id: number
    recurring_obligation_id: number | null
    entity: string
    name: string
    purpose: string | null
    priority: string
    target_amount: number | null
    target_on: string | null
    status: string
    reserved: number
  }>
  alerts: Array<{ id: number; entity: string; alert_type: string; title: string; body: string; business_date: string }>
  cash_runways: Array<{
    id: number
    entity_id: number
    entity: string
    name: string
    kind: string
    is_active: boolean
    collection_reliability_basis_points: number
    irregular_income_daily: number
    repair_buffer_daily: number
    emergency_reserve: number
    opening_available: number
    closing_available: number
    lowest_closing_available: number
    maximum_shortfall: number
  }>
  acquisition_simulations: Array<{
    id: number
    entity_id: number
    entity: string
    name: string
    deposit: number
    weekly_loan_payment: number | null
    expected_weekly_collections: number
    repair_buffer_weekly: number
    lender_settlement_quote: number | null
    quote_valid_until: string | null
    evaluation_scenario: string | null
    evaluation: {
      free_before_deposit: number
      deposit_gap: number
      weekly_surplus: number
      runway_shortfall: number
      recommend_delay: boolean
      reasons: string[]
    } | null
  }>
  budgets: Array<{
    id: number
    entity_id: number
    financial_category_id: number
    entity: string
    name: string
    category: string
    starts_on: string
    ends_on: string
    budgeted: number
    spent: number
    remaining: number
  }>
}

export type RecruitmentWorkspaceData = {
  entities: Array<{
    id: number
    name: string
  }>
  applications: Array<{
    id: number
    name: string
    entity: string
    vehicle_class: string
    status: string
    submitted_at: string | null
    allowed_transitions: string[]
    outstanding_requirements: string[]
  }>
  evaluations: Array<{
    id: number
    applicant: string
    entity: string
    template: string
    vehicle_class: string
    assessed_on: string
    status: string
    outcome: string | null
    aggregate_basis_points: number | null
    has_critical_failure: boolean
  }>
  templates: Array<{
    id: number
    entity: string
    name: string
    vehicle_class: string
    pass_threshold_basis_points: number
    criteria_count: number
    is_active: boolean
  }>
  home_visits: Array<{
    id: number
    applicant: string
    entity: string
    scheduled_for: string | null
    visited_at: string | null
    status: string
    review_outcome: string | null
  }>
}

export type RecruitmentApplicantDetail = {
  application: {
    id: number
    name: string
    entity_id: number
    entity: string
    first_name: string
    last_name: string
    primary_phone: string
    secondary_phone: string | null
    email: string | null
    vehicle_class: 'motorcycle' | 'car'
    payment_method: 'mobile_money' | 'bank' | 'cash' | null
    status: string
    district: string | null
    address: string | null
    landmark: string | null
    maps_link: string | null
    has_consent: boolean
    submitted_at: string | null
    allowed_transitions: string[]
    outstanding_requirements: string[]
  }
  documents: Array<{
    id: number
    document_type: string
    expires_on: string | null
    verification_status: string
    verified_at: string | null
  }>
  licenses: Array<{
    id: number
    license_number: string
    categories: string[]
    expires_on: string
    verification_status: string
  }>
  related_people: Array<{
    id: number
    relationship_type: string
    name: string
    phone: string
    relationship: string | null
    verification_status: string
  }>
  evaluations: Array<{
    id: number
    attempt_number: number
    template: string
    assessed_on: string
    status: string
    outcome: string | null
    aggregate_basis_points: number | null
    has_critical_failure: boolean
    criteria: Array<{
      id: number
      name: string
      maximum_score: number
      is_required: boolean
      is_critical_safety: boolean
      score: number | null
      not_applicable: boolean
      critical_failure: boolean
      observation: string | null
    }>
  }>
  home_visits: Array<{
    id: number
    attempt_number: number
    scheduled_for: string | null
    visited_at: string | null
    status: string
    review_outcome: string | null
    address_confirmed: boolean
    parking_confirmed: boolean
    objective_observations: string | null
    follow_up: string | null
  }>
  review: {
    status: string
    reasons: string | null
    outstanding_conditions: string | null
    reviewed_at: string | null
  } | null
  templates: Array<{
    id: number
    name: string
    version_number: number
    criteria: Array<{
      id: number
      name: string
      maximum_score: number
      is_required: boolean
      is_critical_safety: boolean
    }>
  }>
  timeline: Array<{
    id: number
    from_status: string | null
    to_status: string
    reason: string | null
    performed_at: string
    actor: string | null
  }>
}

export type DriverOperationsWorkspaceData = {
  drivers: Array<{
    id: number
    name: string
    entity: string
    vehicle_class: string
    active_contract_reference: string | null
    active_vehicle: string | null
    remittance_owed: number
    arrears: number
  }>
}

export type DriverOperationsDriverDetail = {
  driver: {
    id: number
    name: string
    entity: string
    vehicle_class: string
    primary_phone: string
    secondary_phone: string | null
    payment_method: string | null
    district: string | null
    landmark: string | null
    maps_link: string | null
    approved_at: string | null
  }
  remittance: {
    gross_expected: number
    waived_amount: number
    net_expected: number
    cash_received: number
    cash_applied: number
    remittance_owed: number
    arrears: number
    today_due: number
    unapplied_credit: number
  }
  active_contract: DriverContractSummary | null
  contracts: DriverContractSummary[]
  assignment: {
    vehicle: string | null
    starts_at: string | null
    status: string
    driver_accepted_at: string | null
    completed_at: string | null
  } | null
  schedule_window: { from: string; until: string }
  schedule: Array<{
    id: number
    service_date: string
    due_on: string
    expected_amount: number
    waived_amount: number
    allocated_amount: number
    outstanding: number
    status: string
  }>
  payments: Array<{
    id: number
    amount: number
    received_at: string
    reference: string | null
    status: string
    account: string | null
    applied_amount: number
    unapplied_credit: number
  }>
  documents: Array<{ document_type: string; expires_on: string | null; verification_status: string }>
  licenses: Array<{ license_number: string; categories: string[]; expires_on: string; verification_status: string }>
  timeline: Array<{ id: number; from_status: string | null; to_status: string; reason: string | null; performed_at: string; actor: string | null }>
  collection: {
    allowed: boolean
    contract_id: number | null
    financial_accounts: Array<{ id: number; name: string; account_type: string }>
  }
}

type DriverContractSummary = {
  id: number
  reference: string
  status: string
  starts_on: string
  ends_on: string
  remittance_starts_on: string | null
  frequency: string
  remittance_amount: number
  off_weekdays: number[]
  grace_days: number
  vehicle: string | null
  amendments: Array<{ effective_on: string; amendment_type: string; reason: string | null; acknowledged_at: string | null }>
}

export type ManagementWorkspaceData = {
  entities: Array<{
    id: number
    name: string
  }>
  financial_accounts: Array<{
    id: number
    entity_id: number
    name: string
    entity: string
  }>
  revenue_ledger_accounts: Array<{
    id: number
    entity_id: number
    code: string
    name: string
    entity: string
  }>
  reconciliations: Array<{
    id: number
    entity: string
    account: string
    status: string
    statement_ending_balance: number
    ledger_ending_balance: number
    variance: number
    reference: string | null
    reconciled_through_at: string
  }>
  audit_events: Array<{
    id: number
    entity: string | null
    event: string
    actor: string | null
    occurred_at: string
  }>
  imports: Array<{
    id: number
    entity: string
    source: string
    filename: string
    status: string
    summary: {
      total: number
      valid: number
      invalid: number
      duplicate: number
    } | null
    committed_at: string | null
  }>
}

export type FleetFinanceInstallment = {
  id: number
  agreement_id: number
  vehicle: string
  lender: string
  number: number
  due_on: string
  total_expected: number
  allocated_amount: number
  outstanding: number
  verification_status: string | null
  status: string
  operational_status?: string
  is_historical_review?: boolean
  is_actionable?: boolean
}

export type FleetFinanceWorkspaceData = {
  entities: Array<{ id: number; name: string }>
  financial_accounts: Array<{ id: number; entity_id: number; entity: string; name: string; account_type: string }>
  ledger_accounts: Array<{ id: number; entity_id: number; entity: string; code: string; name: string; account_type: string }>
  lenders: Array<{ id: number; entity_id: number; entity: string; name: string; institution_type: string; reference: string | null }>
  vehicles: Array<{
    id: number
    entity_id: number
    entity: string
    asset_reference: string
    manufacturer: string | null
    model: string | null
    vehicle_type: string
    usage_type: string
    finance_status: string
    operational_status: string
    current_odometer: number | null
  }>
  acquisition_plans: Array<{
    id: number
    reference: string
    entity_id: number
    entity: string
    vehicle: string
    status: string
    expected_cash_price: number
    expected_deposit: number
    expected_additional_charges: number
    expected_financed_additional_charges: number
    deposit_paid: number
    deposit_remaining: number
    proposed_total_financing: number
    funding_financial_account_id: number | null
    deposit_ledger_account_id: number | null
    asset_ledger_account_id: number | null
    lender_id: number | null
    liability_ledger_account_id: number | null
    interest_expense_ledger_account_id: number | null
    fee_expense_ledger_account_id: number | null
    weekly_operating_surplus: number
    repayment_frequency: string | null
    installment_count: number | null
    scheduled_repayment_total: number | null
    projected_cash_outlay: number | null
    financing_premium: number | null
    historical_schedule_review_required: boolean
    vehicle_id: number | null
    finance_agreement_id: number | null
  }>
  agreements: Array<{
    id: number
    entity_id: number
    entity: string
    vehicle: string
    lender: string
    reference: string
    status: string
    original_principal: number
    payment_frequency: string | null
    first_due_on: string | null
    last_due_on: string | null
    expected_installments: number | null
    contractual_installment_total: number | null
    unpaid_total: number
    repayment_summary: {
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
  }>
  schedule_versions: Array<{
    id: number
    agreement_id: number
    vehicle: string
    reference: string
    version_number: number
    source: string
    status: string
    expected_installment_count: number | null
    declared_total: number | null
    supersedes_id: number | null
  }>
  installments: Array<{
    id: number
    agreement_id: number
    vehicle: string
    lender: string
    number: number
    due_on: string
    total_expected: number
    allocated_amount: number
    outstanding: number
    verification_status: string | null
    status: string
    operational_status?: string
    is_historical_review?: boolean
    is_actionable?: boolean
  }>
  missed_installments: Array<{
    id: number
    agreement_id: number
    vehicle: string
    lender: string
    number: number
    due_on: string
    total_expected: number
    allocated_amount: number
    outstanding: number
    verification_status: string | null
    status: string
    operational_status?: string
    is_historical_review?: boolean
    is_actionable?: boolean
  }>
  payments: Array<{ id: number; vehicle: string; lender: string; amount: number; paid_at: string; status: string | null }>
  repayment_portfolio: {
    as_of: string
    agreement_count: number
    contractual_schedule_remaining: number
    confirmed_overdue_amount: number
    confirmed_overdue_count: number
    due_today_amount: number
    due_next_seven_days_amount: number
    historical_review_amount: number
    historical_review_count: number
  }
  funding_policies: Array<{
    id: number
    agreement_id: number
    vehicle_id: number
    vehicle: string
    contract_id: number
    contract: string
    reserve_id: number
    reserve: string
    funding_method: string
    fixed_amount: number | null
    percentage_basis_points: number | null
    minimum_unrestricted_cash_buffer: number
    priority: number
    effective_on: string
    status: string
    paused_reason: string | null
  }>
  driver_contracts: Array<{ id: number; entity_id: number; reference: string; driver: string; vehicle: string | null; remittance_amount: number }>
  reserves: Array<{ id: number; entity_id: number; name: string }>
  remittance_obligations: Array<{
    id: number
    contract_id: number
    vehicle: string
    driver: string
    due_on: string
    expected_amount: number
    allocated_amount: number
    outstanding: number
    status: string
  }>
  faults: Array<{
    id: number
    vehicle_id: number
    vehicle: string
    reported_at: string
    status: string
    description: string
    resolution: string | null
  }>
  maintenance_plans: Array<{
    id: number
    vehicle_id: number
    vehicle: string
    category: string
    description: string
    rule_type: string
    odometer_interval: number | null
    calendar_interval_days: number | null
    estimated_cost: number | null
    priority: string
    is_active: boolean
  }>
  maintenance: Array<{
    id: number
    vehicle: string
    performed_on: string
    vendor: string | null
    actual_cost: number | null
    status: string
    responsibility: string
  }>
  profitability: Array<{
    vehicle_id: number
    vehicle: string
    entity: string
    expected_collections: number
    valid_waivers: number
    actual_collections: number
    outstanding_collections: number
    operating_expenses: number
    finance_interest: number
    finance_fees: number
    principal_repayments: number
    net_operating_contribution: number
    cash_profit_after_finance_charges: number
    debt_service_cash: number
    post_debt_service_cash_flow: number
    total_cost_of_ownership_cash: number
  }>
  loan_safety: {
    available_cash: number
    overdue_amount: number
    overdue_count: number
    due_next_seven_days: number
    next_friday: { due_on: string; amount: number } | null
  }
}

export type FleetOperationsWorkspaceData = {
  period: {
    from: string
    until: string
  }
  entities: DashboardEntity[]
  summary: {
    active_vehicles: number
    assigned_vehicles: number
    vehicles_under_maintenance: number
    open_faults: number
    remittance_expected: number
    remittance_outstanding: number
  }
  vehicles: Array<{
    id: number
    asset_reference: string
    entity: string
    vehicle_type: string
    manufacturer: string | null
    model: string | null
    usage_type: string
    operational_status: string
    finance_status: string
    current_odometer: number | null
    assigned_driver: string | null
  }>
  assignments: Array<{
    id: number
    vehicle: string
    driver: string
    contract_reference: string
    status: string
    starts_at: string
    ends_at: string | null
  }>
  handovers: Array<{
    id: number
    vehicle: string
    driver: string
    assignment_status: string
    driver_accepted_at: string | null
    completed_at: string | null
  }>
  faults: Array<{
    id: number
    vehicle: string
    reported_at: string
    status: string
    description: string
  }>
  maintenance: Array<{
    id: number
    vehicle: string
    performed_on: string
    status: string
    vendor: string | null
    actual_cost: number | null
    responsibility: string
  }>
  service_plans: Array<{
    id: number
    vehicle: string
    category: string
    rule_type: string
    priority: string
    last_completed_on: string | null
    estimated_cost: number | null
  }>
  contracts: Array<{
    id: number
    reference: string
    driver: string
    status: string
    starts_on: string
    ends_on: string
    frequency: string
    remittance_amount: number
  }>
  remittances: Array<{
    id: number
    due_on: string
    vehicle: string
    driver: string
    status: string
    expected_amount: number
    waived_amount: number
    allocated_amount: number
    outstanding: number
  }>
}

export type FleetVehicleDetailData = {
  vehicle: {
    id: number
    asset_reference: string
    entity: string
    vehicle_type: string
    manufacturer: string | null
    model: string | null
    model_year: number | null
    propulsion_type: string | null
    usage_type: string
    acquisition_type: string
    finance_status: string
    operational_status: string
    current_odometer: number | null
    odometer_unit: string
  }
  current_assignment: {
    id: number
    driver: string
    contract_reference: string
    status: string
    starts_at: string
    ends_at: string | null
  } | null
  handovers: Array<{
    id: number
    driver: string
    assignment_status: string
    driver_accepted_at: string | null
    completed_at: string | null
  }>
  faults: Array<{
    id: number
    reported_at: string
    status: string
    description: string
  }>
  maintenance: Array<{
    id: number
    performed_on: string
    status: string
    vendor: string | null
    actual_cost: number | null
    responsibility: string
  }>
  service_plans: Array<{
    id: number
    category: string
    rule_type: string
    priority: string
    is_active: boolean
    last_completed_on: string | null
    estimated_cost: number | null
  }>
  remittances: Array<{
    id: number
    due_on: string
    driver: string
    status: string
    expected_amount: number
    waived_amount: number
    allocated_amount: number
    outstanding: number
  }>
}

export type FleetVehicleManageData = {
  id: number
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
  entities: Array<{
    id: number
    name: string
  }>
}
