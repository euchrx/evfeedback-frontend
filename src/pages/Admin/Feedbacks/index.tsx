import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import {
  deleteFeedback,
  getFeedbacks,
  type FeedbackFilters,
  type FeedbackItem,
} from "../../../services/feedbacks";
import { getBranches, type Branch } from "../../../services/branches";
import { getKiosks, type Kiosk } from "../../../services/kiosks";
import { getCompanies, type Company } from "../../../services/companies";
import { getStoredUser } from "../../../services/auth";
import {
  canManageOperationalModules,
  canViewOperationalModules,
  getResolvedCompanyId,
  isSuperAdmin,
} from "../../../utils/permissions";

const PAGE_SIZE = 10;

function getRatingLabel(rating: number) {
  switch (rating) {
    case 1:
      return "Péssimo";
    case 2:
      return "Ruim";
    case 3:
      return "Ok";
    case 4:
      return "Bom";
    case 5:
      return "Excelente";
    default:
      return `${rating}`;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function hasContactInfo(feedback: FeedbackItem) {
  return Boolean(
    feedback.email?.trim() ||
      feedback.contactName?.trim() ||
      feedback.contactPhone?.trim() ||
      feedback.contactMessage?.trim() ||
      feedback.contactConsent,
  );
}

export default function FeedbacksPage() {
  const currentUser = getStoredUser();
  const canView = canViewOperationalModules(currentUser);
  const canManage = canManageOperationalModules(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(
    null,
  );

  const [filters, setFilters] = useState<FeedbackFilters>({
    companyId: superAdmin ? "" : resolvedCompanyId ?? "",
    branchId: "",
    kioskId: "",
    rating: "",
    startDate: "",
    endDate: "",
    active: "",
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedCompanyId = useMemo(() => {
    return superAdmin ? filters.companyId || undefined : resolvedCompanyId;
  }, [superAdmin, filters.companyId, resolvedCompanyId]);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    void loadDependencies();
  }, [canView, selectedCompanyId]);

  useEffect(() => {
    if (!canView) return;
    void loadFeedbacks(filters);
  }, [canView]);

  async function loadDependencies() {
    try {
      setError("");

      const requests: Promise<unknown>[] = [
        getBranches(selectedCompanyId),
        getKiosks(selectedCompanyId),
      ];

      if (superAdmin) {
        requests.unshift(getCompanies());
      }

      const results = await Promise.all(requests);

      if (superAdmin) {
        const [companiesData, branchesData, kiosksData] = results;
        setCompanies(Array.isArray(companiesData) ? (companiesData as Company[]) : []);
        setBranches(Array.isArray(branchesData) ? (branchesData as Branch[]) : []);
        setKiosks(Array.isArray(kiosksData) ? (kiosksData as Kiosk[]) : []);
      } else {
        const [branchesData, kiosksData] = results;
        setCompanies([]);
        setBranches(Array.isArray(branchesData) ? (branchesData as Branch[]) : []);
        setKiosks(Array.isArray(kiosksData) ? (kiosksData as Kiosk[]) : []);
      }
    } catch {
      setError("Não foi possível carregar os filtros auxiliares.");
      setCompanies([]);
      setBranches([]);
      setKiosks([]);
    }
  }

  async function loadFeedbacks(customFilters?: FeedbackFilters) {
    try {
      setLoading(true);
      setError("");

      const finalFilters = customFilters ?? filters;

      const sanitizedFilters: FeedbackFilters = {
        companyId: superAdmin
          ? finalFilters.companyId || undefined
          : resolvedCompanyId,
        branchId: finalFilters.branchId || undefined,
        kioskId: finalFilters.kioskId || undefined,
        rating: finalFilters.rating || undefined,
        startDate: finalFilters.startDate || undefined,
        endDate: finalFilters.endDate || undefined,
        active: finalFilters.active || undefined,
      };

      const data = await getFeedbacks(sanitizedFilters);
      setFeedbacks(Array.isArray(data) ? data : []);
    } catch {
      setError("Não foi possível carregar os feedbacks.");
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  }

  function handleChangeFilter<K extends keyof FeedbackFilters>(
    field: K,
    value: FeedbackFilters[K],
  ) {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "companyId"
        ? {
            branchId: "",
            kioskId: "",
          }
        : {}),
    }));
  }

  function handleApplyFilters() {
    setPage(1);
    setSelectedIds([]);
    void loadFeedbacks(filters);
  }

  function handleClearFilters() {
    const cleared: FeedbackFilters = {
      companyId: superAdmin ? "" : resolvedCompanyId ?? "",
      branchId: "",
      kioskId: "",
      rating: "",
      startDate: "",
      endDate: "",
      active: "",
    };

    setFilters(cleared);
    setSearch("");
    setPage(1);
    setSelectedIds([]);
    void loadDependencies();
    void loadFeedbacks(cleared);
  }

  async function handleDelete(feedback: FeedbackItem) {
    if (!canManage) return;

    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este feedback? Esta ação não pode ser desfeita.",
    );
    if (!confirmed) return;

    try {
      setDeletingId(feedback.id);
      setError("");

      const companyId = superAdmin
        ? feedback.companyId || filters.companyId || undefined
        : resolvedCompanyId || undefined;

      await deleteFeedback(feedback.id, companyId);

      setFeedbacks((current) => current.filter((item) => item.id !== feedback.id));

      if (selectedFeedback?.id === feedback.id) {
        setSelectedFeedback(null);
      }

      setSelectedIds((current) => current.filter((id) => id !== feedback.id));
    } catch {
      setError("Não foi possível excluir o feedback.");
    } finally {
      setDeletingId(null);
    }
  }

  const selectedFeedbacks = useMemo(
    () => feedbacks.filter((feedback) => selectedIds.includes(feedback.id)),
    [feedbacks, selectedIds],
  );

  async function handleBulkDelete() {
    if (!canManage || selectedFeedbacks.length === 0) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir ${selectedFeedbacks.length} feedback(s) selecionado(s)? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      setBulkDeleting(true);
      setError("");

      const results = await Promise.allSettled(
        selectedFeedbacks.map((feedback) => {
          const companyId = superAdmin
            ? feedback.companyId || filters.companyId || undefined
            : resolvedCompanyId || undefined;

          return deleteFeedback(feedback.id, companyId);
        }),
      );

      const failedCount = results.filter((result) => result.status === "rejected").length;
      const successIds = selectedFeedbacks
        .filter((_, index) => results[index]?.status === "fulfilled")
        .map((feedback) => feedback.id);

      if (successIds.includes(selectedFeedback?.id ?? "")) {
        setSelectedFeedback(null);
      }

      await loadFeedbacks(filters);

      if (failedCount > 0) {
        const successCount = selectedFeedbacks.length - failedCount;
        setError(
          successCount > 0
            ? `${failedCount} de ${selectedFeedbacks.length} feedback(s) selecionado(s) não puderam ser excluídos.`
            : `Não foi possível excluir os ${selectedFeedbacks.length} feedback(s) selecionado(s).`,
        );
      }
    } catch {
      setError("Não foi possível concluir a exclusão em massa dos feedbacks.");
    } finally {
      setBulkDeleting(false);
      setSelectedIds([]);
    }
  }

  const filteredFeedbacks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return feedbacks;

    return feedbacks.filter((feedback) => {
      const tagsText = (feedback.tags ?? [])
        .map((item) => item.tag?.name ?? "")
        .join(" ")
        .toLowerCase();

      return (
        (feedback.comment ?? "").toLowerCase().includes(normalizedSearch) ||
        (feedback.email ?? "").toLowerCase().includes(normalizedSearch) ||
        (feedback.company?.name ?? "").toLowerCase().includes(normalizedSearch) ||
        (feedback.branch?.name ?? "").toLowerCase().includes(normalizedSearch) ||
        (feedback.kiosk?.name ?? "").toLowerCase().includes(normalizedSearch) ||
        (feedback.contactName ?? "").toLowerCase().includes(normalizedSearch) ||
        (feedback.contactPhone ?? "").toLowerCase().includes(normalizedSearch) ||
        (feedback.contactMessage ?? "").toLowerCase().includes(normalizedSearch) ||
        tagsText.includes(normalizedSearch)
      );
    });
  }, [feedbacks, search]);

  const totalPages = Math.max(1, Math.ceil(filteredFeedbacks.length / PAGE_SIZE));

  const paginatedFeedbacks = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredFeedbacks.slice(start, start + PAGE_SIZE);
  }, [filteredFeedbacks, page]);

  const currentPageIds = useMemo(
    () => paginatedFeedbacks.map((feedback) => feedback.id),
    [paginatedFeedbacks],
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

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setSelectedIds([]);
  }, [search, page]);

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
          Você não tem permissão para acessar a página de feedbacks.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Feedbacks
          </h1>
          <p className="text-slate-600">
            Acompanhe as avaliações enviadas pelos clientes.
          </p>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">Filtros</h2>
            <p className="text-sm text-slate-500">
              Refine os resultados por empresa, nota, filial, kiosk, período e status.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {superAdmin ? (
              <select
                value={filters.companyId ?? ""}
                onChange={(e) => handleChangeFilter("companyId", e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
              >
                <option value="">Todas as empresas</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            ) : null}

            <select
              value={filters.rating ?? ""}
              onChange={(e) => handleChangeFilter("rating", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
            >
              <option value="">Todas as notas</option>
              <option value="1">1 - Péssimo</option>
              <option value="2">2 - Ruim</option>
              <option value="3">3 - Ok</option>
              <option value="4">4 - Bom</option>
              <option value="5">5 - Excelente</option>
            </select>

            <select
              value={filters.branchId ?? ""}
              onChange={(e) => handleChangeFilter("branchId", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
            >
              <option value="">Todas as filiais</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

            <select
              value={filters.kioskId ?? ""}
              onChange={(e) => handleChangeFilter("kioskId", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
            >
              <option value="">Todos os kiosks</option>
              {kiosks.map((kiosk) => (
                <option key={kiosk.id} value={kiosk.id}>
                  {kiosk.name}
                </option>
              ))}
            </select>

            <select
              value={filters.active ?? ""}
              onChange={(e) => handleChangeFilter("active", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
            >
              <option value="">Todos os status</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>

            <input
              type="date"
              value={filters.startDate ?? ""}
              onChange={(e) => handleChangeFilter("startDate", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />

            <input
              type="date"
              value={filters.endDate ?? ""}
              onChange={(e) => handleChangeFilter("endDate", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por comentário, e-mail, filial, kiosk, contato ou tag"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />

            <button
              type="button"
              onClick={handleApplyFilters}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Aplicar filtros
            </button>

            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Limpar
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Lista de feedbacks
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading ? "Carregando..." : `${filteredFeedbacks.length} item(ns)`}
              </p>
            </div>
          </div>

          {selectedIds.length > 0 ? (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium text-slate-700">
                {selectedIds.length} selecionado(s)
              </span>

              <div className="flex flex-wrap gap-2">
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => void handleBulkDelete()}
                    disabled={bulkDeleting}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                Carregando feedbacks...
              </div>
            ) : filteredFeedbacks.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-500">
                Nenhum feedback encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1260px] divide-y divide-slate-200">
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
                        Data
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Nota
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Empresa
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Filial
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Kiosk
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Comentário
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tags
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paginatedFeedbacks.map((feedback) => (
                      <tr key={feedback.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(feedback.id)}
                            onChange={() => handleToggleOne(feedback.id)}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {formatDate(feedback.createdAt)}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {feedback.rating} - {getRatingLabel(feedback.rating)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {feedback.company?.name ?? "-"}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {feedback.branch?.name ?? "-"}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {feedback.kiosk?.name ?? "-"}
                        </td>

                        <td className="max-w-[260px] px-4 py-4 text-sm text-slate-600">
                          <span className="line-clamp-2">
                            {feedback.comment?.trim() || "Sem comentário."}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {(Array.isArray(feedback.tags) ? feedback.tags : []).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {feedback.tags!.map((item) => (
                                <span
                                  key={item.id}
                                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                                >
                                  {item.tag?.name ?? "Tag"}
                                </span>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedFeedback(feedback)}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                              title="Ver detalhes"
                            >
                              <Eye size={18} />
                            </button>

                            {canManage ? (
                              <button
                                type="button"
                                onClick={() => handleDelete(feedback)}
                                disabled={deletingId === feedback.id || bulkDeleting}
                                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingId === feedback.id ? "Excluindo..." : "Excluir"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!loading && filteredFeedbacks.length > 0 ? (
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

      {selectedFeedback ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Detalhes do feedback
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Visualize todas as informações do registro.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Dados gerais
                </h3>

                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold">Data:</span>{" "}
                    {formatDate(selectedFeedback.createdAt)}
                  </p>
                  <p>
                    <span className="font-semibold">Nota:</span>{" "}
                    {selectedFeedback.rating} -{" "}
                    {getRatingLabel(selectedFeedback.rating)}
                  </p>
                  {superAdmin ? (
                    <p>
                      <span className="font-semibold">Empresa:</span>{" "}
                      {selectedFeedback.company?.name ?? "-"}
                    </p>
                  ) : null}
                  <p>
                    <span className="font-semibold">Filial:</span>{" "}
                    {selectedFeedback.branch?.name ?? "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Kiosk:</span>{" "}
                    {selectedFeedback.kiosk?.name ?? "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Contato
                </h3>

                {hasContactInfo(selectedFeedback) ? (
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold">E-mail:</span>{" "}
                      {selectedFeedback.email?.trim() || "-"}
                    </p>
                    <p>
                      <span className="font-semibold">Nome:</span>{" "}
                      {selectedFeedback.contactName?.trim() || "-"}
                    </p>
                    <p>
                      <span className="font-semibold">Telefone:</span>{" "}
                      {selectedFeedback.contactPhone?.trim() || "-"}
                    </p>
                    <p>
                      <span className="font-semibold">Mensagem:</span>{" "}
                      {selectedFeedback.contactMessage?.trim() || "-"}
                    </p>
                    <p>
                      <span className="font-semibold">Consentimento:</span>{" "}
                      {selectedFeedback.contactConsent ? "Sim" : "Não"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    Nenhuma informação de contato registrada.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 md:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Comentário
                </h3>
                <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">
                  {selectedFeedback.comment?.trim() || "Sem comentário."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 md:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Tags
                </h3>

                {(selectedFeedback.tags ?? []).length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedFeedback.tags!.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {item.tag?.name ?? "Tag"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    Nenhuma tag marcada.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}