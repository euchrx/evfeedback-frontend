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
  updateKiosk,
  type Kiosk,
  type EnvironmentType,
} from "../../../services/kiosks";
import {
  canHardDelete,
  canManageOperationalModules,
  canViewOperationalModules,
  getResolvedCompanyId,
  isSuperAdmin,
} from "../../../utils/permissions";

type EditingState = {
  id: string;
  name: string;
  branchId: string;
  locationDescription: string;
  environmentType: EnvironmentType;
  companyId?: string;
} | null;

type EnvironmentFilter = "ALL" | EnvironmentType;

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
  const [environmentType, setEnvironmentType] =
    useState<EnvironmentType>("POSTO");
  const [companyId, setCompanyId] = useState(resolvedCompanyId ?? "");
  const [showInactive, setShowInactive] = useState(true);
  const [environmentFilter, setEnvironmentFilter] =
    useState<EnvironmentFilter>("ALL");
  const [selectedQrLink, setSelectedQrLink] = useState<string | null>(null);

  const [editing, setEditing] = useState<EditingState>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const feedbackBaseUrl = useMemo(() => {
    return `${window.location.origin}/feedback`;
  }, []);

  const selectedCompanyId = useMemo(() => {
    return superAdmin ? companyId || undefined : resolvedCompanyId;
  }, [superAdmin, companyId, resolvedCompanyId]);

  const visibleKiosks = useMemo(() => {
    const base = showInactive ? kiosks : kiosks.filter((kiosk) => kiosk.active);

    if (environmentFilter === "ALL") {
      return base;
    }

    return base.filter((kiosk) => kiosk.environmentType === environmentFilter);
  }, [kiosks, showInactive, environmentFilter]);

  const filteredBranches = useMemo(() => {
    if (!superAdmin) return branches;
    if (!selectedCompanyId) return [];
    return branches.filter((branch) => branch.companyId === selectedCompanyId);
  }, [branches, selectedCompanyId, superAdmin]);

  const editingBranches = useMemo(() => {
    if (!editing) return [];

    if (!superAdmin) return branches;

    if (!editing.companyId) return [];

    return branches.filter((branch) => branch.companyId === editing.companyId);
  }, [branches, editing, superAdmin]);

  function getEnvironmentLabel(environment: EnvironmentType) {
    switch (environment) {
      case "POSTO":
        return "Posto";
      case "CONVENIENCIA":
        return "Conveniência";
      case "RESTAURANTE":
        return "Restaurante";
      default:
        return environment;
    }
  }

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
        environmentType,
        active: true,
      });

      setName("");
      setBranchId("");
      setLocationDescription("");
      setEnvironmentType("POSTO");

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

  function handleStartEdit(kiosk: Kiosk) {
    setEditing({
      id: kiosk.id,
      name: kiosk.name ?? "",
      branchId: kiosk.branchId ?? "",
      locationDescription: kiosk.locationDescription ?? "",
      environmentType: kiosk.environmentType ?? "POSTO",
      companyId: kiosk.companyId,
    });
  }

  function handleCancelEdit() {
    setEditing(null);
  }

  async function handleSaveEdit(kiosk: Kiosk) {
    if (!canManage || !editing) return;

    if (!editing.name.trim()) {
      setError("Informe o nome do kiosk.");
      return;
    }

    if (!editing.branchId) {
      setError("Selecione uma filial para o kiosk.");
      return;
    }

    try {
      setSavingEdit(true);
      setError("");

      await updateKiosk(kiosk.id, {
        name: editing.name.trim(),
        branchId: editing.branchId,
        locationDescription: editing.locationDescription.trim() || "",
        environmentType: editing.environmentType,
        companyId: superAdmin ? editing.companyId : resolvedCompanyId,
      });

      setEditing(null);
      await load();
    } catch {
      setError("Não foi possível atualizar o kiosk.");
    } finally {
      setSavingEdit(false);
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

  useEffect(() => {
    if (!editing || !superAdmin) return;

    if (!editing.companyId) return;

    const stillExists = branches.some(
      (branch) =>
        branch.id === editing.branchId && branch.companyId === editing.companyId
    );

    if (!stillExists) {
      setEditing((prev) => (prev ? { ...prev, branchId: "" } : prev));
    }
  }, [branches, editing, superAdmin]);

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

          <div className="grid gap-4 md:grid-cols-6">
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
              value={environmentType}
              onChange={(e) =>
                setEnvironmentType(e.target.value as EnvironmentType)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
            >
              <option value="POSTO">Posto</option>
              <option value="CONVENIENCIA">Conveniência</option>
              <option value="RESTAURANTE">Restaurante</option>
            </select>

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
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Kiosks cadastrados
            </h2>
            <p className="text-sm text-slate-500">
              {visibleKiosks.length} item(ns)
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <select
              value={environmentFilter}
              onChange={(e) =>
                setEnvironmentFilter(e.target.value as EnvironmentFilter)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-sky-500"
            >
              <option value="ALL">Todos os ambientes</option>
              <option value="POSTO">Posto</option>
              <option value="CONVENIENCIA">Conveniência</option>
              <option value="RESTAURANTE">Restaurante</option>
            </select>

            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Mostrar inativos
            </label>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Carregando kiosks...
          </div>
        ) : visibleKiosks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Nenhum kiosk cadastrado para o filtro selecionado.
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleKiosks.map((kiosk) => {
              const link = `${feedbackBaseUrl}?token=${kiosk.token}`;
              const isProcessing = processingId === kiosk.id;
              const isEditing = editing?.id === kiosk.id;

              return (
                <article
                  key={kiosk.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3 flex-1">
                      {isEditing ? (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <input
                            value={editing.name}
                            onChange={(e) =>
                              setEditing((prev) =>
                                prev ? { ...prev, name: e.target.value } : prev
                              )
                            }
                            placeholder="Nome do kiosk"
                            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                          />

                          <input
                            value={editing.locationDescription}
                            onChange={(e) =>
                              setEditing((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      locationDescription: e.target.value,
                                    }
                                  : prev
                              )
                            }
                            placeholder="Localização/descrição"
                            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                          />

                          <select
                            value={editing.environmentType}
                            onChange={(e) =>
                              setEditing((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      environmentType: e.target
                                        .value as EnvironmentType,
                                    }
                                  : prev
                              )
                            }
                            className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
                          >
                            <option value="POSTO">Posto</option>
                            <option value="CONVENIENCIA">Conveniência</option>
                            <option value="RESTAURANTE">Restaurante</option>
                          </select>

                          <select
                            value={editing.branchId}
                            onChange={(e) =>
                              setEditing((prev) =>
                                prev
                                  ? { ...prev, branchId: e.target.value }
                                  : prev
                              )
                            }
                            className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
                          >
                            <option value="">Selecione a filial</option>
                            {(superAdmin ? editingBranches : branches).map(
                              (branch) => (
                                <option key={branch.id} value={branch.id}>
                                  {branch.name}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {kiosk.name}
                          </h3>

                          <div className="space-y-1 text-sm text-slate-600">
                            <p>Empresa: {kiosk.company?.name ?? "-"}</p>
                            <p>Filial: {kiosk.branch?.name ?? "Sem filial"}</p>
                            <p>
                              Ambiente: {getEnvironmentLabel(kiosk.environmentType)}
                            </p>
                            <p>Local: {kiosk.locationDescription || "-"}</p>
                            <p>Status: {kiosk.active ? "Ativo" : "Inativo"}</p>
                          </div>
                        </>
                      )}

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
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(kiosk)}
                            disabled={savingEdit}
                            className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingEdit ? "Salvando..." : "Salvar"}
                          </button>

                          <button
                            onClick={handleCancelEdit}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
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
                                onClick={() => handleStartEdit(kiosk)}
                                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
                              >
                                Editar
                              </button>

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
                        </>
                      )}
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