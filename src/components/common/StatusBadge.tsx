import React from 'react'
import type { LoanStatus } from '../../domain/types'

interface StatusBadgeProps {
  status: LoanStatus
  isActive?: boolean
  isPaid?: boolean
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isActive, isPaid }) => {
  if (isPaid || status === 'PAID') {
    return <span className="badge badge-success">Quitado</span>
  }

  if (isActive || status === 'ACTIVE') {
    return <span className="badge badge-info">Ativo</span>
  }

  if (status === 'DEFAULTED') {
    return (
      <span className="badge badge-warning" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
        Inadimplente
      </span>
    )
  }

  if (status === 'CANCELLED') {
    return (
      <span className="badge badge-warning" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
        Cancelado
      </span>
    )
  }

  return <span className="badge badge-warning">{status}</span>
}
