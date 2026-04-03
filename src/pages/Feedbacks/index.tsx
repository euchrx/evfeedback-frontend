import { useEffect, useState } from "react";
import { getFeedbacks, type FeedbackItem } from "../../services/feedbacks";

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

export default function FeedbackKiosk() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadFeedbacks() {
    try {
      setIsLoading(true);
      const data = await getFeedbacks();
      setFeedbacks(Array.isArray(data) ? data : []);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFeedbacks();
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