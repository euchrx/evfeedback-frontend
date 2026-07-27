import { useAdminScopeBranchId, useAdminScopeCompanyId } from "../../../hooks/useAdminScope";
import { NO_BRANCH_SCOPE } from "../../../services/adminScope";
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
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirmDialog } from "../../../components/ui/ConfirmDialogProvider";

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

function getRatingBadgeClass(rating: number) {
  switch (rating) {
    case 1:
      return "border-rose-200 bg-rose-50 text-rose-700";
    case 2:
      return "border-orange-400/20 bg-orange-500/10 text-orange-200";
    case 3:
      return "border-amber-200 bg-amber-50 text-amber-700";
    case 4:
      return "border-sky-400/20 bg-sky-500/10 text-sky-200";
    case 5:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-white text-slate-700";
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
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const currentUser = getStoredUser();
  const canView = canViewOperationalModules(currentUser);
  const canManage = canManageOperationalModules(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);
  const scopeBranchId = useAdminScopeBranchId();
  const scopeCompanyId = useAdminScopeCompanyId();

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [, setCompanies] = useState<Company[]>([]);

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(
    null,
  );

  const [filters, setFilters] = useState<FeedbackFilters>({
    companyId: superAdmin ? scopeCompanyId : resolvedCompanyId ?? "",
    branchId: scopeBranchId,
    kioskId: "",
    rating: "",
    startDate: "",
    endDate: "",
    active: "",
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const selectedCompanyId = useMemo(() => {
    return superAdmin ? scopeCompanyId || undefined : resolvedCompanyId;
  }, [superAdmin, scopeCompanyId, resolvedCompanyId]);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    void loadDependencies();
  }, [canView, selectedCompanyId]);

  useEffect(() => {
    if (!canView) return;
    const scopedFilters = {
      ...filters,
      branchId: scopeBranchId,
      kioskId: scopeBranchId ? "" : filters.kioskId,
    };
    setFilters(scopedFilters);
    void loadFeedbacks(scopedFilters);
  }, [canView, scopeBranchId]);

  async function loadDependencies() {
    try {
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
      toast.error("Não foi possível carregar os filtros auxiliares.");
      setCompanies([]);
      setBranches([]);
      setKiosks([]);
    }
  }

  async function loadFeedbacks(customFilters?: FeedbackFilters) {
    try {
      setLoading(true);

      if (superAdmin && scopeBranchId === NO_BRANCH_SCOPE) {
        setFeedbacks([]);
        return;
      }

      const finalFilters = customFilters ?? filters;

      const sanitizedFilters: FeedbackFilters = {
        companyId: superAdmin
          ? scopeCompanyId || undefined
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
      toast.error("Não foi possível carregar os feedbacks.");
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
          branchId: scopeBranchId,
          kioskId: "",
        }
        : {}),
    }));
  }

  function handleApplyFilters() {
    setPage(1);
    void loadFeedbacks(filters);
  }


  async function handleDelete(feedback: FeedbackItem) {
    if (!canManage) return;

    const confirmed = await confirm({
      title: "Excluir feedback",
      description:
        "Esse feedback será removido definitivamente. Essa ação não poderá ser desfeita.",
      confirmText: "Excluir feedback",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      setProcessingId(feedback.id);

      const companyId = superAdmin
        ? feedback.companyId || filters.companyId || undefined
        : resolvedCompanyId || undefined;

      await deleteFeedback(feedback.id, companyId);

      setFeedbacks((current) => current.filter((item) => item.id !== feedback.id));

      if (selectedFeedback?.id === feedback.id) {
        setSelectedFeedback(null);
      }

      toast.success("Feedback excluído com sucesso.");
    } catch {
      toast.error("Não foi possível excluir o feedback.");
    } finally {
      setProcessingId(null);
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

  useEffect(() => {
    setPage(1);
  }, [search]);

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
          Você não tem permissão para acessar a página de feedbacks.
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

              <select
                value={filters.rating ?? ""}
                onChange={(e) => handleChangeFilter("rating", e.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
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
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
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
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
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
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
              >
                <option value="">Todos os status</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>

              <input
                type="date"
                value={filters.startDate ?? ""}
                onChange={(e) => handleChangeFilter("startDate", e.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition  focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
              />

              <input
                type="date"
                value={filters.endDate ?? ""}
                onChange={(e) => handleChangeFilter("endDate", e.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition  focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por comentário, e-mail, filial, kiosk, contato ou tag"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 sm:col-span-2 xl:col-span-2"
              />

              <div className="w-full flex gap-3 sm:col-span-2 xl:col-span-2">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Aplicar filtros
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                Feedbacks
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {loading
                  ? "Carregando dados..."
                  : `${filteredFeedbacks.length} feedback(s) encontrado(s)`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-600">
              Carregando feedbacks...
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto max-w-md">
                <h4 className="text-lg font-semibold text-slate-900">
                  Nenhum feedback encontrado
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Ajuste os filtros para ampliar o resultado da consulta.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1450px] divide-y divide-white/10">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Data
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Nota
                      </th>
                      {superAdmin ? (
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Empresa
                        </th>
                      ) : null}
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Filial
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Kiosk
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Comentário
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Tags
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Contato
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {paginatedFeedbacks.map((feedback) => {
                      const tags = feedback.tags ?? [];
                      const isProcessing = processingId === feedback.id;

                      return (
                        <tr
                          key={feedback.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-4 align-top text-sm text-slate-600">
                            {formatDate(feedback.createdAt)}
                          </td>

                          <td className="px-6 py-4 align-top">
                            <span
                              className={[
                                "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                getRatingBadgeClass(feedback.rating),
                              ].join(" ")}
                            >
                              {feedback.rating} - {getRatingLabel(feedback.rating)}
                            </span>
                          </td>

                          {superAdmin ? (
                            <td className="px-6 py-4 align-top text-sm text-slate-600">
                              {feedback.company?.name ?? "-"}
                            </td>
                          ) : null}

                          <td className="px-6 py-4 align-top text-sm text-slate-600">
                            {feedback.branch?.name ?? "-"}
                          </td>

                          <td className="px-6 py-4 align-top text-sm text-slate-600">
                            {feedback.kiosk?.name ?? "-"}
                          </td>

                          <td className="max-w-[300px] px-6 py-4 align-top text-sm text-slate-600">
                            <span className="line-clamp-3">
                              {feedback.comment?.trim() || "Sem comentário."}
                            </span>
                          </td>

                          <td className="px-6 py-4 align-top text-sm text-slate-600">
                            {tags.length > 0 ? (
                              <div className="w-full flex max-w-[280px] flex-wrap gap-2">
                                {tags.map((item) => (
                                  <span
                                    key={item.id}
                                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                                  >
                                    {item.tag?.name ?? "Tag"}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td className="px-6 py-4 align-top">
                            <span
                              className={[
                                "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                hasContactInfo(feedback)
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-white text-slate-600",
                              ].join(" ")}
                            >
                              {hasContactInfo(feedback)
                                ? "Disponível"
                                : "Não informado"}
                            </span>
                          </td>

                          <td className="px-6 py-4 align-top">
                            <div className="w-full flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedFeedback(feedback)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
                                title="Ver detalhes"
                              >
                                <Eye size={18} />
                              </button>

                              {canManage ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(feedback)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isProcessing ? "Excluindo..." : "Excluir"}
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
      {selectedFeedback ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/80 bg-white p-6 shadow-[0_24px_70px_-22px_rgba(15,23,42,0.30)]">
            <div className="w-full flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  <Eye size={14} />
                  Detalhes do feedback
                </div>

                <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                  Registro detalhado
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Visualização completa do feedback para leitura operacional e
                  acompanhamento da experiência registrada pelo cliente.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Dados gerais
                </h3>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Data
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {formatDate(selectedFeedback.createdAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Avaliação
                    </p>
                    <div className="mt-2">
                      <span
                        className={[
                          "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                          getRatingBadgeClass(selectedFeedback.rating),
                        ].join(" ")}
                      >
                        {selectedFeedback.rating} -{" "}
                        {getRatingLabel(selectedFeedback.rating)}
                      </span>
                    </div>
                  </div>

                  {superAdmin ? (
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Empresa
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {selectedFeedback.company?.name ?? "-"}
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Filial
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {selectedFeedback.branch?.name ?? "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Kiosk
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {selectedFeedback.kiosk?.name ?? "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Registro
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      Feedback recebido
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Informações de contato
                </h3>

                {hasContactInfo(selectedFeedback) ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        E-mail
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {selectedFeedback.email?.trim() || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Nome
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {selectedFeedback.contactName?.trim() || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Telefone
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {selectedFeedback.contactPhone?.trim() || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Consentimento
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {selectedFeedback.contactConsent ? "Sim" : "Não"}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Mensagem de contato
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {selectedFeedback.contactMessage?.trim() || "-"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-6 text-slate-600">
                    Nenhuma informação de contato foi registrada neste feedback.
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 lg:col-span-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Comentário
                </h3>

                <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {selectedFeedback.comment?.trim() || "Sem comentário."}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 lg:col-span-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Tags
                </h3>

                {(selectedFeedback.tags ?? []).length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedFeedback.tags!.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        {item.tag?.name ?? "Tag"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-600">
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
