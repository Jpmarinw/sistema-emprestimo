/**
 * Serviço de Agregação de Métricas para o Dashboard Geral.
 */

import { supabase } from '../lib/supabase'
import { toCents, fromCents } from '../utils/money'
import { isLoanActive, isLoanPaid } from '../domain/financial'
import type { LoanStatus } from '../domain/types'

export interface DashboardMetrics {
  totalPrincipal: number
  totalToReceive: number
  totalPaid: number
  remainingBalance: number
  activeLoansCount: number
  paidLoansCount: number
  totalLoansCount: number
}

export const dashboardService = {
  /**
   * Calcula as 6 métricas essenciais do dashboard consolidando
   * os dados da view loans_summary em centavos inteiros.
   */
  async getMetrics(): Promise<{ data: DashboardMetrics | null; error: string | null }> {
    const { data, error } = await supabase
      .from('loans_summary')
      .select('*')

    if (error) {
      return { data: null, error: error.message }
    }

    const rows = data || []

    let totalPrincipalCents = 0
    let totalToReceiveCents = 0
    let totalPaidCents = 0
    let remainingBalanceCents = 0
    let activeLoansCount = 0
    let paidLoansCount = 0

    for (const row of rows) {
      const principal = row.principal_amount ?? 0
      const totalAmount = row.total_amount ?? 0
      const totalPaid = row.total_paid ?? 0
      const remaining = row.remaining_balance ?? Math.max(0, totalAmount - totalPaid)
      const status = (row.status as LoanStatus) || 'ACTIVE'

      totalPrincipalCents += toCents(principal)
      totalToReceiveCents += toCents(totalAmount)
      totalPaidCents += toCents(totalPaid)
      remainingBalanceCents += toCents(remaining)

      if (isLoanActive(totalAmount, totalPaid, status)) {
        activeLoansCount++
      }
      if (isLoanPaid(totalAmount, totalPaid, status)) {
        paidLoansCount++
      }
    }

    return {
      data: {
        totalPrincipal: fromCents(totalPrincipalCents),
        totalToReceive: fromCents(totalToReceiveCents),
        totalPaid: fromCents(totalPaidCents),
        remainingBalance: fromCents(remainingBalanceCents),
        activeLoansCount,
        paidLoansCount,
        totalLoansCount: rows.length,
      },
      error: null,
    }
  },
}
