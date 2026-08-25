import React, { useEffect, useState } from 'react'
import { dashboardService, type DashboardData } from '../services/dashboardService'
import { StatCard } from '../components/common/StatCard'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { EmptyState } from '../components/common/EmptyState'
import { formatBRL } from '../utils/money'

interface DashboardPageProps {
  onNavigateToLoans: () => void
  onNavigateToLoanDetail: (loanId: string) => void
  onNavigateToPeople: () => void
  onNavigateToPersonDetail: (personId: string) => void
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToLoans,
  onNavigateToLoanDetail,
  onNavigateToPeople,
  onNavigateToPersonDetail,
}) => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function fetchData() {
      try {
        const res = await dashboardService.getDashboardData()
        if (!active) return

        if (res.error) {
          setError(res.error)
        } else {
          setData(res.data)
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
    return <LoadingSpinner message="Carregando visão gerencial..." />
  }

  const metrics = data?.metrics
  const topPending = data?.topPendingLoans || []
  const recentPayments = data?.recentPayments || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabeçalho com Ações Rápidas Mobile/Tablet Friendly */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.875rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Visão Geral
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', fontSize: '0.875rem' }}>
            Resumo gerencial e saúde financeira da carteira
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.625rem', width: '100%', maxWidth: '340px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={onNavigateToPeople}
          >
            👤 Pessoas
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={onNavigateToLoans}
          >
            📄 Empréstimos
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.875rem 1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 1. Card de Destaque: Termômetro da Carteira & Recuperação */}
      {metrics && metrics.totalLoansCount > 0 ? (
        <div className="hero-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Taxa de Recuperação do Capital
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-brand-500)', lineHeight: 1 }}>
                  {metrics.recoveryRate}%
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  recebido do total contratado
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-info">
                {metrics.activeLoansCount} Ativo(s)
              </span>
              <span className="badge badge-success">
                {metrics.paidLoansCount} Quitado(s)
              </span>
            </div>
          </div>

          {/* Barra de Progresso Visual */}
          <div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(100, metrics.recoveryRate)}%` }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Recebido: {formatBRL(metrics.totalPaid)}</span>
              <span>Total Contratado: {formatBRL(metrics.totalToReceive)}</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. Grid de 4 Métricas Financeiras Consolidadas */}
      <div className="grid-metrics">
        <StatCard
          label="Total Emprestado"
          value={formatBRL(metrics?.totalPrincipal || 0)}
          subtitle="Capital inicial investido"
        />
        <StatCard
          label="Total a Receber"
          value={formatBRL(metrics?.totalToReceive || 0)}
          highlight="brand"
          subtitle={`+${formatBRL(metrics?.totalInterest || 0)} em juros`}
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
          subtitle="Valor em aberto na praça"
        />
      </div>

      {/* 3. Dois Painéis Focados em Gestão (Lado a Lado no Tablet) */}
      <div className="grid-dashboard-panels">
        {/* Painel 1: Maiores Saldos Pendentes (Foco em Cobrança) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                ⚠️ Maiores Saldos Pendentes
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Contratos com maior valor a receber
              </span>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onNavigateToLoans}
            >
              Ver Todos
            </button>
          </div>

          {topPending.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              🎉 Nenhum saldo em aberto pendente no momento!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {topPending.map((item) => (
                <div
                  key={item.loan_id}
                  className="touch-list-item"
                  onClick={() => onNavigateToLoanDetail(item.loan_id)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                    <span
                      style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem' }}
                      onClick={(e) => {
                        if (item.person_id) {
                          e.stopPropagation()
                          onNavigateToPersonDetail(item.person_id)
                        }
                      }}
                    >
                      {item.person_name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Contrato: {item.loan_date} • Pago: {item.progress_percent}%
                    </span>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ display: 'block', fontWeight: 800, color: '#ef4444', fontSize: '1rem' }}>
                      {formatBRL(item.remaining_balance)}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      de {formatBRL(item.total_amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Painel 2: Últimas Amortizações Recebidas (Extrato de Entradas) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                💳 Últimos Pagamentos Recebidos
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Entradas recentes de amortizações
              </span>
            </div>
          </div>

          {recentPayments.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Nenhum pagamento registrado ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="touch-list-item"
                  onClick={() => onNavigateToLoanDetail(payment.loan_id)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                      {payment.person_name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Data: {payment.payment_date}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ display: 'block', fontWeight: 800, color: 'var(--color-brand-600)', fontSize: '1rem' }}>
                      +{formatBRL(payment.amount)}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-brand-500)', fontWeight: 600 }}>
                      Amortizado
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {metrics?.totalLoansCount === 0 && (
        <EmptyState
          title="Nenhum empréstimo cadastrado"
          description="Cadastre a primeira pessoa e crie o primeiro contrato para alimentar o dashboard."
          actionLabel="+ Conceder Primeiro Empréstimo"
          onAction={onNavigateToLoans}
        />
      )}
    </div>
  )
}
