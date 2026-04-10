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

const PAGE_SIZE = 10;
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function CompaniesPage() {
  const currentUser = getStoredUser();

  const canView = canAccessCompanies(currentUser);
  const canDeletePermanently = canHardDelete(currentUser);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

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
      setPage(1);
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

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setPage(1);
  }

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return companies.filter((company) => {
      const matchesSearch =
        !normalizedSearch ||
        company.name.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && company.active) ||
        (statusFilter === "INACTIVE" && !company.active);

      return matchesSearch && matchesStatus;
    });
  }, [companies, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE));

  const paginatedCompanies = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCompanies.slice(start, start + PAGE_SIZE);
  }, [filteredCompanies, page]);

  useEffect(() => {
    if (canView) {
      void load();
    } else {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
          >
            <option value="ALL">Todos os status</option>
            <option value="ACTIVE">Ativas</option>
            <option value="INACTIVE">Inativas</option>
          </select>

          <button
            onClick={handleClearFilters}
            className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Limpar filtros
          </button>
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Empresas cadastradas
          </h2>
          <p className="text-sm text-slate-500">
            {loading ? "Carregando..." : `${filteredCompanies.length} item(ns)`}
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Carregando empresas...
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Nenhuma empresa encontrada.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-sm text-slate-600">
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Criada em</th>
                    <th className="px-4 py-3 font-semibold">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedCompanies.map((company) => {
                    const isProcessing = processingId === company.id;

                    return (
                      <tr key={company.id} className="align-top">
                        <td className="px-4 py-4 font-medium text-slate-900">
                          {company.name}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              company.active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {company.active ? "Ativa" : "Inativa"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {formatDate(company.createdAt)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {company.active ? (
                              <button
                                onClick={() => handleDeactivate(company)}
                                disabled={isProcessing}
                                className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-60"
                              >
                                Desativar
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(company)}
                                disabled={isProcessing}
                                className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-60"
                              >
                                Reativar
                              </button>
                            )}

                            {canDeletePermanently ? (
                              <button
                                onClick={() => handleHardDelete(company)}
                                disabled={isProcessing}
                                className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                              >
                                Excluir
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-500">
                Página {page} de {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  Anterior
                </button>

                <button
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page === totalPages}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}