import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "../../../services/auth";
import {
  activateCompany,
  createCompany,
  deactivateCompany,
  getCompanies,
  hardDeleteCompany,
  type Company,
} from "../../../services/companies";

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";
  companyId?: string | null;
};

export default function CompaniesPage() {
  const currentUser = getStoredUser() as StoredUser | null;
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const visibleCompanies = useMemo(() => {
    if (showInactive) return companies;
    return companies.filter((company) => company.active);
  }, [companies, showInactive]);

  async function load() {
    try {
      setError("");
      setLoading(true);

      const data = await getCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch {
      setError("Não foi possível carregar as empresas.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createCompany({
        name: name.trim(),
      });

      setName("");
      await load();
    } catch {
      setError("Não foi possível criar a empresa.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(company: Company) {
    const confirmed = window.confirm(
      `Deseja desativar a empresa "${company.name}"?`,
    );

    if (!confirmed) return;

    try {
      setError("");
      await deactivateCompany(company.id);
      await load();
    } catch {
      setError("Não foi possível desativar a empresa.");
    }
  }

  async function handleActivate(company: Company) {
    try {
      setError("");
      await activateCompany(company.id);
      await load();
    } catch {
      setError("Não foi possível reativar a empresa.");
    }
  }

  async function handleHardDelete(company: Company) {
    const confirmed = window.confirm(
      `Excluir definitivamente a empresa "${company.name}"? Essa ação não poderá ser desfeita.`,
    );

    if (!confirmed) return;

    try {
      setError("");
      await hardDeleteCompany(company.id);
      await load();
    } catch {
      setError("Não foi possível excluir definitivamente a empresa.");
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
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-xl font-bold text-rose-700">Acesso negado</h1>
        <p className="mt-2 text-sm text-rose-600">
          Apenas SUPER_ADMIN pode acessar a página de empresas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Gerencie as empresas da plataforma.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Nova empresa</h2>

        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da empresa"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />

          <button
            onClick={handleCreate}
            disabled={submitting}
            className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Criando..." : "Criar empresa"}
          </button>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Mostrar inativas
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Empresas cadastradas
          </h2>
          <span className="text-sm text-slate-500">
            {visibleCompanies.length} item(ns)
          </span>
        </div>

        {loading ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Carregando empresas...
          </div>
        ) : visibleCompanies.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Nenhuma empresa cadastrada.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {visibleCompanies.map((company) => (
              <div
                key={company.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {company.name}
                    </h3>

                    <p className="text-sm text-slate-600">
                      Status:{" "}
                      <span
                        className={
                          company.active
                            ? "font-medium text-emerald-700"
                            : "font-medium text-amber-700"
                        }
                      >
                        {company.active ? "Ativa" : "Inativa"}
                      </span>
                    </p>

                    <p className="text-xs text-slate-500">
                      Criada em{" "}
                      {new Date(company.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {company.active ? (
                      <button
                        onClick={() => handleDeactivate(company)}
                        className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200"
                      >
                        Desativar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(company)}
                        className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200"
                      >
                        Reativar
                      </button>
                    )}

                    <button
                      onClick={() => handleHardDelete(company)}
                      className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      Excluir definitivo
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}