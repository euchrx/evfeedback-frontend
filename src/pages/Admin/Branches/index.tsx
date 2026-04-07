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
import {
  canHardDelete,
  canManageOperationalModules,
  canViewOperationalModules,
  getResolvedCompanyId,
  isSuperAdmin,
} from "../../../utils/permissions";

export default function BranchesPage() {
  const currentUser = getStoredUser();

  const canView = canViewOperationalModules(currentUser);
  const canManage = canManageOperationalModules(currentUser);
  const canDeletePermanently = canHardDelete(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [companyId, setCompanyId] = useState(resolvedCompanyId ?? "");
  const [showInactive, setShowInactive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const selectedCompanyId = useMemo(() => {
    return superAdmin ? companyId || undefined : resolvedCompanyId;
  }, [superAdmin, companyId, resolvedCompanyId]);

  const visibleBranches = useMemo(() => {
    if (showInactive) return branches;
    return branches.filter((branch) => branch.active);
  }, [branches, showInactive]);

  async function load() {
    try {
      setError("");
      setLoading(true);

      const requests: Promise<unknown>[] = [
        getBranches(selectedCompanyId),
      ];

      if (superAdmin) {
        requests.push(getCompanies());
      }

      const [branchesData, companiesData] = await Promise.all(requests);

      setBranches(Array.isArray(branchesData) ? (branchesData as Branch[]) : []);
      setCompanies(Array.isArray(companiesData) ? (companiesData as Company[]) : []);
    } catch {
      setError("Não foi possível carregar as filiais.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!canManage) return;

    if (!name.trim()) {
      setError("Informe o nome da filial.");
      return;
    }

    const targetCompanyId = superAdmin ? companyId : resolvedCompanyId ?? "";

    if (!targetCompanyId) {
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
        companyId: targetCompanyId,
      });

      setName("");
      setCode("");
      if (superAdmin) {
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
    if (!canManage) return;

    const confirmed = window.confirm(
      `Deseja desativar a filial "${branch.name}"?`
    );
    if (!confirmed) return;

    try {
      setProcessingId(branch.id);
      setError("");

      await deactivateBranch(
        branch.id,
        superAdmin ? branch.companyId : undefined
      );

      await load();
    } catch {
      setError("Não foi possível desativar a filial.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleActivate(branch: Branch) {
    if (!canManage) return;

    try {
      setProcessingId(branch.id);
      setError("");

      await activateBranch(
        branch.id,
        superAdmin ? branch.companyId : undefined
      );

      await load();
    } catch {
      setError("Não foi possível reativar a filial.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleHardDelete(branch: Branch) {
    if (!canDeletePermanently) return;

    const confirmed = window.confirm(
      `Excluir definitivamente a filial "${branch.name}"? Essa ação não poderá ser desfeita.`
    );
    if (!confirmed) return;

    try {
      setProcessingId(branch.id);
      setError("");

      await hardDeleteBranch(
        branch.id,
        superAdmin ? branch.companyId : undefined
      );

      await load();
    } catch {
      setError("Não foi possível excluir definitivamente a filial.");
    } finally {
      setProcessingId(null);
    }
  }

  useEffect(() => {
    if (canView) {
      void load();
    } else {
      setLoading(false);
    }
  }, [canView, selectedCompanyId]);

  if (!canView) {
    return (
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Acesso negado
        </h1>
        <p className="text-slate-600">
          Você não tem permissão para acessar a página de filiais.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Filiais
        </h1>
        <p className="text-slate-600">
          Gerencie as filiais da plataforma.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {canManage ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">
              Nova filial
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
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
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={!superAdmin}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {superAdmin ? (
                <>
                  <option value="">Selecione a empresa</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </>
              ) : (
                <option value={resolvedCompanyId ?? ""}>Empresa atual</option>
              )}
            </select>

            <button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Criando..." : "Criar filial"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Filiais cadastradas
            </h2>
            <p className="text-sm text-slate-500">
              {visibleBranches.length} item(ns)
            </p>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Mostrar inativas
          </label>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Carregando filiais...
          </div>
        ) : visibleBranches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Nenhuma filial cadastrada.
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleBranches.map((branch) => {
              const isProcessing = processingId === branch.id;

              return (
                <article
                  key={branch.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {branch.name}
                      </h3>

                      <div className="space-y-1 text-sm text-slate-600">
                        <p>Código: {branch.code || "-"}</p>
                        <p>Empresa: {branch.company?.name ?? "-"}</p>
                        <p>Status: {branch.active ? "Ativa" : "Inativa"}</p>
                      </div>
                    </div>

                    {canManage ? (
                      <div className="flex flex-wrap gap-2">
                        {branch.active ? (
                          <button
                            onClick={() => handleDeactivate(branch)}
                            disabled={isProcessing}
                            className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Desativar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(branch)}
                            disabled={isProcessing}
                            className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Reativar
                          </button>
                        )}

                        {canDeletePermanently ? (
                          <button
                            onClick={() => handleHardDelete(branch)}
                            disabled={isProcessing}
                            className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Excluir definitivo
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}