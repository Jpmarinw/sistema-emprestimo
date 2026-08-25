/**
 * Serviço de Gestão de Pessoas (Clientes / Devedores).
 * Responsável pelas operações de cadastro e consulta integradas ao Supabase.
 */

import { supabase } from '../lib/supabase'
import { validatePersonCreation, isLoanActive, isLoanPaid } from '../domain/financial'
import { toCents, fromCents } from '../utils/money'
import type { CreatePersonDTO, PersonRow, LoanStatus } from '../domain/types'
import type { EnrichedLoanSummary } from './loansService'

export interface PersonFinancialSummary {
  id: string
  name: string
  created_at: string
  total_principal: number
  total_to_receive: number
  total_paid: number
  remaining_balance: number
  active_loans_count: number
  total_loans_count: number
}

export interface PersonDetails {
  person: PersonRow
  summary: {
    total_principal: number
    total_to_receive: number
    total_paid: number
    remaining_balance: number
    active_loans_count: number
    paid_loans_count: number
    total_loans_count: number
  }
  activeLoans: EnrichedLoanSummary[]
  loansHistory: EnrichedLoanSummary[]
}

export const peopleService = {
  /**
   * Cria uma nova pessoa aplicando as regras de validação de domínio.
   */
  async createPerson(dto: CreatePersonDTO): Promise<{ data: PersonRow | null; error: string | null }> {
    const validation = validatePersonCreation(dto)
    if (!validation.isValid) {
      return { data: null, error: validation.errors.join(' ') }
    }

    const { data, error } = await supabase
      .from('people')
      .insert({
        name: dto.name.trim(),
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  },

  /**
   * Lista todas as pessoas cadastradas em ordem alfabética.
   */
  async listPeople(): Promise<{ data: PersonRow[]; error: string | null }> {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      return { data: [], error: error.message }
    }

    return { data: data || [], error: null }
  },

  /**
   * Lista pessoas agregando suas métricas financeiras (Total emprestado, recebido, saldo e ativos).
   */
  async listPeopleWithSummary(): Promise<{ data: PersonFinancialSummary[]; error: string | null }> {
    // 1. Busca todas as pessoas
    const { data: peopleData, error: peopleError } = await supabase
      .from('people')
      .select('*')
      .order('name', { ascending: true })

    if (peopleError) {
      return { data: [], error: peopleError.message }
    }

    // 2. Busca todos os empréstimos consolidados da view
    const { data: loansData, error: loansError } = await supabase
      .from('loans_summary')
      .select('*')

    if (loansError) {
      return { data: [], error: loansError.message }
    }

    const loansByPerson = new Map<string, any[]>()
    for (const loan of loansData || []) {
      if (loan.person_id) {
        const list = loansByPerson.get(loan.person_id) || []
        list.push(loan)
        loansByPerson.set(loan.person_id, list)
      }
    }

    const summaries: PersonFinancialSummary[] = (peopleData || []).map((person) => {
      const personLoans = loansByPerson.get(person.id) || []

      let totalPrincipalCents = 0
      let totalToReceiveCents = 0
      let totalPaidCents = 0
      let remainingBalanceCents = 0
      let activeLoansCount = 0

      for (const loan of personLoans) {
        const principal = loan.principal_amount ?? 0
        const totalAmount = loan.total_amount ?? 0
        const totalPaid = loan.total_paid ?? 0
        const remaining = loan.remaining_balance ?? Math.max(0, totalAmount - totalPaid)
        const status = (loan.status as LoanStatus) || 'ACTIVE'

        totalPrincipalCents += toCents(principal)
        totalToReceiveCents += toCents(totalAmount)
        totalPaidCents += toCents(totalPaid)
        remainingBalanceCents += toCents(remaining)

        if (isLoanActive(totalAmount, totalPaid, status)) {
          activeLoansCount++
        }
      }

      return {
        id: person.id,
        name: person.name,
        created_at: person.created_at,
        total_principal: fromCents(totalPrincipalCents),
        total_to_receive: fromCents(totalToReceiveCents),
        total_paid: fromCents(totalPaidCents),
        remaining_balance: fromCents(remainingBalanceCents),
        active_loans_count: activeLoansCount,
        total_loans_count: personLoans.length,
      }
    })

    return { data: summaries, error: null }
  },

  /**
   * Busca os detalhes completos de uma pessoa, resumo financeiro e listas segregadas de empréstimos.
   */
  async getPersonDetails(id: string): Promise<{ data: PersonDetails | null; error: string | null }> {
    // 1. Busca a pessoa
    const { data: person, error: personError } = await supabase
      .from('people')
      .select('*')
      .eq('id', id)
      .single()

    if (personError || !person) {
      return { data: null, error: personError?.message || 'Pessoa não encontrada.' }
    }

    // 2. Busca os empréstimos da pessoa
    const { data: loansData, error: loansError } = await supabase
      .from('loans_summary')
      .select('*')
      .eq('person_id', id)
      .order('loan_date', { ascending: false })

    if (loansError) {
      return { data: null, error: loansError.message }
    }

    const loansList = loansData || []
    let totalPrincipalCents = 0
    let totalToReceiveCents = 0
    let totalPaidCents = 0
    let remainingBalanceCents = 0
    let activeLoansCount = 0
    let paidLoansCount = 0

    const enrichedLoans: EnrichedLoanSummary[] = loansList.map((row) => {
      const totalAmount = row.total_amount ?? 0
      const totalPaid = row.total_paid ?? 0
      const status = (row.status as LoanStatus) || 'ACTIVE'

      const active = isLoanActive(totalAmount, totalPaid, status)
      const paid = isLoanPaid(totalAmount, totalPaid, status)

      totalPrincipalCents += toCents(row.principal_amount ?? 0)
      totalToReceiveCents += toCents(totalAmount)
      totalPaidCents += toCents(totalPaid)
      remainingBalanceCents += toCents(row.remaining_balance ?? Math.max(0, totalAmount - totalPaid))

      if (active) activeLoansCount++
      if (paid) paidLoansCount++

      return {
        loan_id: row.loan_id || '',
        person_id: row.person_id || person.id,
        person_name: row.person_name || person.name,
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

    return {
      data: {
        person,
        summary: {
          total_principal: fromCents(totalPrincipalCents),
          total_to_receive: fromCents(totalToReceiveCents),
          total_paid: fromCents(totalPaidCents),
          remaining_balance: fromCents(remainingBalanceCents),
          active_loans_count: activeLoansCount,
          paid_loans_count: paidLoansCount,
          total_loans_count: loansList.length,
        },
        activeLoans: enrichedLoans.filter((l) => l.is_active),
        loansHistory: enrichedLoans,
      },
      error: null,
    }
  },

  /**
   * Busca uma pessoa por ID.
   */
  async getPersonById(id: string): Promise<{ data: PersonRow | null; error: string | null }> {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  },
}
