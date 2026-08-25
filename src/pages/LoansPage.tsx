import React, { useEffect, useState } from "react";
import {
    loansService,
    type EnrichedLoanSummary,
} from "../services/loansService";
import { peopleService } from "../services/peopleService";
import {
    calculateTotalAmount,
    calculateInterestAmount,
} from "../domain/financial";
import { StatusBadge } from "../components/common/StatusBadge";
import { Modal } from "../components/common/Modal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { EmptyState } from "../components/common/EmptyState";
import { formatBRL } from "../utils/money";
import type { PersonRow } from "../domain/types";

interface LoansPageProps {
    onNavigateToLoanDetail: (loanId: string) => void;
    onNavigateToPersonDetail: (personId: string) => void;
}

export const LoansPage: React.FC<LoansPageProps> = ({
    onNavigateToLoanDetail,
    onNavigateToPersonDetail,
}) => {
    const [loans, setLoans] = useState<EnrichedLoanSummary[]>([]);
    const [people, setPeople] = useState<PersonRow[]>([]);
    const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "PAID">("ALL");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal de Criação de Empréstimo
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPersonId, setSelectedPersonId] = useState("");
    const [principal, setPrincipal] = useState<string>("1000");
    const [interestRate, setInterestRate] = useState<string>("10");
    const [loanDate, setLoanDate] = useState<string>(
        new Date().toISOString().split("T")[0],
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            const [loansRes, peopleRes] = await Promise.all([
                loansService.listLoansSummary(filter),
                peopleService.listPeople(),
            ]);

            if (loansRes.error) {
                setError(loansRes.error);
            } else {
                setLoans(loansRes.data);
            }

            if (!peopleRes.error) {
                setPeople(peopleRes.data);
                if (peopleRes.data.length > 0 && !selectedPersonId) {
                    setSelectedPersonId(peopleRes.data[0].id);
                }
            }
        } catch (err: any) {
            setError(err.message || "Erro ao carregar lista de empréstimos.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let active = true;

        async function fetchLoans() {
            try {
                const [loansRes, peopleRes] = await Promise.all([
                    loansService.listLoansSummary(filter),
                    peopleService.listPeople(),
                ]);

                if (!active) return;

                if (loansRes.error) {
                    setError(loansRes.error);
                } else {
                    setLoans(loansRes.data);
                }

                if (!peopleRes.error) {
                    setPeople(peopleRes.data);
                    if (peopleRes.data.length > 0 && !selectedPersonId) {
                        setSelectedPersonId(peopleRes.data[0].id);
                    }
                }
            } catch (err: any) {
                if (active)
                    setError(
                        err.message || "Erro ao carregar lista de empréstimos.",
                    );
            } finally {
                if (active) setIsLoading(false);
            }
        }

        fetchLoans();

        return () => {
            active = false;
        };
    }, [filter, selectedPersonId]);

    // Cálculo prévio em tempo real para o modal
    const numPrincipal = parseFloat(principal) || 0;
    const numRate = parseFloat(interestRate) || 0;
    const previewTotal =
        numPrincipal > 0 && numRate >= 0
            ? calculateTotalAmount(numPrincipal, numRate)
            : 0;
    const previewInterest =
        numPrincipal > 0 && numRate >= 0
            ? calculateInterestAmount(numPrincipal, numRate)
            : 0;

    const handleCreateLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!selectedPersonId) {
            setFormError("Selecione uma pessoa para conceder o empréstimo.");
            return;
        }
        if (numPrincipal <= 0) {
            setFormError("O valor emprestado deve ser maior que zero.");
            return;
        }
        if (numRate < 0) {
            setFormError("A taxa de juros não pode ser negativa.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await loansService.createLoan({
                person_id: selectedPersonId,
                principal_amount: numPrincipal,
                interest_rate: numRate,
                loan_date: loanDate,
            });

            if (res.error) {
                setFormError(res.error);
            } else {
                setIsModalOpen(false);
                setPrincipal("1000");
                setInterestRate("10");
                await loadData();
            }
        } catch (err: any) {
            setFormError(err.message || "Erro ao criar empréstimo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <LoadingSpinner message="Carregando empréstimos..." />;
    }

    return (
        <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
            {/* Cabeçalho e Ações */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: "1.75rem",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            margin: 0,
                        }}
                    >
                        Empréstimos
                    </h1>
                    <p
                        style={{
                            color: "var(--text-secondary)",
                            marginTop: "0.25rem",
                            fontSize: "0.9rem",
                        }}
                    >
                        Gerenciamento geral de contratos de empréstimos e status
                        de pagamento
                    </p>
                </div>

                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                        setFormError(null);
                        if (people.length > 0 && !selectedPersonId) {
                            setSelectedPersonId(people[0].id);
                        }
                        setIsModalOpen(true);
                    }}
                >
                    + Novo Empréstimo
                </button>
            </div>

            {/* Barra de Filtros */}
            <div
                style={{
                    display: "flex",
                    gap: "0.5rem",
                    borderBottom: "1px solid var(--border-subtle)",
                    paddingBottom: "0.5rem",
                }}
            >
                <button
                    type="button"
                    className={`nav-btn ${filter === "ALL" ? "active" : ""}`}
                    onClick={() => setFilter("ALL")}
                >
                    Todos ({loans.length})
                </button>
                <button
                    type="button"
                    className={`nav-btn ${filter === "ACTIVE" ? "active" : ""}`}
                    onClick={() => setFilter("ACTIVE")}
                >
                    Ativos
                </button>
                <button
                    type="button"
                    className={`nav-btn ${filter === "PAID" ? "active" : ""}`}
                    onClick={() => setFilter("PAID")}
                >
                    Quitados
                </button>
            </div>

            {error && (
                <div
                    style={{
                        padding: "0.875rem 1rem",
                        backgroundColor: "#fee2e2",
                        color: "#991b1b",
                        borderRadius: "var(--radius-md)",
                        fontSize: "0.875rem",
                    }}
                >
                    ⚠️ {error}
                </div>
            )}

            {loans.length === 0 ? (
                <EmptyState
                    title="Nenhum empréstimo encontrado"
                    description={
                        filter === "ACTIVE"
                            ? "Não há empréstimos com saldo pendente no momento."
                            : filter === "PAID"
                              ? "Não há empréstimos quitados no momento."
                              : "Nenhum contrato cadastrado."
                    }
                    actionLabel="+ Criar Empréstimo"
                    onAction={() => setIsModalOpen(true)}
                />
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Data</th>
                                <th>Principal</th>
                                <th>Taxa</th>
                                <th>Total Contratado</th>
                                <th>Total Pago</th>
                                <th>Saldo Devedor</th>
                                <th>Status</th>
                                <th style={{ textAlign: "right" }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loans.map((loan) => (
                                <tr
                                    key={loan.loan_id}
                                    className="clickable"
                                    onClick={() =>
                                        onNavigateToLoanDetail(loan.loan_id)
                                    }
                                >
                                    <td style={{ fontWeight: 600 }}>
                                        <span
                                            style={{
                                                color: "var(--color-brand-600)",
                                                cursor: "pointer",
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onNavigateToPersonDetail(
                                                    loan.person_id,
                                                );
                                            }}
                                        >
                                            {loan.person_name}
                                        </span>
                                    </td>
                                    <td
                                        style={{
                                            color: "var(--text-secondary)",
                                        }}
                                    >
                                        {loan.loan_date}
                                    </td>
                                    <td>{formatBRL(loan.principal_amount)}</td>
                                    <td>{loan.interest_rate}%</td>
                                    <td style={{ fontWeight: 600 }}>
                                        {formatBRL(loan.total_amount)}
                                    </td>
                                    <td
                                        style={{
                                            color: "var(--color-brand-600)",
                                        }}
                                    >
                                        {formatBRL(loan.total_paid)}
                                    </td>
                                    <td
                                        style={{
                                            fontWeight: 600,
                                            color:
                                                loan.remaining_balance > 0
                                                    ? "#ef4444"
                                                    : "var(--color-brand-600)",
                                        }}
                                    >
                                        {formatBRL(loan.remaining_balance)}
                                    </td>
                                    <td>
                                        <StatusBadge
                                            status={loan.status}
                                            isActive={loan.is_active}
                                            isPaid={loan.is_paid}
                                        />
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onNavigateToLoanDetail(
                                                    loan.loan_id,
                                                );
                                            }}
                                        >
                                            Ver Detalhes
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de Criação de Empréstimo */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Cadastrar Novo Empréstimo"
            >
                <form onSubmit={handleCreateLoan}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="select-person">
                            Pessoa (Cliente)
                        </label>
                        {people.length === 0 ? (
                            <p
                                style={{
                                    fontSize: "0.875rem",
                                    color: "#ef4444",
                                }}
                            >
                                Cadastre ao menos uma pessoa na aba "Pessoas"
                                antes de criar um empréstimo.
                            </p>
                        ) : (
                            <select
                                id="select-person"
                                className="form-select"
                                value={selectedPersonId}
                                onChange={(e) =>
                                    setSelectedPersonId(e.target.value)
                                }
                                required
                                disabled={isSubmitting}
                            >
                                {people.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="loan-principal">
                            Valor Emprestado (Principal em R$)
                        </label>
                        <input
                            id="loan-principal"
                            type="number"
                            min="1"
                            step="0.01"
                            className="form-input"
                            value={principal}
                            onChange={(e) => setPrincipal(e.target.value)}
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0.75rem",
                        }}
                    >
                        <div className="form-group">
                            <label className="form-label" htmlFor="loan-rate">
                                Taxa de Juros (%)
                            </label>
                            <input
                                id="loan-rate"
                                type="number"
                                min="0"
                                step="0.1"
                                className="form-input"
                                value={interestRate}
                                onChange={(e) =>
                                    setInterestRate(e.target.value)
                                }
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="form-group">
                            <label
                                className="form-label"
                                htmlFor="loan-date-input"
                            >
                                Data do Empréstimo
                            </label>
                            <input
                                id="loan-date-input"
                                type="date"
                                className="form-input"
                                value={loanDate}
                                onChange={(e) => setLoanDate(e.target.value)}
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    {/* Simulador dinâmico de juros e total */}
                    <div
                        style={{
                            padding: "0.875rem",
                            backgroundColor: "var(--bg-app)",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border-subtle)",
                            margin: "0.5rem 0 1rem 0",
                            fontSize: "0.875rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.375rem",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                            }}
                        >
                            <span style={{ color: "var(--text-secondary)" }}>
                                Juros ({numRate}%):
                            </span>
                            <span
                                style={{
                                    fontWeight: 600,
                                    color: "var(--color-brand-600)",
                                }}
                            >
                                +{formatBRL(previewInterest)}
                            </span>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                borderTop: "1px solid var(--border-subtle)",
                                paddingTop: "0.375rem",
                            }}
                        >
                            <span
                                style={{
                                    fontWeight: 600,
                                    color: "var(--text-primary)",
                                }}
                            >
                                Total a Receber:
                            </span>
                            <span
                                style={{
                                    fontWeight: 700,
                                    color: "var(--color-brand-600)",
                                    fontSize: "1rem",
                                }}
                            >
                                {formatBRL(previewTotal)}
                            </span>
                        </div>
                    </div>

                    {formError && (
                        <p
                            className="form-error"
                            style={{ marginBottom: "1rem" }}
                        >
                            {formError}
                        </p>
                    )}

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "0.75rem",
                        }}
                    >
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setIsModalOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting || people.length === 0}
                        >
                            {isSubmitting ? "Salvando..." : "Salvar Empréstimo"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
