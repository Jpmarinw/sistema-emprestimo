import React from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        backgroundColor: 'var(--bg-app)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
      }}
    >
      <span style={{ fontSize: '2rem' }}>📂</span>
      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
        {title}
      </h4>
      {description && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: 0 }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onAction}
          style={{ marginTop: '0.5rem' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
