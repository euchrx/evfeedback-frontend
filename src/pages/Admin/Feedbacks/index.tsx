import { useEffect, useMemo, useState } from "react";
import {
  getFeedbacks,
  type FeedbackFilters,
  type FeedbackItem,
} from "../../../services/feedbacks";
import { getBranches, type Branch } from "../../../services/branches";
import { getKiosks, type Kiosk } from "../../../services/kiosks";
import { getCompanies, type Company } from "../../../services/companies";
import { getStoredUser } from "../../../services/auth";
import {
  canViewOperationalModules,
  getResolvedCompanyId,
  isSuperAdmin,
} from "../../../utils/permissions";

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

export default function FeedbacksPage() {
  const currentUser = getStoredUser();

  const canView = canViewOperationalModules(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState<FeedbackFilters>({
    companyId: resolvedCompanyId ?? "",
    branchId: "",
    kioskId: "",
    rating: "",
    startDate: "",
    endDate: "",
    active: "",
  });

  const selectedCompanyId = useMemo(() => {
    return superAdmin ? filters.companyId || undefined : resolvedCompanyId;
  }, [superAdmin, filters.companyId, resolvedCompanyId]);

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
        companyId: superAdmin ? finalFilters.companyId || undefined : resolvedCompanyId,
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
    void loadFeedbacks(filters);
  }

  function handleClearFilters() {
    const cleared: FeedbackFilters = {
      companyId: superAdmin ? "" : resolvedCompanyId ?? "",
      branchId: "",
      kioskId: "",
      rating: "",
      startDate: "",
      endDate: "",
      active: "",
    };

    setFilters(cleared);
    void loadDependencies();
    void loadFeedbacks(cleared);
  }

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
            Refine os resultados por empresa, nota, filial, kiosk, período e status.
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

          <div className="flex gap-3">
            <button
              onClick={handleApplyFilters}
              className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Aplicar filtros
            </button>

            <button
              onClick={handleClearFilters}
              className="w-full rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">
            Lista de feedbacks
          </h2>
          <p className="text-sm text-slate-500">
            {loading ? "Carregando..." : `${feedbacks.length} item(ns)`}
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Carregando feedbacks...
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Nenhum feedback encontrado.
          </div>
        ) : (
          <div className="grid gap-4">
            {feedbacks.map((feedback) => (
              <article
                key={feedback.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          feedback.rating <= 2
                            ? "bg-rose-100 text-rose-700"
                            : feedback.rating === 3
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {getRatingLabel(feedback.rating)}
                      </span>

                      <span className="text-sm text-slate-500">
                        {formatDate(feedback.createdAt)}
                      </span>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      {superAdmin ? (
                        <p>
                          <span className="font-medium text-slate-800">Empresa:</span>{" "}
                          {feedback.company?.name ?? "Não informada"}
                        </p>
                      ) : null}

                      <p>
                        <span className="font-medium text-slate-800">Kiosk:</span>{" "}
                        {feedback.kiosk?.name ?? "Não informado"}
                      </p>

                      <p>
                        <span className="font-medium text-slate-800">Filial:</span>{" "}
                        {feedback.branch?.name ?? "Não informada"}
                      </p>

                      <p>
                        <span className="font-medium text-slate-800">Status:</span>{" "}
                        {feedback.active === false ? "Inativo" : "Ativo"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-800">Comentário</p>
                      <p className="text-sm text-slate-600">
                        {feedback.comment?.trim() ? feedback.comment : "Sem comentário."}
                      </p>
                    </div>

                    {hasContactInfo(feedback) ? (
                      <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-amber-900">
                            Dados para contato
                          </p>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              feedback.contactConsent
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {feedback.contactConsent
                              ? "Autorizou contato"
                              : "Sem autorização explícita"}
                          </span>
                        </div>

                        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                          <p>
                            <span className="font-medium text-slate-800">Nome:</span>{" "}
                            {feedback.contactName?.trim() || "Não informado"}
                          </p>

                          <p>
                            <span className="font-medium text-slate-800">Telefone / WhatsApp:</span>{" "}
                            {feedback.contactPhone?.trim() || "Não informado"}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-800">
                            Mensagem para contato
                          </p>
                          <p className="text-sm text-slate-700">
                            {feedback.contactMessage?.trim()
                              ? feedback.contactMessage
                              : "Sem mensagem adicional."}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-800">Tags</p>

                      {(Array.isArray(feedback.tags) ? feedback.tags : []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {feedback.tags!.map((item) => (
                            <span
                              key={item.id}
                              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                            >
                              {item.tag?.name ?? "Tag"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Sem tags.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Nota
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {feedback.rating}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}