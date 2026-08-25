-- Migration: 20260824190000_configure_private_rls.sql
-- Descrição: Configuração de Row Level Security (RLS) restrito a usuários autenticados para sistema privado.

-- 1. Habilitação de RLS em todas as tabelas principais
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 2. Remoção de políticas permissivas abertas anteriores se existirem
DROP POLICY IF EXISTS "Permitir leitura de people" ON people;
DROP POLICY IF EXISTS "Permitir insercao de people" ON people;
DROP POLICY IF EXISTS "Permitir atualizacao de people" ON people;
DROP POLICY IF EXISTS "Permitir exclusao de people" ON people;

DROP POLICY IF EXISTS "Permitir leitura de loans" ON loans;
DROP POLICY IF EXISTS "Permitir insercao de loans" ON loans;
DROP POLICY IF EXISTS "Permitir atualizacao de loans" ON loans;
DROP POLICY IF EXISTS "Permitir exclusao de loans" ON loans;

DROP POLICY IF EXISTS "Permitir leitura de payments" ON payments;
DROP POLICY IF EXISTS "Permitir insercao de payments" ON payments;
DROP POLICY IF EXISTS "Permitir atualizacao de payments" ON payments;
DROP POLICY IF EXISTS "Permitir exclusao de payments" ON payments;

-- 3. Políticas privadas restritas exclusivamente ao papel autenticado (TO authenticated)
-- Garante que requisições anônimas (sem token JWT válido) não acessem nem modifiquem dados.

-- Tabela: people
CREATE POLICY "Acesso autenticado para leitura de people"
    ON people FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Acesso autenticado para criacao de people"
    ON people FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Acesso autenticado para atualizacao de people"
    ON people FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Acesso autenticado para exclusao de people"
    ON people FOR DELETE
    TO authenticated
    USING (true);

-- Tabela: loans
CREATE POLICY "Acesso autenticado para leitura de loans"
    ON loans FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Acesso autenticado para criacao de loans"
    ON loans FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Acesso autenticado para atualizacao de loans"
    ON loans FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Acesso autenticado para exclusao de loans"
    ON loans FOR DELETE
    TO authenticated
    USING (true);

-- Tabela: payments
CREATE POLICY "Acesso autenticado para leitura de payments"
    ON payments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Acesso autenticado para criacao de payments"
    ON payments FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Acesso autenticado para atualizacao de payments"
    ON payments FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Acesso autenticado para exclusao de payments"
    ON payments FOR DELETE
    TO authenticated
    USING (true);
