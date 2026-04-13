import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Building2,
  CalendarClock,
  Eye,
  MessageSquareText,
  Star,
  Store,
  X,
} from "lucide-react";
import {
  getSharedFeedbacks,
  type SharedFeedbackFilters,
} from "../../services/publicFeedbacks";
import type { FeedbackItem } from "../../services/feedbacks";

const PAGE_SIZE = 10;

type SortField =
  | "createdAt"
  | "rating"
  | "branch"
  | "kiosk"
  | "comment"
  | "contact";

type SortDirection = "asc" | "desc";

function getRatingLabel(rating: number) {
  switch (rating) {
    case 1:
      return "Péssimo";
    case 2:
      return "Ruim";
    case 3:
      return "Regular";
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
      return "border border-rose-500/30 bg-rose-500/10 text-rose-300";
    case 2:
      return "border border-orange-500/30 bg-orange-500/10 text-orange-300";
    case 3:
      return "border border-amber-500/30 bg-amber-500/10 text-amber-300";
    case 4:
      return "border border-sky-500/30 bg-sky-500/10 text-sky-300";
    case 5:
      return "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    default:
      return "border border-slate-700 bg-slate-800 text-slate-200";
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

function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token")?.trim() || "";
}

function hasContactInfo(feedback: FeedbackItem) {
  return Boolean(
    feedback.contactName?.trim() ||
    feedback.contactPhone?.trim() ||
    feedback.contactMessage?.trim() ||
    feedback.contactConsent,
  );
}

function AccessBlocked({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[28px] border border-rose-500/25 bg-slate-900/90 p-8 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3">
              <AlertTriangle className="h-6 w-6 text-rose-300" />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                {title}
              </h1>
              <p className="text-base leading-7 text-slate-300">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/85 p-5 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
          <p className="mt-2 text-sm text-slate-400">{helper}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-slate-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

function ColumnSortButton({
  label,
  active,
  direction,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  align?: "left" | "center" | "right";
}) {
  const justify =
    align === "right"
      ? "justify-end"
      : align === "center"
        ? "justify-center"
        : "justify-start";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 ${justify} text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-300`}
    >
      <span>{label}</span>
      {active ? (
        direction === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )
      ) : null}
    </button>
  );
}

export default function PublicFeedbacksPage() {
  const token = useMemo(() => getTokenFromUrl(), []);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(
    null,
  );

  const [filters, setFilters] = useState<SharedFeedbackFilters>({
    branchId: "",
    kioskId: "",
    rating: "",
    startDate: "",
    endDate: "",
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setAccessDenied(true);
      setLoadError("");
      return;
    }

    void loadFeedbacks(filters);
  }, [token]);

  async function loadFeedbacks(customFilters?: SharedFeedbackFilters) {
    if (!token) return;

    try {
      setLoading(true);
      setLoadError("");
      setAccessDenied(false);

      const finalFilters = customFilters ?? filters;

      const data = await getSharedFeedbacks(token, {
        rating: finalFilters.rating || undefined,
        branchId: finalFilters.branchId || undefined,
        kioskId: finalFilters.kioskId || undefined,
        startDate: finalFilters.startDate || undefined,
        endDate: finalFilters.endDate || undefined,
      });

      setFeedbacks(Array.isArray(data) ? data : []);
    } catch {
      setFeedbacks([]);
      setAccessDenied(true);
      setLoadError("Link inválido, expirado ou sem permissão para visualização.");
    } finally {
      setLoading(false);
    }
  }

  function handleChangeFilter<K extends keyof SharedFeedbackFilters>(
    field: K,
    value: SharedFeedbackFilters[K],
  ) {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "branchId" ? { kioskId: "" } : {}),
    }));
  }

  function handleApplyFilters() {
    setPage(1);
    void loadFeedbacks(filters);
  }

  function handleClearFilters() {
    const cleared: SharedFeedbackFilters = {
      branchId: "",
      kioskId: "",
      rating: "",
      startDate: "",
      endDate: "",
    };

    setFilters(cleared);
    setSearch("");
    setPage(1);
    void loadFeedbacks(cleared);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "createdAt" ? "desc" : "asc");
  }

  const branchOptions = useMemo(() => {
    const map = new Map<string, string>();

    feedbacks.forEach((item) => {
      if (item.branch?.id && item.branch?.name) {
        map.set(item.branch.id, item.branch.name);
      }
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [feedbacks]);

  const kioskOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; branchId?: string }>();

    feedbacks.forEach((item) => {
      if (item.kiosk?.id && item.kiosk?.name) {
        map.set(item.kiosk.id, {
          id: item.kiosk.id,
          name: item.kiosk.name,
          branchId: item.branchId,
        });
      }
    });

    return Array.from(map.values())
      .filter((item) => !filters.branchId || item.branchId === filters.branchId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [feedbacks, filters.branchId]);

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
        (feedback.branch?.name ?? "").toLowerCase().includes(normalizedSearch) ||
        (feedback.kiosk?.name ?? "").toLowerCase().includes(normalizedSearch) ||
        (feedback.contactName ?? "").toLowerCase().includes(normalizedSearch) ||
        (feedback.contactPhone ?? "").toLowerCase().includes(normalizedSearch) ||
        (feedback.contactMessage ?? "").toLowerCase().includes(normalizedSearch) ||
        tagsText.includes(normalizedSearch)
      );
    });
  }, [feedbacks, search]);

  const sortedFeedbacks = useMemo(() => {
    const items = [...filteredFeedbacks];

    items.sort((a, b) => {
      let result = 0;

      if (sortField === "createdAt") {
        result =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === "rating") {
        result = a.rating - b.rating;
      } else if (sortField === "branch") {
        result = (a.branch?.name ?? "").localeCompare(b.branch?.name ?? "");
      } else if (sortField === "kiosk") {
        result = (a.kiosk?.name ?? "").localeCompare(b.kiosk?.name ?? "");
      } else if (sortField === "comment") {
        result = (a.comment ?? "").localeCompare(b.comment ?? "");
      } else if (sortField === "contact") {
        result =
          Number(hasContactInfo(a)) - Number(hasContactInfo(b));
      }

      return sortDirection === "asc" ? result : -result;
    });

    return items;
  }, [filteredFeedbacks, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedFeedbacks.length / PAGE_SIZE));

  const paginatedFeedbacks = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedFeedbacks.slice(start, start + PAGE_SIZE);
  }, [sortedFeedbacks, page]);

  useEffect(() => {
    setPage(1);
  }, [search, sortField, sortDirection]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const totalFeedbacks = sortedFeedbacks.length;

  const averageRating = useMemo(() => {
    if (!sortedFeedbacks.length) return 0;

    const total = sortedFeedbacks.reduce((sum, item) => sum + item.rating, 0);
    return total / sortedFeedbacks.length;
  }, [sortedFeedbacks]);

  const feedbacksWithComment = useMemo(() => {
    return sortedFeedbacks.filter((item) => item.comment?.trim()).length;
  }, [sortedFeedbacks]);

  const feedbacksWithContact = useMemo(() => {
    return sortedFeedbacks.filter((item) => hasContactInfo(item)).length;
  }, [sortedFeedbacks]);

  const uniqueBranches = useMemo(() => {
    return new Set(
      sortedFeedbacks
        .map((item) => item.branch?.name?.trim())
        .filter(Boolean),
    ).size;
  }, [sortedFeedbacks]);

  const uniqueKiosks = useMemo(() => {
    return new Set(
      sortedFeedbacks
        .map((item) => item.kiosk?.name?.trim())
        .filter(Boolean),
    ).size;
  }, [sortedFeedbacks]);

  const ratingsDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    sortedFeedbacks.forEach((item) => {
      if (item.rating >= 1 && item.rating <= 5) {
        counts[item.rating as 1 | 2 | 3 | 4 | 5] += 1;
      }
    });

    return [5, 4, 3, 2, 1].map((rating) => {
      const count = counts[rating as 1 | 2 | 3 | 4 | 5];
      const percentage =
        totalFeedbacks > 0 ? (count / totalFeedbacks) * 100 : 0;

      return {
        rating,
        label: getRatingLabel(rating),
        count,
        percentage,
      };
    });
  }, [sortedFeedbacks, totalFeedbacks]);

  const branchSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        branchName: string;
        total: number;
        avg: number;
        comments: number;
      }
    >();

    sortedFeedbacks.forEach((item) => {
      const branchName = item.branch?.name?.trim() || "Sem filial";
      const current = map.get(branchName) ?? {
        branchName,
        total: 0,
        avg: 0,
        comments: 0,
      };

      current.total += 1;
      current.avg += item.rating;
      if (item.comment?.trim()) current.comments += 1;

      map.set(branchName, current);
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        avg: item.total > 0 ? item.avg / item.total : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [sortedFeedbacks]);

  if (!token) {
    return (
      <AccessBlocked
        title="Acesso indisponível"
        description="Este link não contém um token válido para visualização dos feedbacks."
      />
    );
  }

  if (!loading && accessDenied) {
    return (
      <AccessBlocked
        title="Link inválido ou expirado"
        description={loadError || "Não foi possível validar este acesso compartilhado."}
      />
    );
  }

  return (
    <>
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1700px] space-y-8">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              icon={<MessageSquareText className="h-5 w-5" />}
              label="Total de registros"
              value={loading ? "--" : String(totalFeedbacks)}
              helper="Quantidade de feedbacks dentro do recorte atual."
            />

            <SummaryCard
              icon={<Star className="h-5 w-5" />}
              label="Nota média"
              value={loading ? "--" : averageRating.toFixed(1)}
              helper="Média consolidada das avaliações filtradas."
            />

            <SummaryCard
              icon={<Building2 className="h-5 w-5" />}
              label="Filiais presentes"
              value={loading ? "--" : String(uniqueBranches)}
              helper="Unidades com registros no recorte atual."
            />

            <SummaryCard
              icon={<Store className="h-5 w-5" />}
              label="Kiosks monitorados"
              value={loading ? "--" : String(uniqueKiosks)}
              helper="Pontos de coleta incluídos na visualização."
            />

            <SummaryCard
              icon={<Eye className="h-5 w-5" />}
              label="Contato disponível"
              value={loading ? "--" : String(feedbacksWithContact)}
              helper="Registros com informação de contato preenchida."
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[32px] border border-slate-800 bg-slate-900/85 p-6 shadow-xl">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Filtros e recorte operacional
                </h2>
                <p className="text-sm leading-6 text-slate-400">
                  Refine a visualização por nota, filial, kiosk, período e texto livre.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Nota
                  </label>
                  <select
                    value={filters.rating ?? ""}
                    onChange={(e) => handleChangeFilter("rating", e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-white outline-none transition focus:border-sky-500"
                  >
                    <option value="">Todas as notas</option>
                    <option value="1">1 - Péssimo</option>
                    <option value="2">2 - Ruim</option>
                    <option value="3">3 - Regular</option>
                    <option value="4">4 - Bom</option>
                    <option value="5">5 - Excelente</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Filial
                  </label>
                  <select
                    value={filters.branchId ?? ""}
                    onChange={(e) => handleChangeFilter("branchId", e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-white outline-none transition focus:border-sky-500"
                  >
                    <option value="">Todas as filiais</option>
                    {branchOptions.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Kiosk
                  </label>
                  <select
                    value={filters.kioskId ?? ""}
                    onChange={(e) => handleChangeFilter("kioskId", e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-white outline-none transition focus:border-sky-500"
                  >
                    <option value="">Todos os kiosks</option>
                    {kioskOptions.map((kiosk) => (
                      <option key={kiosk.id} value={kiosk.id}>
                        {kiosk.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Data inicial
                  </label>
                  <input
                    type="date"
                    value={filters.startDate ?? ""}
                    onChange={(e) => handleChangeFilter("startDate", e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-white outline-none transition focus:border-sky-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Data final
                  </label>
                  <input
                    type="date"
                    value={filters.endDate ?? ""}
                    onChange={(e) => handleChangeFilter("endDate", e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-white outline-none transition focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_auto_auto]">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Busca textual
                  </label>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por comentário, filial, kiosk, contato ou tag"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-white outline-none placeholder:text-slate-500 transition focus:border-sky-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="self-end rounded-2xl bg-sky-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  Aplicar filtros
                </button>

                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="self-end rounded-2xl border border-slate-700 bg-slate-950 px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-800 bg-slate-900/85 p-6 shadow-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white">
                    Distribuição por nota
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Visão rápida da concentração das avaliações.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Comentários
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">
                    {loading ? "--" : feedbacksWithComment}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {ratingsDistribution.map((item) => (
                  <div key={item.rating} className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                            getRatingBadgeClass(item.rating),
                          ].join(" ")}
                        >
                          {item.rating} · {item.label}
                        </span>
                      </div>

                      <div className="text-sm text-slate-300">
                        {item.count} registro(s)
                      </div>
                    </div>

                    <div className="h-2.5 rounded-full bg-slate-800">
                      <div
                        className="h-2.5 rounded-full bg-sky-500 transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-800 bg-slate-900/85 p-6 shadow-xl">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Resumo por filial
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Destaque das unidades com maior volume de registros dentro do recorte atual.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Última atualização visual
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-300">
                  <CalendarClock className="h-4 w-4" />
                  Agora
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {branchSummary.length === 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400 lg:col-span-2 xl:col-span-3">
                  Nenhuma filial encontrada no recorte atual.
                </div>
              ) : (
                branchSummary.map((item) => (
                  <div
                    key={item.branchName}
                    className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5"
                  >
                    <p className="text-lg font-semibold text-white">
                      {item.branchName}
                    </p>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Registros
                        </p>
                        <p className="mt-2 text-xl font-bold text-white">
                          {item.total}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Média
                        </p>
                        <p className="mt-2 text-xl font-bold text-white">
                          {item.avg.toFixed(1)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Comentários
                        </p>
                        <p className="mt-2 text-xl font-bold text-white">
                          {item.comments}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-800 bg-slate-900/85 p-6 shadow-xl">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Painel detalhado de feedbacks
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Leitura estruturada dos registros com ordenação por coluna, foco em unidade,
                  avaliação, comentário, contato e marcadores operacionais.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Ordenação atual
                </p>
                <p className="mt-2 text-sm font-medium text-slate-300">
                  {sortField} · {sortDirection === "asc" ? "crescente" : "decrescente"}
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/55">
              {loading ? (
                <div className="px-6 py-14 text-center text-slate-400">
                  Carregando feedbacks...
                </div>
              ) : sortedFeedbacks.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <p className="text-lg font-semibold text-white">
                    Nenhum feedback encontrado
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Ajuste os filtros para ampliar o recorte ou limpe a pesquisa atual.
                  </p>
                </div>
              ) : (
                <div className="max-h-[720px] overflow-auto">
                  <table className="min-w-[1480px] w-full">
                    <thead className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
                      <tr>
                        <th className="px-5 py-4 text-left">
                          <ColumnSortButton
                            label="Data e hora"
                            active={sortField === "createdAt"}
                            direction={sortDirection}
                            onClick={() => toggleSort("createdAt")}
                          />
                        </th>
                        <th className="px-5 py-4 text-left">
                          <ColumnSortButton
                            label="Avaliação"
                            active={sortField === "rating"}
                            direction={sortDirection}
                            onClick={() => toggleSort("rating")}
                          />
                        </th>
                        <th className="px-5 py-4 text-left">
                          <ColumnSortButton
                            label="Filial"
                            active={sortField === "branch"}
                            direction={sortDirection}
                            onClick={() => toggleSort("branch")}
                          />
                        </th>
                        <th className="px-5 py-4 text-left">
                          <ColumnSortButton
                            label="Kiosk"
                            active={sortField === "kiosk"}
                            direction={sortDirection}
                            onClick={() => toggleSort("kiosk")}
                          />
                        </th>
                        <th className="px-5 py-4 text-left">
                          <ColumnSortButton
                            label="Comentário"
                            active={sortField === "comment"}
                            direction={sortDirection}
                            onClick={() => toggleSort("comment")}
                          />
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Tags operacionais
                        </th>
                        <th className="px-5 py-4 text-center">
                          <ColumnSortButton
                            label="Contato"
                            active={sortField === "contact"}
                            direction={sortDirection}
                            onClick={() => toggleSort("contact")}
                            align="center"
                          />
                        </th>
                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Ações
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedFeedbacks.map((feedback, index) => (
                        <tr
                          key={feedback.id}
                          className={[
                            "border-b border-slate-800/80 transition hover:bg-slate-900/90",
                            index % 2 === 0 ? "bg-slate-950/40" : "bg-slate-900/40",
                          ].join(" ")}
                        >
                          <td className="px-5 py-5 align-top">
                            <div className="min-w-[170px]">
                              <p className="text-sm font-medium text-white">
                                {formatDate(feedback.createdAt)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Registro cronológico
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-5 align-top">
                            <div className="min-w-[150px]">
                              <span
                                className={[
                                  "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold",
                                  getRatingBadgeClass(feedback.rating),
                                ].join(" ")}
                              >
                                {feedback.rating} · {getRatingLabel(feedback.rating)}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-5 align-top">
                            <div className="min-w-[190px]">
                              <p className="text-sm font-semibold text-white">
                                {feedback.branch?.name ?? "-"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Unidade operacional
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-5 align-top">
                            <div className="min-w-[170px]">
                              <p className="text-sm font-semibold text-white">
                                {feedback.kiosk?.name ?? "-"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Ponto de coleta
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-5 align-top">
                            <div className="max-w-[380px]">
                              <p className="line-clamp-3 text-sm leading-6 text-slate-200">
                                {feedback.comment?.trim() || "Sem comentário informado."}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-5 align-top">
                            <div className="flex max-w-[300px] flex-wrap gap-2">
                              {(Array.isArray(feedback.tags) ? feedback.tags : []).length > 0 ? (
                                feedback.tags!.map((item) => (
                                  <span
                                    key={item.id}
                                    className="inline-flex rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200"
                                  >
                                    {item.tag?.name ?? "Tag"}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-slate-500">Sem tags</span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-5 align-top text-center">
                            <span
                              className={[
                                "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold",
                                hasContactInfo(feedback)
                                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                  : "border border-slate-700 bg-slate-800 text-slate-400",
                              ].join(" ")}
                            >
                              {hasContactInfo(feedback) ? "Disponível" : "Não informado"}
                            </span>
                          </td>

                          <td className="px-5 py-5 align-top">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => setSelectedFeedback(feedback)}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
                                title="Ver detalhes"
                              >
                                <Eye size={16} />
                                Detalhes
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!loading && sortedFeedbacks.length > 0 ? (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-400">
                  Exibindo página <span className="font-semibold text-white">{page}</span> de{" "}
                  <span className="font-semibold text-white">{totalPages}</span>
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page === totalPages}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </main>

      {selectedFeedback ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[32px] border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-7">
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                  <Eye size={14} />
                  Detalhamento do registro
                </div>

                <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
                  Feedback em modo leitura
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Visualização completa do registro para análise gerencial, auditoria
                  operacional e acompanhamento das ocorrências por unidade.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Dados gerais
                </h3>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Data
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
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
                          "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold",
                          getRatingBadgeClass(selectedFeedback.rating),
                        ].join(" ")}
                      >
                        {selectedFeedback.rating} ·{" "}
                        {getRatingLabel(selectedFeedback.rating)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Filial
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {selectedFeedback.branch?.name ?? "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Kiosk
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {selectedFeedback.kiosk?.name ?? "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Contato do cliente
                </h3>

                {hasContactInfo(selectedFeedback) ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Nome
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {selectedFeedback.contactName?.trim() || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Telefone
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {selectedFeedback.contactPhone?.trim() || "-"}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Mensagem de contato
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                        {selectedFeedback.contactMessage?.trim() || "-"}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Consentimento
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {selectedFeedback.contactConsent ? "Sim" : "Não"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-6 text-slate-400">
                    Nenhuma informação de contato foi registrada neste feedback.
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 lg:col-span-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Comentário registrado
                </h3>
                <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                  {selectedFeedback.comment?.trim() || "Sem comentário informado."}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 lg:col-span-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Tags operacionais
                </h3>

                {(selectedFeedback.tags ?? []).length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedFeedback.tags!.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200"
                      >
                        {item.tag?.name ?? "Tag"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-400">
                    Nenhuma tag foi vinculada a este registro.
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