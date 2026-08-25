import { describe, it, expect } from 'vitest'
import {
  calculateTotalAmount,
  calculateInterestAmount,
  calculateTotalPaid,
  calculateRemainingBalance,
  isLoanActive,
  isLoanPaid,
  deriveLoanStatus,
  validatePayment,
  validateLoanCreation,
  validatePersonCreation,
  buildLoanFinancialState,
} from './financial'
import { toCents, fromCents, roundMoney, formatBRL, parseBRL } from '../utils/money'

describe('Utilitários Monetários Seguros (money.ts)', () => {
  it('converte reais para centavos inteiros sem perda de precisão', () => {
    expect(toCents(100.5)).toBe(10050)
    expect(toCents(10.05)).toBe(1005)
    expect(toCents(0.1 + 0.2)).toBe(30) // Teste clássico de imprecisão float IEEE 754
    expect(toCents(19.99)).toBe(1999)
  })

  it('converte centavos para reais', () => {
    expect(fromCents(10050)).toBe(100.5)
    expect(fromCents(1005)).toBe(10.05)
    expect(fromCents(30)).toBe(0.3)
  })

  it('normaliza valores para 2 casas decimais com roundMoney', () => {
    expect(roundMoney(10.555)).toBe(10.56)
    expect(roundMoney(10.554)).toBe(10.55)
  })

  it('formata para o padrão monetário brasileiro BRL', () => {
    const formatted = formatBRL(1500.5)
    // Contém R$, 1.500 e 50
    expect(formatted).toContain('1.500,50')
    expect(formatted).toContain('R$')
  })

  it('faz parse de strings monetárias em formato brasileiro', () => {
    expect(parseBRL('R$ 1.500,50')).toBe(1500.5)
    expect(parseBRL('1.250,00')).toBe(1250)
    expect(parseBRL('350.75')).toBe(350.75)
    expect(parseBRL('')).toBe(0)
  })
})

describe('Regra 1: Validação de Criação de Pessoa', () => {
  it('permite criação com nome válido', () => {
    const res = validatePersonCreation({ name: 'Maria Silva' })
    expect(res.isValid).toBe(true)
    expect(res.errors).toHaveLength(0)
  })

  it('rejeita nome vazio ou contendo apenas espaços', () => {
    const resEmpty = validatePersonCreation({ name: '' })
    expect(resEmpty.isValid).toBe(false)
    expect(resEmpty.errors).toContain('O nome da pessoa é obrigatório.')

    const resSpaces = validatePersonCreation({ name: '   ' })
    expect(resSpaces.isValid).toBe(false)
    expect(resSpaces.errors).toContain('O nome da pessoa é obrigatório.')
  })

  it('rejeita nome com menos de 2 caracteres', () => {
    const res = validatePersonCreation({ name: 'A' })
    expect(res.isValid).toBe(false)
    expect(res.errors).toContain('O nome deve conter pelo menos 2 caracteres.')
  })
})

describe('Regra 2 e 3: Cálculo do Valor Total a Receber e Juros', () => {
  it('calcula o valor total com juros zero', () => {
    const total = calculateTotalAmount(1000, 0)
    expect(total).toBe(1000)
    expect(calculateInterestAmount(1000, 0)).toBe(0)
  })

  it('calcula o valor total com taxa de juros padrão (10%)', () => {
    const total = calculateTotalAmount(1000, 10)
    expect(total).toBe(1100)
    expect(calculateInterestAmount(1000, 10)).toBe(100)
  })

  it('calcula corretamente com centavos e taxas fracionárias', () => {
    // 500 * (1 + 0.035) = 517.50
    expect(calculateTotalAmount(500, 3.5)).toBe(517.5)
    expect(calculateInterestAmount(500, 3.5)).toBe(17.5)

    // R$ 333,33 com 5% de juros: 333.33 * 0.05 = 16.6665 -> juros R$ 16.67 -> Total R$ 350.00
    expect(calculateTotalAmount(333.33, 5)).toBe(350.0)
    expect(calculateInterestAmount(333.33, 5)).toBe(16.67)
  })

  it('calcula grandes volumes financeiros sem distorção', () => {
    // R$ 1.000.000,00 com 15.5% = R$ 1.155.000,00
    expect(calculateTotalAmount(1000000, 15.5)).toBe(1155000)
  })

  it('lança erro ao tentar calcular com principal negativo ou zero', () => {
    expect(() => calculateTotalAmount(0, 10)).toThrow('O valor principal do empréstimo deve ser maior que zero.')
    expect(() => calculateTotalAmount(-500, 10)).toThrow('O valor principal do empréstimo deve ser maior que zero.')
  })

  it('lança erro ao tentar calcular com taxa de juros negativa', () => {
    expect(() => calculateTotalAmount(1000, -5)).toThrow('A taxa de juros não pode ser negativa.')
  })
})

