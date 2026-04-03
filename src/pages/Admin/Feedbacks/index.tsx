import { useEffect, useState } from "react";
import {
  getFeedbacks,
  type FeedbackItem,
  type FeedbackFilters,
} from "../../../services/feedbacks";
import { getBranches, type Branch } from "../../../services/branches";

function getRatingLabel(rating: number) {
  switch (rating) {
    case 1:
      return "😡 Péssimo";
    case 2:
      return "😐 Ruim";
    case 3:
      return "🙂 Ok";
    case 4:
      return "😃 Bom";
    case 5:
      return "🤩 Excelente";
    default:
      return `${rating}`;
  }
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

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState<FeedbackFilters>({
    rating: "",
    branchId: "",
    dateFrom: "",
    dateTo: "",
  });

  async function loadBranches() {
    try {
      const data = await getBranches();
      setBranches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar filiais:", error);
      setBranches([]);
    }
  }

  async function loadFeedbacks(customFilters?: FeedbackFilters) {
    try {
      setIsLoading(true);

      const finalFilters = customFilters ?? filters;

      const sanitizedFilters: FeedbackFilters = {
        rating: finalFilters.rating || undefined,
        branchId: finalFilters.branchId || undefined,
        dateFrom: finalFilters.dateFrom || undefined,
        dateTo: finalFilters.dateTo || undefined,
      };

      const data = await getFeedbacks(sanitizedFilters);
      setFeedbacks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar feedbacks:", error);
      setFeedbacks([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleChangeFilter<K extends keyof FeedbackFilters>(
    field: K,
    value: FeedbackFilters[K]
  ) {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleApplyFilters() {
    loadFeedbacks(filters);
  }

  function handleClearFilters() {
    const cleared = {
      rating: "",
      branchId: "",
      dateFrom: "",
      dateTo: "",
    };

    setFilters(cleared);
    loadFeedbacks(cleared);
  }

  useEffect(() => {
    loadBranches();
    loadFeedbacks({
      rating: "",
      branchId: "",
      dateFrom: "",
      dateTo: "",
    });
  }, []);

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Feedbacks</h1>
        <p className="text-slate-600 mt-2">
          Acompanhe as avaliações enviadas pelos clientes.
        </p>
      </div>

      <section className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Filtros</h2>
          <p className="text-sm text-slate-500 mt-1">
            Refine os resultados por nota, filial e período.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nota
            </label>
            <select
              value={filters.rating ?? ""}
              onChange={(e) => handleChangeFilter("rating", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 bg-white"
            >
              <option value="">Todas</option>
              <option value="1">1 - Péssimo</option>
              <option value="2">2 - Ruim</option>
              <option value="3">3 - Ok</option>
              <option value="4">4 - Bom</option>
              <option value="5">5 - Excelente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filial
            </label>
            <select
              value={filters.branchId ?? ""}
              onChange={(e) => handleChangeFilter("branchId", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 bg-white"
            >
              <option value="">Todas</option>
              {(Array.isArray(branches) ? branches : []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Data inicial
            </label>
            <input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) => handleChangeFilter("dateFrom", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Data final
            </label>
            <input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) => handleChangeFilter("dateTo", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleApplyFilters}
            className="rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-3 font-semibold text-slate-950 transition"
          >
            Aplicar filtros
          </button>

          <button
            onClick={handleClearFilters}
            className="rounded-xl bg-slate-100 hover:bg-slate-200 px-5 py-3 font-semibold text-slate-800 transition"
          >
            Limpar filtros
          </button>
        </div>
      </section>

      <section className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Lista de feedbacks
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Últimas avaliações recebidas pelo sistema.
            </p>
          </div>

          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {feedbacks.length} item(ns)
          </span>
        </div>

        {isLoading ? (
          <div className="mt-6 text-slate-500">Carregando feedbacks...</div>
        ) : feedbacks.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Nenhum feedback encontrado.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {(Array.isArray(feedbacks) ? feedbacks : []).map((feedback) => (
              <div
                key={feedback.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0 space-y-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        {getRatingLabel(feedback.rating)}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {formatDate(feedback.createdAt)}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Kiosk
                        </p>
                        <p className="text-sm text-slate-700">
                          {feedback.kiosk?.name ?? "Não informado"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Filial
                        </p>
                        <p className="text-sm text-slate-700">
                          {feedback.branch?.name ?? "Não informada"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Comentário
                      </p>
                      <p className="text-sm text-slate-700 mt-1">
                        {feedback.comment?.trim()
                          ? feedback.comment
                          : "Sem comentário."}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Tags
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(Array.isArray(feedback.tags) ? feedback.tags : []).length >
                        0 ? (
                          feedback.tags!.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                            >
                              {item.tag?.name ?? "Tag"}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">
                            Sem tags.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
                      Nota {feedback.rating}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}