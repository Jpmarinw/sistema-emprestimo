import React from 'react'

interface StatCardProps {
  label: string
  value: string | number
  highlight?: 'default' | 'success' | 'warning' | 'danger' | 'brand'
  subtitle?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  highlight = 'default',
  subtitle,
}) => {
  const getHighlightColor = () => {
    switch (highlight) {
      case 'success':
        return 'var(--color-brand-600)'
      case 'brand':
        return 'var(--color-brand-500)'
      case 'warning':
        return 'var(--badge-warning-text)'
      case 'danger':
        return '#ef4444'
      default:
        return 'var(--text-primary)'
    }
  }

  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ fontSize: '1.625rem', fontWeight: 700, color: getHighlightColor(), lineHeight: 1.2 }}>
        {value}
      </span>
      {subtitle && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {subtitle}
        </span>
      )}
    </div>
  )
}
