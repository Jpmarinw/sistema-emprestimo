import { isSupabaseConfigured } from './lib/supabase'

export default function App() {
  const checkItems = [
    { label: 'React + TypeScript + Vite', status: 'Ativo', ok: true },
    {
      label: 'Supabase Client & Tipagem',
      status: isSupabaseConfigured ? 'Conectado (.env)' : 'Configurado (Aguardando credenciais reais)',
      ok: true,
    },
    { label: 'Supabase CLI & Migrations', status: 'Inicializado (supabase/migrations)', ok: true },
    { label: 'Variáveis de Ambiente', status: '.env e .env.example criados', ok: true },
    { label: 'Compatibilidade GitHub Pages', status: 'Base relativa configurada', ok: true },
  ]

  return (
    <main className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="card-glass" style={{ padding: '2.5rem', boxShadow: 'var(--shadow-glow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-success">Etapa 1 Concluída</span>
              <span className="badge badge-info">Arquitetura Base</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Controle de Empréstimos
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
              Configuração inicial do projeto, tipagem e estrutura de diretórios finalizada com sucesso.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
          {checkItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-brand-500)',
                    boxShadow: '0 0 8px var(--color-brand-500)',
                  }}
                />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {item.label}
                </span>
              </div>
              <span className="badge badge-info" style={{ textTransform: 'none', fontWeight: 500 }}>
                {item.status}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: '2rem',
            padding: '1.25rem',
            backgroundColor: 'var(--bg-app)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Próximos passos planejados:
          </h3>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6' }}>
            <li>Modelagem relacional e criação das migrations do banco via Supabase CLI.</li>
            <li>Definição das políticas de segurança (Row Level Security - RLS).</li>
            <li>Implementação dos serviços de acesso aos dados e interfaces de usuário.</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
