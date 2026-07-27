import { Plus } from "lucide-react";
import { useAdminScopeBranchId, useAdminScopeCompanyId } from "../../../hooks/useAdminScope";
import { NO_BRANCH_SCOPE } from "../../../services/adminScope";
import { getAdminScopeCompanyId } from "../../../services/adminScope";
import { useEffect, useMemo, useState } from "react";
import { getCompanies, type Company } from "../../../services/companies";
import { getStoredUser } from "../../../services/auth";
import {
  activateUser,
  createUser,
  deactivateUser,
  getUsers,
  hardDeleteUser,
  updateUser,
  type UserItem,
  type UserRole,
} from "../../../services/users";
import {
  canAccessUsers,
  canHardDelete,
  getResolvedCompanyId,
  isSuperAdmin,
} from "../../../utils/permissions";
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirmDialog } from "../../../components/ui/ConfirmDialogProvider";
import { UserFormModal } from "./UserFormModal";

const PAGE_SIZE = 10;

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

function getRoleLabel(role: UserRole) {
  switch (role) {
    case "SUPER_ADMIN":
      return "SUPER_ADMIN";
    case "COMPANY_ADMIN":
      return "COMPANY_ADMIN";
    case "MANAGER":
      return "MANAGER";
    default:
      return role;
  }
}

