import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { loansService, type EnrichedLoanSummary } from '../../services/loansService'
import { calculateTotalAmount, calculateInterestAmount } from '../../domain/financial'
import { formatBRL } from '../../utils/money'
import type { PersonRow } from '../../domain/types'

interface EditLoanModalProps {
  isOpen: boolean
  onClose: () => void
  loan: EnrichedLoanSummary | null
  people?: PersonRow[]
  onSuccess: () => void
}

export const EditLoanModal: React.FC<EditLoanModalProps> = ({
  isOpen,
  onClose,
  loan,
  people = [],
  onSuccess,
}) => {
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [principal, setPrincipal] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [loanDate, setLoanDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (loan && isOpen) {
      setSelectedPersonId(loan.person_id)
      setPrincipal(loan.principal_amount.toString())
      setInterestRate(loan.interest_rate.toString())
      setLoanDate(loan.loan_date || new Date().toISOString().split('T')[0])
      setFormError(null)
    }
  }, [loan, isOpen])

  if (!loan) return null

  const numPrincipal = parseFloat(principal) || 0
  const numRate = parseFloat(interestRate) || 0
  const previewTotal =
    numPrincipal > 0 && numRate >= 0
      ? calculateTotalAmount(numPrincipal, numRate)
      : 0
  const previewInterest =
    numPrincipal > 0 && numRate >= 0
      ? calculateInterestAmount(numPrincipal, numRate)
      : 0

  const totalPaid = loan.total_paid || 0
  const isBelowPaid = previewTotal < totalPaid && previewTotal > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!selectedPersonId) {
      setFormError('Selecione uma pessoa vinculada ao empréstimo.')
      return
    }
    if (numPrincipal <= 0) {
      setFormError('O valor emprestado deve ser maior que zero.')
      return
    }
    if (numRate < 0) {
      setFormError('A taxa de juros não pode ser negativa.')
      return
    }
    if (isBelowPaid) {
      setFormError(
        `O novo valor total contratado (${formatBRL(previewTotal)}) não pode ser inferior ao montante já pago (${formatBRL(totalPaid)}).`
      )
      return
    }

    setIsSubmitting(true)
    try {
      const res = await loansService.updateLoan({
        id: loan.loan_id,
        person_id: selectedPersonId,
        principal_amount: numPrincipal,
        interest_rate: numRate,
        loan_date: loanDate,
      })

      if (res.error) {
        setFormError(res.error)
      } else {
        onClose()
        onSuccess()
      }
    } catch (err: any) {
      setFormError(err.message || 'Erro ao atualizar empréstimo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Empréstimo">
      <form onSubmit={handleSubmit}>
        {/* Informações sobre Amortizações Prévias */}
        {totalPaid > 0 && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--color-brand-50)',
              border: '1px solid var(--color-brand-100)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: 'var(--color-brand-700)',
            }}
          >
            <strong>💡 Atenção:</strong> Este empréstimo já possui{' '}
            <strong>{formatBRL(totalPaid)}</strong> amortizados em {loan.payments_count} pagamento(s).
            O novo valor total contratado não pode ser menor que o total já pago.
          </div>
        )}

        {/* Seleção de Pessoa */}
        <div className="form-group">
          <label className="form-label" htmlFor="edit-loan-person">
            Pessoa (Cliente)
          </label>
          {people.length > 0 ? (
            <select
              id="edit-loan-person"
              className="form-select"
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              required
              disabled={isSubmitting}
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="edit-loan-person"
              type="text"
              className="form-input"
              value={loan.person_name}
              disabled
            />
          )}
        </div>

        {/* Valor Principal */}
        <div className="form-group">
          <label className="form-label" htmlFor="edit-loan-principal">
            Valor Emprestado (Principal em R$)
          </label>
          <input
            id="edit-loan-principal"
            type="number"
            min="1"
            step="0.01"
            className="form-input"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
          }}
        >
          {/* Taxa de Juros */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-loan-rate">
              Taxa de Juros (%)
            </label>
            <input
              id="edit-loan-rate"
              type="number"
              min="0"
              step="0.1"
              className="form-input"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Data do Empréstimo */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-loan-date">
              Data do Empréstimo
            </label>
            <input
              id="edit-loan-date"
              type="date"
              className="form-input"
              value={loanDate}
              onChange={(e) => setLoanDate(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Simulador dinâmico de juros e total */}
        <div
          style={{
            padding: '0.875rem',
            backgroundColor: 'var(--bg-app)',
            borderRadius: 'var(--radius-md)',
            border: isBelowPaid ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
            margin: '0.5rem 0 1rem 0',
            fontSize: '0.875rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Juros ({numRate}%):</span>
            <span style={{ fontWeight: 600, color: 'var(--color-brand-600)' }}>
              +{formatBRL(previewInterest)}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.375rem',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Novo Total a Receber:
            </span>
            <span
              style={{
                fontWeight: 700,
                color: isBelowPaid ? '#ef4444' : 'var(--color-brand-600)',
                fontSize: '1rem',
              }}
            >
              {formatBRL(previewTotal)}
            </span>
          </div>
          {totalPaid > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8125rem',
                color: isBelowPaid ? '#ef4444' : 'var(--text-muted)',
              }}
            >
              <span>Novo Saldo Devedor Restante:</span>
              <strong>{formatBRL(Math.max(0, previewTotal - totalPaid))}</strong>
            </div>
          )}
        </div>

        {formError && (
          <p className="form-error" style={{ marginBottom: '1rem' }}>
            {formError}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || isBelowPaid}
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
