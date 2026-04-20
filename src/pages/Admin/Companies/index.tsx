import { useEffect, useMemo, useState } from "react";
import {
  activateCompany,
  createCompany,
  updateCompany,
  deactivateCompany,
  getCompanies,
  hardDeleteCompany,
  type Company,
} from "../../../services/companies";
import { getStoredUser } from "../../../services/auth";
import { canAccessCompanies, canHardDelete } from "../../../utils/permissions";

const PAGE_SIZE = 10;

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

type EditingState = {
  id: string;
  name: string;
} | null;

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

  const [editing, setEditing] = useState<EditingState>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [error, setError] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
      setSelectedIds([]);
      await load();
    } catch {
      setError("Não foi possível criar a empresa.");
    } finally {
      setSubmitting(false);
    }
  }


  function handleStartEdit(company: Company) {
    setEditing({
      id: company.id,
      name: company.name ?? "",
    });
  }

  function handleCancelEdit() {
    setEditing(null);
  }

  async function handleSaveEdit(company: Company) {
    if (!editing) return;

    if (!editing.name.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }

    try {
      setSavingEdit(true);
      setError("");

      await updateCompany(company.id, {
        name: editing.name.trim(),
      });

      setEditing(null);
      await load();
    } catch {
      setError("Não foi possível atualizar a empresa.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeactivate(company: Company) {
    const confirmed = window.confirm(`Deseja desativar a empresa "${company.name}"?`);
    if (!confirmed) return;

    try {
      setProcessingId(company.id);
      setError("");
      await deactivateCompany(company.id);
      await load();
      setSelectedIds((current) => current.filter((id) => id !== company.id));
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
      `Excluir definitivamente a empresa "${company.name}"? Essa ação não poderá ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      setProcessingId(company.id);
      setError("");
      await hardDeleteCompany(company.id);
      await load();
      setSelectedIds((current) => current.filter((id) => id !== company.id));
    } catch {
      setError("Não foi possível excluir definitivamente a empresa.");
    } finally {
      setProcessingId(null);
    }
  }

  const selectedCompanies = useMemo(
    () => companies.filter((company) => selectedIds.includes(company.id)),
    [companies, selectedIds],
  );

  async function handleBulkDelete() {
    if (!canDeletePermanently || selectedCompanies.length === 0) return;

    const confirmed = window.confirm(
      `Excluir definitivamente ${selectedCompanies.length} empresa(s) selecionada(s)? Essa ação não poderá ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      setBulkDeleting(true);
      setError("");

      const results = await Promise.allSettled(
        selectedCompanies.map((company) => hardDeleteCompany(company.id)),
      );

      const failedCount = results.filter((result) => result.status === "rejected").length;

      await load();

      if (failedCount > 0) {
        const successCount = selectedCompanies.length - failedCount;
        setError(
          successCount > 0
            ? `${failedCount} de ${selectedCompanies.length} empresa(s) selecionada(s) não puderam ser excluídas.`
            : `Não foi possível excluir as ${selectedCompanies.length} empresa(s) selecionada(s).`,
        );
      }
    } catch {
      setError("Não foi possível concluir a exclusão em massa das empresas.");
    } finally {
      setBulkDeleting(false);
      setSelectedIds([]);
    }
  }

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setPage(1);
    setSelectedIds([]);
  }

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return companies.filter((company) => {
      const matchesSearch =
        !normalizedSearch || company.name.toLowerCase().includes(normalizedSearch);

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

  const currentPageIds = useMemo(
    () => paginatedCompanies.map((company) => company.id),
    [paginatedCompanies],
  );

  const allCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.includes(id));

  const someCurrentPageSelected =
    currentPageIds.some((id) => selectedIds.includes(id)) &&
    !allCurrentPageSelected;

  function handleToggleOne(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function handleTogglePage(ids: string[]) {
    const allSelected = ids.every((id) => selectedIds.includes(id));

    setSelectedIds((current) => {
      if (allSelected) {
        return current.filter((id) => !ids.includes(id));
      }

      const merged = new Set([...current, ...ids]);
      return Array.from(merged);
    });
  }

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
    setSelectedIds([]);
  }, [search, statusFilter, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (!canView) {
    return (
      <section className="space-y-4">
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
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Empresas
        </h1>
        <p className="text-slate-600">Gerencie as empresas da plataforma.</p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Nova empresa</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da empresa"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />

          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting}
            className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
          >
            {submitting ? "Criando..." : "Criar empresa"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Empresas cadastradas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? "Carregando..." : `${filteredCompanies.length} item(ns)`}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
              type="button"
              onClick={handleClearFilters}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        {selectedIds.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-slate-700">
              {selectedIds.length} selecionado(s)
            </span>

            <div className="flex flex-wrap gap-2">
              {canDeletePermanently ? (
                <button
                  type="button"
                  onClick={() => void handleBulkDelete()}
                  disabled={bulkDeleting}
                  className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:opacity-60"
                >
                  {bulkDeleting ? "Excluindo..." : "Excluir selecionados"}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                disabled={bulkDeleting}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Limpar seleção
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          {loading ? (
            <div className="px-6 py-10 text-center text-slate-500">
              Carregando empresas...
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">
              Nenhuma empresa encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = someCurrentPageSelected;
                          }
                        }}
                        type="checkbox"
                        checked={allCurrentPageSelected}
                        onChange={() => handleTogglePage(currentPageIds)}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Criada em
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Atualizada em
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedCompanies.map((company) => {
                    const isEditing = editing?.id === company.id;
                    const isProcessing = processingId === company.id;

                    return (
                      <tr key={company.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(company.id)}
                            onChange={() => handleToggleOne(company.id)}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                        </td>

                        <td className="px-4 py-4 text-sm font-medium text-slate-900">
                          {isEditing ? (
                            <input
                              value={editing?.name ?? ""}
                              onChange={(e) =>
                                setEditing((prev) =>
                                  prev ? { ...prev, name: e.target.value } : prev,
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500"
                            />
                          ) : (
                            company.name
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {formatDate((company as Company & { createdAt?: string }).createdAt)}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {formatDate((company as Company & { updatedAt?: string }).updatedAt)}
                        </td>

                        <td className="px-4 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              company.active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {company.active ? "Ativa" : "Inativa"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(company)}
                                  disabled={savingEdit}
                                  className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200 disabled:opacity-60"
                                >
                                  {savingEdit ? "Salvando..." : "Salvar"}
                                </button>

                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(company)}
                                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
                                >
                                  Editar
                                </button>

                                {company.active ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeactivate(company)}
                                    disabled={isProcessing}
                                    className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200 disabled:opacity-60"
                                  >
                                    Desativar
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleActivate(company)}
                                    disabled={isProcessing}
                                    className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200 disabled:opacity-60"
                                  >
                                    Ativar
                                  </button>
                                )}

                                {canDeletePermanently ? (
                                  <button
                                    type="button"
                                    onClick={() => handleHardDelete(company)}
                                    disabled={isProcessing || bulkDeleting}
                                    className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:opacity-60"
                                  >
                                    Excluir
                                  </button>
                                ) : null}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && filteredCompanies.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Página {page} de {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Anterior
              </button>

              <button
                type="button"
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
        ) : null}
      </section>
    </section>
  );
}
