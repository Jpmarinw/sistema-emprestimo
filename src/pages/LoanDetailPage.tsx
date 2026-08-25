import React, { useEffect, useState } from 'react'
import { loansService, type EnrichedLoanSummary } from '../services/loansService'
import { paymentsService } from '../services/paymentsService'
import { peopleService } from '../services/peopleService'
import { validatePayment } from '../domain/financial'
import { StatCard } from '../components/common/StatCard'
import { StatusBadge } from '../components/common/StatusBadge'
import { Modal } from '../components/common/Modal'
import { ConfirmModal } from '../components/common/ConfirmModal'
import { EditLoanModal } from '../components/loans/EditLoanModal'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { EmptyState } from '../components/common/EmptyState'
import { formatBRL } from '../utils/money'
import type { PaymentRow, PersonRow } from '../domain/types'

interface LoanDetailPageProps {
  loanId: string
  onBack: () => void
  onNavigateToPersonDetail: (personId: string) => void
}

export const LoanDetailPage: React.FC<LoanDetailPageProps> = ({
  loanId,
  onBack,
  onNavigateToPersonDetail,
}) => {
  const [loan, setLoan] = useState<EnrichedLoanSummary | null>(null)
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [people, setPeople] = useState<PersonRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal de Registro de Pagamento
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentFormError, setPaymentFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Modal de Edição e Exclusão
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadLoanDetails = async () => {
    try {
      const [loanRes, paymentsRes, peopleRes] = await Promise.all([
        loansService.getLoanSummaryById(loanId),
        paymentsService.listPaymentsByLoanId(loanId),
        peopleService.listPeople(),
      ])

      if (loanRes.error || !loanRes.data) {
        setError(loanRes.error || 'Empréstimo não encontrado.')
      } else {
        setLoan(loanRes.data)
      }

      if (!paymentsRes.error) {
        setPayments(paymentsRes.data)
      }

      if (!peopleRes.error) {
        setPeople(peopleRes.data)
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar detalhes do empréstimo.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function fetchLoan() {
      try {
        const [loanRes, paymentsRes, peopleRes] = await Promise.all([
          loansService.getLoanSummaryById(loanId),
          paymentsService.listPaymentsByLoanId(loanId),
          peopleService.listPeople(),
        ])

        if (!active) return

        if (loanRes.error || !loanRes.data) {
          setError(loanRes.error || 'Empréstimo não encontrado.')
        } else {
          setLoan(loanRes.data)
        }

        if (!paymentsRes.error) {
          setPayments(paymentsRes.data)
        }

        if (!peopleRes.error) {
          setPeople(peopleRes.data)
        }
      } catch (err: any) {
        if (active) setError(err.message || 'Erro ao carregar detalhes do empréstimo.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    fetchLoan()

    return () => {
      active = false
    }
  }, [loanId])

  const handleDeleteLoan = async () => {
    setIsDeleting(true)
    try {
      const res = await loansService.deleteLoan(loanId)
      if (res.error) {
        setError(res.error)
        setIsDeleteModalOpen(false)
      } else {
        setIsDeleteModalOpen(false)
        onBack()
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir empréstimo.')
      setIsDeleteModalOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const numPayment = parseFloat(paymentAmount) || 0

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setPaymentFormError(null)

    if (!loan) return

    const validation = validatePayment(numPayment, loan.remaining_balance)
    if (!validation.isValid) {
      setPaymentFormError(validation.errors.join(' '))
      return
    }

    setIsSubmitting(true)
    try {
      const res = await paymentsService.registerPayment({
        loan_id: loanId,
        amount: numPayment,
        payment_date: paymentDate,
      })

      if (res.error) {
        setPaymentFormError(res.error)
      } else {
        setIsPaymentModalOpen(false)
        setPaymentAmount('')
        setSuccessMessage(
          res.isFullyPaid
            ? '🎉 Pagamento registrado com sucesso! O empréstimo foi totalmente QUITADO.'
            : '✅ Pagamento amortizado com sucesso.'
        )
        await loadLoanDetails()
      }
    } catch (err: any) {
      setPaymentFormError(err.message || 'Erro ao registrar pagamento.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Carregando dados do empréstimo..." />
  }

  if (error || !loan) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
          ← Voltar para Empréstimos
        </button>
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)' }}>
          ⚠️ {error || 'Empréstimo não encontrado.'}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Retorno e Cabeçalho */}
      <div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onBack}
          style={{ marginBottom: '1rem' }}
        >
          ← Voltar para Empréstimos
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <StatusBadge status={loan.status} isActive={loan.is_active} isPaid={loan.is_paid} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Contrato de {loan.loan_date}
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Empréstimo de{' '}
              <span
                style={{ color: 'var(--color-brand-600)', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => onNavigateToPersonDetail(loan.person_id)}
                title="Ver perfil da pessoa"
              >
                {loan.person_name}
              </span>
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsEditModalOpen(true)}
              title="Editar dados do empréstimo"
            >
              ✏️ Editar
            </button>
            <button
              type="button"
              className="btn btn-danger-outline btn-sm"
              onClick={() => setIsDeleteModalOpen(true)}
              title="Excluir este empréstimo"
            >
              🗑️ Excluir
            </button>
            {!loan.is_paid && loan.remaining_balance > 0 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setPaymentFormError(null)
                  setPaymentAmount(loan.remaining_balance.toString())
                  setIsPaymentModalOpen(true)
                }}
              >
                💳 Registrar Pagamento
              </button>
            )}
          </div>
        </div>
      </div>

      {successMessage && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#065f46' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Cards de Métricas do Empréstimo */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <StatCard
          label="Valor Emprestado"
          value={formatBRL(loan.principal_amount)}
          subtitle="Capital inicial"
        />
        <StatCard
          label="Taxa de Juros"
          value={`${loan.interest_rate}%`}
          subtitle="Pré-fixada"
        />
        <StatCard
          label="Valor Total a Receber"
          value={formatBRL(loan.total_amount)}
          highlight="brand"
          subtitle="Principal + juros"
        />
        <StatCard
          label="Total Recebido"
          value={formatBRL(loan.total_paid)}
          highlight="success"
          subtitle={`${payments.length} pagamento(s)`}
        />
        <StatCard
          label="Saldo Devedor"
          value={formatBRL(loan.remaining_balance)}
          highlight={loan.remaining_balance > 0 ? 'danger' : 'success'}
          subtitle={loan.remaining_balance === 0 ? 'Quitado' : 'Em aberto'}
        />
      </div>

      {/* Histórico de Pagamentos */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Histórico de Pagamentos ({payments.length})
          </h2>

          {!loan.is_paid && loan.remaining_balance > 0 && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setPaymentFormError(null)
                setPaymentAmount(loan.remaining_balance.toString())
                setIsPaymentModalOpen(true)
              }}
            >
              + Novo Pagamento
            </button>
          )}
        </div>

        {payments.length === 0 ? (
          <EmptyState
            title="Nenhum pagamento registrado ainda"
            description="Registre uma amortização para atualizar o saldo devedor deste empréstimo."
            actionLabel="Registrar Primeiro Pagamento"
            onAction={() => {
              setPaymentFormError(null)
              setPaymentAmount(loan.remaining_balance.toString())
              setIsPaymentModalOpen(true)
            }}
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data do Pagamento</th>
                  <th>Valor Pago</th>
                  <th>ID da Transação</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.payment_date}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-brand-600)' }}>
                      {formatBRL(p.amount)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {p.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Registro de Pagamento */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Registrar Pagamento de Empréstimo"
      >
        <form onSubmit={handleRegisterPayment}>
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-app)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Cliente:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{loan.person_name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Saldo Devedor Atual:</span>
              <strong style={{ color: '#ef4444' }}>{formatBRL(loan.remaining_balance)}</strong>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pay-amount">
              Valor do Pagamento (R$)
            </label>
            <input
              id="pay-amount"
              type="number"
              min="0.01"
              max={loan.remaining_balance}
              step="0.01"
              className="form-input"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder={`Máx: ${loan.remaining_balance.toFixed(2)}`}
              required
              disabled={isSubmitting}
              autoFocus
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Dica: Digite o valor exato para liquidação ou um valor parcial.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pay-date">
              Data do Pagamento
            </label>
            <input
              id="pay-date"
              type="date"
              className="form-input"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          {paymentFormError && (
            <p className="form-error" style={{ marginBottom: '1rem' }}>
              {paymentFormError}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Edição de Empréstimo */}
      <EditLoanModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        loan={loan}
        people={people}
        onSuccess={async () => {
          setSuccessMessage('✅ Empréstimo atualizado com sucesso.')
          await loadLoanDetails()
        }}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteLoan}
        title="Excluir Empréstimo"
        message={
          <div>
            <p style={{ marginBottom: '0.75rem' }}>
              Tem certeza que deseja excluir o empréstimo de <strong>{loan.person_name}</strong> no valor de <strong>{formatBRL(loan.principal_amount)}</strong>?
            </p>
            {payments.length > 0 && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                ⚠️ <strong>Aviso Importante:</strong> Este contrato possui <strong>{payments.length} pagamento(s)</strong> vinculados no total de <strong>{formatBRL(loan.total_paid)}</strong>. Ao excluir, todas as movimentações serão excluídas permanentemente.
              </div>
            )}
          </div>
        }
        confirmText="Sim, Excluir Empréstimo"
        cancelText="Cancelar"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  )
}
