-- Migration: 20260824170608_create_loan_management_schema.sql
-- Descrição: Criação das tabelas de Pessoas, Empréstimos, Pagamentos, Índices, Triggers, View de Saldo e RLS.

-- 1. Função utilitária para atualização automática de timestamp updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Tabela: people (Pessoas)
CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE people IS 'Armazena as pessoas físicas ou clientes associados a empréstimos.';
COMMENT ON COLUMN people.name IS 'Nome completo da pessoa (não vazio).';

-- 3. Tabela: loans (Empréstimos)
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
    principal_amount NUMERIC(15, 2) NOT NULL CHECK (principal_amount > 0),
    interest_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00 CHECK (interest_rate >= 0),
    total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount >= principal_amount),
    loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING', 'ACTIVE', 'PAID', 'DEFAULTED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE loans IS 'Registros de contratos de empréstimos concedidos a pessoas.';
COMMENT ON COLUMN loans.principal_amount IS 'Valor inicial emprestado (capital principal).';
COMMENT ON COLUMN loans.interest_rate IS 'Taxa percentual de juros aplicada (ex: 5.00 para 5%).';
COMMENT ON COLUMN loans.total_amount IS 'Valor total contratado a receber (capital + juros).';
COMMENT ON COLUMN loans.status IS 'Estado atual do empréstimo (PENDING, ACTIVE, PAID, DEFAULTED, CANCELLED).';

-- 4. Tabela: payments (Pagamentos)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE payments IS 'Registros de pagamentos/amortizações efetuadas para cada empréstimo.';
COMMENT ON COLUMN payments.amount IS 'Valor recebido na transação de pagamento (maior que zero).';

-- 5. Índices para otimização de consultas e integridade referencial
CREATE INDEX IF NOT EXISTS idx_loans_person_id ON loans(person_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_loan_date ON loans(loan_date);

CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- 6. Triggers para updated_at automático
DROP TRIGGER IF EXISTS trg_people_updated_at ON people;
CREATE TRIGGER trg_people_updated_at
    BEFORE UPDATE ON people
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_loans_updated_at ON loans;
CREATE TRIGGER trg_loans_updated_at
    BEFORE UPDATE ON loans
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- 7. View para cálculo em tempo real do Saldo Devedor e Total Pago (sem persistência desnecessária de campos calculados)
CREATE OR REPLACE VIEW loans_summary AS
SELECT
    l.id AS loan_id,
    l.person_id,
    p.name AS person_name,
    l.principal_amount,
    l.interest_rate,
    l.total_amount,
    l.loan_date,
    l.status,
    l.created_at,
    l.updated_at,
    COALESCE(SUM(pm.amount), 0)::NUMERIC(15, 2) AS total_paid,
    (l.total_amount - COALESCE(SUM(pm.amount), 0))::NUMERIC(15, 2) AS remaining_balance,
    COUNT(pm.id)::INTEGER AS payments_count
FROM loans l
INNER JOIN people p ON p.id = l.person_id
LEFT JOIN payments pm ON pm.loan_id = l.id
GROUP BY l.id, p.name;

COMMENT ON VIEW loans_summary IS 'Visão agregada que calcula em tempo real o total pago e o saldo devedor restante de cada empréstimo.';

-- 8. Preparação da estrutura de Row Level Security (RLS)
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (estruturadas para permitir operações durante o desenvolvimento, preparadas para auth futura)
CREATE POLICY "Permitir leitura de people" ON people FOR SELECT USING (true);
CREATE POLICY "Permitir insercao de people" ON people FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao de people" ON people FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusao de people" ON people FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de loans" ON loans FOR SELECT USING (true);
CREATE POLICY "Permitir insercao de loans" ON loans FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao de loans" ON loans FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusao de loans" ON loans FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de payments" ON payments FOR SELECT USING (true);
CREATE POLICY "Permitir insercao de payments" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao de payments" ON payments FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusao de payments" ON payments FOR DELETE USING (true);
