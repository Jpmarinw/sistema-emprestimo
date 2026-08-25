/**
 * Serviço de Gestão de Empréstimos.
 * Aplica os cálculos financeiros de total contratado e orquestra a persistência no Supabase.
 */

import { supabase } from '../lib/supabase'
import {
  calculateTotalAmount,
  validateLoanCreation,
  isLoanActive,
  isLoanPaid,
} from '../domain/financial'
import type {
  CreateLoanDTO,
  LoanRow,
  LoanStatus,
} from '../domain/types'

export interface EnrichedLoanSummary {
  loan_id: string
  person_id: string
  person_name: string
  principal_amount: number
  interest_rate: number
  total_amount: number
  total_paid: number
  remaining_balance: number
  payments_count: number
  loan_date: string
  status: LoanStatus
  is_active: boolean
  is_paid: boolean
}

export const loansService = {
  /**
   * Cria um novo empréstimo calculando automaticamente o valor total a receber
   * com base no capital principal e na taxa de juros informada.
   */
  async createLoan(dto: CreateLoanDTO): Promise<{ data: LoanRow | null; error: string | null }> {
    const validation = validateLoanCreation(dto)
    if (!validation.isValid) {
      return { data: null, error: validation.errors.join(' ') }
    }

    try {
      const calculatedTotal = calculateTotalAmount(dto.principal_amount, dto.interest_rate)
      const loanDate = dto.loan_date || new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('loans')
        .insert({
          person_id: dto.person_id,
          principal_amount: dto.principal_amount,
          interest_rate: dto.interest_rate,
          total_amount: calculatedTotal,
          loan_date: loanDate,
          status: 'ACTIVE',
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message || 'Erro inesperado ao calcular valores do empréstimo.' }
    }
  },

  /**
   * Lista os empréstimos a partir da view loans_summary,
   * enriquecendo os registros com a identificação de status ativo ou quitado.
   */
  async listLoansSummary(
    filter: 'ALL' | 'ACTIVE' | 'PAID' = 'ALL'
  ): Promise<{ data: EnrichedLoanSummary[]; error: string | null }> {
    const { data, error } = await supabase
      .from('loans_summary')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return { data: [], error: error.message }
    }

    const enriched: EnrichedLoanSummary[] = (data || []).map((row) => {
      const totalAmount = row.total_amount ?? 0
      const totalPaid = row.total_paid ?? 0
      const status = (row.status as LoanStatus) || 'ACTIVE'

      const active = isLoanActive(totalAmount, totalPaid, status)
      const paid = isLoanPaid(totalAmount, totalPaid, status)

      return {
        loan_id: row.loan_id || '',
        person_id: row.person_id || '',
        person_name: row.person_name || 'Desconhecido',
        principal_amount: row.principal_amount ?? 0,
        interest_rate: row.interest_rate ?? 0,
        total_amount: totalAmount,
        total_paid: totalPaid,
        remaining_balance: row.remaining_balance ?? Math.max(0, totalAmount - totalPaid),
        payments_count: row.payments_count ?? 0,
        loan_date: row.loan_date || '',
        status,
        is_active: active,
        is_paid: paid,
      }
    })

    if (filter === 'ACTIVE') {
      return { data: enriched.filter((l) => l.is_active), error: null }
    }
    if (filter === 'PAID') {
      return { data: enriched.filter((l) => l.is_paid), error: null }
    }

    return { data: enriched, error: null }
  },

  /**
   * Obtém os dados consolidados de um empréstimo específico por ID.
   */
  async getLoanSummaryById(id: string): Promise<{ data: EnrichedLoanSummary | null; error: string | null }> {
    const { data, error } = await supabase
      .from('loans_summary')
      .select('*')
      .eq('loan_id', id)
      .single()

    if (error || !data) {
      return { data: null, error: error?.message || 'Empréstimo não encontrado.' }
    }

    const totalAmount = data.total_amount ?? 0
    const totalPaid = data.total_paid ?? 0
    const status = (data.status as LoanStatus) || 'ACTIVE'

    return {
      data: {
        loan_id: data.loan_id || '',
        person_id: data.person_id || '',
        person_name: data.person_name || 'Desconhecido',
        principal_amount: data.principal_amount ?? 0,
        interest_rate: data.interest_rate ?? 0,
        total_amount: totalAmount,
        total_paid: totalPaid,
        remaining_balance: data.remaining_balance ?? Math.max(0, totalAmount - totalPaid),
        payments_count: data.payments_count ?? 0,
        loan_date: data.loan_date || '',
        status,
        is_active: isLoanActive(totalAmount, totalPaid, status),
        is_paid: isLoanPaid(totalAmount, totalPaid, status),
      },
      error: null,
    }
  },
}
