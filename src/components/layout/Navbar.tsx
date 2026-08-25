import React from 'react'

export type AppView = 'dashboard' | 'people' | 'person-detail' | 'loans' | 'loan-detail'

interface NavbarProps {
  currentView: AppView
  onNavigate: (view: AppView) => void
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const isTabActive = (tab: 'dashboard' | 'people' | 'loans') => {
    if (tab === 'dashboard') return currentView === 'dashboard'
    if (tab === 'people') return currentView === 'people' || currentView === 'person-detail'
    if (tab === 'loans') return currentView === 'loans' || currentView === 'loan-detail'
    return false
  }

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        className="container"
        style={{
          padding: '0.875rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div
          onClick={() => onNavigate('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-brand-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            $
          </div>
          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Controle de Empréstimos
          </span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className={`nav-btn ${isTabActive('dashboard') ? 'active' : ''}`}
            onClick={() => onNavigate('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`nav-btn ${isTabActive('people') ? 'active' : ''}`}
            onClick={() => onNavigate('people')}
          >
            Pessoas
          </button>
          <button
            type="button"
            className={`nav-btn ${isTabActive('loans') ? 'active' : ''}`}
            onClick={() => onNavigate('loans')}
          >
            Empréstimos
          </button>
        </nav>
      </div>
    </header>
  )
}
