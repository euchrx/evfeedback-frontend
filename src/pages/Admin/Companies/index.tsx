import { useEffect, useMemo, useState } from "react";
import {
  activateCompany,
  createCompany,
  deactivateCompany,
  getCompanies,
  hardDeleteCompany,
  type Company,
} from "../../../services/companies";
import { getStoredUser } from "../../../services/auth";
import {
  canAccessCompanies,
  canHardDelete,
} from "../../../utils/permissions";

export default function CompaniesPage() {
  const currentUser = getStoredUser();

  const canView = canAccessCompanies(currentUser);
  const canDeletePermanently = canHardDelete(currentUser);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const visibleCompanies = useMemo(() => {
    if (showInactive) return companies;
    return companies.filter((company) => company.active);
  }, [companies, showInactive]);

  async function load() {
    try {
      setError("");
      setLoading(true);

      const data = await getCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch {
      setError("Não foi possível carregar as empresas.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!canView) return;

    if (!name.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createCompany({
        name: name.trim(),
      });

      setName("");
      await load();
    } catch {
      setError("Não foi possível criar a empresa.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(company: Company) {
    const confirmed = window.confirm(
      `Deseja desativar a empresa "${company.name}"?`
    );
    if (!confirmed) return;

    try {
      setProcessingId(company.id);
      setError("");

      await deactivateCompany(company.id);
      await load();
    } catch {
      setError("Não foi possível desativar a empresa.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleActivate(company: Company) {
    try {
      setProcessingId(company.id);
      setError("");

      await activateCompany(company.id);
      await load();
    } catch {
      setError("Não foi possível reativar a empresa.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleHardDelete(company: Company) {
    if (!canDeletePermanently) return;

    const confirmed = window.confirm(
      `Excluir definitivamente a empresa "${company.name}"? Essa ação não poderá ser desfeita.`
    );
    if (!confirmed) return;

    try {
      setProcessingId(company.id);
      setError("");

      await hardDeleteCompany(company.id);
      await load();
    } catch {
      setError("Não foi possível excluir definitivamente a empresa.");
    } finally {
      setProcessingId(null);
    }
  }

  useEffect(() => {
    if (canView) {
      void load();
    } else {
      setLoading(false);
    }
  }, [canView]);

  if (!canView) {
    return (
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Acesso negado
        </h1>
        <p className="text-slate-600">
          Apenas SUPER_ADMIN pode acessar a página de empresas.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Empresas
        </h1>
        <p className="text-slate-600">
          Gerencie as empresas da plataforma.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">
            Nova empresa
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da empresa"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />

          <button
            onClick={handleCreate}
            disabled={submitting}
            className="rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Criando..." : "Criar empresa"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Empresas cadastradas
            </h2>
            <p className="text-sm text-slate-500">
              {visibleCompanies.length} item(ns)
            </p>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Mostrar inativas
          </label>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Carregando empresas...
          </div>
        ) : visibleCompanies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Nenhuma empresa cadastrada.
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleCompanies.map((company) => {
              const isProcessing = processingId === company.id;

              return (
                <article
                  key={company.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {company.name}
                      </h3>

                      <div className="space-y-1 text-sm text-slate-600">
                        <p>Status: {company.active ? "Ativa" : "Inativa"}</p>
                        <p>
                          Criada em{" "}
                          {new Date(company.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {company.active ? (
                        <button
                          onClick={() => handleDeactivate(company)}
                          disabled={isProcessing}
                          className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Desativar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(company)}
                          disabled={isProcessing}
                          className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reativar
                        </button>
                      )}

                      {canDeletePermanently ? (
                        <button
                          onClick={() => handleHardDelete(company)}
                          disabled={isProcessing}
                          className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Excluir definitivo
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}