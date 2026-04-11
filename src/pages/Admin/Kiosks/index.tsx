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

type EditingState = {
  id: string;
  name: string;
  branchId: string;
  locationDescription: string;
  companyId?: string;
} | null;

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const PAGE_SIZE = 10;

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
  const [createCompanyId, setCreateCompanyId] = useState(
    superAdmin ? "" : resolvedCompanyId ?? "",
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const [selectedQrLink, setSelectedQrLink] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [error, setError] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const feedbackBaseUrl = useMemo(() => {
    return `${window.location.origin}/feedback`;
  }, []);

  // Listagem global para SUPER_ADMIN; escopo fixo só para usuários vinculados.
  const selectedCompanyId = useMemo(() => {
    return superAdmin ? undefined : resolvedCompanyId;
  }, [superAdmin, resolvedCompanyId]);

  const createBranches = useMemo(() => {
    if (!superAdmin) return branches;
    if (!createCompanyId) return [];
    return branches.filter((branch) => branch.companyId === createCompanyId);
  }, [branches, createCompanyId, superAdmin]);

  const editingBranches = useMemo(() => {
    if (!editing) return [];
    if (!superAdmin) return branches;
    if (!editing.companyId) return [];
    return branches.filter((branch) => branch.companyId === editing.companyId);
  }, [branches, editing, superAdmin]);

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

  const currentPageIds = useMemo(
    () => paginatedKiosks.map((kiosk) => kiosk.id),
    [paginatedKiosks],
  );

  const allCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.includes(id));

  const someCurrentPageSelected =
    currentPageIds.some((id) => selectedIds.includes(id)) &&
    !allCurrentPageSelected;

  function handleToggleOne(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function handleTogglePage(ids: string[]) {
    const allSelected = ids.every((id) => selectedIds.includes(id));

    setSelectedIds((current) => {
      if (allSelected) {
        return current.filter((id) => !ids.includes(id));
      }

      const merged = new Set([...current, ...ids]);
      return Array.from(merged);
    });
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

      const [kiosksData, branchesData, companiesData] = await Promise.all(requests);

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

    const targetCompanyId = superAdmin ? createCompanyId : resolvedCompanyId ?? "";

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
        setCreateCompanyId("");
      }

      setPage(1);
      setSelectedIds([]);
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

    const confirmed = window.confirm(`Deseja desativar o kiosk "${kiosk.name}"?`);
    if (!confirmed) return;

    try {
      setProcessingId(kiosk.id);
      setError("");
      await deactivateKiosk(kiosk.id, superAdmin ? kiosk.companyId : undefined);
      await load();
      setSelectedIds((current) => current.filter((id) => id !== kiosk.id));
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
      await activateKiosk(kiosk.id, superAdmin ? kiosk.companyId : undefined);
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
      `Deseja regenerar o token do kiosk "${kiosk.name}"? O link antigo deixará de funcionar.`,
    );
    if (!confirmed) return;

    try {
      setProcessingId(kiosk.id);
      setError("");
      await regenerateKioskToken(kiosk.id, superAdmin ? kiosk.companyId : undefined);
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
      `Excluir definitivamente o kiosk "${kiosk.name}"? Essa ação não poderá ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      setProcessingId(kiosk.id);
      setError("");
      await hardDeleteKiosk(kiosk.id, superAdmin ? kiosk.companyId : undefined);
      await load();
      setSelectedIds((current) => current.filter((id) => id !== kiosk.id));
    } catch {
      setError("Não foi possível excluir definitivamente o kiosk.");
    } finally {
      setProcessingId(null);
    }
  }

  const selectedKiosks = useMemo(
    () => kiosks.filter((kiosk) => selectedIds.includes(kiosk.id)),
    [kiosks, selectedIds],
  );

  async function handleBulkDelete() {
    if (!canDeletePermanently || selectedKiosks.length === 0) return;

    const confirmed = window.confirm(
      `Excluir definitivamente ${selectedKiosks.length} kiosk(s) selecionado(s)? Essa ação não poderá ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      setBulkDeleting(true);
      setError("");

      const results = await Promise.allSettled(
        selectedKiosks.map((kiosk) =>
          hardDeleteKiosk(kiosk.id, superAdmin ? kiosk.companyId : undefined),
        ),
      );

      const failedCount = results.filter((result) => result.status === "rejected").length;

      await load();

      if (failedCount > 0) {
        const successCount = selectedKiosks.length - failedCount;
        setError(
          successCount > 0
            ? `${failedCount} de ${selectedKiosks.length} kiosk(s) selecionado(s) não puderam ser excluídos.`
            : `Não foi possível excluir os ${selectedKiosks.length} kiosk(s) selecionado(s).`,
        );
      }
    } catch {
      setError("Não foi possível concluir a exclusão em massa dos kiosks.");
    } finally {
      setBulkDeleting(false);
      setSelectedIds([]);
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

  function getQrImageUrl(value: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      value,
    )}`;
  }

  function handleShowQr(token: string) {
    const link = `${feedbackBaseUrl}?token=${token}`;
    setSelectedQrLink(link);
  }

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setPage(1);
    setSelectedIds([]);
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
      const branchStillExists = createBranches.some((branch) => branch.id === branchId);
      if (!branchStillExists) {
        setBranchId("");
      }
    }
  }, [createBranches, branchId, superAdmin]);

  useEffect(() => {
    if (!editing || !superAdmin) return;
    if (!editing.companyId) return;

    const stillExists = branches.some(
      (branch) =>
        branch.id === editing.branchId && branch.companyId === editing.companyId,
    );

    if (!stillExists) {
      setEditing((prev) => (prev ? { ...prev, branchId: "" } : prev));
    }
  }, [branches, editing, superAdmin]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    setSelectedIds([]);
  }, [search, statusFilter, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (!canView) {
    return (
      <section className="space-y-4">
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
    <>
      <section className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Kiosks
          </h1>
          <p className="text-slate-600">
            Cadastre tablets e controle o status de operação.
          </p>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {canManage ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Novo kiosk</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do kiosk"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />

              <input
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                placeholder="Localização"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />

              <select
                value={createCompanyId}
                onChange={(e) => setCreateCompanyId(e.target.value)}
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
                  <option value={currentUser?.companyId ?? ""}>Empresa atual</option>
                )}
              </select>

              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
              >
                <option value="">Selecione a filial</option>
                {createBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={handleCreate}
                disabled={submitting}
                className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
              >
                {submitting ? "Criando..." : "Criar kiosk"}
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Kiosks cadastrados
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading ? "Carregando..." : `${filteredKiosks.length} item(ns)`}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, local, filial ou empresa"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>

              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Limpar filtros
              </button>
            </div>
          </div>

          {selectedIds.length > 0 ? (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium text-slate-700">
                {selectedIds.length} selecionado(s)
              </span>

              <div className="flex flex-wrap gap-2">
                {canDeletePermanently ? (
                  <button
                    type="button"
                    onClick={() => void handleBulkDelete()}
                    disabled={bulkDeleting}
                    className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:opacity-60"
                  >
                    {bulkDeleting ? "Excluindo..." : "Excluir selecionados"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  disabled={bulkDeleting}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Limpar seleção
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            {loading ? (
              <div className="px-6 py-10 text-center text-slate-500">
                Carregando kiosks...
              </div>
            ) : filteredKiosks.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-500">
                Nenhum kiosk encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1350px] divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = someCurrentPageSelected;
                            }
                          }}
                          type="checkbox"
                          checked={allCurrentPageSelected}
                          onChange={() => handleTogglePage(currentPageIds)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Localização
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Filial
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Empresa
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Token
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paginatedKiosks.map((kiosk) => {
                      const isEditing = editing?.id === kiosk.id;
                      const isProcessing = processingId === kiosk.id;

                      return (
                        <tr key={kiosk.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-4 align-top">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(kiosk.id)}
                              onChange={() => handleToggleOne(kiosk.id)}
                              className="mt-2 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                          </td>

                          <td className="px-4 py-4 align-top text-sm text-slate-700">
                            {isEditing ? (
                              <input
                                value={editing?.name ?? ""}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, name: e.target.value } : prev,
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500"
                              />
                            ) : (
                              <span className="font-medium text-slate-900">
                                {kiosk.name}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 align-top text-sm text-slate-600">
                            {isEditing ? (
                              <input
                                value={editing?.locationDescription ?? ""}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev
                                      ? {
                                        ...prev,
                                        locationDescription: e.target.value,
                                      }
                                      : prev,
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500"
                              />
                            ) : (
                              kiosk.locationDescription ?? "-"
                            )}
                          </td>

                          <td className="px-4 py-4 align-top text-sm text-slate-600">
                            {isEditing ? (
                              <select
                                value={editing?.branchId ?? ""}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, branchId: e.target.value } : prev,
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-sky-500"
                              >
                                <option value="">Selecione a filial</option>
                                {editingBranches.map((branch) => (
                                  <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              kiosk.branch?.name ?? "-"
                            )}
                          </td>

                          <td className="px-4 py-4 align-top text-sm text-slate-600">
                            {superAdmin ? kiosk.company?.name ?? "-" : "-"}
                          </td>

                          <td className="px-4 py-4 align-top text-sm text-slate-600">
                            <div className="space-y-2">
                              <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-mono text-slate-700">
                                {kiosk.token ?? "-"}
                              </div>

                              {kiosk.token ? (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void handleCopyToken(kiosk.token!)}
                                    className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
                                  >
                                    Copiar token
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void handleCopyLink(kiosk.token!)}
                                    className="rounded-lg bg-sky-100 px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-200"
                                  >
                                    Copiar link
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleShowQr(kiosk.token!)}
                                    className="rounded-lg bg-violet-100 px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-200"
                                  >
                                    Ver QR
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top text-sm">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${kiosk.active
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                                }`}
                            >
                              {kiosk.active ? "Ativo" : "Inativo"}
                            </span>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-wrap justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(kiosk)}
                                    disabled={savingEdit}
                                    className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-60"
                                  >
                                    {savingEdit ? "Salvando..." : "Salvar"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <>
                                  {canManage ? (
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(kiosk)}
                                      className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200"
                                    >
                                      Editar
                                    </button>
                                  ) : null}

                                  {canManage && kiosk.active ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDeactivate(kiosk)}
                                      disabled={isProcessing}
                                      className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-60"
                                    >
                                      Desativar
                                    </button>
                                  ) : null}

                                  {canManage && !kiosk.active ? (
                                    <button
                                      type="button"
                                      onClick={() => handleActivate(kiosk)}
                                      disabled={isProcessing}
                                      className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-60"
                                    >
                                      Ativar
                                    </button>
                                  ) : null}

                                  {canManage ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRegenerateToken(kiosk)}
                                      disabled={isProcessing}
                                      className="rounded-lg bg-violet-100 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-200 disabled:opacity-60"
                                    >
                                      Regenerar token
                                    </button>
                                  ) : null}

                                  {canDeletePermanently ? (
                                    <button
                                      type="button"
                                      onClick={() => handleHardDelete(kiosk)}
                                      disabled={isProcessing || bulkDeleting}
                                      className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-200 disabled:opacity-60"
                                    >
                                      Excluir
                                    </button>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!loading && filteredKiosks.length > 0 ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Página {page} de {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  Anterior
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page === totalPages}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </section>

      {selectedQrLink ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">QR Code do kiosk</h3>
            <p className="mt-2 break-all text-sm text-slate-500">{selectedQrLink}</p>

            <div className="mt-5 flex justify-center">
              <img
                src={getQrImageUrl(selectedQrLink)}
                alt="QR Code do kiosk"
                className="h-64 w-64 rounded-2xl border border-slate-200"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(selectedQrLink)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Copiar link
              </button>

              <button
                type="button"
                onClick={() => setSelectedQrLink(null)}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
