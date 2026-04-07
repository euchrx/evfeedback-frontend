import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "../../../services/auth";
import { getCompanies, type Company } from "../../../services/companies";
import {
  getDashboardByBranch,
  getDashboardSummary,
  type BranchDashboardItem,
  type DashboardFilters,
  type DashboardSummary,
} from "../../../services/dashboard";

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";
  companyId?: string | null;
};

function formatAverage(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

export default function DashboardPage() {
  const currentUser = getStoredUser() as StoredUser | null;
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [branches, setBranches] = useState<BranchDashboardItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [companyId, setCompanyId] = useState(
    isSuperAdmin ? "" : currentUser?.companyId ?? "",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function loadCompanies() {
    if (!isSuperAdmin) return;

    const data = await getCompanies();
    setCompanies(Array.isArray(data) ? data : []);
  }

  async function loadSummary(
    customCompanyId?: string,
    customDateFrom?: string,
    customDateTo?: string,
  ) {
    try {
      setError("");
      setIsLoading(true);

      const filters: DashboardFilters = {
        companyId: isSuperAdmin
          ? (customCompanyId ?? companyId) || undefined
          : currentUser?.companyId ?? undefined,
        dateFrom: (customDateFrom ?? dateFrom) || undefined,
        dateTo: (customDateTo ?? dateTo) || undefined,
      };

      const [summaryData, branchData] = await Promise.all([
        getDashboardSummary(filters),
        getDashboardByBranch(filters),
      ]);

      setSummary(summaryData);
      setBranches(Array.isArray(branchData) ? branchData : []);
    } catch {
      setError("Não foi possível carregar os indicadores.");
      setSummary(null);
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleApplyPeriod() {
    loadSummary();
  }

  function handleClearPeriod() {
    const resetCompanyId = isSuperAdmin ? "" : currentUser?.companyId ?? "";
    setCompanyId(resetCompanyId);
    setDateFrom("");
    setDateTo("");
    loadSummary(resetCompanyId, "", "");
  }

  useEffect(() => {
    async function init() {
      try {
        if (isSuperAdmin) {
          await loadCompanies();
        }

        await loadSummary(
          isSuperAdmin ? "" : currentUser?.companyId ?? "",
          "",
          "",
        );
      } catch {
        setError("Não foi possível iniciar o dashboard.");
        setIsLoading(false);
      }
    }

    init();
  }, []);

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
    return [...branches]
      .filter((branch) => branch.totalFeedbacks > 0)
      .sort((a, b) => a.averageRating - b.averageRating)[0];
  }, [branches]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Visão geral dos feedbacks recebidos.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Filtro por período
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Filtre os indicadores por empresa e período.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isSuperAdmin ? (
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
            >
              <option value="">Todas as empresas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          ) : null}

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={handleApplyPeriod}
            className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Aplicar período
          </button>

          <button
            onClick={handleClearPeriod}
            className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            Limpar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Carregando indicadores...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Total de feedbacks</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {summary?.total ?? 0}
              </h2>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Média geral</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {formatAverage(summary?.averageRating ?? 0)}
              </h2>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Filiais com feedback</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {branches.filter((item) => item.totalFeedbacks > 0).length}
              </h2>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Tags principais</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {summary?.topTags?.length ?? 0}
              </h2>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Distribuição por nota
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Quantidade de feedbacks por avaliação.
              </p>

              <div className="mt-5 space-y-4">
                {ratingMap.map((item) => {
                  const width = `${(item.count / maxRatingCount) * 100}%`;

                  return (
                    <div key={item.rating}>
                      <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                        <span>Nota {item.rating}</span>
                        <span>{item.count}</span>
                      </div>

                      <div className="h-3 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full bg-sky-500"
                          style={{ width }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Principais motivos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tags mais marcadas pelos clientes.
              </p>

              {summary?.topTags?.length ? (
                <div className="mt-5 space-y-3">
                  {summary.topTags.map((tag, index) => (
                    <div
                      key={`${tag.name}-${index}`}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                    >
                      <span className="font-medium text-slate-800">{tag.name}</span>
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                        {tag.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
                  Nenhuma tag registrada ainda.
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Melhor filial
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Unidade com melhor média de avaliação.
              </p>

              {bestBranch ? (
                <div className="mt-5 rounded-2xl bg-emerald-50 p-5">
                  <h3 className="text-xl font-bold text-emerald-900">
                    {bestBranch.name}
                  </h3>
                  <p className="mt-2 text-sm text-emerald-800">
                    Média: {formatAverage(bestBranch.averageRating)}
                  </p>
                  <p className="mt-1 text-sm text-emerald-800">
                    Feedbacks: {bestBranch.totalFeedbacks}
                  </p>
                  <p className="mt-1 text-sm text-emerald-800">
                    Empresa: {bestBranch.company?.name ?? "-"}
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
                  Ainda não há dados suficientes.
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Pior filial
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Unidade com menor média de avaliação.
              </p>

              {worstBranch ? (
                <div className="mt-5 rounded-2xl bg-rose-50 p-5">
                  <h3 className="text-xl font-bold text-rose-900">
                    {worstBranch.name}
                  </h3>
                  <p className="mt-2 text-sm text-rose-800">
                    Média: {formatAverage(worstBranch.averageRating)}
                  </p>
                  <p className="mt-1 text-sm text-rose-800">
                    Feedbacks: {worstBranch.totalFeedbacks}
                  </p>
                  <p className="mt-1 text-sm text-rose-800">
                    Empresa: {worstBranch.company?.name ?? "-"}
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
                  Ainda não há dados suficientes.
                </div>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Desempenho por filial
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Compare volume e média entre as unidades.
            </p>

            {branches.length === 0 ? (
              <div className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
                Nenhuma filial encontrada.
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <h3 className="text-lg font-semibold text-slate-900">
                      {branch.name}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Empresa:{" "}
                      <span className="font-medium">
                        {branch.company?.name ?? "-"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Feedbacks:{" "}
                      <span className="font-medium">{branch.totalFeedbacks}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Média:{" "}
                      <span className="font-medium">
                        {formatAverage(branch.averageRating)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}