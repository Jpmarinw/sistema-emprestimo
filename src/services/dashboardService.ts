/**
 * Serviço de Agregação de Métricas e Análise Gerencial para o Dashboard.
 */

import { supabase } from '../lib/supabase'
import { toCents, fromCents, roundMoney } from '../utils/money'
import { isLoanActive, isLoanPaid } from '../domain/financial'
import type { LoanStatus } from '../domain/types'

export interface DashboardMetrics {
  totalPrincipal: number
  totalToReceive: number
  totalPaid: number
  remainingBalance: number
  totalInterest: number
  recoveryRate: number
  activeLoansCount: number
  paidLoansCount: number
  totalLoansCount: number
}

export interface RecentPaymentItem {
  id: string
  amount: number
  payment_date: string
  loan_id: string
  person_name: string
  person_id: string
}

export interface PendingLoanItem {
  loan_id: string
  person_name: string
  person_id: string
  principal_amount: number
  total_amount: number
  total_paid: number
  remaining_balance: number
  loan_date: string
  progress_percent: number
}

export interface DashboardData {
  metrics: DashboardMetrics
  topPendingLoans: PendingLoanItem[]
  recentPayments: RecentPaymentItem[]
}

export const dashboardService = {
  /**
   * Consolida métricas financeiras, maiores saldos em aberto e amortizações recentes.
   */
  async getDashboardData(): Promise<{ data: DashboardData | null; error: string | null }> {
    try {
      // 1. Busca todos os empréstimos consolidados da view
      const { data: loansData, error: loansError } = await supabase
        .from('loans_summary')
        .select('*')

      if (loansError) {
        return { data: null, error: loansError.message }
      }

      const rows = loansData || []

      let totalPrincipalCents = 0
      let totalToReceiveCents = 0
      let totalPaidCents = 0
      let remainingBalanceCents = 0
      let activeLoansCount = 0
      let paidLoansCount = 0

      const pendingLoans: PendingLoanItem[] = []

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

        const isActive = isLoanActive(totalAmount, totalPaid, status)
        const isPaid = isLoanPaid(totalAmount, totalPaid, status)

        if (isActive) activeLoansCount++
        if (isPaid) paidLoansCount++

        if (remaining > 0) {
          const progress = totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 0
          pendingLoans.push({
            loan_id: row.loan_id || '',
            person_name: row.person_name || 'Desconhecido',
            person_id: row.person_id || '',
            principal_amount: principal,
            total_amount: totalAmount,
            total_paid: totalPaid,
            remaining_balance: remaining,
            loan_date: row.loan_date || '',
            progress_percent: progress,
          })
        }
      }

      // Ordena os empréstimos pendentes pelo maior saldo devedor
      pendingLoans.sort((a, b) => b.remaining_balance - a.remaining_balance)
      const topPendingLoans = pendingLoans.slice(0, 5)

      // 2. Busca os últimos pagamentos com dados do cliente
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          loan_id,
          loans (
            person_id,
            people (
              name
            )
          )
        `)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)

      const recentPayments: RecentPaymentItem[] = []

      if (!paymentsError && paymentsData) {
        for (const p of paymentsData as any[]) {
          const personName = p.loans?.people?.name || 'Cliente'
          const personId = p.loans?.person_id || ''
          recentPayments.push({
            id: p.id,
            amount: p.amount,
            payment_date: p.payment_date,
            loan_id: p.loan_id,
            person_name: personName,
            person_id: personId,
          })
        }
      }

      const totalPrincipal = fromCents(totalPrincipalCents)
      const totalToReceive = fromCents(totalToReceiveCents)
      const totalPaid = fromCents(totalPaidCents)
      const remainingBalance = fromCents(remainingBalanceCents)
      const totalInterest = Math.max(0, totalToReceive - totalPrincipal)
      const recoveryRate = totalToReceive > 0 ? roundMoney((totalPaid / totalToReceive) * 100) : 0

      return {
        data: {
          metrics: {
            totalPrincipal,
            totalToReceive,
            totalPaid,
            remainingBalance,
            totalInterest: roundMoney(totalInterest),
            recoveryRate,
            activeLoansCount,
            paidLoansCount,
            totalLoansCount: rows.length,
          },
          topPendingLoans,
          recentPayments,
        },
        error: null,
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'Erro ao processar dados do dashboard.' }
    }
  },

  /**
   * Compatibilidade legado: métricas gerais.
   */
  async getMetrics(): Promise<{ data: DashboardMetrics | null; error: string | null }> {
    const res = await this.getDashboardData()
    if (res.error || !res.data) {
      return { data: null, error: res.error }
    }
    return { data: res.data.metrics, error: null }
  },
}
