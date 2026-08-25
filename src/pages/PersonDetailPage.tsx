import React, { useEffect, useState } from "react";
import { peopleService, type PersonDetails } from "../services/peopleService";
import { loansService } from "../services/loansService";
import {
    calculateTotalAmount,
    calculateInterestAmount,
} from "../domain/financial";
import { StatCard } from "../components/common/StatCard";
import { StatusBadge } from "../components/common/StatusBadge";
import { Modal } from "../components/common/Modal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { EmptyState } from "../components/common/EmptyState";
import { formatBRL } from "../utils/money";

interface PersonDetailPageProps {
    personId: string;
    onBack: () => void;
    onNavigateToLoanDetail: (loanId: string) => void;
}

export const PersonDetailPage: React.FC<PersonDetailPageProps> = ({
    personId,
    onBack,
    onNavigateToLoanDetail,
}) => {
    const [details, setDetails] = useState<PersonDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal de Novo Empréstimo para a pessoa
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [principal, setPrincipal] = useState<string>("1000");
    const [interestRate, setInterestRate] = useState<string>("10");
    const [loanDate, setLoanDate] = useState<string>(
        new Date().toISOString().split("T")[0],
    );
    const [isSubmittingLoan, setIsSubmittingLoan] = useState(false);
    const [loanFormError, setLoanFormError] = useState<string | null>(null);

    const loadPersonDetails = async () => {
        try {
            const res = await peopleService.getPersonDetails(personId);
            if (res.error || !res.data) {
                setError(res.error || "Pessoa não encontrada.");
            } else {
                setDetails(res.data);
            }
        } catch (err: any) {
            setError(err.message || "Erro ao carregar detalhes da pessoa.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let active = true;

        async function fetchDetails() {
            try {
                const res = await peopleService.getPersonDetails(personId);
                if (!active) return;
                if (res.error || !res.data) {
                    setError(res.error || "Pessoa não encontrada.");
                } else {
                    setDetails(res.data);
                }
            } catch (err: any) {
                if (active)
                    setError(
                        err.message || "Erro ao carregar detalhes da pessoa.",
                    );
            } finally {
                if (active) setIsLoading(false);
            }
        }

        fetchDetails();

        return () => {
            active = false;
        };
    }, [personId]);

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
        setLoanFormError(null);

        if (numPrincipal <= 0) {
            setLoanFormError("O valor emprestado deve ser maior que zero.");
            return;
        }
        if (numRate < 0) {
            setLoanFormError("A taxa de juros não pode ser negativa.");
            return;
        }

        setIsSubmittingLoan(true);
        try {
            const res = await loansService.createLoan({
                person_id: personId,
                principal_amount: numPrincipal,
                interest_rate: numRate,
                loan_date: loanDate,
            });

            if (res.error) {
                setLoanFormError(res.error);
            } else {
                setIsLoanModalOpen(false);
                setPrincipal("1000");
                setInterestRate("10");
                await loadPersonDetails();
            }
        } catch (err: any) {
            setLoanFormError(err.message || "Erro ao criar empréstimo.");
        } finally {
            setIsSubmittingLoan(false);
        }
    };

    if (isLoading) {
        return <LoadingSpinner message="Carregando dados da pessoa..." />;
    }

    if (error || !details) {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onBack}
                    style={{ alignSelf: "flex-start" }}
                >
                    ← Voltar para Pessoas
                </button>
                <div
                    style={{
                        padding: "1rem",
                        backgroundColor: "#fee2e2",
                        color: "#991b1b",
                        borderRadius: "var(--radius-md)",
                    }}
                >
                    ⚠️ {error || "Pessoa não encontrada."}
                </div>
            </div>
        );
    }

    const { person, summary, activeLoans, loansHistory } = details;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {/* Botão de Retorno e Cabeçalho */}
            <div>
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onBack}
                    style={{ marginBottom: "1rem" }}
                >
                    ← Voltar para Pessoas
                </button>

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
                        <span
                            className="badge badge-info"
                            style={{ marginBottom: "0.25rem" }}
                        >
                            Perfil do Cliente
                        </span>
                        <h1
                            style={{
                                fontSize: "1.75rem",
                                fontWeight: 700,
                                color: "var(--text-primary)",
                                margin: 0,
                            }}
                        >
                            {person.name}
                        </h1>
                    </div>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            setLoanFormError(null);
                            setIsLoanModalOpen(true);
                        }}
                    >
                        + Conceder Empréstimo
                    </button>
                </div>
            </div>

            {/* Resumo Financeiro da Pessoa */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                }}
            >
                <StatCard
                    label="Total Emprestado"
                    value={formatBRL(summary.total_principal)}
                />
                <StatCard
                    label="Total a Receber"
                    value={formatBRL(summary.total_to_receive)}
                    highlight="brand"
                />
                <StatCard
                    label="Total Recebido"
                    value={formatBRL(summary.total_paid)}
                    highlight="success"
                />
                <StatCard
                    label="Saldo Devedor"
                    value={formatBRL(summary.remaining_balance)}
                    highlight={
                        summary.remaining_balance > 0 ? "danger" : "default"
                    }
                />
                <StatCard
                    label="Empréstimos Ativos"
                    value={summary.active_loans_count}
                    highlight="brand"
                />
                <StatCard
                    label="Empréstimos Quitados"
                    value={summary.paid_loans_count}
                    highlight="success"
                />
            </div>

            {/* Empréstimos Ativos */}
            <div
                className="card"
                style={{
                    padding: "1.5rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                <h2
                    style={{
                        fontSize: "1.1rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        margin: 0,
                    }}
                >
                    Empréstimos Ativos ({activeLoans.length})
                </h2>

                {activeLoans.length === 0 ? (
                    <EmptyState
                        title="Nenhum empréstimo ativo no momento"
                        description="Esta pessoa não possui débitos pendentes."
                    />
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Principal</th>
                                    <th>Taxa</th>
                                    <th>Total</th>
                                    <th>Recebido</th>
                                    <th>Saldo Devedor</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: "right" }}>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeLoans.map((loan) => (
                                    <tr
                                        key={loan.loan_id}
                                        className="clickable"
                                        onClick={() =>
                                            onNavigateToLoanDetail(loan.loan_id)
                                        }
                                    >
                                        <td>{loan.loan_date}</td>
                                        <td>
                                            {formatBRL(loan.principal_amount)}
                                        </td>
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
                                                color: "#ef4444",
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
            </div>

            {/* Histórico Completo de Empréstimos */}
            <div
                className="card"
                style={{
                    padding: "1.5rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                <h2
                    style={{
                        fontSize: "1.1rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        margin: 0,
                    }}
                >
                    Histórico Completo de Empréstimos ({loansHistory.length})
                </h2>

                {loansHistory.length === 0 ? (
                    <EmptyState
                        title="Nenhum histórico registrado"
                        description="Nenhum empréstimo concedido até o momento."
                    />
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Principal</th>
                                    <th>Taxa</th>
                                    <th>Total Contratado</th>
                                    <th>Total Pago</th>
                                    <th>Saldo Devedor</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loansHistory.map((loan) => (
                                    <tr
                                        key={loan.loan_id}
                                        className="clickable"
                                        onClick={() =>
                                            onNavigateToLoanDetail(loan.loan_id)
                                        }
                                    >
                                        <td>{loan.loan_date}</td>
                                        <td>
                                            {formatBRL(loan.principal_amount)}
                                        </td>
                                        <td>{loan.interest_rate}%</td>
                                        <td>{formatBRL(loan.total_amount)}</td>
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Concessão de Empréstimo */}
            <Modal
                isOpen={isLoanModalOpen}
                onClose={() => setIsLoanModalOpen(false)}
                title={`Conceder Empréstimo para ${person.name}`}
            >
                <form onSubmit={handleCreateLoan}>
                    <div className="form-group">
                        <label
                            className="form-label"
                            htmlFor="principal-amount"
                        >
                            Valor Emprestado (Principal em R$)
                        </label>
                        <input
                            id="principal-amount"
                            type="number"
                            min="1"
                            step="0.01"
                            className="form-input"
                            value={principal}
                            onChange={(e) => setPrincipal(e.target.value)}
                            required
                            disabled={isSubmittingLoan}
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
                            <label
                                className="form-label"
                                htmlFor="interest-rate"
                            >
                                Taxa de Juros (%)
                            </label>
                            <input
                                id="interest-rate"
                                type="number"
                                min="0"
                                step="0.1"
                                className="form-input"
                                value={interestRate}
                                onChange={(e) =>
                                    setInterestRate(e.target.value)
                                }
                                required
                                disabled={isSubmittingLoan}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="loan-date">
                                Data do Empréstimo
                            </label>
                            <input
                                id="loan-date"
                                type="date"
                                className="form-input"
                                value={loanDate}
                                onChange={(e) => setLoanDate(e.target.value)}
                                required
                                disabled={isSubmittingLoan}
                            />
                        </div>
                    </div>

                    {/* Resumo Dinâmico do Cálculo Financeiro */}
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

                    {loanFormError && (
                        <p
                            className="form-error"
                            style={{ marginBottom: "1rem" }}
                        >
                            {loanFormError}
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
                            onClick={() => setIsLoanModalOpen(false)}
                            disabled={isSubmittingLoan}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmittingLoan}
                        >
                            {isSubmittingLoan
                                ? "Salvando..."
                                : "Confirmar Empréstimo"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
