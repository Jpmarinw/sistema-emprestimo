/**
 * Módulo de Regras de Negócio Financeiras do Sistema de Empréstimos.
 * 
 * Este arquivo concentra toda a lógica pura de cálculos financeiros, validações de regras
 * e derivações de estado (Ativo / Quitado). Nenhuma dependência com UI ou banco de dados.
 */

import { toCents, fromCents, roundMoney } from '../utils/money'
import type {
  CreateLoanDTO,
  UpdateLoanDTO,
  CreatePersonDTO,
  LoanFinancialState,
  LoanStatus,
  LoanValidationResult,
} from './types'

/**
 * 1. Validação de Criação de Pessoa
 * Garante que a pessoa possua um nome válido com pelo menos 2 caracteres não vazios.
 */
export function validatePersonCreation(dto: CreatePersonDTO): LoanValidationResult {
  const errors: string[] = []
  const trimmedName = (dto.name || '').trim()

  if (!trimmedName) {
    errors.push('O nome da pessoa é obrigatório.')
  } else if (trimmedName.length < 2) {
    errors.push('O nome deve conter pelo menos 2 caracteres.')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 2. Cálculo do Valor Total a Receber
 * Fórmula: Total = Principal + (Principal * (Taxa / 100))
 * 
 * As operações são realizadas em centavos inteiros com arredondamento seguro
 * para eliminar imprecisões de ponto flutuante do padrão IEEE 754.
 */
export function calculateTotalAmount(principalAmount: number, interestRate: number): number {
  if (principalAmount <= 0) {
    throw new Error('O valor principal do empréstimo deve ser maior que zero.')
  }
  if (interestRate < 0) {
    throw new Error('A taxa de juros não pode ser negativa.')
  }

  const principalCents = toCents(principalAmount)
  // Calcula os juros em centavos com arredondamento comercial (half-up)
  const interestCents = Math.round(principalCents * (interestRate / 100))
  const totalCents = principalCents + interestCents

  return fromCents(totalCents)
}

/**
 * 3. Cálculo do valor absoluto dos Juros
 * Retorna a quantia em R$ correspondente aos juros incidentes.
 */
export function calculateInterestAmount(principalAmount: number, interestRate: number): number {
  if (principalAmount <= 0 || interestRate < 0) return 0
  const principalCents = toCents(principalAmount)
  const interestCents = Math.round(principalCents * (interestRate / 100))
  return fromCents(interestCents)
}

/**
 * 4. Validação de Criação de Empréstimo
 */
export function validateLoanCreation(dto: CreateLoanDTO): LoanValidationResult {
  const errors: string[] = []

  if (!dto.person_id || !dto.person_id.trim()) {
    errors.push('É obrigatório vincular uma pessoa ao empréstimo.')
  }
  if (typeof dto.principal_amount !== 'number' || isNaN(dto.principal_amount) || dto.principal_amount <= 0) {
    errors.push('O valor emprestado (principal) deve ser maior que zero.')
  }
  if (typeof dto.interest_rate !== 'number' || isNaN(dto.interest_rate) || dto.interest_rate < 0) {
    errors.push('A taxa de juros deve ser maior ou igual a zero.')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 4.1 Validação de Alteração de Empréstimo
 * Garante que os dados informados sejam válidos e que o novo total contratado não seja
 * inferior ao montante que já foi amortizado (currentTotalPaid).
 */
export function validateLoanUpdate(
  dto: UpdateLoanDTO,
  currentTotalPaid: number = 0
): LoanValidationResult {
  const errors: string[] = []

  if (!dto.id || !dto.id.trim()) {
    errors.push('Identificador do empréstimo é obrigatório para alteração.')
  }
  if (dto.person_id !== undefined && (!dto.person_id || !dto.person_id.trim())) {
    errors.push('É obrigatório vincular uma pessoa ao empréstimo.')
  }
  if (typeof dto.principal_amount !== 'number' || isNaN(dto.principal_amount) || dto.principal_amount <= 0) {
    errors.push('O valor emprestado (principal) deve ser maior que zero.')
  }
  if (typeof dto.interest_rate !== 'number' || isNaN(dto.interest_rate) || dto.interest_rate < 0) {
    errors.push('A taxa de juros deve ser maior ou igual a zero.')
  }

  if (
    typeof dto.principal_amount === 'number' &&
    !isNaN(dto.principal_amount) &&
    dto.principal_amount > 0 &&
    typeof dto.interest_rate === 'number' &&
    !isNaN(dto.interest_rate) &&
    dto.interest_rate >= 0
  ) {
    const newTotal = calculateTotalAmount(dto.principal_amount, dto.interest_rate)
    const paidCents = toCents(currentTotalPaid > 0 ? currentTotalPaid : 0)
    const newTotalCents = toCents(newTotal)

    if (newTotalCents < paidCents) {
      errors.push(
        `O novo valor total contratado (R$ ${roundMoney(newTotal).toFixed(2)}) não pode ser inferior ao valor já pago (R$ ${roundMoney(currentTotalPaid).toFixed(2)}).`
      )
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 5. Cálculo do Total Recebido (Soma de Pagamentos)
 * Realiza o somatório seguro de amortizações em centavos inteiros.
 */
export function calculateTotalPaid(payments: Array<{ amount: number } | number>): number {
  if (!Array.isArray(payments) || payments.length === 0) {
    return 0
  }

  const totalCents = payments.reduce<number>((acc, item) => {
    const rawAmount = typeof item === 'number' ? item : item?.amount
    if (typeof rawAmount === 'number' && !isNaN(rawAmount) && rawAmount > 0) {
      return acc + toCents(rawAmount)
    }
    return acc
  }, 0)

  return fromCents(totalCents)
}

/**
 * 6. Cálculo do Saldo Devedor Restante
 * Fórmula: Saldo Devedor = max(0, Total a Receber - Total Pago)
 * 
 * Garante que o saldo nunca fique negativo e calcula a diferença em centavos.
 */
export function calculateRemainingBalance(
  totalAmount: number,
  paidOrPayments: number | Array<{ amount: number } | number>
): number {
  const totalCents = toCents(totalAmount > 0 ? totalAmount : 0)
  const paidCents = Array.isArray(paidOrPayments)
    ? toCents(calculateTotalPaid(paidOrPayments))
    : toCents(typeof paidOrPayments === 'number' && paidOrPayments > 0 ? paidOrPayments : 0)

  const remainingCents = Math.max(0, totalCents - paidCents)
  return fromCents(remainingCents)
}

/**
 * 7. Validação de Registro de Pagamento
 * Regra: Pagamentos devem ser maiores que zero e não podem exceder o saldo devedor restante.
 */
export function validatePayment(amount: number, remainingBalance: number): LoanValidationResult {
  const errors: string[] = []

  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    errors.push('O valor do pagamento deve ser maior que zero.')
    return { isValid: false, errors }
  }

  const amountCents = toCents(amount)
  const balanceCents = toCents(remainingBalance)

  if (amountCents > balanceCents) {
    errors.push(
      `O valor do pagamento (R$ ${roundMoney(amount).toFixed(2)}) não pode exceder o saldo devedor restante (R$ ${roundMoney(remainingBalance).toFixed(2)}).`
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 8. Identificação de Empréstimo Quitado
 * Um empréstimo é considerado quitado se seu status for 'PAID'
 * ou se o saldo devedor restante for zero após pagamentos que totalizem o valor contratado.
 */
export function isLoanPaid(
  totalAmount: number,
  totalPaid: number,
  status?: LoanStatus
): boolean {
  if (status === 'PAID') return true
  if (status === 'CANCELLED') return false

  const remaining = calculateRemainingBalance(totalAmount, totalPaid)
  return remaining === 0 && totalPaid > 0 && totalAmount > 0
}

/**
 * 9. Identificação de Empréstimo Ativo
 * Um empréstimo é considerado ativo se possui saldo devedor pendente (> 0)
 * e não está cancelado, inadimplente ou marcado como quitado.
 */
export function isLoanActive(
  totalAmount: number,
  totalPaid: number,
  status?: LoanStatus
): boolean {
  if (status === 'CANCELLED' || status === 'DEFAULTED' || status === 'PAID') {
    return false
  }

  const remaining = calculateRemainingBalance(totalAmount, totalPaid)
  return remaining > 0 && status !== 'PENDING'
}

/**
 * 10. Derivação Automática de Status
 * Define o status correto com base na liquidação do saldo devedor.
 */
export function deriveLoanStatus(
  totalAmount: number,
  totalPaid: number,
  currentStatus: LoanStatus = 'ACTIVE'
): LoanStatus {
  if (currentStatus === 'CANCELLED') return 'CANCELLED'
  if (currentStatus === 'DEFAULTED') return 'DEFAULTED'

  const remaining = calculateRemainingBalance(totalAmount, totalPaid)
  if (remaining === 0 && totalPaid >= totalAmount && totalAmount > 0) {
    return 'PAID'
  }

  return currentStatus === 'PAID' ? 'ACTIVE' : currentStatus
}

/**
 * 11. Consolidador do Estado Financeiro Completo do Empréstimo
 */
export function buildLoanFinancialState(params: {
  loan_id: string
  person_id: string
  principal_amount: number
  interest_rate: number
  total_amount?: number
  payments?: Array<{ amount: number } | number>
  total_paid?: number
  status?: LoanStatus
}): LoanFinancialState {
  const calculatedTotal = params.total_amount ?? calculateTotalAmount(params.principal_amount, params.interest_rate)
  const totalPaid = params.total_paid ?? (params.payments ? calculateTotalPaid(params.payments) : 0)
  const remainingBalance = calculateRemainingBalance(calculatedTotal, totalPaid)
  const paymentsCount = params.payments ? params.payments.length : (totalPaid > 0 ? 1 : 0)
  const currentStatus = params.status || 'ACTIVE'
  const resolvedStatus = deriveLoanStatus(calculatedTotal, totalPaid, currentStatus)

  return {
    loan_id: params.loan_id,
    person_id: params.person_id,
    principal_amount: roundMoney(params.principal_amount),
    interest_rate: roundMoney(params.interest_rate),
    total_amount: roundMoney(calculatedTotal),
    total_paid: roundMoney(totalPaid),
    remaining_balance: roundMoney(remainingBalance),
    payments_count: paymentsCount,
    status: resolvedStatus,
    is_active: isLoanActive(calculatedTotal, totalPaid, resolvedStatus),
    is_paid: isLoanPaid(calculatedTotal, totalPaid, resolvedStatus),
  }
}
