import { useEffect, useMemo, useState } from "react";
import {
  createKiosk,
  deleteKiosk,
  getKiosks,
  type Kiosk,
} from "../../../services/kiosks";
import { getBranches, type Branch } from "../../../services/branches";

export default function KiosksPage() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const feedbackBaseUrl = useMemo(() => {
    return `${window.location.origin}/feedback`;
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);

      const [kiosksData, branchesData] = await Promise.all([
        getKiosks(),
        getBranches(),
      ]);

      setKiosks(kiosksData);
      setBranches(branchesData);

      if (!branchId && branchesData.length > 0) {
        setBranchId(branchesData[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateKiosk() {
    if (!name.trim() || !branchId || isSaving) return;

    try {
      setIsSaving(true);

      await createKiosk({
        name: name.trim(),
        branchId,
      });

      setName("");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteKiosk(id: string) {
    const confirmed = window.confirm("Deseja realmente excluir este kiosk?");
    if (!confirmed) return;

    await deleteKiosk(id);
    await loadData();
  }

  async function copyKioskLink(token: string) {
    const url = `${feedbackBaseUrl}?token=${token}`;
    await navigator.clipboard.writeText(url);
    window.alert("Link do kiosk copiado com sucesso.");
  }

  async function copyToken(token: string) {
    await navigator.clipboard.writeText(token);
    window.alert("Token copiado com sucesso.");
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900">Kiosks</h1>
        <p className="text-slate-600">
          Cadastre e gerencie os tablets de feedback.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6">
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            Novo kiosk
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Crie um tablet e gere o link de feedback automaticamente.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome do kiosk
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Conveniência"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filial
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 bg-white"
              >
                <option value="">Selecione uma filial</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleCreateKiosk}
              disabled={!name.trim() || !branchId || isSaving}
              className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3 font-semibold text-slate-950 transition"
            >
              {isSaving ? "Criando..." : "Criar kiosk"}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Kiosks cadastrados
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Copie o link e configure o tablet correspondente.
              </p>
            </div>

            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {kiosks.length} item(ns)
            </span>
          </div>

          {isLoading ? (
            <div className="mt-6 text-slate-500">Carregando kiosks...</div>
          ) : kiosks.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Nenhum kiosk cadastrado ainda.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {kiosks.map((kiosk) => {
                const kioskLink = `${feedbackBaseUrl}?token=${kiosk.token}`;

                return (
                  <div
                    key={kiosk.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {kiosk.name}
                        </h3>

                        <p className="text-sm text-slate-500 mt-1">
                          Filial: {kiosk.branch?.name ?? "Não informada"}
                        </p>

                        <div className="mt-4 space-y-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Token
                            </p>
                            <p className="text-sm text-slate-700 break-all">
                              {kiosk.token}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Link do kiosk
                            </p>
                            <p className="text-sm text-slate-700 break-all">
                              {kioskLink}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => copyToken(kiosk.token)}
                          className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition"
                        >
                          Copiar token
                        </button>

                        <button
                          type="button"
                          onClick={() => copyKioskLink(kiosk.token)}
                          className="rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950 transition"
                        >
                          Copiar link
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteKiosk(kiosk.id)}
                          className="rounded-xl bg-rose-50 hover:bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 transition"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}