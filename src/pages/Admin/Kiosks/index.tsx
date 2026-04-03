import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import {
  getKiosks,
  createKiosk,
  deleteKiosk,
  updateKioskStatus,
} from "../../../services/kiosks";
import { getBranches } from "../../../services/branches";

type Branch = {
  id: string;
  name: string;
};

type Kiosk = {
  id: string;
  name: string;
  token: string;
  branchId: string;
  active: boolean;
  branch?: Branch;
};

export default function KiosksPage() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [selectedQrLink, setSelectedQrLink] = useState<string | null>(null);

  const feedbackBaseUrl = useMemo(() => {
    return `${window.location.origin}/feedback`;
  }, []);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [kData, bData] = await Promise.all([getKiosks(), getBranches()]);
    setKiosks(Array.isArray(kData) ? kData : []);
    setBranches(Array.isArray(bData) ? bData : []);
  }

  async function handleCreate() {
    if (!name.trim() || !branchId) return;

    await createKiosk({
      name: name.trim(),
      branchId,
    });

    setName("");
    await load();
  }

  async function handleDisable(id: string) {
    const confirmed = window.confirm("Deseja desativar este kiosk?");
    if (!confirmed) return;

    await updateKioskStatus(id, false);
    await load();
  }

  async function handleEnable(id: string) {
    await updateKioskStatus(id, true);
    await load();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Deseja remover este kiosk? Ele será desativado."
    );
    if (!confirmed) return;

    await deleteKiosk(id);
    await load();
  }

  async function handleCopyToken(token: string) {
    await navigator.clipboard.writeText(token);
    window.alert("Token copiado com sucesso.");
  }

  async function handleCopyLink(token: string) {
    const link = `${feedbackBaseUrl}?token=${token}`;
    await navigator.clipboard.writeText(link);
    window.alert("Link copiado com sucesso.");
  }

  function handleShowQr(token: string) {
    const link = `${feedbackBaseUrl}?token=${token}`;
    setSelectedQrLink(link);
  }

  function handleCloseQr() {
    setSelectedQrLink(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kiosks</h1>
        <p className="text-slate-600 mt-1">
          Cadastre tablets e controle o status de operação.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Novo kiosk</h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome do kiosk
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Conveniência"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filial
              </label>
              <select
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 bg-white"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">Selecione a filial</option>
                {(Array.isArray(branches) ? branches : []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCreate}
              className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-3 font-semibold text-slate-950 transition"
            >
              Criar kiosk
            </button>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Kiosks cadastrados
            </h2>
            <span className="text-sm text-slate-500">{kiosks.length} item(ns)</span>
          </div>

          <div className="mt-5 space-y-4">
            {kiosks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                Nenhum kiosk cadastrado.
              </div>
            ) : (
              kiosks.map((kiosk) => {
                const link = `${feedbackBaseUrl}?token=${kiosk.token}`;

                return (
                  <div
                    key={kiosk.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">
                            {kiosk.name}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            Filial: {kiosk.branch?.name || "Sem filial"}
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            kiosk.active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {kiosk.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>

                      <div className="space-y-3">
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
                            {link}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleCopyToken(kiosk.token)}
                          className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition"
                        >
                          Copiar token
                        </button>

                        <button
                          onClick={() => handleCopyLink(kiosk.token)}
                          className="rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950 transition"
                        >
                          Copiar link
                        </button>

                        <button
                          onClick={() => handleShowQr(kiosk.token)}
                          className="rounded-xl bg-emerald-100 hover:bg-emerald-200 px-4 py-2 text-sm font-medium text-emerald-800 transition"
                        >
                          Ver QR Code
                        </button>

                        {kiosk.active ? (
                          <button
                            onClick={() => handleDisable(kiosk.id)}
                            className="rounded-xl bg-amber-100 hover:bg-amber-200 px-4 py-2 text-sm font-medium text-amber-800 transition"
                          >
                            Desativar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnable(kiosk.id)}
                            className="rounded-xl bg-violet-100 hover:bg-violet-200 px-4 py-2 text-sm font-medium text-violet-800 transition"
                          >
                            Reativar
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(kiosk.id)}
                          className="rounded-xl bg-rose-50 hover:bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 transition"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {selectedQrLink && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">QR Code do kiosk</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Escaneie ou abra este link no tablet correspondente.
                </p>
              </div>

              <button
                onClick={handleCloseQr}
                className="text-slate-500 hover:text-slate-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mt-6 flex justify-center bg-white p-4 rounded-xl border border-slate-200">
              <QRCode value={selectedQrLink} size={220} />
            </div>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-wide text-slate-400">Link</p>
              <p className="text-sm text-slate-700 break-all mt-1">
                {selectedQrLink}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(selectedQrLink);
                  window.alert("Link copiado com sucesso.");
                }}
                className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-3 font-semibold text-slate-950 transition"
              >
                Copiar link
              </button>

              <button
                onClick={handleCloseQr}
                className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-3 font-semibold text-slate-800 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}