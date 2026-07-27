import { useEffect, useMemo, useState } from "react";
import { Ban, Building2, Check, ChevronDown, MapPin, Search } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { getStoredUser } from "../../services/auth";
import { getBranches, type Branch } from "../../services/branches";
import { getAdminScopeBranchId, getAdminScopeCompanyId, NO_BRANCH_SCOPE, setAdminBranchScope } from "../../services/adminScope";
import { getResolvedCompanyId, isSuperAdmin } from "../../utils/permissions";

export function AdminLayout() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const superAdmin = isSuperAdmin(user);
  const companyId = getResolvedCompanyId(user);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [scopeBranchId, setScopeBranchId] = useState(getAdminScopeBranchId);
  const [scopeCompanyId, setScopeCompanyId] = useState(getAdminScopeCompanyId);
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  const [pendingBranchId, setPendingBranchId] = useState(getAdminScopeBranchId);
  const [pendingCompanyId, setPendingCompanyId] = useState(getAdminScopeCompanyId);
  const [isApplyingScope, setIsApplyingScope] = useState(false);
  const [scopeSearch, setScopeSearch] = useState("");
  const [expandedCompanyIds, setExpandedCompanyIds] = useState<Set<string>>(
    () => new Set(getAdminScopeCompanyId() ? [getAdminScopeCompanyId()] : []),
  );

  useEffect(() => {
    if (superAdmin && !scopeBranchId && !scopeCompanyId) {
      setScopeBranchId(NO_BRANCH_SCOPE);
      setPendingBranchId(NO_BRANCH_SCOPE);
      setAdminBranchScope(NO_BRANCH_SCOPE);
    }
  }, [superAdmin, scopeBranchId, scopeCompanyId]);

  useEffect(() => {
    void getBranches(superAdmin ? undefined : companyId)
      .then((data) => {
        const activeBranches = (Array.isArray(data) ? data : []).filter((branch) => branch.active);
        setBranches(activeBranches);
        if (scopeBranchId && scopeBranchId !== NO_BRANCH_SCOPE && !activeBranches.some((branch) => branch.id === scopeBranchId)) {
          setScopeBranchId("");
          setAdminBranchScope("");
        }
      })
      .catch(() => setBranches([]));
  }, [superAdmin, companyId, scopeBranchId]);

  useEffect(() => {
    if (!scopeMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setScopeMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [scopeMenuOpen]);

  const selectedBranch = branches.find((branch) => branch.id === scopeBranchId);
  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((branch) => {
      const id = branch.companyId ?? branch.company?.id;
      if (id) map.set(id, branch.company?.name ?? "Rede");
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [branches]);
  const selectedCompanyName = companyOptions.find((company) => company.id === scopeCompanyId)?.name;
  const filteredBranches = useMemo(() => {
    const query = scopeSearch.trim().toLocaleLowerCase("pt-BR");
    if (!query) return branches;
    return branches.filter((branch) =>
      `${branch.name} ${branch.code ?? ""} ${branch.company?.name ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(query),
    );
  }, [branches, scopeSearch]);

  function openScopeMenu() {
    setPendingBranchId(scopeBranchId);
    setPendingCompanyId(scopeCompanyId);
    if (scopeCompanyId) {
      setExpandedCompanyIds((current) => new Set(current).add(scopeCompanyId));
    }
    setScopeSearch("");
    setScopeMenuOpen(true);
  }

  function handleApplyScope() {
    const branch = branches.find((item) => item.id === pendingBranchId);
    setIsApplyingScope(true);
    setScopeMenuOpen(false);
    setScopeBranchId(pendingBranchId);
    setScopeCompanyId(pendingCompanyId);
    setAdminBranchScope(
      pendingBranchId,
      branch?.companyId ?? branch?.company?.id ?? pendingCompanyId,
    );

    window.setTimeout(() => {
      navigate("/admin/dashboard");
      setIsApplyingScope(false);
    }, 500);
  }

  if (isApplyingScope) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white text-sm font-semibold text-slate-700">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-0 lg:h-screen"><Sidebar /></aside>

        <div className="min-w-0">
          <div className="sticky top-0 z-40 flex h-16 items-center justify-end border-b border-slate-200 bg-white/95 px-3 backdrop-blur-xl sm:px-6">
            <button
              type="button"
              onClick={() => (scopeMenuOpen ? setScopeMenuOpen(false) : openScopeMenu())}
              aria-expanded={scopeMenuOpen}
              aria-haspopup="dialog"
              className="flex h-10 max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 text-left transition hover:border-cyan-300 hover:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/10 sm:max-w-sm sm:px-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700"><MapPin className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                {scopeBranchId === NO_BRANCH_SCOPE ? "Nenhuma filial" : selectedBranch?.name ?? (selectedCompanyName ? `Todas · ${selectedCompanyName}` : "Selecione uma rede")}
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition ${scopeMenuOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>

            {scopeMenuOpen ? (
              <>
                <button type="button" aria-label="Fechar menu de escopo" className="fixed inset-0 z-40 cursor-default" onClick={() => setScopeMenuOpen(false)} />
                <div role="dialog" aria-label="Selecionar escopo da filial" className="scope-menu-enter absolute right-3 top-[calc(100%+0.5rem)] z-50 w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-22px_rgba(15,23,42,0.34)] sm:right-6">
                  <div className="border-b border-slate-100 p-4">
                    <h2 className="text-sm font-semibold text-slate-900">Selecionar filial</h2>
                    <div className="relative mt-3">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input autoFocus value={scopeSearch} onChange={(event) => setScopeSearch(event.target.value)} placeholder="Buscar filial..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10" />
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto p-2">
                    {superAdmin ? (
                      <button type="button" onClick={() => { setPendingBranchId(NO_BRANCH_SCOPE); setPendingCompanyId(""); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${pendingBranchId === NO_BRANCH_SCOPE ? "bg-cyan-50 text-cyan-800" : "hover:bg-slate-50"}`}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Ban className="h-4 w-4" aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Nenhuma filial</span><span className="block truncate text-xs text-slate-500">Não exibir dados das redes</span></span>
                        {pendingBranchId === NO_BRANCH_SCOPE ? <Check className="h-4 w-4 text-cyan-700" aria-hidden="true" /> : null}
                      </button>
                    ) : null}
                    {companyOptions.map((company) => {
                      const companyBranches = filteredBranches.filter((branch) => (branch.companyId ?? branch.company?.id) === company.id);
                      const allSelected = !pendingBranchId && pendingCompanyId === company.id;
                      const expanded = scopeSearch.trim() ? companyBranches.length > 0 : expandedCompanyIds.has(company.id);
                      if (scopeSearch.trim() && companyBranches.length === 0) return null;
                      return (
                        <div key={company.id} className="mt-1 border-t border-slate-100 pt-1 first:border-0">
                          <button
                            type="button"
                            onClick={() => setExpandedCompanyIds((current) => {
                              const next = new Set(current);
                              if (next.has(company.id)) next.delete(company.id);
                              else next.add(company.id);
                              return next;
                            })}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50"
                            aria-expanded={expanded}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Building2 className="h-4 w-4" aria-hidden="true" /></span>
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{company.name}</span>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                          </button>
                          {expanded ? (
                            <div className="ml-4 border-l border-slate-200 pl-2">
                              <button type="button" onClick={() => { setPendingBranchId(""); setPendingCompanyId(company.id); }} className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${allSelected ? "bg-cyan-50 text-cyan-800" : "hover:bg-slate-50"}`}>
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Building2 className="h-3.5 w-3.5" aria-hidden="true" /></span>
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold">Todas as filiais</span>
                                {allSelected ? <Check className="h-4 w-4 text-cyan-700" aria-hidden="true" /> : null}
                              </button>
                              {companyBranches.map((branch) => {
                                const selected = branch.id === pendingBranchId;
                                return (
                                  <button key={branch.id} type="button" onClick={() => { setPendingBranchId(branch.id); setPendingCompanyId(company.id); }} className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${selected ? "bg-cyan-50 text-cyan-800" : "hover:bg-slate-50"}`}>
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><MapPin className="h-3.5 w-3.5" aria-hidden="true" /></span>
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{branch.name}</span>
                                    {selected ? <Check className="h-4 w-4 shrink-0 text-cyan-700" aria-hidden="true" /> : null}
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                    {filteredBranches.length === 0 ? <p className="px-3 py-8 text-center text-sm text-slate-500">Nenhuma filial encontrada.</p> : null}
                  </div>                  <div className="border-t border-slate-100 p-3">
                    <button type="button" onClick={handleApplyScope} className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-500/20">
                      Selecionar
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="p-4 sm:p-6">
            <main className="min-w-0"><Outlet /></main>
          </div>
        </div>
      </div>
    </div>
  );
}
