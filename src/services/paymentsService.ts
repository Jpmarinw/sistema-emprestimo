/**
 * Serviço de Gestão de Pagamentos / Amortizações.
 * Orquestra o registro seguro de pagamentos, validação de saldo devedor e quitação automática.
 */

import { supabase } from '../lib/supabase'
import {
  validatePayment,
  calculateRemainingBalance,
  calculateTotalPaid,
} from '../domain/financial'
import { loansService } from './loansService'
import type { PaymentRow, RegisterPaymentDTO } from '../domain/types'

export interface PaymentRegistrationResult {
  payment: PaymentRow | null
  newRemainingBalance: number
  newTotalPaid: number
  isFullyPaid: boolean
  error: string | null
}

export const paymentsService = {
  /**
   * Registra um pagamento para um empréstimo existente.
   * Regras aplicadas:
   * - O valor deve ser maior que zero.
   * - O valor não pode exceder o saldo devedor restante.
   * - Caso o saldo restante atinja zero, o empréstimo é marcado como 'PAID'.
   */
  async registerPayment(dto: RegisterPaymentDTO): Promise<PaymentRegistrationResult> {
    // 1. Busca os dados atuais do empréstimo para obter o saldo devedor
    const { data: loanSummary, error: loanError } = await loansService.getLoanSummaryById(dto.loan_id)

    if (loanError || !loanSummary) {
      return {
        payment: null,
        newRemainingBalance: 0,
        newTotalPaid: 0,
        isFullyPaid: false,
        error: loanError || 'Empréstimo não encontrado para vincular o pagamento.',
      }
    }

    // 2. Valida se o pagamento é permitido contra o saldo devedor
    const validation = validatePayment(dto.amount, loanSummary.remaining_balance)
    if (!validation.isValid) {
      return {
        payment: null,
        newRemainingBalance: loanSummary.remaining_balance,
        newTotalPaid: loanSummary.total_paid,
        isFullyPaid: loanSummary.is_paid,
        error: validation.errors.join(' '),
      }
    }

    const paymentDate = dto.payment_date || new Date().toISOString().split('T')[0]

    // 3. Insere a transação de pagamento
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        loan_id: dto.loan_id,
        amount: dto.amount,
        payment_date: paymentDate,
      })
      .select()
      .single()

    if (paymentError || !paymentData) {
      return {
        payment: null,
        newRemainingBalance: loanSummary.remaining_balance,
        newTotalPaid: loanSummary.total_paid,
        isFullyPaid: loanSummary.is_paid,
        error: paymentError?.message || 'Falha ao registrar pagamento no banco.',
      }
    }

    // 4. Calcula o novo total pago e novo saldo devedor restante
    const newTotalPaid = loanSummary.total_paid + dto.amount
    const newRemainingBalance = calculateRemainingBalance(loanSummary.total_amount, newTotalPaid)
    const isFullyPaid = newRemainingBalance === 0

    // 5. Se o empréstimo foi totalmente liquidado, atualiza o status para 'PAID'
    if (isFullyPaid && loanSummary.status !== 'PAID') {
      await supabase
        .from('loans')
        .update({ status: 'PAID' })
        .eq('id', dto.loan_id)
    }

    return {
      payment: paymentData,
      newRemainingBalance,
      newTotalPaid,
      isFullyPaid,
      error: null,
    }
  },

  /**
   * Lista todos os pagamentos realizados para um empréstimo específico.
   */
  async listPaymentsByLoanId(loanId: string): Promise<{ data: PaymentRow[]; totalPaid: number; error: string | null }> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: true })

    if (error) {
      return { data: [], totalPaid: 0, error: error.message }
    }

    const payments = data || []
    const totalPaid = calculateTotalPaid(payments)

    return {
      data: payments,
      totalPaid,
      error: null,
    }
  },
}
