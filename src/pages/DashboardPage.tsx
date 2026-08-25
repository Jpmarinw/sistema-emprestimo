import React, { useEffect, useState } from 'react'
import { dashboardService, type DashboardMetrics } from '../services/dashboardService'
import { loansService, type EnrichedLoanSummary } from '../services/loansService'
import { StatCard } from '../components/common/StatCard'
import { StatusBadge } from '../components/common/StatusBadge'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { EmptyState } from '../components/common/EmptyState'
import { formatBRL } from '../utils/money'

interface DashboardPageProps {
  onNavigateToLoans: () => void
  onNavigateToLoanDetail: (loanId: string) => void
  onNavigateToPeople: () => void
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToLoans,
  onNavigateToLoanDetail,
  onNavigateToPeople,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [recentLoans, setRecentLoans] = useState<EnrichedLoanSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function fetchData() {
      try {
        const [metricsRes, loansRes] = await Promise.all([
          dashboardService.getMetrics(),
          loansService.listLoansSummary('ALL'),
        ])

        if (!active) return

        if (metricsRes.error) {
          setError(metricsRes.error)
        } else {
          setMetrics(metricsRes.data)
        }

        if (!loansRes.error) {
          setRecentLoans(loansRes.data.slice(0, 5))
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Erro ao carregar dados do dashboard.')
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      active = false
    }
  }, [])

  if (isLoading) {
    return <LoadingSpinner message="Carregando visão geral do sistema..." />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Cabeçalho da Página */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Visão consolidada das métricas e fluxo de empréstimos
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onNavigateToPeople}>
            Pessoas
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onNavigateToLoans}>
            Empréstimos
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.875rem 1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Grid de 6 Métricas Principais Solicitadas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <StatCard
          label="Total Emprestado"
          value={formatBRL(metrics?.totalPrincipal || 0)}
          subtitle="Capital inicial concedido"
        />
        <StatCard
          label="Total a Receber"
          value={formatBRL(metrics?.totalToReceive || 0)}
          highlight="brand"
          subtitle="Principal + juros contratados"
        />
        <StatCard
          label="Total Recebido"
          value={formatBRL(metrics?.totalPaid || 0)}
          highlight="success"
          subtitle="Amortizações efetuadas"
        />
        <StatCard
          label="Saldo Devedor"
          value={formatBRL(metrics?.remainingBalance || 0)}
          highlight={metrics && metrics.remainingBalance > 0 ? 'danger' : 'default'}
          subtitle="Valor pendente em aberto"
        />
        <StatCard
          label="Empréstimos Ativos"
          value={metrics?.activeLoansCount || 0}
          highlight="brand"
          subtitle="Com saldo em aberto"
        />
        <StatCard
          label="Empréstimos Quitados"
          value={metrics?.paidLoansCount || 0}
          highlight="success"
          subtitle="Totalmente liquidados"
        />
      </div>

      {/* Empréstimos Recentes */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Empréstimos Recentes
          </h2>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onNavigateToLoans}
          >
            Ver Todos
          </button>
        </div>

        {recentLoans.length === 0 ? (
          <EmptyState
            title="Nenhum empréstimo registrado"
            description="Cadastre uma pessoa e crie o primeiro contrato de empréstimo."
            actionLabel="Ir para Empréstimos"
            onAction={onNavigateToLoans}
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Principal</th>
                  <th>Taxa</th>
                  <th>Total</th>
                  <th>Recebido</th>
                  <th>Saldo Devedor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLoans.map((loan) => (
                  <tr
                    key={loan.loan_id}
                    className="clickable"
                    onClick={() => onNavigateToLoanDetail(loan.loan_id)}
                  >
                    <td style={{ fontWeight: 600 }}>{loan.person_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{loan.loan_date}</td>
                    <td>{formatBRL(loan.principal_amount)}</td>
                    <td>{loan.interest_rate}%</td>
                    <td style={{ fontWeight: 600 }}>{formatBRL(loan.total_amount)}</td>
                    <td style={{ color: 'var(--color-brand-600)' }}>{formatBRL(loan.total_paid)}</td>
                    <td style={{ fontWeight: 600, color: loan.remaining_balance > 0 ? '#ef4444' : 'var(--color-brand-600)' }}>
                      {formatBRL(loan.remaining_balance)}
                    </td>
                    <td>
                      <StatusBadge status={loan.status} isActive={loan.is_active} isPaid={loan.is_paid} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
