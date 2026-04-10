import { useEffect, useMemo, useState } from "react";
import { getCompanies, type Company } from "../../../services/companies";
import { getStoredUser } from "../../../services/auth";
import {
  activateUser,
  createUser,
  deactivateUser,
  getUsers,
  hardDeleteUser,
  type UserItem,
  type UserRole,
} from "../../../services/users";
import {
  canAccessUsers,
  canHardDelete,
  getResolvedCompanyId,
  isSuperAdmin,
} from "../../../utils/permissions";

const PAGE_SIZE = 10;
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export default function UsersPage() {
  const currentUser = getStoredUser();

  const superAdmin = isSuperAdmin(currentUser);
  const canManageUsers = canAccessUsers(currentUser);
  const canDeletePermanently = canHardDelete(currentUser);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("MANAGER");
  const [companyId, setCompanyId] = useState(
    currentUser?.companyId ?? ""
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const availableRoles: UserRole[] = superAdmin
    ? ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"]
    : ["COMPANY_ADMIN", "MANAGER"];

  async function load() {
    try {
      setError("");
      setLoading(true);

      const resolvedCompanyId = getResolvedCompanyId(currentUser);

      const [usersData, companiesData] = await Promise.all([
        getUsers(resolvedCompanyId),
        superAdmin ? getCompanies() : Promise.resolve([]),
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);

      if (!superAdmin && currentUser?.companyId) {
        setCompanyId(currentUser.companyId);
      }
    } catch {
      setError("Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Preencha nome, e-mail e senha.");
      return;
    }

    const resolvedCompanyId =
      role === "SUPER_ADMIN"
        ? undefined
        : superAdmin
        ? companyId
        : currentUser?.companyId ?? "";

    if (role !== "SUPER_ADMIN" && !resolvedCompanyId) {
      setError("Selecione uma empresa.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        companyId: resolvedCompanyId,
        active: true,
      });

      setName("");
      setEmail("");
      setPassword("");
      setRole("MANAGER");

      if (superAdmin) {
        setCompanyId("");
      }

      setPage(1);
      await load();
    } catch {
      setError("Não foi possível criar o usuário.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(user: UserItem) {
    const confirmed = window.confirm(
      `Deseja desativar o usuário "${user.name}"?`
    );
    if (!confirmed) return;

    try {
      setProcessingId(user.id);
      setError("");

      await deactivateUser(user.id, superAdmin ? user.companyId : undefined);
      await load();
    } catch {
      setError("Não foi possível desativar o usuário.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleActivate(user: UserItem) {
    try {
      setProcessingId(user.id);
      setError("");

      await activateUser(user.id, superAdmin ? user.companyId : undefined);
      await load();
    } catch {
      setError("Não foi possível reativar o usuário.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleHardDelete(user: UserItem) {
    const confirmed = window.confirm(
      `Excluir definitivamente o usuário "${user.name}"? Essa ação não poderá ser desfeita.`
    );
    if (!confirmed) return;

    try {
      setProcessingId(user.id);
      setError("");

      await hardDeleteUser(user.id, superAdmin ? user.companyId : undefined);
      await load();
    } catch {
      setError("Não foi possível excluir definitivamente o usuário.");
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
    if (canManageUsers) {
      void load();
    } else {
      setLoading(false);
    }
  }, [canManageUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, roleFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (!canManageUsers) {
    return (
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Acesso negado
        </h1>
        <p className="text-slate-600">
          Apenas SUPER_ADMIN e COMPANY_ADMIN podem acessar a página de usuários.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Usuários
        </h1>
        <p className="text-slate-600">
          Gerencie os usuários da plataforma.
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
            Novo usuário
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
          >
            {availableRoles.map((itemRole) => (
              <option key={itemRole} value={itemRole}>
                {itemRole}
              </option>
            ))}
          </select>

          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            disabled={!superAdmin || role === "SUPER_ADMIN"}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-500"
          >
            {superAdmin ? (
              <>
                <option value="">
                  {role === "SUPER_ADMIN"
                    ? "Empresa ignorada para SUPER_ADMIN"
                    : "Selecione a empresa"}
                </option>
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
        </div>

        <div className="mt-4">
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Criando..." : "Criar usuário"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou empresa"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
          >
            <option value="ALL">Todos os status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "" | UserRole)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
          >
            <option value="">Todas as roles</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
            <option value="MANAGER">MANAGER</option>
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
            Usuários cadastrados
          </h2>
          <p className="text-sm text-slate-500">
            {loading ? "Carregando..." : `${filteredUsers.length} item(ns)`}
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Carregando usuários...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-sm text-slate-600">
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">E-mail</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Empresa</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedUsers.map((user) => {
                    const isProcessing = processingId === user.id;
                    const canDelete =
                      canDeletePermanently && currentUser?.id !== user.id;

                    return (
                      <tr key={user.id} className="align-top">
                        <td className="px-4 py-4 font-medium text-slate-900">
                          {user.name}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {user.email}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {user.role}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {user.company?.name ?? "-"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              user.active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {user.active ? "Ativo" : "Inativo"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {user.active ? (
                              <button
                                onClick={() => handleDeactivate(user)}
                                disabled={isProcessing}
                                className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-60"
                              >
                                Desativar
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(user)}
                                disabled={isProcessing}
                                className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-60"
                              >
                                Reativar
                              </button>
                            )}

                            {canDelete ? (
                              <button
                                onClick={() => handleHardDelete(user)}
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