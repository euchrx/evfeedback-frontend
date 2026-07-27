import { Plus } from "lucide-react";
import { useAdminScopeBranchId, useAdminScopeCompanyId } from "../../../hooks/useAdminScope";
import { getAdminScopeBranchId, getAdminScopeCompanyId } from "../../../services/adminScope";
import { useEffect, useMemo, useState } from "react";
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
} from "../../../services/kiosks";
import {
  canHardDelete,
  canManageOperationalModules,
  canViewOperationalModules,
  getResolvedCompanyId,
  isSuperAdmin,
} from "../../../utils/permissions";
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirmDialog } from "../../../components/ui/ConfirmDialogProvider";
import { KioskFormModal } from "./KioskFormModal";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const PAGE_SIZE = 10;

function getStatusBadgeClass(active: boolean) {
  return active
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function buildFeedbackLink(token: string) {
  return `${window.location.origin}/feedback?token=${token}`;
}

export default function KiosksPage() {
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const currentUser = getStoredUser();
  const canView = canViewOperationalModules(currentUser);
  const canManage = canManageOperationalModules(currentUser);
  const canDeletePermanently = canHardDelete(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);
  const scopeBranchId = useAdminScopeBranchId();
  const scopeCompanyId = useAdminScopeCompanyId();

  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const [listCompanyId] = useState(
    superAdmin ? scopeCompanyId : resolvedCompanyId ?? "",
  );

  const [selectedQrLink, setSelectedQrLink] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [editingKiosk, setEditingKiosk] = useState<Kiosk | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const selectedCompanyId = useMemo(() => {
    if (superAdmin) {
      return scopeCompanyId || undefined;
    }

    return resolvedCompanyId;
  }, [superAdmin, scopeCompanyId, resolvedCompanyId]);

  async function load() {
    try {
      setLoading(true);

      const requests: Promise<unknown>[] = [
        getKiosks(selectedCompanyId),
        getBranches(selectedCompanyId),
      ];

      if (superAdmin) {
        requests.push(getCompanies());
      }

      const [kiosksData, branchesData, companiesData] = await Promise.all(requests);

      setKiosks(Array.isArray(kiosksData) ? (kiosksData as Kiosk[]) : []);
      setBranches(Array.isArray(branchesData) ? (branchesData as Branch[]) : []);
      setCompanies(Array.isArray(companiesData) ? (companiesData as Company[]) : []);
    } catch {
      toast.error("Não foi possível carregar os kiosks.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload: {
    name: string;
    branchId: string;
    locationDescription?: string;
    companyId?: string;
  }) {
    if (!canManage) return;

    if (!payload.name.trim()) {
      toast.warning("Informe o nome do kiosk.");
      return;
    }

    if (!payload.branchId) {
      toast.warning("Selecione uma filial.");
      return;
    }

    const targetCompanyId = superAdmin
      ? scopeCompanyId
      : resolvedCompanyId ?? currentUser?.companyId ?? "";

    if (!targetCompanyId) {
      toast.warning("Selecione uma rede no escopo.");
      return;
    }

    try {
      setCreateLoading(true);

      await createKiosk({
        name: payload.name.trim(),
        branchId: payload.branchId,
        companyId: targetCompanyId,
        locationDescription: payload.locationDescription?.trim() || undefined,
        active: true,
      });

      setCreateOpen(false);
      toast.success("Kiosk criado com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível criar o kiosk.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUpdate(payload: {
    name: string;
    branchId: string;
    locationDescription?: string;
    companyId?: string;
  }) {
    if (!canManage || !editingKiosk) return;

    if (!payload.name.trim()) {
      toast.warning("Informe o nome do kiosk.");
      return;
    }

    if (!payload.branchId) {
      toast.warning("Selecione uma filial.");
      return;
    }

    const targetCompanyId = superAdmin
      ? scopeCompanyId
      : resolvedCompanyId ?? editingKiosk.companyId;

    if (superAdmin && !targetCompanyId) {
      toast.warning("Selecione uma rede no escopo.");
      return;
    }

    try {
      setEditLoading(true);

      await updateKiosk(
        editingKiosk.id,
        {
          name: payload.name.trim(),
          branchId: payload.branchId,
          locationDescription: payload.locationDescription?.trim() || undefined,
          companyId: targetCompanyId,
        },
        targetCompanyId,
      );

      setEditingKiosk(null);
      toast.success("Kiosk atualizado com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível atualizar o kiosk.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeactivate(kiosk: Kiosk) {
    if (!canManage) return;

    const confirmed = await confirm({
      title: "Desativar kiosk",
      description: `O kiosk "${kiosk.name}" ficará indisponível até ser reativado novamente.`,
      confirmText: "Desativar",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!confirmed) return;

    try {
      setProcessingId(kiosk.id);
      await deactivateKiosk(kiosk.id, superAdmin ? kiosk.companyId : undefined);
      toast.success("Kiosk desativado com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível desativar o kiosk.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleActivate(kiosk: Kiosk) {
    if (!canManage) return;

    try {
      setProcessingId(kiosk.id);
      await activateKiosk(kiosk.id, superAdmin ? kiosk.companyId : undefined);
      toast.success("Kiosk ativado com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível ativar o kiosk.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRegenerateToken(kiosk: Kiosk) {
    if (!canManage) return;

    const confirmed = await confirm({
      title: "Regenerar token do kiosk",
      description: `O link atual do kiosk "${kiosk.name}" deixará de funcionar imediatamente após a regeneração.`,
      confirmText: "Regenerar token",
      cancelText: "Cancelar",
      variant: "info",
    });

    if (!confirmed) return;

    try {
      setProcessingId(kiosk.id);
      await regenerateKioskToken(kiosk.id, superAdmin ? kiosk.companyId : undefined);
      toast.success("Token regenerado com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível regenerar o token do kiosk.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleHardDelete(kiosk: Kiosk) {
    if (!canDeletePermanently) return;

    const confirmed = await confirm({
      title: "Excluir kiosk",
      description: `O kiosk "${kiosk.name}" será removido definitivamente. Essa ação não poderá ser desfeita.`,
      confirmText: "Excluir kiosk",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      setProcessingId(kiosk.id);
      await hardDeleteKiosk(kiosk.id, superAdmin ? kiosk.companyId : undefined);
      toast.success("Kiosk excluído com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível excluir o kiosk.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleCopyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Token copiado com sucesso.");
    } catch {
      toast.error("Não foi possível copiar o token.");
    }
  }

  async function handleCopyLink(token: string) {
    try {
      await navigator.clipboard.writeText(buildFeedbackLink(token));
      toast.success("Link copiado com sucesso.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  function handleShowQr(token: string) {
    setSelectedQrLink(buildFeedbackLink(token));
  }


  const filteredKiosks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return kiosks.filter((kiosk) => {
      const matchesScope = !scopeBranchId || kiosk.branchId === scopeBranchId;
      const matchesSearch =
        !normalizedSearch ||
        kiosk.name.toLowerCase().includes(normalizedSearch) ||
        (kiosk.locationDescription ?? "").toLowerCase().includes(normalizedSearch) ||
        (kiosk.branch?.name ?? "").toLowerCase().includes(normalizedSearch) ||
        (kiosk.company?.name ?? "").toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && kiosk.active) ||
        (statusFilter === "INACTIVE" && !kiosk.active);

      return matchesScope && matchesSearch && matchesStatus;
    });
  }, [kiosks, search, statusFilter, scopeBranchId]);

  const totalPages = Math.max(1, Math.ceil(filteredKiosks.length / PAGE_SIZE));

  const paginatedKiosks = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredKiosks.slice(start, start + PAGE_SIZE);
  }, [filteredKiosks, page]);

  useEffect(() => {
    if (canView) {
      void load();
    } else {
      setLoading(false);
    }
  }, [canView, selectedCompanyId]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, listCompanyId]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (!canView) {
    return (
      <section className="rounded-3xl border border-rose-100 bg-white p-6 shadow-[0_18px_50px_-20px_rgba(244,63,94,0.28)]">
        <h2 className="text-xl font-semibold text-slate-900">Acesso negado</h2>
        <p className="mt-2 text-sm leading-6 text-rose-700">
          Você não tem permissão para acessar a página de kiosks.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-6">
        <div>
          <div className="w-full">
<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, local, filial ou empresa"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>

              <div className="w-full flex gap-3">
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Kiosks</h3>
              <p className="mt-1 text-sm text-slate-600">
                {loading
                  ? "Carregando dados..."
                  : `${filteredKiosks.length} kiosk(s) encontrado(s)`}
              </p>
            </div>
            {canManage ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <Plus size={18} strokeWidth={2.5} />
              Adicionar
            </button>            ) : null}

          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-600">
              Carregando kiosks...
            </div>
          ) : filteredKiosks.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto max-w-md">
                <h4 className="text-lg font-semibold text-slate-900">
                  Nenhum kiosk encontrado
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Ajuste os filtros ou cadastre um novo kiosk para iniciar a coleta de feedback.
                </p>

                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Cadastrar kiosk
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1250px] divide-y divide-white/10">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Nome
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Localização
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Filial
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Empresa
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Token
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {paginatedKiosks.map((kiosk) => {
                      const isProcessing = processingId === kiosk.id;

                      return (
                        <tr
                          key={kiosk.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-4 align-top">
                            <p className="text-sm font-semibold text-slate-900">
                              {kiosk.name}
                            </p>
                          </td>

                          <td className="px-6 py-4 align-top text-sm text-slate-600">
                            {kiosk.locationDescription ?? "-"}
                          </td>

                          <td className="px-6 py-4 align-top text-sm text-slate-600">
                            {kiosk.branch?.name ?? "-"}
                          </td>

                          <td className="px-6 py-4 align-top text-sm text-slate-600">
                            {superAdmin ? kiosk.company?.name ?? "-" : "-"}
                          </td>

                          <td className="px-6 py-4 align-top text-sm text-slate-600">
                            <div className="space-y-3">
                              <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-xs text-slate-600">
                                {kiosk.token ?? "-"}
                              </div>

                              {kiosk.token ? (
                                <div className="w-full flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void handleCopyToken(kiosk.token!)}
                                    className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
                                  >
                                    Copiar token
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void handleCopyLink(kiosk.token!)}
                                    className="inline-flex h-9 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 px-3 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
                                  >
                                    Copiar link
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleShowQr(kiosk.token!)}
                                    className="inline-flex h-9 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                                  >
                                    Ver QR
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-6 py-4 align-top">
                            <span
                              className={[
                                "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                getStatusBadgeClass(kiosk.active),
                              ].join(" ")}
                            >
                              {kiosk.active ? "Ativo" : "Inativo"}
                            </span>
                          </td>

                          <td className="px-6 py-4 align-top">
                            <div className="w-full flex flex-wrap justify-end gap-2">
                              {canManage ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingKiosk(kiosk)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Editar
                                </button>
                              ) : null}

                              {canManage && kiosk.active ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDeactivate(kiosk)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Desativar
                                </button>
                              ) : null}

                              {canManage && !kiosk.active ? (
                                <button
                                  type="button"
                                  onClick={() => void handleActivate(kiosk)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Ativar
                                </button>
                              ) : null}

                              {canManage ? (
                                <button
                                  type="button"
                                  onClick={() => void handleRegenerateToken(kiosk)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Regenerar token
                                </button>
                              ) : null}

                              {canDeletePermanently ? (
                                <button
                                  type="button"
                                  onClick={() => void handleHardDelete(kiosk)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Excluir
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="w-full flex flex-col gap-3 border-t border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  Página {page} de {totalPages}
                </p>

                <div className="w-full flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page === totalPages}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <KioskFormModal
        open={createOpen}
        mode="create"
        companies={companies}
        branches={branches}
        isSuperAdmin={superAdmin}
        defaultCompanyId={superAdmin ? getAdminScopeCompanyId() : resolvedCompanyId ?? currentUser?.companyId ?? ""}
        defaultBranchId={getAdminScopeBranchId()}
        loading={createLoading}
        onClose={() => {
          if (!createLoading) {
            setCreateOpen(false);
          }
        }}
        onSubmit={handleCreate}
      />

      <KioskFormModal
        open={!!editingKiosk}
        mode="edit"
        companies={companies}
        branches={branches}
        isSuperAdmin={superAdmin}
        defaultCompanyId={superAdmin ? getAdminScopeCompanyId() : resolvedCompanyId ?? currentUser?.companyId ?? ""}
        defaultBranchId={getAdminScopeBranchId()}
        loading={editLoading}
        initialData={
          editingKiosk
            ? {
                name: editingKiosk.name,
                branchId: editingKiosk.branchId,
                locationDescription: editingKiosk.locationDescription ?? "",
                companyId: editingKiosk.companyId ?? "",
              }
            : undefined
        }
        onClose={() => {
          if (!editLoading) {
            setEditingKiosk(null);
          }
        }}
        onSubmit={handleUpdate}
      />

      {selectedQrLink ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setSelectedQrLink(null)}
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_24px_70px_-22px_rgba(15,23,42,0.30)]">
            <div className="border-b border-slate-200 p-6">

              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
                QR Code do kiosk
              </h3>

              <p className="mt-3 break-all text-sm leading-6 text-slate-600">
                {selectedQrLink}
              </p>
            </div>

            <div className="p-6">
              <div className="w-full flex justify-center rounded-[24px] border border-slate-200 bg-white p-5">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
                    selectedQrLink,
                  )}`}
                  alt="QR Code do kiosk"
                  className="h-64 w-64 rounded-2xl"
                />
              </div>
            </div>

            <div className="w-full flex flex-col-reverse gap-3 border-t border-slate-200 p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedQrLink(null)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(selectedQrLink)}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Copiar link
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
