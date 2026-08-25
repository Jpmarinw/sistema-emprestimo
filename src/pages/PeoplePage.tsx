import React, { useEffect, useState } from "react";
import {
    peopleService,
    type PersonFinancialSummary,
} from "../services/peopleService";
import { Modal } from "../components/common/Modal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { EmptyState } from "../components/common/EmptyState";
import { formatBRL } from "../utils/money";

interface PeoplePageProps {
    onNavigateToPersonDetail: (personId: string) => void;
}

export const PeoplePage: React.FC<PeoplePageProps> = ({
    onNavigateToPersonDetail,
}) => {
    const [people, setPeople] = useState<PersonFinancialSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal de Criação de Pessoa (Somente nome!)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const loadPeople = async () => {
        try {
            const res = await peopleService.listPeopleWithSummary();
            if (res.error) {
                setError(res.error);
            } else {
                setPeople(res.data);
            }
        } catch (err: any) {
            setError(err.message || "Erro ao carregar lista de pessoas.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let active = true;

        async function fetchList() {
            try {
                const res = await peopleService.listPeopleWithSummary();
                if (!active) return;
                if (res.error) {
                    setError(res.error);
                } else {
                    setPeople(res.data);
                }
            } catch (err: any) {
                if (active)
                    setError(
                        err.message || "Erro ao carregar lista de pessoas.",
                    );
            } finally {
                if (active) setIsLoading(false);
            }
        }

        fetchList();

        return () => {
            active = false;
        };
    }, []);

    const handleCreatePerson = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!newName.trim() || newName.trim().length < 2) {
            setFormError("O nome deve conter pelo menos 2 caracteres.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await peopleService.createPerson({ name: newName });
            if (res.error) {
                setFormError(res.error);
            } else {
                setNewName("");
                setIsModalOpen(false);
                await loadPeople();
            }
        } catch (err: any) {
            setFormError(err.message || "Erro ao cadastrar pessoa.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <LoadingSpinner message="Carregando lista de pessoas..." />;
    }

    return (
        <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
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
                        Pessoas
                    </h1>
                    <p
                        style={{
                            color: "var(--text-secondary)",
                            marginTop: "0.25rem",
                            fontSize: "0.9rem",
                        }}
                    >
                        Lista de clientes cadastrados e resumo financeiro
                        individual
                    </p>
                </div>

                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                        setFormError(null);
                        setNewName("");
                        setIsModalOpen(true);
                    }}
                >
                    + Nova Pessoa
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

            {people.length === 0 ? (
                <EmptyState
                    title="Nenhuma pessoa cadastrada"
                    description="Cadastre a primeira pessoa para iniciar a concessão de empréstimos."
                    actionLabel="+ Cadastrar Pessoa"
                    onAction={() => setIsModalOpen(true)}
                />
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Total Emprestado</th>
                                <th>Total Recebido</th>
                                <th>Saldo Devedor</th>
                                <th>Empréstimos Ativos</th>
                                <th style={{ textAlign: "right" }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {people.map((person) => (
                                <tr
                                    key={person.id}
                                    className="clickable"
                                    onClick={() =>
                                        onNavigateToPersonDetail(person.id)
                                    }
                                >
                                    <td style={{ fontWeight: 600 }}>
                                        {person.name}
                                    </td>
                                    <td>{formatBRL(person.total_principal)}</td>
                                    <td
                                        style={{
                                            color: "var(--color-brand-600)",
                                        }}
                                    >
                                        {formatBRL(person.total_paid)}
                                    </td>
                                    <td
                                        style={{
                                            fontWeight: 600,
                                            color:
                                                person.remaining_balance > 0
                                                    ? "#ef4444"
                                                    : "var(--color-brand-600)",
                                        }}
                                    >
                                        {formatBRL(person.remaining_balance)}
                                    </td>
                                    <td>
                                        {person.active_loans_count > 0 ? (
                                            <span className="badge badge-info">
                                                {person.active_loans_count}{" "}
                                                ativo(s)
                                            </span>
                                        ) : (
                                            <span
                                                style={{
                                                    color: "var(--text-muted)",
                                                    fontSize: "0.8125rem",
                                                }}
                                            >
                                                0
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onNavigateToPersonDetail(
                                                    person.id,
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

            {/* Modal de Criação de Pessoa: SOMENTE NOME */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Cadastrar Nova Pessoa"
            >
                <form onSubmit={handleCreatePerson}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="person-name">
                            Nome Completo
                        </label>
                        <input
                            id="person-name"
                            type="text"
                            className="form-input"
                            placeholder="Ex: Carlos Eduardo de Oliveira"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            autoFocus
                            disabled={isSubmitting}
                        />
                        {formError && (
                            <span className="form-error">{formError}</span>
                        )}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "0.75rem",
                            marginTop: "1.5rem",
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
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Salvando..." : "Salvar Pessoa"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
