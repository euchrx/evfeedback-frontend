import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "../../../services/auth";
import { getCompanies, type Company } from "../../../services/companies";
import {
  activateBranch,
  createBranch,
  updateBranch,
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
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirmDialog } from "../../../components/ui/ConfirmDialogProvider";
import { BranchFormModal } from "./BranchFormModal";

const PAGE_SIZE = 10;

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

function getStatusBadgeClass(active: boolean) {
  return active
    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
    : "border-amber-400/20 bg-amber-500/10 text-amber-200";
}

export default function BranchesPage() {
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const currentUser = getStoredUser();
  const canView = canViewOperationalModules(currentUser);
  const canManage = canManageOperationalModules(currentUser);
  const canDeletePermanently = canHardDelete(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const selectedCompanyId = useMemo(() => {
    return superAdmin ? undefined : resolvedCompanyId;
  }, [superAdmin, resolvedCompanyId]);

  async function load() {
    try {
      setLoading(true);

      const requests: Promise<unknown>[] = [getBranches(selectedCompanyId)];

      if (superAdmin) {
        requests.push(getCompanies());
      }

      const [branchesData, companiesData] = await Promise.all(requests);

      setBranches(Array.isArray(branchesData) ? (branchesData as Branch[]) : []);
      setCompanies(Array.isArray(companiesData) ? (companiesData as Company[]) : []);
    } catch {
      toast.error("Não foi possível carregar as filiais.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload: {
    name: string;
    code?: string;
    companyId?: string;
  }) {
    if (!canManage) return;

    if (!payload.name.trim()) {
      toast.warning("Informe o nome da filial.");
      return;
    }

    const targetCompanyId = superAdmin
      ? payload.companyId
      : resolvedCompanyId ?? currentUser?.companyId ?? "";

    if (!targetCompanyId) {
      toast.warning("Selecione uma empresa.");
      return;
    }

    try {
      setCreateLoading(true);

      await createBranch({
        name: payload.name.trim(),
        code: payload.code?.trim() || undefined,
        active: true,
        companyId: targetCompanyId,
      });

      setCreateOpen(false);
      toast.success("Filial criada com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível criar a filial.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUpdate(payload: {
    name: string;
    code?: string;
    companyId?: string;
  }) {
    if (!canManage || !editingBranch) return;

    if (!payload.name.trim()) {
      toast.warning("Informe o nome da filial.");
      return;
    }

    const targetCompanyId = superAdmin
      ? payload.companyId
      : resolvedCompanyId ?? editingBranch.companyId;

    if (superAdmin && !targetCompanyId) {
      toast.warning("Selecione uma empresa.");
      return;
    }

    try {
      setEditLoading(true);

      await updateBranch(
        editingBranch.id,
        {
          name: payload.name.trim(),
          code: payload.code?.trim() || undefined,
          companyId: targetCompanyId,
        },
        targetCompanyId,
      );

      setEditingBranch(null);
      toast.success("Filial atualizada com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível atualizar a filial.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeactivate(branch: Branch) {
    if (!canManage) return;

    const confirmed = await confirm({
      title: "Desativar filial",
      description: `A filial "${branch.name}" ficará indisponível até ser reativada novamente.`,
      confirmText: "Desativar",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!confirmed) return;

    try {
      setProcessingId(branch.id);
      await deactivateBranch(branch.id, superAdmin ? branch.companyId : undefined);
      toast.success("Filial desativada com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível desativar a filial.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleActivate(branch: Branch) {
    if (!canManage) return;

    try {
      setProcessingId(branch.id);
      await activateBranch(branch.id, superAdmin ? branch.companyId : undefined);
      toast.success("Filial ativada com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível ativar a filial.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleHardDelete(branch: Branch) {
    if (!canDeletePermanently) return;

    const confirmed = await confirm({
      title: "Excluir filial",
      description: `A filial "${branch.name}" será removida definitivamente. Essa ação não poderá ser desfeita.`,
      confirmText: "Excluir filial",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      setProcessingId(branch.id);
      await hardDeleteBranch(branch.id, superAdmin ? branch.companyId : undefined);
      toast.success("Filial excluída com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível excluir a filial.");
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
  }, [search, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (!canView) {
    return (
      <section className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-white">Acesso negado</h2>
        <p className="mt-2 text-sm leading-6 text-rose-100/80">
          Você não tem permissão para acessar a página de filiais.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                gestão de filiais
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                Estrutura operacional
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Organize as filiais por empresa e mantenha a operação administrativa estruturada.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, código ou empresa"
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativas</option>
                <option value="INACTIVE">Inativas</option>
              </select>

              <div className="flex gap-3 sm:col-span-2 xl:col-span-2">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                >
                  Limpar
                </button>

                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Nova
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Filiais cadastradas</h3>
              <p className="mt-1 text-sm text-slate-400">
                {loading
                  ? "Carregando dados..."
                  : `${filteredBranches.length} filial(is) encontrada(s)`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">
              Carregando filiais...
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto max-w-md">
                <h4 className="text-lg font-semibold text-white">
                  Nenhuma filial encontrada
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Ajuste os filtros ou cadastre uma nova filial para estruturar a operação.
                </p>

                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Cadastrar filial
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-white/[0.03]">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Nome
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Código
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Empresa
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {paginatedBranches.map((branch) => {
                      const isProcessing = processingId === branch.id;

                      return (
                        <tr
                          key={branch.id}
                          className="transition hover:bg-white/[0.03]"
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-white">
                              {branch.name}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-400">
                            {branch.code ?? "-"}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-400">
                            {branch.company?.name ?? "-"}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={[
                                "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                getStatusBadgeClass(branch.active),
                              ].join(" ")}
                            >
                              {branch.active ? "Ativa" : "Inativa"}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              {canManage ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingBranch(branch)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Editar
                                </button>
                              ) : null}

                              {canManage && branch.active ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDeactivate(branch)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Desativar
                                </button>
                              ) : null}

                              {canManage && !branch.active ? (
                                <button
                                  type="button"
                                  onClick={() => void handleActivate(branch)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Ativar
                                </button>
                              ) : null}

                              {canDeletePermanently ? (
                                <button
                                  type="button"
                                  onClick={() => void handleHardDelete(branch)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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

              <div className="flex flex-col gap-3 border-t border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-400">
                  Página {page} de {totalPages}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page === totalPages}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <BranchFormModal
        open={createOpen}
        mode="create"
        companies={companies}
        isSuperAdmin={superAdmin}
        defaultCompanyId={resolvedCompanyId ?? currentUser?.companyId ?? ""}
        loading={createLoading}
        onClose={() => {
          if (!createLoading) {
            setCreateOpen(false);
          }
        }}
        onSubmit={handleCreate}
      />

      <BranchFormModal
        open={!!editingBranch}
        mode="edit"
        companies={companies}
        isSuperAdmin={superAdmin}
        defaultCompanyId={resolvedCompanyId ?? currentUser?.companyId ?? ""}
        loading={editLoading}
        initialData={
          editingBranch
            ? {
                name: editingBranch.name,
                code: editingBranch.code ?? "",
                companyId: editingBranch.companyId ?? "",
              }
            : undefined
        }
        onClose={() => {
          if (!editLoading) {
            setEditingBranch(null);
          }
        }}
        onSubmit={handleUpdate}
      />
    </>
  );
}