describe('Validação de Criação de Empréstimo', () => {
  it('valida empréstimo com parâmetros corretos', () => {
    const res = validateLoanCreation({
      person_id: 'person-123',
      principal_amount: 1500,
      interest_rate: 5,
    })
    expect(res.isValid).toBe(true)
    expect(res.errors).toHaveLength(0)
  })

  it('rejeita empréstimo sem person_id ou com valores inválidos', () => {
    const res = validateLoanCreation({
      person_id: '',
      principal_amount: -100,
      interest_rate: -1,
    })
    expect(res.isValid).toBe(false)
    expect(res.errors.length).toBe(3)
  })
})

describe('Regra 4 e 5: Registro e Cálculo do Total Recebido (Pagamentos)', () => {
  it('retorna 0 para lista vazia de pagamentos', () => {
    expect(calculateTotalPaid([])).toBe(0)
  })

  it('soma múltiplos pagamentos com precisão de centavos', () => {
    const payments = [
      { amount: 150.25 },
      { amount: 200.5 },
      { amount: 49.25 },
    ]
    expect(calculateTotalPaid(payments)).toBe(400)
  })

  it('aceita array direto de números monetários', () => {
    expect(calculateTotalPaid([100.1, 200.2])).toBe(300.3)
  })

  it('ignora pagamentos inválidos ou negativos na soma', () => {
    const payments = [{ amount: 100 }, { amount: -50 } as any, { amount: 50 }]
    expect(calculateTotalPaid(payments)).toBe(150)
  })
})

describe('Regra 6: Cálculo do Saldo Devedor Restante', () => {
  it('calcula saldo restante quando não houve nenhum pagamento', () => {
    expect(calculateRemainingBalance(1000, 0)).toBe(1000)
    expect(calculateRemainingBalance(1000, [])).toBe(1000)
  })

  it('calcula saldo restante após amortizações parciais', () => {
    expect(calculateRemainingBalance(1000, 350)).toBe(650)
    expect(calculateRemainingBalance(1100, [{ amount: 300 }, { amount: 200 }])).toBe(600)
  })

  it('calcula saldo zero quando totalmente liquidado', () => {
    expect(calculateRemainingBalance(1000, 1000)).toBe(0)
  })

  it('nunca retorna saldo negativo mesmo se total pago for maior', () => {
    expect(calculateRemainingBalance(1000, 1200)).toBe(0)
  })
})

describe('Regra 4: Validação de Registro de Pagamento', () => {
  it('permite pagamento dentro do saldo devedor', () => {
    const res = validatePayment(300, 500)
    expect(res.isValid).toBe(true)
  })

  it('permite pagamento que liquida exatamente o saldo restante', () => {
    const res = validatePayment(500, 500)
    expect(res.isValid).toBe(true)
  })

  it('rejeita pagamento de valor zero ou negativo', () => {
    const resZero = validatePayment(0, 500)
    expect(resZero.isValid).toBe(false)
    expect(resZero.errors).toContain('O valor do pagamento deve ser maior que zero.')

    const resNeg = validatePayment(-50, 500)
    expect(resNeg.isValid).toBe(false)
  })

  it('rejeita pagamento que excede o saldo devedor restante (overpayment)', () => {
    const res = validatePayment(500.01, 500)
    expect(res.isValid).toBe(false)
    expect(res.errors[0]).toContain('não pode exceder o saldo devedor restante')
  })
})

describe('Regra 7 e 8: Identificação de Empréstimos Ativos e Quitados', () => {
  it('identifica corretamente empréstimo ATIVO', () => {
    // Total R$ 1000, Pago R$ 400 -> Saldo R$ 600 -> Ativo
    expect(isLoanActive(1000, 400, 'ACTIVE')).toBe(true)
    expect(isLoanPaid(1000, 400, 'ACTIVE')).toBe(false)
    expect(deriveLoanStatus(1000, 400, 'ACTIVE')).toBe('ACTIVE')
  })

  it('identifica corretamente empréstimo QUITADO', () => {
    // Total R$ 1000, Pago R$ 1000 -> Saldo R$ 0 -> Quitado
    expect(isLoanActive(1000, 1000, 'ACTIVE')).toBe(false)
    expect(isLoanPaid(1000, 1000, 'ACTIVE')).toBe(true)
    expect(deriveLoanStatus(1000, 1000, 'ACTIVE')).toBe('PAID')
  })

  it('mantém status CANCELLED para empréstimos cancelados', () => {
    expect(isLoanActive(1000, 0, 'CANCELLED')).toBe(false)
    expect(isLoanPaid(1000, 0, 'CANCELLED')).toBe(false)
    expect(deriveLoanStatus(1000, 0, 'CANCELLED')).toBe('CANCELLED')
  })

  it('constrói estado financeiro consolidado com precisão', () => {
    const state = buildLoanFinancialState({
      loan_id: 'loan-1',
      person_id: 'person-1',
      principal_amount: 1000,
      interest_rate: 10,
      payments: [{ amount: 300 }, { amount: 200 }],
    })

    expect(state.principal_amount).toBe(1000)
    expect(state.interest_rate).toBe(10)
    expect(state.total_amount).toBe(1100)
    expect(state.total_paid).toBe(500)
    expect(state.remaining_balance).toBe(600)
    expect(state.payments_count).toBe(2)
    expect(state.is_active).toBe(true)
    expect(state.is_paid).toBe(false)
    expect(state.status).toBe('ACTIVE')
  })
})
