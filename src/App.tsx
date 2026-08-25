import { useState, useEffect } from "react";
import { Navbar, type AppView } from "./components/layout/Navbar";
import { DashboardPage } from "./pages/DashboardPage";
import { PeoplePage } from "./pages/PeoplePage";
import { PersonDetailPage } from "./pages/PersonDetailPage";
import { LoansPage } from "./pages/LoansPage";
import { LoanDetailPage } from "./pages/LoanDetailPage";

export default function App() {
    const [currentView, setCurrentView] = useState<AppView>("dashboard");
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(
        null,
    );
    const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

    // Sincroniza com hash da URL para permitir navegação com histórico do navegador
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace("#", "");
            if (hash.startsWith("person/")) {
                const id = hash.replace("person/", "");
                setSelectedPersonId(id);
                setCurrentView("person-detail");
            } else if (hash.startsWith("loan/")) {
                const id = hash.replace("loan/", "");
                setSelectedLoanId(id);
                setCurrentView("loan-detail");
            } else if (hash === "people") {
                setCurrentView("people");
            } else if (hash === "loans") {
                setCurrentView("loans");
            } else {
                setCurrentView("dashboard");
            }
        };

        handleHashChange();
        window.addEventListener("hashchange", handleHashChange);
        return () => window.removeEventListener("hashchange", handleHashChange);
    }, []);

    const navigateTo = (view: AppView, id?: string) => {
        if (view === "person-detail" && id) {
            setSelectedPersonId(id);
            window.location.hash = `person/${id}`;
        } else if (view === "loan-detail" && id) {
            setSelectedLoanId(id);
            window.location.hash = `loan/${id}`;
        } else if (view === "people") {
            window.location.hash = "people";
        } else if (view === "loans") {
            window.location.hash = "loans";
        } else {
            window.location.hash = "dashboard";
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "var(--bg-app)",
            }}
        >
            <Navbar
                currentView={currentView}
                onNavigate={(view) => navigateTo(view)}
            />

            <main
                className="container"
                style={{ flex: 1, padding: "2rem 1.5rem" }}
            >
                {currentView === "dashboard" && (
                    <DashboardPage
                        onNavigateToLoans={() => navigateTo("loans")}
                        onNavigateToPeople={() => navigateTo("people")}
                        onNavigateToLoanDetail={(id) =>
                            navigateTo("loan-detail", id)
                        }
                        onNavigateToPersonDetail={(id) =>
                            navigateTo("person-detail", id)
                        }
                    />
                )}

                {currentView === "people" && (
                    <PeoplePage
                        onNavigateToPersonDetail={(id) =>
                            navigateTo("person-detail", id)
                        }
                    />
                )}

                {currentView === "person-detail" && selectedPersonId && (
                    <PersonDetailPage
                        personId={selectedPersonId}
                        onBack={() => navigateTo("people")}
                        onNavigateToLoanDetail={(id) =>
                            navigateTo("loan-detail", id)
                        }
                    />
                )}

                {currentView === "loans" && (
                    <LoansPage
                        onNavigateToLoanDetail={(id) =>
                            navigateTo("loan-detail", id)
                        }
                        onNavigateToPersonDetail={(id) =>
                            navigateTo("person-detail", id)
                        }
                    />
                )}

                {currentView === "loan-detail" && selectedLoanId && (
                    <LoanDetailPage
                        loanId={selectedLoanId}
                        onBack={() => navigateTo("loans")}
                        onNavigateToPersonDetail={(id) =>
                            navigateTo("person-detail", id)
                        }
                    />
                )}
            </main>

            <footer
                style={{
                    borderTop: "1px solid var(--border-subtle)",
                    padding: "1.25rem 1.5rem",
                    textAlign: "center",
                    fontSize: "0.8125rem",
                    color: "var(--text-muted)",
                    backgroundColor: "var(--bg-surface)",
                }}
            >
                Sistema de Controle de Empréstimos • Interface Minimalista e
                Segura
            </footer>
        </div>
    );
}
