import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { getStoredUser } from "../../../services/auth";
import { getCompanies, type Company } from "../../../services/companies";
import { getBranches, type Branch } from "../../../services/branches";
import {
  activateKiosk,
  createKiosk,
  deactivateKiosk,
  getKiosks,
  hardDeleteKiosk,
  regenerateKioskToken,
  type Kiosk,
} from "../../../services/kiosks";
import {
  canHardDelete,
  canManageOperationalModules,
  canViewOperationalModules,
  getResolvedCompanyId,
  isSuperAdmin,
} from "../../../utils/permissions";

export default function KiosksPage() {
  const currentUser = getStoredUser();

  const canView = canViewOperationalModules(currentUser);
  const canManage = canManageOperationalModules(currentUser);
  const canDeletePermanently = canHardDelete(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);

  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [companyId, setCompanyId] = useState(resolvedCompanyId ?? "");
  const [showInactive, setShowInactive] = useState(true);
  const [selectedQrLink, setSelectedQrLink] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const feedbackBaseUrl = useMemo(() => {
    return `${window.location.origin}/feedback`;
  }, []);

  const selectedCompanyId = useMemo(() => {
    return superAdmin ? companyId || undefined : resolvedCompanyId;
  }, [superAdmin, companyId, resolvedCompanyId]);

  const visibleKiosks = useMemo(() => {
    if (showInactive) return kiosks;
    return kiosks.filter((kiosk) => kiosk.active);
  }, [kiosks, showInactive]);

  const filteredBranches = useMemo(() => {
    if (!superAdmin) return branches;
    if (!selectedCompanyId) return [];
    return branches.filter((branch) => branch.companyId === selectedCompanyId);
  }, [branches, selectedCompanyId, superAdmin]);

  async function load() {
    try {
      setError("");
      setLoading(true);

      const requests: Promise<unknown>[] = [
        getKiosks(selectedCompanyId),
        getBranches(selectedCompanyId),
      ];

      if (superAdmin) {
        requests.push(getCompanies());
      }

      const [kiosksData, branchesData, companiesData] = await Promise.all(
        requests
      );

      setKiosks(Array.isArray(kiosksData) ? (kiosksData as Kiosk[]) : []);
      setBranches(Array.isArray(branchesData) ? (branchesData as Branch[]) : []);
      setCompanies(Array.isArray(companiesData) ? (companiesData as Company[]) : []);
    } catch {
      setError("Não foi possível carregar os kiosks.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!canManage) return;

    if (!name.trim()) {
      setError("Informe o nome do kiosk.");
      return;
    }

    if (!branchId) {
      setError("Selecione uma filial.");
      return;
    }

    const targetCompanyId = superAdmin ? companyId : resolvedCompanyId ?? "";

    if (!targetCompanyId) {
      setError("Selecione uma empresa.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createKiosk({
        name: name.trim(),
        branchId,
        companyId: targetCompanyId,
        locationDescription: locationDescription.trim() || undefined,
        active: true,
      });

      setName("");
      setBranchId("");
      setLocationDescription("");

      if (superAdmin) {
        setCompanyId("");
      }

      await load();
    } catch {
      setError("Não foi possível criar o kiosk.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(kiosk: Kiosk) {
    if (!canManage) return;

    const confirmed = window.confirm(
      `Deseja desativar o kiosk "${kiosk.name}"?`
    );
    if (!confirmed) return;

    try {
      setProcessingId(kiosk.id);
      setError("");

      await deactivateKiosk(
        kiosk.id,
        superAdmin ? kiosk.companyId : undefined
      );

      await load();
    } catch {
      setError("Não foi possível desativar o kiosk.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleActivate(kiosk: Kiosk) {
    if (!canManage) return;

    try {
      setProcessingId(kiosk.id);
      setError("");

      await activateKiosk(
        kiosk.id,
        superAdmin ? kiosk.companyId : undefined
      );

      await load();
    } catch {
      setError("Não foi possível reativar o kiosk.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRegenerateToken(kiosk: Kiosk) {
    if (!canManage) return;

    const confirmed = window.confirm(
      `Deseja regenerar o token do kiosk "${kiosk.name}"? O link antigo deixará de funcionar.`
    );
    if (!confirmed) return;

    try {
      setProcessingId(kiosk.id);
      setError("");

      await regenerateKioskToken(
        kiosk.id,
        superAdmin ? kiosk.companyId : undefined
      );

      await load();
    } catch {
      setError("Não foi possível regenerar o token do kiosk.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleHardDelete(kiosk: Kiosk) {
    if (!canDeletePermanently) return;

    const confirmed = window.confirm(
      `Excluir definitivamente o kiosk "${kiosk.name}"? Essa ação não poderá ser desfeita.`
    );
    if (!confirmed) return;

    try {
      setProcessingId(kiosk.id);
      setError("");

      await hardDeleteKiosk(
        kiosk.id,
        superAdmin ? kiosk.companyId : undefined
      );

      await load();
    } catch {
      setError("Não foi possível excluir definitivamente o kiosk.");
    } finally {
      setProcessingId(null);
    }
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

  useEffect(() => {
    if (canView) {
      void load();
    } else {
      setLoading(false);
    }
  }, [canView, selectedCompanyId]);

  useEffect(() => {
    if (superAdmin && branchId) {
      const branchStillExists = filteredBranches.some(
        (branch) => branch.id === branchId
      );

      if (!branchStillExists) {
        setBranchId("");
      }
    }
  }, [filteredBranches, branchId, superAdmin]);

  if (!canView) {
    return (
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Acesso negado
        </h1>
        <p className="text-slate-600">
          Você não tem permissão para acessar a página de kiosks.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Kiosks
        </h1>
        <p className="text-slate-600">
          Cadastre tablets e controle o status de operação.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {canManage ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">
              Novo kiosk
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do kiosk"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />

            <input
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
              placeholder="Localização/descrição"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />

            <select
              value={companyId}
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
                <option value={resolvedCompanyId ?? ""}>Empresa atual</option>
              )}
            </select>

            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
            >
              <option value="">Selecione a filial</option>
              {(superAdmin ? filteredBranches : branches).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Criando..." : "Criar kiosk"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Kiosks cadastrados
            </h2>
            <p className="text-sm text-slate-500">
              {visibleKiosks.length} item(ns)
            </p>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Mostrar inativos
          </label>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Carregando kiosks...
          </div>
        ) : visibleKiosks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Nenhum kiosk cadastrado.
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleKiosks.map((kiosk) => {
              const link = `${feedbackBaseUrl}?token=${kiosk.token}`;
              const isProcessing = processingId === kiosk.id;

              return (
                <article
                  key={kiosk.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {kiosk.name}
                      </h3>

                      <div className="space-y-1 text-sm text-slate-600">
                        <p>Empresa: {kiosk.company?.name ?? "-"}</p>
                        <p>Filial: {kiosk.branch?.name ?? "Sem filial"}</p>
                        <p>Local: {kiosk.locationDescription || "-"}</p>
                        <p>Status: {kiosk.active ? "Ativo" : "Inativo"}</p>
                      </div>

                      <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Token
                          </p>
                          <p className="break-all text-sm text-slate-700">
                            {kiosk.token}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Link do kiosk
                          </p>
                          <p className="break-all text-sm text-slate-700">
                            {link}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCopyToken(kiosk.token)}
                        className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
                      >
                        Copiar token
                      </button>

                      <button
                        onClick={() => handleCopyLink(kiosk.token)}
                        className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
                      >
                        Copiar link
                      </button>

                      <button
                        onClick={() => handleShowQr(kiosk.token)}
                        className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200"
                      >
                        Ver QR Code
                      </button>

                      {canManage ? (
                        <>
                          <button
                            onClick={() => handleRegenerateToken(kiosk)}
                            disabled={isProcessing}
                            className="rounded-xl bg-violet-100 px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Regenerar token
                          </button>

                          {kiosk.active ? (
                            <button
                              onClick={() => handleDeactivate(kiosk)}
                              disabled={isProcessing}
                              className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Desativar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(kiosk)}
                              disabled={isProcessing}
                              className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Reativar
                            </button>
                          )}

                          {canDeletePermanently ? (
                            <button
                              onClick={() => handleHardDelete(kiosk)}
                              disabled={isProcessing}
                              className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Excluir definitivo
                            </button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {selectedQrLink ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  QR Code do kiosk
                </h3>
                <p className="text-sm text-slate-500">
                  Escaneie ou abra este link no tablet correspondente.
                </p>
              </div>

              <button
                onClick={handleCloseQr}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                ×
              </button>
            </div>

            <div className="flex justify-center rounded-3xl bg-white p-6">
              <QRCode value={selectedQrLink} size={220} />
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Link
                </p>
                <p className="break-all text-sm text-slate-700">
                  {selectedQrLink}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(selectedQrLink);
                    window.alert("Link copiado com sucesso.");
                  }}
                  className="flex-1 rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
                >
                  Copiar link
                </button>

                <button
                  onClick={handleCloseQr}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}