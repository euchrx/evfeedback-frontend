import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "../../../services/auth";
import { getCompanies, type Company } from "../../../services/companies";
import {
  activateBranch,
  createBranch,
  deactivateBranch,
  getBranches,
  hardDeleteBranch,
  type Branch,
} from "../../../services/branches";

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";
  companyId?: string | null;
};

export default function BranchesPage() {
  const currentUser = getStoredUser() as StoredUser | null;

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const isCompanyAdmin = currentUser?.role === "COMPANY_ADMIN";
  const isManager = currentUser?.role === "MANAGER";
  const canViewBranches = isSuperAdmin || isCompanyAdmin || isManager;
  const canManageBranches = isSuperAdmin || isCompanyAdmin;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const visibleBranches = useMemo(() => {
    if (showInactive) return branches;
    return branches.filter((branch) => branch.active);
  }, [branches, showInactive]);

  async function load() {
    try {
      setError("");
      setLoading(true);

      const resolvedCompanyId = isSuperAdmin
        ? undefined
        : currentUser?.companyId ?? undefined;

      const branchesPromise = getBranches(resolvedCompanyId);
      const companiesPromise = isSuperAdmin ? getCompanies() : Promise.resolve([]);

      const [branchesData, companiesData] = await Promise.all([
        branchesPromise,
        companiesPromise,
      ]);

      setBranches(Array.isArray(branchesData) ? branchesData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);

      if (!isSuperAdmin && currentUser?.companyId) {
        setCompanyId(currentUser.companyId);
      }
    } catch {
      setError("Não foi possível carregar as filiais.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Informe o nome da filial.");
      return;
    }

    const resolvedCompanyId = isSuperAdmin
      ? companyId
      : currentUser?.companyId ?? "";

    if (!resolvedCompanyId) {
      setError("Selecione uma empresa.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createBranch({
        name: name.trim(),
        code: code.trim() || undefined,
        active: true,
        companyId: resolvedCompanyId,
      });

      setName("");
      setCode("");

      if (isSuperAdmin) {
        setCompanyId("");
      }

      await load();
    } catch {
      setError("Não foi possível criar a filial.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(branch: Branch) {
    const confirmed = window.confirm(
      `Deseja desativar a filial "${branch.name}"?`,
    );

    if (!confirmed) return;

    try {
      setError("");

      await deactivateBranch(
        branch.id,
        isSuperAdmin ? branch.companyId : undefined,
      );

      await load();
    } catch {
      setError("Não foi possível desativar a filial.");
    }
  }

  async function handleActivate(branch: Branch) {
    try {
      setError("");

      await activateBranch(
        branch.id,
        isSuperAdmin ? branch.companyId : undefined,
      );

      await load();
    } catch {
      setError("Não foi possível reativar a filial.");
    }
  }

  async function handleHardDelete(branch: Branch) {
    const confirmed = window.confirm(
      `Excluir definitivamente a filial "${branch.name}"? Essa ação não poderá ser desfeita.`,
    );

    if (!confirmed) return;

    try {
      setError("");

      await hardDeleteBranch(
        branch.id,
        isSuperAdmin ? branch.companyId : undefined,
      );

      await load();
    } catch {
      setError("Não foi possível excluir definitivamente a filial.");
    }
  }

  useEffect(() => {
    if (canViewBranches) {
      load();
    } else {
      setLoading(false);
    }
  }, [canViewBranches]);

  if (!canViewBranches) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-xl font-bold text-rose-700">Acesso negado</h1>
        <p className="mt-2 text-sm text-rose-600">
          Você não tem permissão para acessar a página de filiais.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Filiais</h1>
        <p className="mt-1 text-sm text-slate-600">
          Gerencie as filiais da plataforma.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {canManageBranches ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Nova filial</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da filial"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />

            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código da filial"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />

            <select
              value={isSuperAdmin ? companyId : currentUser?.companyId ?? ""}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={!isSuperAdmin}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {isSuperAdmin ? (
                <>
                  <option value="">Selecione a empresa</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </>
              ) : (
                <option value={currentUser?.companyId ?? ""}>Empresa atual</option>
              )}
            </select>

            <button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Criando..." : "Criar filial"}
            </button>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Mostrar inativas
            </label>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Mostrar inativas
          </label>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Filiais cadastradas
          </h2>
          <span className="text-sm text-slate-500">
            {visibleBranches.length} item(ns)
          </span>
        </div>

        {loading ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Carregando filiais...
          </div>
        ) : visibleBranches.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Nenhuma filial cadastrada.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {visibleBranches.map((branch) => {
              const canHardDelete = isSuperAdmin;

              return (
                <div
                  key={branch.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {branch.name}
                      </h3>

                      <p className="text-sm text-slate-600">
                        Código: <span className="font-medium">{branch.code || "-"}</span>
                      </p>

                      <p className="text-sm text-slate-600">
                        Empresa:{" "}
                        <span className="font-medium">
                          {branch.company?.name ?? "-"}
                        </span>
                      </p>

                      <p className="text-sm text-slate-600">
                        Status:{" "}
                        <span
                          className={
                            branch.active
                              ? "font-medium text-emerald-700"
                              : "font-medium text-amber-700"
                          }
                        >
                          {branch.active ? "Ativa" : "Inativa"}
                        </span>
                      </p>
                    </div>

                    {canManageBranches ? (
                      <div className="flex flex-wrap gap-2">
                        {branch.active ? (
                          <button
                            onClick={() => handleDeactivate(branch)}
                            className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200"
                          >
                            Desativar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(branch)}
                            className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200"
                          >
                            Reativar
                          </button>
                        )}

                        {canHardDelete ? (
                          <button
                            onClick={() => handleHardDelete(branch)}
                            className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                          >
                            Excluir definitivo
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}