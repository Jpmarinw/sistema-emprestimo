import { describe, it, expect, vi, beforeEach } from 'vitest'
import { peopleService } from './peopleService'
import { loansService } from './loansService'
import { paymentsService } from './paymentsService'
import { supabase } from '../lib/supabase'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}))

describe('Camada de Serviços (Services)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('peopleService', () => {
    it('bloqueia inserção de pessoa com nome inválido sem chamar banco', async () => {
      const result = await peopleService.createPerson({ name: '' })
      expect(result.data).toBeNull()
      expect(result.error).toContain('O nome da pessoa é obrigatório.')
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('insere pessoa com nome válido no Supabase', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'uuid-1', name: 'Carlos Souza', created_at: '2026-08-24', updated_at: '2026-08-24' },
        error: null,
      })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      const result = await peopleService.createPerson({ name: ' Carlos Souza ' })
      expect(result.error).toBeNull()
      expect(result.data?.name).toBe('Carlos Souza')
      expect(mockInsert).toHaveBeenCalledWith({ name: 'Carlos Souza' })
    })
  })

  describe('loansService', () => {
    it('valida campos e calcula total_amount antes de salvar', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'loan-1',
          person_id: 'person-1',
          principal_amount: 1000,
          interest_rate: 10,
          total_amount: 1100,
          loan_date: '2026-08-24',
          status: 'ACTIVE',
        },
        error: null,
      })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      const result = await loansService.createLoan({
        person_id: 'person-1',
        principal_amount: 1000,
        interest_rate: 10,
      })

      expect(result.error).toBeNull()
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          person_id: 'person-1',
          principal_amount: 1000,
          interest_rate: 10,
          total_amount: 1100, // Total calculado pela regra de negócio
          status: 'ACTIVE',
        })
      )
    })

    it('bloqueia criação de empréstimo inválido', async () => {
      const result = await loansService.createLoan({
        person_id: '',
        principal_amount: 0,
        interest_rate: -1,
      })
      expect(result.data).toBeNull()
      expect(result.error).toBeTruthy()
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('atualiza empréstimo com recálculo correto de total_amount', async () => {
      // Mock do resumo atual do empréstimo (já pago R$ 200)
      vi.spyOn(loansService, 'getLoanSummaryById').mockResolvedValue({
        data: {
          loan_id: 'loan-1',
          person_id: 'person-1',
          person_name: 'Carlos',
          principal_amount: 1000,
          interest_rate: 10,
          total_amount: 1100,
          total_paid: 200,
          remaining_balance: 900,
          payments_count: 1,
          loan_date: '2026-08-24',
          status: 'ACTIVE',
          is_active: true,
          is_paid: false,
        },
        error: null,
      })

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'loan-1',
          person_id: 'person-1',
          principal_amount: 1200,
          interest_rate: 10,
          total_amount: 1320,
          status: 'ACTIVE',
        },
        error: null,
      })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      ;(supabase.from as any).mockReturnValue({ update: mockUpdate })

      const result = await loansService.updateLoan({
        id: 'loan-1',
        principal_amount: 1200,
        interest_rate: 10,
      })

      expect(result.error).toBeNull()
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          principal_amount: 1200,
          interest_rate: 10,
          total_amount: 1320, // 1200 + 10% = 1320
          status: 'ACTIVE',
        })
      )
      expect(mockEq).toHaveBeenCalledWith('id', 'loan-1')
    })

    it('bloqueia atualização se novo total for menor que o valor já amortizado', async () => {
      vi.spyOn(loansService, 'getLoanSummaryById').mockResolvedValue({
        data: {
          loan_id: 'loan-1',
          person_id: 'person-1',
          person_name: 'Carlos',
          principal_amount: 1000,
          interest_rate: 10,
          total_amount: 1100,
          total_paid: 800, // Já foi pago R$ 800
          remaining_balance: 300,
          payments_count: 2,
          loan_date: '2026-08-24',
          status: 'ACTIVE',
          is_active: true,
          is_paid: false,
        },
        error: null,
      })

      // Tenta alterar para principal R$ 500 com 10% = R$ 550 total (< R$ 800)
      const result = await loansService.updateLoan({
        id: 'loan-1',
        principal_amount: 500,
        interest_rate: 10,
      })

      expect(result.data).toBeNull()
      expect(result.error).toContain('não pode ser inferior ao valor já pago')
    })

    it('exclui empréstimo chamando delete no Supabase', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      ;(supabase.from as any).mockReturnValue({ delete: mockDelete })

      const result = await loansService.deleteLoan('loan-123')
      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'loan-123')
    })
  })

  describe('paymentsService', () => {
    it('bloqueia pagamento maior que o saldo devedor restante', async () => {
      // Mock do getLoanSummaryById
      vi.spyOn(loansService, 'getLoanSummaryById').mockResolvedValue({
        data: {
          loan_id: 'loan-1',
          person_id: 'person-1',
          person_name: 'Carlos',
          principal_amount: 1000,
          interest_rate: 10,
          total_amount: 1100,
          total_paid: 600,
          remaining_balance: 500, // Saldo restante é R$ 500
          payments_count: 1,
          loan_date: '2026-08-24',
          status: 'ACTIVE',
          is_active: true,
          is_paid: false,
        },
        error: null,
      })

      // Tenta pagar R$ 550 quando o saldo é R$ 500
      const result = await paymentsService.registerPayment({
        loan_id: 'loan-1',
        amount: 550,
      })

      expect(result.payment).toBeNull()
      expect(result.error).toContain('não pode exceder o saldo devedor restante')
      expect(result.newRemainingBalance).toBe(500)
    })

    it('registra pagamento válido e altera status para PAID ao quitar', async () => {
      vi.spyOn(loansService, 'getLoanSummaryById').mockResolvedValue({
        data: {
          loan_id: 'loan-1',
          person_id: 'person-1',
          person_name: 'Carlos',
          principal_amount: 1000,
          interest_rate: 10,
          total_amount: 1100,
          total_paid: 600,
          remaining_balance: 500, // Saldo devedor de R$ 500
          payments_count: 1,
          loan_date: '2026-08-24',
          status: 'ACTIVE',
          is_active: true,
          is_paid: false,
        },
        error: null,
      })

      const mockPaymentSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'pay-1',
          loan_id: 'loan-1',
          amount: 500,
          payment_date: '2026-08-24',
          created_at: '2026-08-24',
          updated_at: '2026-08-24',
        },
        error: null,
      })
      const mockPaymentSelect = vi.fn().mockReturnValue({ single: mockPaymentSingle })
      const mockPaymentInsert = vi.fn().mockReturnValue({ select: mockPaymentSelect })

      const mockLoanEq = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockLoanUpdate = vi.fn().mockReturnValue({ eq: mockLoanEq })

      ;(supabase.from as any).mockImplementation((table: string) => {
        if (table === 'payments') {
          return { insert: mockPaymentInsert }
        }
        if (table === 'loans') {
          return { update: mockLoanUpdate }
        }
        return {}
      })

      const result = await paymentsService.registerPayment({
        loan_id: 'loan-1',
        amount: 500, // Pagamento de R$ 500 quita o empréstimo
      })

      expect(result.error).toBeNull()
      expect(result.newRemainingBalance).toBe(0)
      expect(result.isFullyPaid).toBe(true)
      expect(result.newTotalPaid).toBe(1100)
      // Verifica se atualizou o status do empréstimo para PAID
      expect(mockLoanUpdate).toHaveBeenCalledWith({ status: 'PAID' })
    })
  })
})
