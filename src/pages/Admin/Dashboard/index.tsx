import { useEffect, useMemo, useState } from "react";
import { useAdminScopeBranchId, useAdminScopeCompanyId } from "../../../hooks/useAdminScope";
import { NO_BRANCH_SCOPE } from "../../../services/adminScope";
import {
  getDashboardSummary,
  type DashboardFilters,
  type DashboardSummary,
} from "../../../services/dashboard";
import { getStoredUser } from "../../../services/auth";
import {
  canViewOperationalModules,
  getResolvedCompanyId,
  isSuperAdmin,
} from "../../../utils/permissions";
import { useToast } from "../../../components/ui/ToastProvider";

function formatAverage(value: number) {
  return Number.isFinite(value) ? value.toFixed(1).replace(".", ",") : "0,0";
}

function formatPercentage(value: number) {
  return `${Math.round(Number.isFinite(value) ? value : 0)}%`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getRatingLabel(rating: number) {
  return ["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"][rating] ?? `${rating}`;
}

export default function DashboardPage() {
  const toast = useToast();
  const currentUser = getStoredUser();
  const canView = canViewOperationalModules(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);
  const scopeBranchId = useAdminScopeBranchId();
  const scopeCompanyId = useAdminScopeCompanyId();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>({ dateFrom: "", dateTo: "" });

  const selectedCompanyId = superAdmin ? scopeCompanyId || undefined : resolvedCompanyId;

  async function loadDashboard(customFilters: DashboardFilters = filters) {
    try {
      setIsLoading(true);
      if (superAdmin && scopeBranchId === NO_BRANCH_SCOPE) {
        setSummary(null);
        return;
      }

      const requestFilters: DashboardFilters = {
        companyId: selectedCompanyId,
        branchId: scopeBranchId || undefined,
        dateFrom: customFilters.dateFrom || undefined,
        dateTo: customFilters.dateTo || undefined,
      };
      const summaryData = await getDashboardSummary(requestFilters);
      setSummary(summaryData);
    } catch {
      toast.error("Não foi possível carregar a análise do período.");
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!canView) {
      setIsLoading(false);
      return;
    }
    void loadDashboard();
  }, [canView, selectedCompanyId, scopeBranchId]);

  const analysis = useMemo(() => {
    const counts = new Map((summary?.ratings ?? []).map((item) => [item.rating, item.count]));
    const total = summary?.total ?? 0;
    const ratingRows = [5, 4, 3, 2, 1].map((rating) => {
      const count = counts.get(rating) ?? 0;
      return { rating, count, share: total ? (count / total) * 100 : 0 };
    });
    const positive = (counts.get(3) ?? 0) + (counts.get(4) ?? 0) + (counts.get(5) ?? 0);
    const critical = (counts.get(1) ?? 0) + (counts.get(2) ?? 0);
    return {
      total,
      ratingRows,
      positive,
      critical,
      satisfactionRate: total ? (positive / total) * 100 : 0,
      criticalRate: total ? (critical / total) * 100 : 0,
    };
  }, [summary]);

  if (!canView) {
    return <p className="border-l-2 border-rose-500 pl-4 text-sm text-rose-700">Você não tem permissão para acessar o dashboard.</p>;
  }

  return (
    <section className="pb-10">
      {isLoading ? (
        <div className="py-20 text-center text-sm text-slate-500">Preparando a análise...</div>
      ) : superAdmin && scopeBranchId === NO_BRANCH_SCOPE ? (
        <div className="py-20 text-center">
          <p className="text-base font-semibold text-slate-800">Selecione uma empresa ou filial</p>
          <p className="mt-2 text-sm text-slate-500">O escopo pode ser alterado no seletor do topo da página.</p>
        </div>
      ) : (
        <div>
          <section className="py-8">
            <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Dashboard</h2>
                <p className="mt-1 text-sm text-slate-500">Visão consolidada da experiência registrada no período selecionado.</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  De
                  <input type="date" value={filters.dateFrom ?? ""} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-500" />
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  Até
                  <input type="date" value={filters.dateTo ?? ""} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-500" />
                </label>
                <button type="button" onClick={() => void loadDashboard(filters)} className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700">Filtrar</button>
                <button type="button" onClick={() => { const cleared = { dateFrom: "", dateTo: "" }; setFilters(cleared); void loadDashboard(cleared); }} className="h-10 px-2 text-sm font-medium text-slate-500 hover:text-slate-900">Limpar</button>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-y-7 lg:grid-cols-3 lg:divide-x lg:divide-slate-200">
              <div className="lg:pr-7"><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Média geral</dt><dd className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{formatAverage(summary?.averageRating ?? 0)}<span className="text-base font-normal text-slate-400"> / 5</span></dd></div>
              <div className="lg:px-7"><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Satisfação</dt><dd className="mt-2 text-3xl font-semibold tracking-tight text-emerald-700">{formatPercentage(analysis.satisfactionRate)}</dd></div>
              <div className="lg:px-7"><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Críticas</dt><dd className="mt-2 text-3xl font-semibold tracking-tight text-rose-700">{formatPercentage(analysis.criticalRate)}</dd></div>
            </dl>
          </section>

          <section className="grid gap-10 py-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Composição das avaliações</h2>
              <p className="mt-1 text-sm text-slate-500">Entenda como as respostas estão distribuídas entre as notas.</p>
              <div className="mt-6 space-y-5">
                {analysis.ratingRows.map((item) => (
                  <div key={item.rating} className="grid grid-cols-[110px_1fr_84px] items-center gap-4 text-sm">
                    <span className="font-medium text-slate-700">{getRatingLabel(item.rating)}</span>
                    <div className="h-2 bg-slate-100"><div className={`h-full ${item.rating <= 2 ? "bg-rose-500" : item.rating === 3 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${item.share}%` }} /></div>
                    <span className="text-right tabular-nums text-slate-500">{item.count} · {formatPercentage(item.share)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Motivos recorrentes</h2>
              <p className="mt-1 text-sm text-slate-500">Principais assuntos associados aos feedbacks recebidos.</p>
              <ol className="mt-5 space-y-1">
                {(summary?.topTags ?? []).map((tag, index) => (
                  <li key={tag.name} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 py-3 text-sm">
                    <span className="text-xs tabular-nums text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                    <span className="font-medium text-slate-800">{tag.name}</span>
                    <span className="tabular-nums text-slate-500">{tag.count} marcações</span>
                  </li>
                ))}
                {!summary?.topTags?.length && <li className="py-8 text-sm text-slate-400">Nenhum motivo foi marcado no período.</li>}
              </ol>
            </div>
          </section>

          <section className="py-8">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Atividade recente</h2>
              <p className="mt-1 text-sm text-slate-500">Acompanhe os últimos feedbacks registrados no sistema.</p>
              <div className="mt-5 space-y-1">
                {(summary?.recentFeedbacks ?? []).map((item) => {
                  return <div key={item.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-medium text-slate-800">{item.branchName ?? "Filial não informada"} <span className="font-normal text-slate-400">·</span> {item.kioskName ?? "Kiosk não informado"}</p><p className="mt-1 text-sm leading-6 text-slate-500">{item.comment?.trim() || "Sem comentário."}</p>{item.tags.length > 0 ? <p className="mt-2 text-xs text-slate-400">{item.tags.join(" · ")}</p> : null}</div><div className="flex items-start justify-between gap-6 sm:block sm:text-right"><p className="text-sm font-semibold tabular-nums text-slate-800">Nota {item.rating}</p><p className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</p></div></div>;
                })}
                {!summary?.recentFeedbacks?.length && <p className="py-8 text-sm text-slate-400">Nenhum feedback encontrado no período.</p>}
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
