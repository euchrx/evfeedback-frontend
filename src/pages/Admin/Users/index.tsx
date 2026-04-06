import { useEffect, useState } from "react";
import { getCompanies, type Company } from "../../../services/companies";
import {
  createUserGlobal,
  deleteUserGlobal,
  getUsersGlobal,
  type UserItem,
} from "../../../services/users";

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER">("ADMIN");
  const [companyId, setCompanyId] = useState("");

  async function load() {
    const [usersData, companiesData] = await Promise.all([
      getUsersGlobal(),
      getCompanies(),
    ]);

    setUsers(Array.isArray(usersData) ? usersData : []);
    setCompanies(Array.isArray(companiesData) ? companiesData : []);
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim() || !password.trim() || !companyId) return;

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
    setRole("ADMIN");
    setCompanyId("");
    await load();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Deseja desativar este usuário?");
    if (!confirmed) return;

    await deleteUserGlobal(id);
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
        <p className="text-slate-600 mt-1">
          Gerencie os usuários da plataforma.
        </p>
      </div>

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
            onChange={(e) => setRole(e.target.value as "ADMIN" | "MANAGER")}
            className="rounded-xl border border-slate-300 px-4 py-3 bg-white"
          >
            <option value="ADMIN">ADMIN</option>
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
          className="rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-3 font-semibold text-slate-950"
        >
          Criar usuário
        </button>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
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
      </section>
    </div>
  );
}