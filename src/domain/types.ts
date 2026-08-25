import type { Tables } from '../types/database.types'

export type LoanStatus = 'PENDING' | 'ACTIVE' | 'PAID' | 'DEFAULTED' | 'CANCELLED'

export interface CreatePersonDTO {
  name: string
}

export interface CreateLoanDTO {
  person_id: string
  principal_amount: number
  interest_rate: number
  loan_date?: string
}

export interface RegisterPaymentDTO {
  loan_id: string
  amount: number
  payment_date?: string
}

export interface PaymentRecord {
  id: string
  loan_id: string
  amount: number
  payment_date: string
  created_at: string
}

export interface LoanFinancialState {
  loan_id: string
  person_id: string
  principal_amount: number
  interest_rate: number
  total_amount: number
  total_paid: number
  remaining_balance: number
  payments_count: number
  status: LoanStatus
  is_active: boolean
  is_paid: boolean
}

export interface LoanValidationResult {
  isValid: boolean
  errors: string[]
}

export type LoanSummaryRow = Tables<'loans_summary'>
export type LoanRow = Tables<'loans'>
export type PersonRow = Tables<'people'>
export type PaymentRow = Tables<'payments'>
