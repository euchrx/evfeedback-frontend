import { useEffect, useState } from "react";
import { getCompanies, type Company } from "../../../services/companies";
import { getStoredUser } from "../../../services/auth";
import {
  createUserGlobal,
  deleteUserGlobal,
  getUsersGlobal,
  type UserItem,
} from "../../../services/users";

type UserRole = "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";

export default function UsersPage() {
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("COMPANY_ADMIN");
  const [companyId, setCompanyId] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      setLoading(true);

      const [usersData, companiesData] = await Promise.all([
        getUsersGlobal(),
        getCompanies(),
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch {
      setError("Não foi possível carregar os dados da página.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim() || !password.trim() || !companyId) {
      setError("Preencha nome, e-mail, senha e empresa.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createUserGlobal({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        companyId,
      });

      setName("");
      setEmail("");
      setPassword("");
      setRole("COMPANY_ADMIN");
      setCompanyId("");

      await load();
    } catch {
      setError("Não foi possível criar o usuário.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Deseja desativar este usuário?");
    if (!confirmed) return;

    try {
      setError("");
      await deleteUserGlobal(id);
      await load();
    } catch {
      setError("Não foi possível desativar o usuário.");
    }
  }

  useEffect(() => {
    if (isSuperAdmin) {
      load();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Acesso negado</h1>
        <p className="mt-2 text-sm text-slate-500">
          Apenas SUPER_ADMIN pode acessar a página de usuários.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
        <p className="text-slate-600 mt-1">
          Gerencie os usuários da plataforma.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-xl border border-slate-300 px-4 py-3 bg-white"
          >
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
            <option value="MANAGER">MANAGER</option>
          </select>

          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 bg-white"
          >
            <option value="">Selecione a empresa</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCreate}
          disabled={submitting}
          className="rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 px-5 py-3 font-semibold text-slate-950"
        >
          {submitting ? "Criando..." : "Criar usuário"}
        </button>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {loading ? (
          <div className="text-slate-500">Carregando usuários...</div>
        ) : (
          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-slate-500">Nenhum usuário cadastrado.</div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-semibold text-slate-900">{user.name}</h3>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="text-sm text-slate-500">Role: {user.role}</p>
                    <p className="text-sm text-slate-500">
                      Empresa: {user.company?.name ?? "-"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Status: {user.active ? "Ativo" : "Inativo"}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(user.id)}
                    className="rounded-xl bg-rose-50 hover:bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700"
                  >
                    Desativar
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}