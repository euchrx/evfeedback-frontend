import { Plus } from "lucide-react";
import { useAdminScopeBranchId, useAdminScopeCompanyId } from "../../../hooks/useAdminScope";
import { getAdminScopeCompanyId } from "../../../services/adminScope";
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
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
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
  const scopeBranchId = useAdminScopeBranchId();
  const scopeCompanyId = useAdminScopeCompanyId();

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
    return superAdmin ? scopeCompanyId || undefined : resolvedCompanyId;
  }, [superAdmin, scopeCompanyId, resolvedCompanyId]);

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
      ? scopeCompanyId
      : resolvedCompanyId ?? currentUser?.companyId ?? "";

    if (!targetCompanyId) {
      toast.warning("Selecione uma rede no escopo.");
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
      ? scopeCompanyId
      : resolvedCompanyId ?? editingBranch.companyId;

    if (superAdmin && !targetCompanyId) {
      toast.warning("Selecione uma rede no escopo.");
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


  const filteredBranches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return branches.filter((branch) => {
      const matchesScope = !scopeBranchId || branch.id === scopeBranchId;
      const matchesSearch =
        !normalizedSearch ||
        branch.name.toLowerCase().includes(normalizedSearch) ||
        (branch.code ?? "").toLowerCase().includes(normalizedSearch) ||
        (branch.company?.name ?? "").toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && branch.active) ||
        (statusFilter === "INACTIVE" && !branch.active);

      return matchesScope && matchesSearch && matchesStatus;
    });
  }, [branches, search, statusFilter, scopeBranchId]);

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
      <section className="rounded-3xl border border-rose-100 bg-white p-6 shadow-[0_18px_50px_-20px_rgba(244,63,94,0.28)]">
        <h2 className="text-xl font-semibold text-slate-900">Acesso negado</h2>
        <p className="mt-2 text-sm leading-6 text-rose-700">
          Você não tem permissão para acessar a página de filiais.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-6">
        <div>
          <div className="w-full">
<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, código ou empresa"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativas</option>
                <option value="INACTIVE">Inativas</option>
              </select>

              <div className="w-full flex gap-3 sm:col-span-2 xl:col-span-2">
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Filiais</h3>
              <p className="mt-1 text-sm text-slate-600">
                {loading
                  ? "Carregando dados..."
                  : `${filteredBranches.length} filial(is) encontrada(s)`}
              </p>
            </div>
            {canManage ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <Plus size={18} strokeWidth={2.5} />
              Adicionar
            </button>            ) : null}

          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-600">
              Carregando filiais...
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto max-w-md">
                <h4 className="text-lg font-semibold text-slate-900">
                  Nenhuma filial encontrada
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">
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
                  <thead>
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
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-slate-900">
                              {branch.name}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            {branch.code ?? "-"}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
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
                            <div className="w-full flex flex-wrap justify-end gap-2">
                              {canManage ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingBranch(branch)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Editar
                                </button>
                              ) : null}

                              {canManage && branch.active ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDeactivate(branch)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Desativar
                                </button>
                              ) : null}

                              {canManage && !branch.active ? (
                                <button
                                  type="button"
                                  onClick={() => void handleActivate(branch)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Ativar
                                </button>
                              ) : null}

                              {canDeletePermanently ? (
                                <button
                                  type="button"
                                  onClick={() => void handleHardDelete(branch)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
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

              <div className="w-full flex flex-col gap-3 border-t border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  Página {page} de {totalPages}
                </p>

                <div className="w-full flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page === totalPages}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
        defaultCompanyId={superAdmin ? getAdminScopeCompanyId() : resolvedCompanyId ?? currentUser?.companyId ?? ""}
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
        defaultCompanyId={superAdmin ? getAdminScopeCompanyId() : resolvedCompanyId ?? currentUser?.companyId ?? ""}
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
