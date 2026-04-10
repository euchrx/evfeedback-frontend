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
  const [companyId, setCompanyId] = useState(
    resolvedCompanyId ?? currentUser?.companyId ?? ""
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const selectedCompanyId = useMemo(() => {
    return superAdmin
      ? companyId || currentUser?.companyId || undefined
      : resolvedCompanyId;
  }, [superAdmin, companyId, resolvedCompanyId, currentUser?.companyId]);

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

    const targetCompanyId = superAdmin ? companyId : resolvedCompanyId ?? "";

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
        setCompanyId("");
      }

      setPage(1);
      await load();
    } catch {
      setError("Não foi possível criar a filial.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(branch: Branch) {
    if (!canManage) return;

    const confirmed = window.confirm(
      `Deseja desativar a filial "${branch.name}"?`
    );
    if (!confirmed) return;

    try {
      setProcessingId(branch.id);
      setError("");

      await deactivateBranch(
        branch.id,
        superAdmin ? branch.companyId : undefined
      );

      await load();
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

      await activateBranch(
        branch.id,
        superAdmin ? branch.companyId : undefined
      );

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
      `Excluir definitivamente a filial "${branch.name}"? Essa ação não poderá ser desfeita.`
    );
    if (!confirmed) return;

    try {
      setProcessingId(branch.id);
      setError("");

      await hardDeleteBranch(
        branch.id,
        superAdmin ? branch.companyId : undefined
      );

      await load();
    } catch {
      setError("Não foi possível excluir definitivamente a filial.");
    } finally {
      setProcessingId(null);
    }
  }

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setPage(1);
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

  useEffect(() => {
    if (canView) {
      void load();
    } else {
      setLoading(false);
    }
  }, [canView, selectedCompanyId]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, selectedCompanyId]);

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
          Você não tem permissão para acessar a página de filiais.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Filiais
        </h1>
        <p className="text-slate-600">
          Gerencie as filiais da plataforma.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {canManage ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">
              Nova filial
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
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
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
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
                <option value={resolvedCompanyId ?? ""}>Empresa atual</option>
              )}
            </select>

            <button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Criando..." : "Criar filial"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
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
            onClick={handleClearFilters}
            className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Limpar filtros
          </button>
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Filiais cadastradas
          </h2>
          <p className="text-sm text-slate-500">
            {loading ? "Carregando..." : `${filteredBranches.length} item(ns)`}
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Carregando filiais...
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Nenhuma filial encontrada.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-sm text-slate-600">
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Código</th>
                    <th className="px-4 py-3 font-semibold">Empresa</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedBranches.map((branch) => {
                    const isProcessing = processingId === branch.id;

                    return (
                      <tr key={branch.id} className="align-top">
                        <td className="px-4 py-4 font-medium text-slate-900">
                          {branch.name}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {branch.code || "-"}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {branch.company?.name ?? "-"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              branch.active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {branch.active ? "Ativa" : "Inativa"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {canManage ? (
                            <div className="flex flex-wrap gap-2">
                              {branch.active ? (
                                <button
                                  onClick={() => handleDeactivate(branch)}
                                  disabled={isProcessing}
                                  className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-60"
                                >
                                  Desativar
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivate(branch)}
                                  disabled={isProcessing}
                                  className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-60"
                                >
                                  Reativar
                                </button>
                              )}

                              {canDeletePermanently ? (
                                <button
                                  onClick={() => handleHardDelete(branch)}
                                  disabled={isProcessing}
                                  className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                >
                                  Excluir
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
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