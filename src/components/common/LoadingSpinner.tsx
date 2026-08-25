import React from 'react'

interface LoadingSpinnerProps {
  message?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Carregando informações...' }) => {
  return (
    <div
      style={{
        padding: '3rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid var(--border-subtle)',
          borderTopColor: 'var(--color-brand-500)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        {message}
      </span>
    </div>
  )
}
