import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "../../../services/auth";
import { getCompanies, type Company } from "../../../services/companies";
import {
  activateTag,
  createTag,
  deactivateTag,
  getTags,
  hardDeleteTag,
  type Tag,
} from "../../../services/tags";

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";
  companyId?: string | null;
};

export default function TagsPage() {
  const currentUser = getStoredUser() as StoredUser | null;

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const isCompanyAdmin = currentUser?.role === "COMPANY_ADMIN";
  const isManager = currentUser?.role === "MANAGER";

  const canViewTags = isSuperAdmin || isCompanyAdmin || isManager;
  const canManageTags = isSuperAdmin || isCompanyAdmin;

  const [tags, setTags] = useState<Tag[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#0ea5e9");
  const [companyId, setCompanyId] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const visibleTags = useMemo(() => {
    if (showInactive) return tags;
    return tags.filter((tag) => tag.active);
  }, [tags, showInactive]);

  async function load() {
    try {
      setError("");
      setLoading(true);

      const resolvedCompanyId = isSuperAdmin
        ? undefined
        : currentUser?.companyId ?? undefined;

      const tagsPromise = getTags(resolvedCompanyId);
      const companiesPromise = isSuperAdmin ? getCompanies() : Promise.resolve([]);

      const [tagsData, companiesData] = await Promise.all([
        tagsPromise,
        companiesPromise,
      ]);

      setTags(Array.isArray(tagsData) ? tagsData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);

      if (!isSuperAdmin && currentUser?.companyId) {
        setCompanyId(currentUser.companyId);
      }
    } catch {
      setError("Não foi possível carregar as tags.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Informe o nome da tag.");
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

      await createTag({
        name: name.trim(),
        color: color || undefined,
        companyId: resolvedCompanyId,
        active: true,
      });

      setName("");
      setColor("#0ea5e9");

      if (isSuperAdmin) {
        setCompanyId("");
      }

      await load();
    } catch {
      setError("Não foi possível criar a tag.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(tag: Tag) {
    const confirmed = window.confirm(
      `Deseja desativar a tag "${tag.name}"?`,
    );

    if (!confirmed) return;

    try {
      setError("");

      await deactivateTag(
        tag.id,
        isSuperAdmin ? tag.companyId : undefined,
      );

      await load();
    } catch {
      setError("Não foi possível desativar a tag.");
    }
  }

  async function handleActivate(tag: Tag) {
    try {
      setError("");

      await activateTag(
        tag.id,
        isSuperAdmin ? tag.companyId : undefined,
      );

      await load();
    } catch {
      setError("Não foi possível reativar a tag.");
    }
  }

  async function handleHardDelete(tag: Tag) {
    const confirmed = window.confirm(
      `Excluir definitivamente a tag "${tag.name}"? Essa ação não poderá ser desfeita.`,
    );

    if (!confirmed) return;

    try {
      setError("");

      await hardDeleteTag(
        tag.id,
        isSuperAdmin ? tag.companyId : undefined,
      );

      await load();
    } catch {
      setError("Não foi possível excluir definitivamente a tag.");
    }
  }

  useEffect(() => {
    if (canViewTags) {
      load();
    } else {
      setLoading(false);
    }
  }, [canViewTags]);

  if (!canViewTags) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-xl font-bold text-rose-700">Acesso negado</h1>
        <p className="mt-2 text-sm text-rose-600">
          Você não tem permissão para acessar a página de tags.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tags</h1>
        <p className="mt-1 text-sm text-slate-600">
          Gerencie os motivos exibidos no kiosk.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {canManageTags ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Nova tag</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Atendimento"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />

            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-[50px] w-full rounded-xl border border-slate-300 bg-white px-2 py-2 outline-none focus:border-sky-500"
              title="Cor da tag"
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
              {submitting ? "Criando..." : "Criar tag"}
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
            Tags cadastradas
          </h2>
          <span className="text-sm text-slate-500">
            {visibleTags.length} item(ns)
          </span>
        </div>

        {loading ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Carregando tags...
          </div>
        ) : visibleTags.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Nenhuma tag cadastrada.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {visibleTags.map((tag) => {
              const canHardDelete = isSuperAdmin;

              return (
                <div
                  key={tag.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-block h-4 w-4 rounded-full border border-slate-200"
                          style={{ backgroundColor: tag.color || "#cbd5e1" }}
                        />
                        <h3 className="text-lg font-semibold text-slate-900">
                          {tag.name}
                        </h3>
                      </div>

                      <p className="text-sm text-slate-600">
                        Empresa:{" "}
                        <span className="font-medium">
                          {tag.company?.name ?? "-"}
                        </span>
                      </p>

                      <p className="text-sm text-slate-600">
                        Status:{" "}
                        <span
                          className={
                            tag.active
                              ? "font-medium text-emerald-700"
                              : "font-medium text-amber-700"
                          }
                        >
                          {tag.active ? "Ativa" : "Inativa"}
                        </span>
                      </p>

                      <p className="text-xs text-slate-500">
                        ID: {tag.id}
                      </p>
                    </div>

                    {canManageTags ? (
                      <div className="flex flex-wrap gap-2">
                        {tag.active ? (
                          <button
                            onClick={() => handleDeactivate(tag)}
                            className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200"
                          >
                            Desativar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(tag)}
                            className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200"
                          >
                            Reativar
                          </button>
                        )}

                        {canHardDelete ? (
                          <button
                            onClick={() => handleHardDelete(tag)}
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