import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "../../../services/auth";
import { getCompanies, type Company } from "../../../services/companies";
import { getBranches, type Branch } from "../../../services/branches";
import { getKiosks, type Kiosk } from "../../../services/kiosks";
import {
  getFeedbacks,
  type FeedbackFilters,
  type FeedbackItem,
} from "../../../services/feedbacks";

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";
  companyId?: string | null;
};

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

function getRatingBadgeClass(rating: number) {
  switch (rating) {
    case 1:
      return "bg-rose-100 text-rose-700";
    case 2:
      return "bg-orange-100 text-orange-700";
    case 3:
      return "bg-amber-100 text-amber-700";
    case 4:
      return "bg-emerald-100 text-emerald-700";
    case 5:
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-slate-100 text-slate-700";
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
  const currentUser = getStoredUser() as StoredUser | null;

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const isCompanyAdmin = currentUser?.role === "COMPANY_ADMIN";
  const isManager = currentUser?.role === "MANAGER";
  const canViewFeedbacks = isSuperAdmin || isCompanyAdmin || isManager;

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState<FeedbackFilters>({
    companyId: "",
    branchId: "",
    kioskId: "",
    rating: "",
    startDate: "",
    endDate: "",
    active: "",
  });

  const filteredBranches = useMemo(() => {
    if (!isSuperAdmin) return branches;
    if (!filters.companyId) return branches;
    return branches.filter((branch) => branch.companyId === filters.companyId);
  }, [branches, filters.companyId, isSuperAdmin]);

  const filteredKiosks = useMemo(() => {
    if (!isSuperAdmin) return kiosks;

    let result = kiosks;

    if (filters.companyId) {
      result = result.filter((kiosk) => kiosk.companyId === filters.companyId);
    }

    if (filters.branchId) {
      result = result.filter((kiosk) => kiosk.branchId === filters.branchId);
    }

    return result;
  }, [kiosks, filters.companyId, filters.branchId, isSuperAdmin]);

  function handleChangeFilter<K extends keyof FeedbackFilters>(
    field: K,
    value: FeedbackFilters[K],
  ) {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function loadDependencies() {
    const scopeCompanyId = isSuperAdmin
      ? undefined
      : currentUser?.companyId ?? undefined;

    const companiesPromise = isSuperAdmin ? getCompanies() : Promise.resolve([]);
    const branchesPromise = getBranches(scopeCompanyId);
    const kiosksPromise = getKiosks(scopeCompanyId);

    const [companiesData, branchesData, kiosksData] = await Promise.all([
      companiesPromise,
      branchesPromise,
      kiosksPromise,
    ]);

    setCompanies(Array.isArray(companiesData) ? companiesData : []);
    setBranches(Array.isArray(branchesData) ? branchesData : []);
    setKiosks(Array.isArray(kiosksData) ? kiosksData : []);
  }

  async function loadFeedbacks(customFilters?: FeedbackFilters) {
    try {
      setError("");
      setLoading(true);

      const finalFilters = customFilters ?? filters;

      const sanitizedFilters: FeedbackFilters = {
        companyId: isSuperAdmin
          ? finalFilters.companyId || undefined
          : currentUser?.companyId ?? undefined,
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

  async function initialLoad() {
    try {
      await loadDependencies();

      const initialFilters: FeedbackFilters = {
        companyId: isSuperAdmin ? "" : currentUser?.companyId ?? "",
        branchId: "",
        kioskId: "",
        rating: "",
        startDate: "",
        endDate: "",
        active: "",
      };

      setFilters(initialFilters);
      await loadFeedbacks(initialFilters);
    } catch {
      setError("Não foi possível carregar os dados da página.");
      setLoading(false);
    }
  }

  function handleApplyFilters() {
    loadFeedbacks(filters);
  }

  function handleClearFilters() {
    const cleared: FeedbackFilters = {
      companyId: isSuperAdmin ? "" : currentUser?.companyId ?? "",
      branchId: "",
      kioskId: "",
      rating: "",
      startDate: "",
      endDate: "",
      active: "",
    };

    setFilters(cleared);
    loadFeedbacks(cleared);
  }

  useEffect(() => {
    if (canViewFeedbacks) {
      initialLoad();
    } else {
      setLoading(false);
    }
  }, [canViewFeedbacks]);

  useEffect(() => {
    if (isSuperAdmin && filters.branchId) {
      const exists = filteredBranches.some((branch) => branch.id === filters.branchId);
      if (!exists) {
        setFilters((prev) => ({ ...prev, branchId: "" }));
      }
    }
  }, [filteredBranches, filters.branchId, isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin && filters.kioskId) {
      const exists = filteredKiosks.some((kiosk) => kiosk.id === filters.kioskId);
      if (!exists) {
        setFilters((prev) => ({ ...prev, kioskId: "" }));
      }
    }
  }, [filteredKiosks, filters.kioskId, isSuperAdmin]);

  if (!canViewFeedbacks) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-xl font-bold text-rose-700">Acesso negado</h1>
        <p className="mt-2 text-sm text-rose-600">
          Você não tem permissão para acessar a página de feedbacks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Feedbacks</h1>
        <p className="mt-1 text-sm text-slate-600">
          Acompanhe as avaliações enviadas pelos clientes.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Filtros</h2>
        <p className="mt-1 text-sm text-slate-500">
          Refine os resultados por empresa, filial, kiosk, nota e período.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isSuperAdmin ? (
            <select
              value={filters.companyId ?? ""}
              onChange={(e) => handleChangeFilter("companyId", e.target.value)}
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

          <select
            value={filters.branchId ?? ""}
            onChange={(e) => handleChangeFilter("branchId", e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
          >
            <option value="">Todas as filiais</option>
            {filteredBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>

          <select
            value={filters.kioskId ?? ""}
            onChange={(e) => handleChangeFilter("kioskId", e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
          >
            <option value="">Todos os kiosks</option>
            {filteredKiosks.map((kiosk) => (
              <option key={kiosk.id} value={kiosk.id}>
                {kiosk.name}
              </option>
            ))}
          </select>

          <select
            value={filters.rating ?? ""}
            onChange={(e) => handleChangeFilter("rating", e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
          >
            <option value="">Todas as notas</option>
            <option value="1">1 - Péssimo</option>
            <option value="2">2 - Ruim</option>
            <option value="3">3 - Ok</option>
            <option value="4">4 - Bom</option>
            <option value="5">5 - Excelente</option>
          </select>

          <input
            type="date"
            value={filters.startDate ?? ""}
            onChange={(e) => handleChangeFilter("startDate", e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />

          <input
            type="date"
            value={filters.endDate ?? ""}
            onChange={(e) => handleChangeFilter("endDate", e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />

          <select
            value={filters.active ?? ""}
            onChange={(e) => handleChangeFilter("active", e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
          >
            <option value="">Ativos e inativos</option>
            <option value="true">Somente ativos</option>
            <option value="false">Somente inativos</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={handleApplyFilters}
            className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Aplicar filtros
          </button>

          <button
            onClick={handleClearFilters}
            className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Lista de feedbacks
          </h2>
          <span className="text-sm text-slate-500">
            {feedbacks.length} item(ns)
          </span>
        </div>

        {loading ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Carregando feedbacks...
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Nenhum feedback encontrado.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getRatingBadgeClass(
                          feedback.rating,
                        )}`}
                      >
                        {getRatingLabel(feedback.rating)}
                      </span>

                      <span className="text-xs text-slate-500">
                        {formatDate(feedback.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600">
                      Empresa:{" "}
                      <span className="font-medium">
                        {feedback.company?.name ?? "-"}
                      </span>
                    </p>

                    <p className="text-sm text-slate-600">
                      Kiosk:{" "}
                      <span className="font-medium">
                        {feedback.kiosk?.name ?? "Não informado"}
                      </span>
                    </p>

                    <p className="text-sm text-slate-600">
                      Filial:{" "}
                      <span className="font-medium">
                        {feedback.branch?.name ?? "Não informada"}
                      </span>
                    </p>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Comentário
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {feedback.comment?.trim()
                          ? feedback.comment
                          : "Sem comentário."}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tags
                      </p>

                      {(feedback.tags ?? []).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {feedback.tags!.map((item) => (
                            <span
                              key={item.id}
                              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                              style={{
                                backgroundColor: item.tag?.color ?? undefined,
                                color: item.tag?.color ? "#ffffff" : undefined,
                              }}
                            >
                              {item.tag?.name ?? "Tag"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-slate-600">Sem tags.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                      Nota {feedback.rating}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}