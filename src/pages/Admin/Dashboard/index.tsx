import { useEffect, useMemo, useState } from "react";
import {
  getDashboardByBranch,
  getDashboardSummary,
  type BranchDashboardItem,
  type DashboardEnvironmentType,
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

function getEnvironmentLabel(environment?: DashboardEnvironmentType | null) {
  switch (environment) {
    case "POSTO":
      return "Posto";
    case "CONVENIENCIA":
      return "Conveniência";
    case "RESTAURANTE":
      return "Restaurante";
    default:
      return "Não informado";
  }
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

export default function DashboardPage() {
  const currentUser = getStoredUser();

  const canView = canViewOperationalModules(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [branches, setBranches] = useState<BranchDashboardItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState<DashboardFilters>({
    companyId: resolvedCompanyId ?? currentUser?.companyId ?? "",
    dateFrom: "",
    dateTo: "",
  });

  const selectedCompanyId = useMemo(() => {
    return superAdmin
      ? filters.companyId || currentUser?.companyId || undefined
      : resolvedCompanyId;
  }, [superAdmin, filters.companyId, resolvedCompanyId, currentUser?.companyId]);

  async function loadDependencies() {
    if (!superAdmin) return;

    try {
      const data = await getCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch {
      setCompanies([]);
    }
  }

  async function loadDashboard(customFilters?: DashboardFilters) {
    try {
      setIsLoading(true);
      setError("");

      const finalFilters = customFilters ?? filters;

      const sanitizedFilters: DashboardFilters = {
        companyId: superAdmin
          ? finalFilters.companyId || currentUser?.companyId || undefined
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
      setError("Não foi possível carregar os indicadores do dashboard.");
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
      companyId: superAdmin ? currentUser?.companyId ?? "" : resolvedCompanyId ?? "",
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

    const initial: DashboardFilters = {
      companyId: superAdmin
        ? filters.companyId || currentUser?.companyId || ""
        : resolvedCompanyId ?? "",
      dateFrom: filters.dateFrom || "",
      dateTo: filters.dateTo || "",
    };

    void loadDashboard(initial);
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
      (branch) => branch.totalFeedbacks > 0
    );

    if (validBranches.length <= 1) {
      return undefined;
    }

    const sorted = validBranches.sort((a, b) => a.averageRating - b.averageRating);

    const candidate = sorted[0];

    if (candidate.id === bestBranch?.id) {
      return undefined;
    }

    return candidate;
  }, [branches, bestBranch]);

  if (!canView) {
    return (
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Acesso negado
        </h1>
        <p className="text-slate-600">
          Você não tem permissão para acessar o dashboard.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="text-slate-600">
          Visão geral dos feedbacks recebidos.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">
            Filtro do dashboard
          </h2>
          <p className="text-sm text-slate-500">
            Filtre os indicadores por empresa e período.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {superAdmin ? (
            <select
              value={filters.companyId ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  companyId: e.target.value,
                }))
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
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
              className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
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
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
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
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />

          <div className="flex gap-3">
            <button
              onClick={handleApplyPeriod}
              className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Aplicar
            </button>

            <button
              onClick={handleClearPeriod}
              className="w-full rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-slate-500 shadow-sm">
          Carregando indicadores...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Total de feedbacks
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {summary?.total ?? 0}
              </h2>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Média geral
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {formatAverage(summary?.averageRating ?? 0)}
              </h2>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Filiais com feedback
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {branches.filter((item) => item.totalFeedbacks > 0).length}
              </h2>
            </article>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {(summary?.byEnvironment ?? []).map((item) => (
              <article
                key={item.environmentType}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-500">
                  {getEnvironmentLabel(item.environmentType)}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {item.total}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Média: {formatAverage(item.averageRating)}
                </p>
              </article>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 space-y-1">
                <h2 className="text-xl font-semibold text-slate-900">
                  Distribuição por nota
                </h2>
                <p className="text-sm text-slate-500">
                  Quantidade de feedbacks por avaliação.
                </p>
              </div>

              <div className="space-y-4">
                {ratingMap.map((item) => {
                  const width = `${(item.count / maxRatingCount) * 100}%`;

                  return (
                    <div key={item.rating} className="space-y-1">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>Nota {item.rating}</span>
                        <span>{item.count}</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full bg-sky-500 transition-all"
                          style={{ width }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 space-y-1">
                <h2 className="text-xl font-semibold text-slate-900">
                  Principais motivos
                </h2>
                <p className="text-sm text-slate-500">
                  Tags mais marcadas pelos clientes.
                </p>
              </div>

              {summary?.topTags?.length ? (
                <div className="space-y-3">
                  {summary.topTags.map((tag, index) => (
                    <div
                      key={`${tag.name}-${index}`}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <span className="font-medium text-slate-800">
                        {tag.name}
                      </span>
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                        {tag.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
                  Nenhuma tag registrada ainda.
                </div>
              )}
            </article>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 space-y-1">
                <h2 className="text-xl font-semibold text-slate-900">
                  Melhor filial
                </h2>
                <p className="text-sm text-slate-500">
                  Unidade com melhor média de avaliação.
                </p>
              </div>

              {bestBranch ? (
                <div className="rounded-2xl bg-green-50 px-5 py-4">
                  <h3 className="text-lg font-semibold text-green-900">
                    {bestBranch.name}
                  </h3>
                  <p className="mt-2 text-sm text-green-800">
                    Média: {formatAverage(bestBranch.averageRating)}
                  </p>
                  <p className="text-sm text-green-800">
                    Feedbacks: {bestBranch.totalFeedbacks}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
                  Ainda não há filiais suficientes para comparação.
                </div>
              )}
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 space-y-1">
                <h2 className="text-xl font-semibold text-slate-900">
                  Pior filial
                </h2>
                <p className="text-sm text-slate-500">
                  Unidade com menor média de avaliação.
                </p>
              </div>

              {worstBranch ? (
                <div className="rounded-2xl bg-rose-50 px-5 py-4">
                  <h3 className="text-lg font-semibold text-rose-900">
                    {worstBranch.name}
                  </h3>
                  <p className="mt-2 text-sm text-rose-800">
                    Média: {formatAverage(worstBranch.averageRating)}
                  </p>
                  <p className="text-sm text-rose-800">
                    Feedbacks: {worstBranch.totalFeedbacks}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
                  Ainda não há filiais suficientes para comparação.
                </div>
              )}
            </article>
          </div>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">
                Últimos feedbacks
              </h2>
              <p className="text-sm text-slate-500">
                Acompanhe os registros mais recentes.
              </p>
            </div>

            {!summary?.recentFeedbacks?.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
                Nenhum feedback recente encontrado.
              </div>
            ) : (
              <div className="grid gap-4">
                {summary.recentFeedbacks.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${item.rating <= 2
                              ? "bg-rose-100 text-rose-700"
                              : item.rating === 3
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                              }`}
                          >
                            {getRatingLabel(item.rating)}
                          </span>

                          <span className="text-xs text-slate-500">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>

                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-slate-900">Filial:</span>{" "}
                          {item.branchName ?? "-"}
                        </p>

                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-slate-900">Kiosk:</span>{" "}
                          {item.kioskName ?? "-"}
                        </p>

                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-slate-900">Ambiente:</span>{" "}
                          {getEnvironmentLabel(item.environmentType)}
                        </p>

                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-slate-900">Comentário:</span>{" "}
                          {item.comment?.trim() || "Sem comentário."}
                        </p>

                        {item.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {item.tags.map((tag, index) => (
                              <span
                                key={`${tag}-${index}`}
                                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
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

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">
                Desempenho por filial
              </h2>
              <p className="text-sm text-slate-500">
                Compare volume e média entre as unidades.
              </p>
            </div>

            {branches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
                Nenhuma filial encontrada.
              </div>
            ) : (
              <div className="grid gap-4">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <h3 className="text-base font-semibold text-slate-900">
                        {branch.name}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                        <span>Feedbacks: {branch.totalFeedbacks}</span>
                        <span>Média: {formatAverage(branch.averageRating)}</span>
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