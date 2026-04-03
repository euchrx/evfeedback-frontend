import { useEffect, useMemo, useState } from "react";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "../../../services/dashboard";

function formatAverage(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadSummary() {
    try {
      setIsLoading(true);
      const data = await getDashboardSummary();
      setSummary(data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
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

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Visão geral dos feedbacks recebidos.
        </p>
      </div>

      {isLoading ? (
        <div className="mt-8 text-slate-500">Carregando indicadores...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500">Total de feedbacks</p>
              <h2 className="text-3xl font-bold text-slate-900 mt-2">
                {summary?.total ?? 0}
              </h2>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500">Média geral</p>
              <h2 className="text-3xl font-bold text-slate-900 mt-2">
                {formatAverage(summary?.averageRating ?? 0)}
              </h2>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500">Motivos em destaque</p>
              <h2 className="text-3xl font-bold text-slate-900 mt-2">
                {summary?.topTags?.length ?? 0}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6 mt-8">
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Distribuição por nota
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Quantidade de feedbacks por avaliação.
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-5">
                {ratingMap.map((item) => {
                  const width = `${(item.count / maxRatingCount) * 100}%`;

                  return (
                    <div key={item.rating}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium text-slate-700">
                          Nota {item.rating}
                        </span>
                        <span className="text-slate-500">{item.count}</span>
                      </div>

                      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{ width }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Principais motivos
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Tags mais marcadas pelos clientes.
              </p>

              {summary?.topTags?.length ? (
                <div className="mt-6 space-y-3">
                  {summary.topTags.map((tag, index) => (
                    <div
                      key={`${tag.name}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{tag.name}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        {tag.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 text-slate-500">
                  Nenhuma tag registrada ainda.
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}