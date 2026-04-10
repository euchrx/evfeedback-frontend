import { useEffect, useMemo, useState } from "react";
import {
  deleteFeedback,
  getFeedbacks,
  type FeedbackFilters,
  type FeedbackItem,
  type FeedbackEnvironmentType,
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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function hasContactInfo(feedback: FeedbackItem) {
  return Boolean(
    feedback.contactName?.trim() ||
      feedback.contactPhone?.trim() ||
      feedback.contactMessage?.trim() ||
      feedback.contactConsent
  );
}

function getEnvironmentLabel(environment?: FeedbackEnvironmentType) {
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

  const [filters, setFilters] = useState<FeedbackFilters>({
    companyId: resolvedCompanyId ?? currentUser?.companyId ?? "",
    branchId: "",
    kioskId: "",
    rating: "",
    environmentType: "",
    startDate: "",
    endDate: "",
    active: "",
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const selectedCompanyId = useMemo(() => {
    return superAdmin
      ? filters.companyId || currentUser?.companyId || undefined
      : resolvedCompanyId;
  }, [superAdmin, filters.companyId, resolvedCompanyId, currentUser?.companyId]);

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
          ? finalFilters.companyId || currentUser?.companyId || undefined
          : resolvedCompanyId,
        branchId: finalFilters.branchId || undefined,
        kioskId: finalFilters.kioskId || undefined,
        rating: finalFilters.rating || undefined,
        environmentType: finalFilters.environmentType || undefined,
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
    value: FeedbackFilters[K]
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
    void loadFeedbacks(filters);
  }

  function handleClearFilters() {
    const cleared: FeedbackFilters = {
      companyId: superAdmin ? currentUser?.companyId ?? "" : resolvedCompanyId ?? "",
      branchId: "",
      kioskId: "",
      rating: "",
      environmentType: "",
      startDate: "",
      endDate: "",
      active: "",
    };

    setFilters(cleared);
    setSearch("");
    setPage(1);
    void loadDependencies();
    void loadFeedbacks(cleared);
  }

  async function handleDelete(feedback: FeedbackItem) {
    if (!canManage) return;

    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este feedback? Esta ação não pode ser desfeita."
    );

    if (!confirmed) return;

    try {
      setDeletingId(feedback.id);
      setError("");

      const companyId = superAdmin
        ? feedback.companyId || filters.companyId || currentUser?.companyId || undefined
        : resolvedCompanyId || undefined;

      await deleteFeedback(feedback.id, companyId);

      setFeedbacks((current) => current.filter((item) => item.id !== feedback.id));
    } catch {
      setError("Não foi possível excluir o feedback.");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredFeedbacks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return feedbacks;
    }

    return feedbacks.filter((feedback) => {
      const tagsText = (feedback.tags ?? [])
        .map((item) => item.tag?.name ?? "")
        .join(" ")
        .toLowerCase();

      return (
        (feedback.comment ?? "").toLowerCase().includes(normalizedSearch) ||
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
      <section className="space-y-3">
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
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Feedbacks
        </h1>
        <p className="text-slate-600">
          Acompanhe as avaliações enviadas pelos clientes.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">Filtros</h2>
          <p className="text-sm text-slate-500">
            Refine os resultados por empresa, ambiente, nota, filial, kiosk, período e status.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            value={filters.environmentType ?? ""}
            onChange={(e) => handleChangeFilter("environmentType", e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
          >
            <option value="">Todos os ambientes</option>
            <option value="POSTO">Posto</option>
            <option value="CONVENIENCIA">Conveniência</option>
            <option value="RESTAURANTE">Restaurante</option>
          </select>

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

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por comentário, filial, kiosk, contato ou tag"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />

          <button
            onClick={handleApplyFilters}
            className="rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Aplicar filtros
          </button>

          <button
            onClick={handleClearFilters}
            className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">
              Lista de feedbacks
            </h2>
            <p className="text-sm text-slate-500">
              {loading ? "Carregando..." : `${filteredFeedbacks.length} item(ns)`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Carregando feedbacks...
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Nenhum feedback encontrado.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-sm text-slate-600">
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Nota</th>
                    <th className="px-4 py-3 font-semibold">Empresa</th>
                    <th className="px-4 py-3 font-semibold">Filial</th>
                    <th className="px-4 py-3 font-semibold">Kiosk</th>
                    <th className="px-4 py-3 font-semibold">Ambiente</th>
                    <th className="px-4 py-3 font-semibold">Comentário</th>
                    <th className="px-4 py-3 font-semibold">Contato</th>
                    <th className="px-4 py-3 font-semibold">Tags</th>
                    <th className="px-4 py-3 font-semibold">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedFeedbacks.map((feedback) => (
                    <tr key={feedback.id} className="align-top">
                      <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {formatDate(feedback.createdAt)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            feedback.rating <= 2
                              ? "bg-rose-100 text-rose-700"
                              : feedback.rating === 3
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {feedback.rating} - {getRatingLabel(feedback.rating)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {superAdmin ? feedback.company?.name ?? "-" : "-"}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {feedback.branch?.name ?? "-"}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {feedback.kiosk?.name ?? "-"}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {getEnvironmentLabel(feedback.kiosk?.environmentType)}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        <div className="max-w-[280px] whitespace-normal break-words">
                          {feedback.comment?.trim() || "Sem comentário."}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {hasContactInfo(feedback) ? (
                          <div className="space-y-1">
                            <div>
                              <span className="font-medium text-slate-800">Nome:</span>{" "}
                              {feedback.contactName?.trim() || "-"}
                            </div>
                            <div>
                              <span className="font-medium text-slate-800">Telefone:</span>{" "}
                              {feedback.contactPhone?.trim() || "-"}
                            </div>
                            <div>
                              <span className="font-medium text-slate-800">Consentimento:</span>{" "}
                              {feedback.contactConsent ? "Sim" : "Não"}
                            </div>
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {(Array.isArray(feedback.tags) ? feedback.tags : []).length > 0 ? (
                          <div className="flex max-w-[220px] flex-wrap gap-2">
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
                          <span>-</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(feedback)}
                            disabled={deletingId === feedback.id}
                            className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === feedback.id ? "Excluindo..." : "Excluir"}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-500">
                Página {page} de {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  Anterior
                </button>

                <button
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
          </>
        )}
      </div>
    </section>
  );
}