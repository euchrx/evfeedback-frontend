import { useEffect, useMemo, useState } from "react";
import {
  getDashboardByBranch,
  getDashboardSummary,
  type BranchDashboardItem,
  type DashboardFilters,
  type DashboardSummary,
} from "../../../services/dashboard";
import { getCompanies, type Company } from "../../../services/companies";
import { getStoredUser } from "../../../services/auth";
import {
  canViewOperationalModules,
  getResolvedCompanyId,
  isSuperAdmin,
} from "../../../utils/permissions";
import { useToast } from "../../../components/ui/ToastProvider";

function formatAverage(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

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

const panelClass =
  "rounded-[28px] border border-white/10 bg-slate-900/80 shadow-lg shadow-black/10";

export default function DashboardPage() {
  const toast = useToast();

  const currentUser = getStoredUser();
  const canView = canViewOperationalModules(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [branches, setBranches] = useState<BranchDashboardItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState<DashboardFilters>({
    companyId: superAdmin ? "" : resolvedCompanyId ?? "",
    dateFrom: "",
    dateTo: "",
  });

  const selectedCompanyId = useMemo(() => {
    return superAdmin ? filters.companyId || undefined : resolvedCompanyId;
  }, [superAdmin, filters.companyId, resolvedCompanyId]);

  async function loadDependencies() {
    if (!superAdmin) return;

    try {
      const data = await getCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Erro ao carregar empresas.");
      setCompanies([]);
    }
  }

  async function loadDashboard(customFilters?: DashboardFilters) {
    try {
      setIsLoading(true);

      const finalFilters = customFilters ?? filters;

      const sanitizedFilters: DashboardFilters = {
        companyId: superAdmin
          ? finalFilters.companyId || undefined
          : resolvedCompanyId,
        dateFrom: finalFilters.dateFrom || undefined,
        dateTo: finalFilters.dateTo || undefined,
      };

      const [summaryData, branchData] = await Promise.all([
        getDashboardSummary(sanitizedFilters),
        getDashboardByBranch(sanitizedFilters),
      ]);

      setSummary(summaryData);
      setBranches(Array.isArray(branchData) ? branchData : []);
    } catch {
      toast.error("Não foi possível carregar o dashboard.");
      setSummary(null);
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleApplyPeriod() {
    void loadDashboard(filters);
  }

  function handleClearPeriod() {
    const cleared: DashboardFilters = {
      companyId: superAdmin ? "" : resolvedCompanyId ?? "",
      dateFrom: "",
      dateTo: "",
    };

    setFilters(cleared);
    void loadDashboard(cleared);
  }

  useEffect(() => {
    if (!canView) {
      setIsLoading(false);
      return;
    }

    void loadDependencies();
  }, [canView, superAdmin]);

  useEffect(() => {
    if (!canView) return;

    void loadDashboard(filters);
  }, [canView, selectedCompanyId]);

  const ratingMap = useMemo(() => {
    const map = new Map<number, number>();

    for (const item of summary?.ratings ?? []) {
      map.set(item.rating, item.count);
    }

    return [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: map.get(rating) ?? 0,
    }));
  }, [summary]);

  const maxRatingCount = useMemo(() => {
    return Math.max(...ratingMap.map((item) => item.count), 1);
  }, [ratingMap]);

  const bestBranch = useMemo(() => {
    return [...branches]
      .filter((branch) => branch.totalFeedbacks > 0)
      .sort((a, b) => b.averageRating - a.averageRating)[0];
  }, [branches]);

  const worstBranch = useMemo(() => {
    const validBranches = [...branches].filter(
      (branch) => branch.totalFeedbacks > 0,
    );

    if (validBranches.length <= 1) {
      return undefined;
    }

    const sorted = validBranches.sort(
      (a, b) => a.averageRating - b.averageRating,
    );

    const candidate = sorted[0];

    if (candidate.id === bestBranch?.id) {
      return undefined;
    }

    return candidate;
  }, [branches, bestBranch]);

  const totalActiveBranches = useMemo(() => {
    return branches.filter((item) => item.totalFeedbacks > 0).length;
  }, [branches]);

  if (!canView) {
    return (
      <section className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-6 shadow-lg shadow-black/10">
        <h2 className="text-xl font-semibold text-white">Acesso negado</h2>
        <p className="mt-2 text-sm leading-6 text-rose-100/80">
          Você não tem permissão para acessar o dashboard.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className={`${panelClass} p-6`}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
              dashboard executivo
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
              Visão geral da operação
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Acompanhe volume, média, distribuição e desempenho por filial em
              um único painel executivo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {superAdmin ? (
              <select
                value={filters.companyId ?? ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    companyId: e.target.value,
                  }))
                }
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition-colors focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
              >
                <option value="">Selecione uma empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={
                  currentUser?.companyId
                    ? "Empresa vinculada ao seu usuário"
                    : "Sem empresa vinculada"
                }
                disabled
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/40 px-4 text-sm text-slate-400 outline-none disabled:cursor-not-allowed"
              />
            )}

            <input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  dateFrom: e.target.value,
                }))
              }
              className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition-colors [color-scheme:dark] focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
            />

            <input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  dateTo: e.target.value,
                }))
              }
              className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition-colors [color-scheme:dark] focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleApplyPeriod}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
              >
                Aplicar
              </button>

              <button
                type="button"
                onClick={handleClearPeriod}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:border-white/20 hover:bg-white/10"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div
          className={`${panelClass} px-6 py-12 text-center text-sm text-slate-400`}
        >
          Carregando indicadores...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className={`${panelClass} p-6`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Total de feedbacks
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">
                {summary?.total ?? 0}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Volume total de registros no período.
              </p>
            </article>

            <article className={`${panelClass} p-6`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Média geral
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">
                {formatAverage(summary?.averageRating ?? 0)}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Média consolidada das avaliações.
              </p>
            </article>

            <article className={`${panelClass} p-6`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Filiais com feedback
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">
                {totalActiveBranches}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Unidades com registros recebidos.
              </p>
            </article>

            <article className={`${panelClass} p-6`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Tags mais marcadas
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">
                {summary?.topTags?.length ?? 0}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Motivos com ocorrência no período.
              </p>
            </article>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <article className={`${panelClass} p-6`}>
              <div className="mb-5 space-y-1">
                <h2 className="text-xl font-semibold text-white">
                  Distribuição por nota
                </h2>
                <p className="text-sm text-slate-400">
                  Quantidade de feedbacks por avaliação recebida.
                </p>
              </div>

              <div className="space-y-4">
                {ratingMap.map((item) => {
                  const width = `${(item.count / maxRatingCount) * 100}%`;

                  return (
                    <div key={item.rating} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-200">
                          Nota {item.rating} · {getRatingLabel(item.rating)}
                        </span>
                        <span className="text-slate-400">{item.count}</span>
                      </div>

                      <div className="h-3 rounded-full bg-slate-950/80">
                        <div
                          className="h-3 rounded-full bg-cyan-400 transition-[width] duration-150"
                          style={{ width }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className={`${panelClass} p-6`}>
              <div className="mb-5 space-y-1">
                <h2 className="text-xl font-semibold text-white">
                  Principais motivos
                </h2>
                <p className="text-sm text-slate-400">
                  Tags mais marcadas pelos clientes.
                </p>
              </div>

              {summary?.topTags?.length ? (
                <div className="space-y-3">
                  {summary.topTags.map((tag, index) => (
                    <div
                      key={`${tag.name}-${index}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3"
                    >
                      <span className="font-medium text-slate-200">
                        {tag.name}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                        {tag.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-slate-500">
                  Nenhuma tag registrada ainda.
                </div>
              )}
            </article>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-[28px] border border-emerald-400/15 bg-emerald-500/10 p-6 shadow-lg shadow-black/10">
              <div className="mb-4 space-y-1">
                <h2 className="text-xl font-semibold text-white">
                  Melhor filial
                </h2>
                <p className="text-sm text-emerald-100/70">
                  Unidade com melhor média de avaliação no período.
                </p>
              </div>

              {bestBranch ? (
                <div className="rounded-2xl border border-emerald-300/15 bg-slate-950/30 px-5 py-4">
                  <h3 className="text-lg font-semibold text-white">
                    {bestBranch.name}
                  </h3>
                  <p className="mt-2 text-sm text-emerald-100/80">
                    Média: {formatAverage(bestBranch.averageRating)}
                  </p>
                  <p className="text-sm text-emerald-100/80">
                    Feedbacks: {bestBranch.totalFeedbacks}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-emerald-300/15 px-4 py-8 text-center text-emerald-100/70">
                  Ainda não há filiais suficientes para comparação.
                </div>
              )}
            </article>

            <article className="rounded-[28px] border border-rose-400/15 bg-rose-500/10 p-6 shadow-lg shadow-black/10">
              <div className="mb-4 space-y-1">
                <h2 className="text-xl font-semibold text-white">
                  Pior filial
                </h2>
                <p className="text-sm text-rose-100/70">
                  Unidade com menor média de avaliação no período.
                </p>
              </div>

              {worstBranch ? (
                <div className="rounded-2xl border border-rose-300/15 bg-slate-950/30 px-5 py-4">
                  <h3 className="text-lg font-semibold text-white">
                    {worstBranch.name}
                  </h3>
                  <p className="mt-2 text-sm text-rose-100/80">
                    Média: {formatAverage(worstBranch.averageRating)}
                  </p>
                  <p className="text-sm text-rose-100/80">
                    Feedbacks: {worstBranch.totalFeedbacks}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-rose-300/15 px-4 py-8 text-center text-rose-100/70">
                  Ainda não há filiais suficientes para comparação.
                </div>
              )}
            </article>
          </div>

          <article className={`${panelClass} p-6`}>
            <div className="mb-5 space-y-1">
              <h2 className="text-xl font-semibold text-white">
                Últimos feedbacks
              </h2>
              <p className="text-sm text-slate-400">
                Acompanhe os registros mais recentes recebidos pela operação.
              </p>
            </div>

            {!summary?.recentFeedbacks?.length ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-slate-500">
                Nenhum feedback recente encontrado.
              </div>
            ) : (
              <div className="grid gap-4">
                {summary.recentFeedbacks.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              item.rating <= 2
                                ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
                                : item.rating === 3
                                  ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                                  : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                            }`}
                          >
                            {getRatingLabel(item.rating)}
                          </span>

                          <span className="text-xs text-slate-500">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>

                        <p className="text-sm text-slate-300">
                          <span className="font-medium text-white">
                            Filial:
                          </span>{" "}
                          {item.branchName ?? "-"}
                        </p>

                        <p className="text-sm text-slate-300">
                          <span className="font-medium text-white">
                            Kiosk:
                          </span>{" "}
                          {item.kioskName ?? "-"}
                        </p>

                        <p className="text-sm text-slate-300">
                          <span className="font-medium text-white">
                            Comentário:
                          </span>{" "}
                          {item.comment?.trim() || "Sem comentário."}
                        </p>

                        {item.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {item.tags.map((tag, index) => (
                              <span
                                key={`${tag}-${index}`}
                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className={`${panelClass} p-6`}>
            <div className="mb-5 space-y-1">
              <h2 className="text-xl font-semibold text-white">
                Desempenho por filial
              </h2>
              <p className="text-sm text-slate-400">
                Compare volume de feedbacks e média entre as unidades.
              </p>
            </div>

            {branches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-slate-500">
                Nenhuma filial encontrada.
              </div>
            ) : (
              <div className="grid gap-4">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <h3 className="text-base font-semibold text-white">
                        {branch.name}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                        <span>Feedbacks: {branch.totalFeedbacks}</span>
                        <span>
                          Média: {formatAverage(branch.averageRating)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </>
      )}
    </section>
  );
}