import { useEffect, useMemo, useState } from "react";
import { Eye, ShieldCheck, TriangleAlert } from "lucide-react";
import {
  getSharedFeedbacks,
  type SharedFeedbackFilters,
} from "../../services/publicFeedbacks";
import type { FeedbackItem } from "../../services/feedbacks";

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

export default function PublicFeedbacksPage() {
  const token = useMemo(() => getTokenFromUrl(), []);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Link inválido ou incompleto. O token de acesso não foi informado.");
      return;
    }

    void loadFeedbacks(filters);
  }, [token]);

  async function loadFeedbacks(customFilters?: SharedFeedbackFilters) {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

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
      setError("Não foi possível validar o link ou carregar os feedbacks.");
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

  if (!token) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-500/30 bg-slate-900/80 p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <TriangleAlert className="text-rose-400" />
            <h1 className="text-2xl font-bold">Acesso indisponível</h1>
          </div>
          <p className="mt-4 text-slate-300">
            Este link não contém um token válido para visualização dos feedbacks.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/85 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  <ShieldCheck size={14} />
                  Acesso somente leitura
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Relatório de feedbacks
                </h1>

                <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
                  Visualização compartilhada por link seguro. Esta página não permite
                  edição, exclusão ou acesso ao painel administrativo.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                Token presente: <span className="font-semibold text-emerald-300">sim</span>
              </div>
            </div>
          </section>

          {error ? (
            <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <section className="rounded-3xl border border-slate-800 bg-slate-900/85 p-6 shadow-xl">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">Filtros</h2>
              <p className="text-sm text-slate-400">
                Refine a visualização por nota, filial, kiosk e período.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <select
                value={filters.rating ?? ""}
                onChange={(e) => handleChangeFilter("rating", e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              >
                <option value="">Todas as filiais</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>

              <select
                value={filters.kioskId ?? ""}
                onChange={(e) => handleChangeFilter("kioskId", e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              >
                <option value="">Todos os kiosks</option>
                {kioskOptions.map((kiosk) => (
                  <option key={kiosk.id} value={kiosk.id}>
                    {kiosk.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={filters.startDate ?? ""}
                onChange={(e) => handleChangeFilter("startDate", e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              />

              <input
                type="date"
                value={filters.endDate ?? ""}
                onChange={(e) => handleChangeFilter("endDate", e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              />
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por comentário, filial, kiosk, contato ou tag"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-sky-500"
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
                className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Limpar
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/85 p-6 shadow-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Lista de feedbacks</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {loading ? "Carregando..." : `${filteredFeedbacks.length} item(ns)`}
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
              {loading ? (
                <div className="px-6 py-10 text-center text-slate-400">
                  Carregando feedbacks...
                </div>
              ) : filteredFeedbacks.length === 0 ? (
                <div className="px-6 py-10 text-center text-slate-400">
                  Nenhum feedback encontrado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] divide-y divide-slate-800">
                    <thead className="bg-slate-950/70">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Data
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Nota
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

                    <tbody className="divide-y divide-slate-800 bg-slate-900">
                      {paginatedFeedbacks.map((feedback) => (
                        <tr key={feedback.id} className="hover:bg-slate-800/60">
                          <td className="px-4 py-4 text-sm text-slate-300">
                            {formatDate(feedback.createdAt)}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-300">
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                              {feedback.rating} - {getRatingLabel(feedback.rating)}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-300">
                            {feedback.branch?.name ?? "-"}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-300">
                            {feedback.kiosk?.name ?? "-"}
                          </td>

                          <td className="max-w-[260px] px-4 py-4 text-sm text-slate-300">
                            <span className="line-clamp-2">
                              {feedback.comment?.trim() || "Sem comentário."}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-300">
                            {(Array.isArray(feedback.tags) ? feedback.tags : []).length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {feedback.tags!.map((item) => (
                                  <span
                                    key={item.id}
                                    className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200"
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
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => setSelectedFeedback(feedback)}
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-200 transition hover:bg-slate-700"
                                title="Ver detalhes"
                              >
                                <Eye size={18} />
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

            {!loading && filteredFeedbacks.length > 0 ? (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-400">
                  Página {page} de {totalPages}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page === totalPages}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Detalhes do feedback</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Visualização em modo somente leitura.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Dados gerais
                </h3>

                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <p>
                    <span className="font-semibold text-white">Data:</span>{" "}
                    {formatDate(selectedFeedback.createdAt)}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Nota:</span>{" "}
                    {selectedFeedback.rating} -{" "}
                    {getRatingLabel(selectedFeedback.rating)}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Filial:</span>{" "}
                    {selectedFeedback.branch?.name ?? "-"}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Kiosk:</span>{" "}
                    {selectedFeedback.kiosk?.name ?? "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Contato
                </h3>

                {hasContactInfo(selectedFeedback) ? (
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <p>
                      <span className="font-semibold text-white">Nome:</span>{" "}
                      {selectedFeedback.contactName?.trim() || "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Telefone:</span>{" "}
                      {selectedFeedback.contactPhone?.trim() || "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Mensagem:</span>{" "}
                      {selectedFeedback.contactMessage?.trim() || "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Consentimento:</span>{" "}
                      {selectedFeedback.contactConsent ? "Sim" : "Não"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">
                    Nenhuma informação de contato registrada.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 p-4 md:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Comentário
                </h3>
                <p className="mt-4 whitespace-pre-wrap text-sm text-slate-300">
                  {selectedFeedback.comment?.trim() || "Sem comentário."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 p-4 md:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Tags
                </h3>

                {(selectedFeedback.tags ?? []).length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedFeedback.tags!.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200"
                      >
                        {item.tag?.name ?? "Tag"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">
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