function formatRoleBadge(role: UserRole) {
  switch (role) {
    case "SUPER_ADMIN":
      return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
    case "COMPANY_ADMIN":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "MANAGER":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

export default function UsersPage() {
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const currentUser = getStoredUser();
  const scopeBranchId = useAdminScopeBranchId();
  const scopeCompanyId = useAdminScopeCompanyId();
  const superAdmin = isSuperAdmin(currentUser);
  const canView = canAccessUsers(currentUser);
  const canDeletePermanently = canHardDelete(currentUser);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");

  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);

      const resolvedCompanyId = getResolvedCompanyId(currentUser);

      const usersData = await getUsers(superAdmin ? scopeCompanyId || undefined : resolvedCompanyId);
      const normalizedUsers = Array.isArray(usersData) ? usersData : [];
      setUsers(normalizedUsers);

      if (superAdmin) {
        const companiesData = await getCompanies();
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
      } else if (resolvedCompanyId) {
        const linkedCompany = normalizedUsers.find((item) => item.company)?.company;
        setCompanies([{
          id: resolvedCompanyId,
          name: linkedCompany?.name ?? "Empresa vinculada",
          active: linkedCompany?.active ?? true,
          createdAt: "",
          updatedAt: "",
        }]);
      } else {
        setCompanies([]);
      }
    } catch {
      toast.error("Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    companyId?: string;
  }) {
    if (!payload.name.trim() || !payload.email.trim() || !payload.password?.trim()) {
      toast.warning("Preencha nome, e-mail e senha.");
      return;
    }

    if (payload.role !== "SUPER_ADMIN" && !scopeCompanyId) {
      toast.warning("Selecione uma rede no escopo.");
      return;
    }

    try {
      setCreateLoading(true);

      await createUser({
        name: payload.name.trim(),
        email: payload.email.trim(),
        password: payload.password,
        role: payload.role,
        companyId: payload.role === "SUPER_ADMIN" ? undefined : (superAdmin ? scopeCompanyId : payload.companyId),
        active: true,
      });

      setCreateOpen(false);
      toast.success("Usuário criado com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível criar o usuário.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUpdate(payload: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    companyId?: string;
  }) {
    if (!editingUser) return;

    if (!payload.name.trim() || !payload.email.trim()) {
      toast.warning("Preencha nome e e-mail.");
      return;
    }

    if (payload.role !== "SUPER_ADMIN" && !scopeCompanyId) {
      toast.warning("Selecione uma rede no escopo.");
      return;
    }

    try {
      setEditLoading(true);

      await updateUser(
        editingUser.id,
        {
          name: payload.name.trim(),
          email: payload.email.trim(),
          role: payload.role,
          companyId: payload.role === "SUPER_ADMIN" ? undefined : (superAdmin ? scopeCompanyId : payload.companyId),
        },
        payload.role === "SUPER_ADMIN"
          ? undefined
          : (superAdmin ? scopeCompanyId : payload.companyId) ?? editingUser.companyId,
      );

      setEditingUser(null);
      toast.success("Usuário atualizado com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível atualizar o usuário.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeactivate(user: UserItem) {
    const confirmed = await confirm({
      title: "Desativar usuário",
      description: `O usuário "${user.name}" ficará sem acesso até ser reativado novamente.`,
      confirmText: "Desativar",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!confirmed) return;

    try {
      setProcessingId(user.id);
      await deactivateUser(user.id, user.companyId);
      toast.success("Usuário desativado com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível desativar o usuário.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleActivate(user: UserItem) {
    try {
      setProcessingId(user.id);
      await activateUser(user.id, user.companyId);
      toast.success("Usuário ativado com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível ativar o usuário.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleHardDelete(user: UserItem) {
    if (!canDeletePermanently) return;

    if (currentUser?.id === user.id) {
      toast.warning("Você não pode excluir o próprio usuário.");
      return;
    }

    const confirmed = await confirm({
      title: "Excluir usuário",
      description: `O usuário "${user.name}" será removido definitivamente. Essa ação não poderá ser desfeita.`,
      confirmText: "Excluir usuário",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      setProcessingId(user.id);
      await hardDeleteUser(user.id, user.companyId);
      toast.success("Usuário excluído com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível excluir o usuário.");
    } finally {
      setProcessingId(null);
    }
  }


  const filteredUsers = useMemo(() => {
    if (superAdmin && scopeBranchId === NO_BRANCH_SCOPE) return [];
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        (user.company?.name ?? "").toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.active) ||
        (statusFilter === "INACTIVE" && !user.active);

      const matchesRole = !roleFilter || user.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, search, statusFilter, roleFilter, scopeBranchId]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  useEffect(() => {
    if (canView) {
      void load();
    } else {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, roleFilter]);

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
          Você não tem permissão para acessar a página de usuários.
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
                placeholder="Buscar por nome, e-mail ou empresa"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as "" | UserRole)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
              >
                <option value="">Todas as roles</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
                <option value="MANAGER">MANAGER</option>
              </select>

              <div className="w-full flex gap-3">
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Usuários</h3>
              <p className="mt-1 text-sm text-slate-600">
                {loading
                  ? "Carregando dados..."
                  : `${filteredUsers.length} usuário(s) encontrado(s)`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <Plus size={18} strokeWidth={2.5} />
              Adicionar
            </button>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-600">
              Carregando usuários...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto max-w-md">
                <h4 className="text-lg font-semibold text-slate-900">
                  Nenhum usuário encontrado
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Ajuste os filtros ou cadastre um novo usuário para organizar os acessos do sistema.
                </p>

                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Cadastrar usuário
                </button>
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
                        E-mail
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Role
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
                    {paginatedUsers.map((user) => {
                      const isProcessing = processingId === user.id;
                      const canDelete = canDeletePermanently && currentUser?.id !== user.id;

                      return (
                        <tr
                          key={user.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {user.name}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            {user.email}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={[
                                "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                formatRoleBadge(user.role),
                              ].join(" ")}
                            >
                              {getRoleLabel(user.role)}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            {user.company?.name ?? "-"}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={[
                                "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                user.active
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700",
                              ].join(" ")}
                            >
                              {user.active ? "Ativo" : "Inativo"}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="w-full flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingUser(user)}
                                disabled={isProcessing}
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Editar
                              </button>

                              {user.active ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDeactivate(user)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Desativar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void handleActivate(user)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Reativar
                                </button>
                              )}

                              {canDelete ? (
                                <button
                                  type="button"
                                  onClick={() => void handleHardDelete(user)}
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

      <UserFormModal
        open={createOpen}
        mode="create"
        companies={companies}
        loading={createLoading}
        allowSuperAdminRole={superAdmin}
        defaultCompanyId={superAdmin ? getAdminScopeCompanyId() : getResolvedCompanyId(currentUser) ?? currentUser?.companyId ?? ""}
        onClose={() => {
          if (!createLoading) {
            setCreateOpen(false);
          }
        }}
        onSubmit={handleCreate}
      />

      <UserFormModal
        open={!!editingUser}
        mode="edit"
        companies={companies}
        loading={editLoading}
        allowSuperAdminRole={superAdmin}
        defaultCompanyId={superAdmin ? getAdminScopeCompanyId() : getResolvedCompanyId(currentUser) ?? currentUser?.companyId ?? ""}
        initialData={
          editingUser
            ? {
                name: editingUser.name,
                email: editingUser.email,
                role: editingUser.role,
                companyId: editingUser.companyId ?? "",
              }
            : undefined
        }
        onClose={() => {
          if (!editLoading) {
            setEditingUser(null);
          }
        }}
        onSubmit={handleUpdate}
      />
    </>
  );
}
