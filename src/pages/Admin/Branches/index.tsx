import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "../../../services/auth";
import { getCompanies, type Company } from "../../../services/companies";
import {
  activateBranch,
  createBranch,
  deactivateBranch,
  getBranches,
  hardDeleteBranch,
  type Branch,
} from "../../../services/branches";
import {
  canHardDelete,
  canManageOperationalModules,
  canViewOperationalModules,
  getResolvedCompanyId,
  isSuperAdmin,
} from "../../../utils/permissions";

const PAGE_SIZE = 10;

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export default function BranchesPage() {
  const currentUser = getStoredUser();
  const canView = canViewOperationalModules(currentUser);
  const canManage = canManageOperationalModules(currentUser);
  const canDeletePermanently = canHardDelete(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  // usado somente no formulário de criação
  const [createCompanyId, setCreateCompanyId] = useState(
    resolvedCompanyId ?? currentUser?.companyId ?? "",
  );

  // empresa usada para carregar a listagem
  const selectedCompanyId = useMemo(() => {
    return superAdmin ? undefined : resolvedCompanyId;
  }, [superAdmin, resolvedCompanyId]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [error, setError] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  async function load() {
    try {
      setError("");
      setLoading(true);

      const requests: Promise<unknown>[] = [getBranches(selectedCompanyId)];
      if (superAdmin) {
        requests.push(getCompanies());
      }

      const [branchesData, companiesData] = await Promise.all(requests);

      setBranches(Array.isArray(branchesData) ? (branchesData as Branch[]) : []);
      setCompanies(Array.isArray(companiesData) ? (companiesData as Company[]) : []);
    } catch {
      setError("Não foi possível carregar as filiais.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!canManage) return;

    if (!name.trim()) {
      setError("Informe o nome da filial.");
      return;
    }

    const targetCompanyId = superAdmin ? createCompanyId : resolvedCompanyId ?? "";

    if (!targetCompanyId) {
      setError("Selecione uma empresa.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createBranch({
        name: name.trim(),
        code: code.trim() || undefined,
        active: true,
        companyId: targetCompanyId,
      });

      setName("");
      setCode("");

      if (superAdmin) {
        setCreateCompanyId("");
      }

      setPage(1);
      setSelectedIds([]);
      await load();
    } catch {
      setError("Não foi possível criar a filial.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(branch: Branch) {
    if (!canManage) return;

    const confirmed = window.confirm(`Deseja desativar a filial "${branch.name}"?`);
    if (!confirmed) return;

    try {
      setProcessingId(branch.id);
      setError("");
      await deactivateBranch(branch.id, superAdmin ? branch.companyId : undefined);
      await load();
      setSelectedIds((current) => current.filter((id) => id !== branch.id));
    } catch {
      setError("Não foi possível desativar a filial.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleActivate(branch: Branch) {
    if (!canManage) return;

    try {
      setProcessingId(branch.id);
      setError("");
      await activateBranch(branch.id, superAdmin ? branch.companyId : undefined);
      await load();
    } catch {
      setError("Não foi possível reativar a filial.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleHardDelete(branch: Branch) {
    if (!canDeletePermanently) return;

    const confirmed = window.confirm(
      `Excluir definitivamente a filial "${branch.name}"? Essa ação não poderá ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      setProcessingId(branch.id);
      setError("");
      await hardDeleteBranch(branch.id, superAdmin ? branch.companyId : undefined);
      await load();
      setSelectedIds((current) => current.filter((id) => id !== branch.id));
    } catch {
      setError("Não foi possível excluir definitivamente a filial.");
    } finally {
      setProcessingId(null);
    }
  }

  const selectedBranches = useMemo(
    () =>
      branches.filter((branch) => {
        const canDelete = canDeletePermanently && currentUser?.id !== branch.id;
        return selectedIds.includes(branch.id) && canDelete;
      }),
    [branches, canDeletePermanently, currentUser?.id, selectedIds],
  );

  async function handleBulkDelete() {
    if (selectedBranches.length === 0) return;

    const confirmed = window.confirm(
      `Excluir definitivamente ${selectedBranches.length} filial(is) selecionada(s)? Essa ação não poderá ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      setBulkDeleting(true);
      setError("");

      const results = await Promise.allSettled(
        selectedBranches.map((branch) =>
          hardDeleteBranch(branch.id, superAdmin ? branch.companyId : undefined),
        ),
      );

      const failedCount = results.filter((result) => result.status === "rejected").length;

      await load();

      if (failedCount > 0) {
        const successCount = selectedBranches.length - failedCount;
        setError(
          successCount > 0
            ? `${failedCount} de ${selectedBranches.length} filial(is) selecionada(s) não puderam ser excluídas.`
            : `Não foi possível excluir as ${selectedBranches.length} filial(is) selecionada(s).`,
        );
      }
    } catch {
      setError("Não foi possível concluir a exclusão em massa das filiais.");
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

  const filteredBranches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return branches.filter((branch) => {
      const matchesSearch =
        !normalizedSearch ||
        branch.name.toLowerCase().includes(normalizedSearch) ||
        (branch.code ?? "").toLowerCase().includes(normalizedSearch) ||
        (branch.company?.name ?? "").toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && branch.active) ||
        (statusFilter === "INACTIVE" && !branch.active);

      return matchesSearch && matchesStatus;
    });
  }, [branches, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / PAGE_SIZE));

  const paginatedBranches = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredBranches.slice(start, start + PAGE_SIZE);
  }, [filteredBranches, page]);

  const currentPageIds = useMemo(
    () => paginatedBranches.map((branch) => branch.id),
    [paginatedBranches],
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
  }, [canView, selectedCompanyId]);

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
          Você não tem permissão para acessar a página de filiais.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Filiais
        </h1>
        <p className="text-slate-600">Gerencie as filiais da plataforma.</p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {canManage ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Nova filial</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da filial"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />

            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código da filial"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />

            <select
              value={createCompanyId}
              onChange={(e) => setCreateCompanyId(e.target.value)}
              disabled={!superAdmin}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {superAdmin ? (
                <>
                  <option value="">Selecione a empresa</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </>
              ) : (
                <option value={currentUser?.companyId ?? ""}>Empresa atual</option>
              )}
            </select>

            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              {submitting ? "Criando..." : "Criar filial"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Filiais cadastradas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? "Carregando..." : `${filteredBranches.length} item(ns)`}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, código ou empresa"
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
              {selectedBranches.length > 0 ? (
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
              Carregando filiais...
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">
              Nenhuma filial encontrada.
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
                      Código
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Empresa
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
                  {paginatedBranches.map((branch) => {
                    const isProcessing = processingId === branch.id;
                    const canDelete =
                      canDeletePermanently && currentUser?.id !== branch.id;

                    return (
                      <tr key={branch.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(branch.id)}
                            onChange={() => handleToggleOne(branch.id)}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                        </td>

                        <td className="px-4 py-4 text-sm font-medium text-slate-900">
                          {branch.name}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {branch.code ?? "-"}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {branch.company?.name ?? "-"}
                        </td>

                        <td className="px-4 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              branch.active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {branch.active ? "Ativa" : "Inativa"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {canManage && branch.active ? (
                              <button
                                type="button"
                                onClick={() => handleDeactivate(branch)}
                                disabled={isProcessing}
                                className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200 disabled:opacity-60"
                              >
                                Desativar
                              </button>
                            ) : null}

                            {canManage && !branch.active ? (
                              <button
                                type="button"
                                onClick={() => handleActivate(branch)}
                                disabled={isProcessing}
                                className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200 disabled:opacity-60"
                              >
                                Ativar
                              </button>
                            ) : null}

                            {canDelete ? (
                              <button
                                type="button"
                                onClick={() => handleHardDelete(branch)}
                                disabled={isProcessing || bulkDeleting}
                                className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:opacity-60"
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
          )}
        </div>

        {!loading && filteredBranches.length > 0 ? (
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
