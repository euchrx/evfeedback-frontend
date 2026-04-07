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

export default function UsersPage() {
  const currentUser = getStoredUser();

  const superAdmin = isSuperAdmin(currentUser);
  const canManageUsers = canAccessUsers(currentUser);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("MANAGER");
  const [companyId, setCompanyId] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const visibleUsers = useMemo(() => {
    if (showInactive) return users;
    return users.filter((user) => user.active);
  }, [users, showInactive]);

  async function load() {
    try {
      setError("");
      setLoading(true);

      const resolvedCompanyId = getResolvedCompanyId(currentUser);

      const usersPromise = getUsers(resolvedCompanyId);
      const companiesPromise = superAdmin ? getCompanies() : Promise.resolve([]);

      const [usersData, companiesData] = await Promise.all([
        usersPromise,
        companiesPromise,
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

    const resolvedCompanyId = superAdmin
      ? companyId
      : currentUser?.companyId ?? "";

    if (!resolvedCompanyId) {
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

      await load();
    } catch {
      setError("Não foi possível criar o usuário.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(user: UserItem) {
    const confirmed = window.confirm(
      `Deseja desativar o usuário "${user.name}"?`,
    );

    if (!confirmed) return;

    try {
      setError("");

      await deactivateUser(user.id, superAdmin ? user.companyId : undefined);

      await load();
    } catch {
      setError("Não foi possível desativar o usuário.");
    }
  }

  async function handleActivate(user: UserItem) {
    try {
      setError("");

      await activateUser(user.id, superAdmin ? user.companyId : undefined);

      await load();
    } catch {
      setError("Não foi possível reativar o usuário.");
    }
  }

  async function handleHardDelete(user: UserItem) {
    const confirmed = window.confirm(
      `Excluir definitivamente o usuário "${user.name}"? Essa ação não poderá ser desfeita.`,
    );

    if (!confirmed) return;

    try {
      setError("");

      await hardDeleteUser(user.id, superAdmin ? user.companyId : undefined);

      await load();
    } catch {
      setError("Não foi possível excluir definitivamente o usuário.");
    }
  }

  useEffect(() => {
    if (canManageUsers) {
      load();
    } else {
      setLoading(false);
    }
  }, [canManageUsers]);

  if (!canManageUsers) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-xl font-bold text-rose-700">Acesso negado</h1>
        <p className="mt-2 text-sm text-rose-600">
          Apenas SUPER_ADMIN e COMPANY_ADMIN podem acessar a página de usuários.
        </p>
      </div>
    );
  }

  const availableRoles: UserRole[] = superAdmin
    ? ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"]
    : ["COMPANY_ADMIN", "MANAGER"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
        <p className="mt-1 text-sm text-slate-600">
          Gerencie os usuários da plataforma.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Novo usuário</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
            value={superAdmin ? companyId : currentUser?.companyId ?? ""}
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
              <option value={currentUser?.companyId ?? ""}>Empresa atual</option>
            )}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Criando..." : "Criar usuário"}
          </button>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Mostrar inativos
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Usuários cadastrados
          </h2>
          <span className="text-sm text-slate-500">
            {visibleUsers.length} item(ns)
          </span>
        </div>

        {loading ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Carregando usuários...
          </div>
        ) : visibleUsers.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Nenhum usuário cadastrado.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {visibleUsers.map((user) => {
              const canDelete = canHardDelete(currentUser) && currentUser?.id !== user.id;

              return (
                <div
                  key={user.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {user.name}
                      </h3>

                      <p className="text-sm text-slate-600">{user.email}</p>
                      <p className="text-sm text-slate-600">
                        Role: <span className="font-medium">{user.role}</span>
                      </p>
                      <p className="text-sm text-slate-600">
                        Empresa:{" "}
                        <span className="font-medium">
                          {user.company?.name ?? "-"}
                        </span>
                      </p>
                      <p className="text-sm text-slate-600">
                        Status:{" "}
                        <span
                          className={
                            user.active
                              ? "font-medium text-emerald-700"
                              : "font-medium text-amber-700"
                          }
                        >
                          {user.active ? "Ativo" : "Inativo"}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {user.active ? (
                        <button
                          onClick={() => handleDeactivate(user)}
                          className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200"
                        >
                          Desativar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(user)}
                          className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200"
                        >
                          Reativar
                        </button>
                      )}

                      {canDelete ? (
                        <button
                          onClick={() => handleHardDelete(user)}
                          className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                        >
                          Excluir definitivo
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}