import { useEffect, useState } from "react";
import { getStoredUser } from "../../../services/auth";
import {
  createCompany,
  getCompanies,
  type Company,
} from "../../../services/companies";

export default function CompaniesPage() {
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
          Apenas SUPER_ADMIN pode acessar a página de empresas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
        <p className="text-slate-600 mt-1">
          Gerencie as empresas da plataforma.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="max-w-xl">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da empresa"
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={submitting}
          className="rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 px-5 py-3 font-semibold text-slate-950"
        >
          {submitting ? "Criando..." : "Criar empresa"}
        </button>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {loading ? (
          <div className="text-slate-500">Carregando empresas...</div>
        ) : (
          <div className="space-y-4">
            {companies.length === 0 ? (
              <div className="text-slate-500">Nenhuma empresa cadastrada.</div>
            ) : (
              companies.map((company) => (
                <div
                  key={company.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <h3 className="font-semibold text-slate-900">{company.name}</h3>
                  <p className="text-sm text-slate-500">
                    Status: {company.active ? "Ativa" : "Inativa"}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}