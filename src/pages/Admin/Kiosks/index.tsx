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

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";
  companyId?: string | null;
};

export default function KiosksPage() {
  const currentUser = getStoredUser() as StoredUser | null;

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const isCompanyAdmin = currentUser?.role === "COMPANY_ADMIN";
  const isManager = currentUser?.role === "MANAGER";

  const canViewKiosks = isSuperAdmin || isCompanyAdmin || isManager;
  const canManageKiosks = isSuperAdmin || isCompanyAdmin;

  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [selectedQrLink, setSelectedQrLink] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const feedbackBaseUrl = useMemo(() => {
    return `${window.location.origin}/feedback`;
  }, []);

  const resolvedCompanyId = isSuperAdmin
    ? companyId || undefined
    : currentUser?.companyId ?? undefined;

  const visibleKiosks = useMemo(() => {
    if (showInactive) return kiosks;
    return kiosks.filter((kiosk) => kiosk.active);
  }, [kiosks, showInactive]);

  const filteredBranches = useMemo(() => {
    if (!isSuperAdmin) return branches;

    if (!companyId) return [];
    return branches.filter((branch) => branch.companyId === companyId);
  }, [branches, companyId, isSuperAdmin]);

  async function load() {
    try {
      setError("");
      setLoading(true);

      const scopeCompanyId = isSuperAdmin
        ? undefined
        : currentUser?.companyId ?? undefined;

      const kiosksPromise = getKiosks(scopeCompanyId);
      const branchesPromise = getBranches(scopeCompanyId);
      const companiesPromise = isSuperAdmin ? getCompanies() : Promise.resolve([]);

      const [kiosksData, branchesData, companiesData] = await Promise.all([
        kiosksPromise,
        branchesPromise,
        companiesPromise,
      ]);

      setKiosks(Array.isArray(kiosksData) ? kiosksData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);

      if (!isSuperAdmin && currentUser?.companyId) {
        setCompanyId(currentUser.companyId);
      }
    } catch {
      setError("Não foi possível carregar os kiosks.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Informe o nome do kiosk.");
      return;
    }

    if (!branchId) {
      setError("Selecione uma filial.");
      return;
    }

    const targetCompanyId = isSuperAdmin
      ? companyId
      : currentUser?.companyId ?? "";

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

      if (isSuperAdmin) {
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
    const confirmed = window.confirm(
      `Deseja desativar o kiosk "${kiosk.name}"?`,
    );

    if (!confirmed) return;

    try {
      setError("");
      await deactivateKiosk(
        kiosk.id,
        isSuperAdmin ? kiosk.companyId : undefined,
      );
      await load();
    } catch {
      setError("Não foi possível desativar o kiosk.");
    }
  }

  async function handleActivate(kiosk: Kiosk) {
    try {
      setError("");
      await activateKiosk(
        kiosk.id,
        isSuperAdmin ? kiosk.companyId : undefined,
      );
      await load();
    } catch {
      setError("Não foi possível reativar o kiosk.");
    }
  }

  async function handleRegenerateToken(kiosk: Kiosk) {
    const confirmed = window.confirm(
      `Deseja regenerar o token do kiosk "${kiosk.name}"? O link antigo deixará de funcionar.`,
    );

    if (!confirmed) return;

    try {
      setError("");
      await regenerateKioskToken(
        kiosk.id,
        isSuperAdmin ? kiosk.companyId : undefined,
      );
      await load();
    } catch {
      setError("Não foi possível regenerar o token do kiosk.");
    }
  }

  async function handleHardDelete(kiosk: Kiosk) {
    const confirmed = window.confirm(
      `Excluir definitivamente o kiosk "${kiosk.name}"? Essa ação não poderá ser desfeita.`,
    );

    if (!confirmed) return;

    try {
      setError("");
      await hardDeleteKiosk(
        kiosk.id,
        isSuperAdmin ? kiosk.companyId : undefined,
      );
      await load();
    } catch {
      setError("Não foi possível excluir definitivamente o kiosk.");
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
    if (canViewKiosks) {
      load();
    } else {
      setLoading(false);
    }
  }, [canViewKiosks]);

  useEffect(() => {
    if (isSuperAdmin && branchId) {
      const branchStillExists = filteredBranches.some((branch) => branch.id === branchId);
      if (!branchStillExists) {
        setBranchId("");
      }
    }
  }, [filteredBranches, branchId, isSuperAdmin]);

  if (!canViewKiosks) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-xl font-bold text-rose-700">Acesso negado</h1>
        <p className="mt-2 text-sm text-rose-600">
          Você não tem permissão para acessar a página de kiosks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kiosks</h1>
        <p className="mt-1 text-sm text-slate-600">
          Cadastre tablets e controle o status de operação.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {canManageKiosks ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Novo kiosk</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
              value={isSuperAdmin ? companyId : currentUser?.companyId ?? ""}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={!isSuperAdmin}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {isSuperAdmin ? (
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

            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
            >
              <option value="">Selecione a filial</option>
              {(isSuperAdmin ? filteredBranches : branches).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Criando..." : "Criar kiosk"}
            </button>
          </div>

          <div className="mt-4">
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
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Mostrar inativos
          </label>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Kiosks cadastrados
          </h2>
          <span className="text-sm text-slate-500">
            {visibleKiosks.length} item(ns)
          </span>
        </div>

        {loading ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Carregando kiosks...
          </div>
        ) : visibleKiosks.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Nenhum kiosk cadastrado.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {visibleKiosks.map((kiosk) => {
              const link = `${feedbackBaseUrl}?token=${kiosk.token}`;
              const canHardDelete = isSuperAdmin;

              return (
                <div
                  key={kiosk.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {kiosk.name}
                      </h3>

                      <p className="text-sm text-slate-600">
                        Empresa:{" "}
                        <span className="font-medium">
                          {kiosk.company?.name ?? "-"}
                        </span>
                      </p>

                      <p className="text-sm text-slate-600">
                        Filial:{" "}
                        <span className="font-medium">
                          {kiosk.branch?.name ?? "Sem filial"}
                        </span>
                      </p>

                      <p className="text-sm text-slate-600">
                        Local:{" "}
                        <span className="font-medium">
                          {kiosk.locationDescription || "-"}
                        </span>
                      </p>

                      <p className="text-sm text-slate-600">
                        Status:{" "}
                        <span
                          className={
                            kiosk.active
                              ? "font-medium text-emerald-700"
                              : "font-medium text-amber-700"
                          }
                        >
                          {kiosk.active ? "Ativo" : "Inativo"}
                        </span>
                      </p>

                      <div className="pt-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Token
                        </p>
                        <p className="mt-1 break-all text-sm text-slate-700">
                          {kiosk.token}
                        </p>
                      </div>

                      <div className="pt-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Link do kiosk
                        </p>
                        <p className="mt-1 break-all text-sm text-slate-700">
                          {link}
                        </p>
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

                      {canManageKiosks ? (
                        <>
                          <button
                            onClick={() => handleRegenerateToken(kiosk)}
                            className="rounded-xl bg-violet-100 px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-200"
                          >
                            Regenerar token
                          </button>

                          {kiosk.active ? (
                            <button
                              onClick={() => handleDeactivate(kiosk)}
                              className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200"
                            >
                              Desativar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(kiosk)}
                              className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200"
                            >
                              Reativar
                            </button>
                          )}

                          {canHardDelete ? (
                            <button
                              onClick={() => handleHardDelete(kiosk)}
                              className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                            >
                              Excluir definitivo
                            </button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedQrLink ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  QR Code do kiosk
                </h3>
                <p className="mt-1 text-sm text-slate-600">
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

            <div className="mt-6 flex justify-center rounded-2xl border border-slate-200 bg-white p-6">
              <QRCode value={selectedQrLink} size={220} />
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Link
              </p>
              <p className="mt-1 break-all text-sm text-slate-700">
                {selectedQrLink}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
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
                className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-800 transition hover:bg-slate-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}