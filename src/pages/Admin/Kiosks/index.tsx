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
    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
    : "border-amber-400/20 bg-amber-500/10 text-amber-200";
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

  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const [listCompanyId, setListCompanyId] = useState(
    superAdmin ? "" : resolvedCompanyId ?? "",
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
      return listCompanyId || undefined;
    }

    return resolvedCompanyId;
  }, [superAdmin, listCompanyId, resolvedCompanyId]);

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
      ? payload.companyId
      : resolvedCompanyId ?? currentUser?.companyId ?? "";

    if (!targetCompanyId) {
      toast.warning("Selecione uma empresa.");
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
      ? payload.companyId
      : resolvedCompanyId ?? editingKiosk.companyId;

    if (superAdmin && !targetCompanyId) {
      toast.warning("Selecione uma empresa.");
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

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("ALL");

    if (superAdmin) {
      setListCompanyId("");
    }

    setPage(1);
  }

  const filteredKiosks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return kiosks.filter((kiosk) => {
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

      return matchesSearch && matchesStatus;
    });
  }, [kiosks, search, statusFilter]);

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
      <section className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-white">Acesso negado</h2>
        <p className="mt-2 text-sm leading-6 text-rose-100/80">
          Você não tem permissão para acessar a página de kiosks.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                gestão de kiosks
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                Dispositivos e operação
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Cadastre dispositivos, gerencie tokens de acesso e acompanhe o status operacional dos kiosks.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, local, filial ou empresa"
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>

              {superAdmin ? (
                <select
                  value={listCompanyId}
                  onChange={(event) => setListCompanyId(event.target.value)}
                  className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
                >
                  <option value="">Todas as empresas</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div />
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                >
                  Limpar
                </button>

                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Novo
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Kiosks cadastrados</h3>
              <p className="mt-1 text-sm text-slate-400">
                {loading
                  ? "Carregando dados..."
                  : `${filteredKiosks.length} kiosk(s) encontrado(s)`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">
              Carregando kiosks...
            </div>
          ) : filteredKiosks.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto max-w-md">
                <h4 className="text-lg font-semibold text-white">
                  Nenhum kiosk encontrado
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-400">
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
                  <thead className="bg-white/[0.03]">
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
                          className="transition hover:bg-white/[0.03]"
                        >
                          <td className="px-6 py-4 align-top">
                            <p className="text-sm font-semibold text-white">
                              {kiosk.name}
                            </p>
                          </td>

                          <td className="px-6 py-4 align-top text-sm text-slate-400">
                            {kiosk.locationDescription ?? "-"}
                          </td>

                          <td className="px-6 py-4 align-top text-sm text-slate-400">
                            {kiosk.branch?.name ?? "-"}
                          </td>

                          <td className="px-6 py-4 align-top text-sm text-slate-400">
                            {superAdmin ? kiosk.company?.name ?? "-" : "-"}
                          </td>

                          <td className="px-6 py-4 align-top text-sm text-slate-400">
                            <div className="space-y-3">
                              <div className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 font-mono text-xs text-slate-300">
                                {kiosk.token ?? "-"}
                              </div>

                              {kiosk.token ? (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void handleCopyToken(kiosk.token!)}
                                    className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                                  >
                                    Copiar token
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void handleCopyLink(kiosk.token!)}
                                    className="inline-flex h-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                                  >
                                    Copiar link
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleShowQr(kiosk.token!)}
                                    className="inline-flex h-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20"
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
                            <div className="flex flex-wrap justify-end gap-2">
                              {canManage ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingKiosk(kiosk)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Editar
                                </button>
                              ) : null}

                              {canManage && kiosk.active ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDeactivate(kiosk)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Desativar
                                </button>
                              ) : null}

                              {canManage && !kiosk.active ? (
                                <button
                                  type="button"
                                  onClick={() => void handleActivate(kiosk)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Ativar
                                </button>
                              ) : null}

                              {canManage ? (
                                <button
                                  type="button"
                                  onClick={() => void handleRegenerateToken(kiosk)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Regenerar token
                                </button>
                              ) : null}

                              {canDeletePermanently ? (
                                <button
                                  type="button"
                                  onClick={() => void handleHardDelete(kiosk)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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

              <div className="flex flex-col gap-3 border-t border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-400">
                  Página {page} de {totalPages}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page === totalPages}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
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
        defaultCompanyId={resolvedCompanyId ?? currentUser?.companyId ?? ""}
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
        defaultCompanyId={resolvedCompanyId ?? currentUser?.companyId ?? ""}
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
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
            onClick={() => setSelectedQrLink(null)}
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/40">
            <div className="border-b border-white/10 p-6">
              <div className="inline-flex rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                qr code
              </div>

              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                QR Code do kiosk
              </h3>

              <p className="mt-3 break-all text-sm leading-6 text-slate-400">
                {selectedQrLink}
              </p>
            </div>

            <div className="p-6">
              <div className="flex justify-center rounded-[24px] border border-white/10 bg-white p-5">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
                    selectedQrLink,
                  )}`}
                  alt="QR Code do kiosk"
                  className="h-64 w-64 rounded-2xl"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedQrLink(null)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
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