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
      return "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200";
    case "COMPANY_ADMIN":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "MANAGER":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    default:
      return "border-white/10 bg-white/5 text-slate-200";
  }
}

export default function UsersPage() {
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const currentUser = getStoredUser();
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

      const [usersData, companiesData] = await Promise.all([
        getUsers(resolvedCompanyId),
        getCompanies(),
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
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

    if (payload.role !== "SUPER_ADMIN" && !payload.companyId) {
      toast.warning("Selecione uma empresa.");
      return;
    }

    try {
      setCreateLoading(true);

      await createUser({
        name: payload.name.trim(),
        email: payload.email.trim(),
        password: payload.password,
        role: payload.role,
        companyId: payload.role === "SUPER_ADMIN" ? undefined : payload.companyId,
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

    if (payload.role !== "SUPER_ADMIN" && !payload.companyId) {
      toast.warning("Selecione uma empresa.");
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
          companyId: payload.role === "SUPER_ADMIN" ? undefined : payload.companyId,
        },
        payload.role === "SUPER_ADMIN"
          ? undefined
          : payload.companyId ?? editingUser.companyId,
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

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setRoleFilter("");
    setPage(1);
  }

  const filteredUsers = useMemo(() => {
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
  }, [users, search, statusFilter, roleFilter]);

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
      <section className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-white">Acesso negado</h2>
        <p className="mt-2 text-sm leading-6 text-rose-100/80">
          Você não tem permissão para acessar a página de usuários.
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
                gestão de usuários
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                Acessos e permissões
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Gerencie usuários, vínculos com empresas e níveis de acesso do ambiente administrativo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, e-mail ou empresa"
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as "" | UserRole)}
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
              >
                <option value="">Todas as roles</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
                <option value="MANAGER">MANAGER</option>
              </select>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                >
                  Limpar
                </button>

                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Novo
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Usuários cadastrados</h3>
              <p className="mt-1 text-sm text-slate-400">
                {loading
                  ? "Carregando dados..."
                  : `${filteredUsers.length} usuário(s) encontrado(s)`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">
              Carregando usuários...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto max-w-md">
                <h4 className="text-lg font-semibold text-white">
                  Nenhum usuário encontrado
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-400">
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
                  <thead className="bg-white/[0.03]">
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
                          className="transition hover:bg-white/[0.03]"
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {user.name}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-400">
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

                          <td className="px-6 py-4 text-sm text-slate-400">
                            {user.company?.name ?? "-"}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={[
                                "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                user.active
                                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                  : "border-amber-400/20 bg-amber-500/10 text-amber-200",
                              ].join(" ")}
                            >
                              {user.active ? "Ativo" : "Inativo"}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingUser(user)}
                                disabled={isProcessing}
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Editar
                              </button>

                              {user.active ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDeactivate(user)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Desativar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void handleActivate(user)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Reativar
                                </button>
                              )}

                              {canDelete ? (
                                <button
                                  type="button"
                                  onClick={() => void handleHardDelete(user)}
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

      <UserFormModal
        open={createOpen}
        mode="create"
        companies={companies}
        loading={createLoading}
        allowSuperAdminRole={superAdmin}
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