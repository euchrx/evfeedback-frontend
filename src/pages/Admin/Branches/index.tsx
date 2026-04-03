import { useEffect, useState } from "react";
import {
  createBranch,
  deleteBranch,
  getBranches,
  type Branch,
} from "../../../services/branches";

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadBranches() {
    try {
      setIsLoading(true);
      const data = await getBranches();
      setBranches(data);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim() || isSaving) return;

    try {
      setIsSaving(true);
      await createBranch({ name: name.trim() });
      setName("");
      await loadBranches();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Deseja excluir esta filial?");
    if (!confirmed) return;

    await deleteBranch(id);
    await loadBranches();
  }

  useEffect(() => {
    loadBranches();
  }, []);

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Filiais</h1>
        <p className="text-slate-600 mt-2">
          Gerencie os estabelecimentos do sistema.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-[400px_minmax(0,1fr)] gap-6">
        
        {/* FORM */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            Nova filial
          </h2>

          <div className="mt-6 space-y-4">
            <input
              type="text"
              placeholder="Ex: Posto Centro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />

            <button
              onClick={handleCreate}
              disabled={!name.trim() || isSaving}
              className="w-full bg-sky-500 hover:bg-sky-400 px-4 py-3 rounded-xl font-semibold text-slate-950"
            >
              {isSaving ? "Criando..." : "Criar filial"}
            </button>
          </div>
        </section>

        {/* LISTA */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            Filiais cadastradas
          </h2>

          {isLoading ? (
            <p className="mt-4 text-slate-500">Carregando...</p>
          ) : branches.length === 0 ? (
            <p className="mt-4 text-slate-500">
              Nenhuma filial cadastrada.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className="flex justify-between items-center border p-4 rounded-xl"
                >
                  <span className="font-medium text-slate-800">
                    {b.name}
                  </span>

                  <button
                    onClick={() => handleDelete(b.id)}
                    className="text-red-600 text-sm"
                  >
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}