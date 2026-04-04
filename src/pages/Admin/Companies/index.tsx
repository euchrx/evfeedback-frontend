import { useEffect, useState } from "react";
import {
  createCompany,
  deleteCompany,
  getCompanies,
  type Company,
} from "../../../services/companies";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  async function load() {
    const data = await getCompanies();
    setCompanies(Array.isArray(data) ? data : []);
  }

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) return;

    await createCompany({
      name: name.trim(),
      slug: slug.trim(),
    });

    setName("");
    setSlug("");
    await load();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Deseja desativar esta empresa?");
    if (!confirmed) return;

    await deleteCompany(id);
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
        <p className="text-slate-600 mt-1">
          Gerencie as empresas da plataforma.
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da empresa"
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Slug"
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

          <button
            onClick={handleCreate}
            className="rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-3 font-semibold text-slate-950"
          >
            Criar empresa
          </button>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="space-y-4">
          {companies.length === 0 ? (
            <div className="text-slate-500">Nenhuma empresa cadastrada.</div>
          ) : (
            companies.map((company) => (
              <div
                key={company.id}
                className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-semibold text-slate-900">{company.name}</h3>
                  <p className="text-sm text-slate-500">Slug: {company.slug}</p>
                  <p className="text-sm text-slate-500">
                    Status: {company.active ? "Ativa" : "Inativa"}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(company.id)}
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