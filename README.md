# Controle de Empréstimos

Sistema web minimalista, seguro e profissional para gerenciamento de concessão de empréstimos financeiros, amortizações e controle de clientes.

---

## 🚀 Tecnologias

- **Frontend:** React 19, TypeScript, Vite, CSS Vanilla (Design Tokens com Dark Mode nativo).
- **Backend & Database:** Supabase (PostgreSQL, Triggers, Views agregadas e Row Level Security).
- **Qualidade & Testes:** Vitest (testes unitários com cálculos em centavos inteiros), Oxlint.
- **CI/CD:** GitHub Actions (Deploy automatizado no GitHub Pages e workflow seguro de migrations).

---

## 🛠️ Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar servidor local de desenvolvimento
npm run dev

# Executar suíte de testes unitários e de integração
npm run test

# Executar linter (Oxlint)
npm run lint

# Compilar build de produção para validação
npm run build
```

---

## 🔒 Configuração de Secrets no GitHub

Para habilitar o deploy automatizado no **GitHub Pages** e a execução segura das migrations via **GitHub Actions**, configure as seguintes variáveis em **Settings > Secrets and variables > Actions**:

### 1. Para o Deploy no GitHub Pages:

| Secret / Variable        | Tipo              | Descrição                                                        |
| ------------------------ | ----------------- | ---------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Variable / Secret | URL pública do projeto Supabase (ex: `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Variable / Secret | Chave pública anônima do Supabase                                |

### 2. Para o Workflow de Migrations do Supabase (Opcional):

| Secret                  | Tipo              | Descrição                                                         |
| ----------------------- | ----------------- | ----------------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | Secret            | Token de acesso pessoal gerado no Supabase CLI / Account Settings |
| `SUPABASE_PROJECT_ID`   | Variable / Secret | ID de referência do projeto (ex: `tyctowjsfqqgeowohzak`)          |
| `SUPABASE_DB_PASSWORD`  | Secret            | Senha do banco de dados PostgreSQL do Supabase                    |

---

## 🗄️ Estrutura das Migrations

As migrações do banco de dados estão versionadas na pasta `supabase/migrations/`:

1. `20260824170608_create_loan_management_schema.sql`: Tabelas (`people`, `loans`, `payments`), view agregada `loans_summary`, triggers e índices.
2. `20260824190000_configure_private_rls.sql`: Políticas de Row Level Security (RLS) restritas a usuários autenticados.
