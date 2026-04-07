import { useEffect, useMemo, useState } from "react";
import {
  activateTag,
  createTag,
  deactivateTag,
  getTags,
  hardDeleteTag,
  updateTag,
  type Tag,
} from "../../../services/tags";
import { getCompanies, type Company } from "../../../services/companies";
import { getStoredUser } from "../../../services/auth";
import {
  canHardDelete,
  canManageOperationalModules,
  canViewOperationalModules,
  getResolvedCompanyId,
  isSuperAdmin,
} from "../../../utils/permissions";

type EditingState = {
  id: string;
  name: string;
  color: string;
} | null;

export default function TagsPage() {
  const currentUser = getStoredUser();

  const canView = canViewOperationalModules(currentUser);
  const canManage = canManageOperationalModules(currentUser);
  const canDeletePermanently = canHardDelete(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);

  const [tags, setTags] = useState<Tag[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#0ea5e9");
  const [companyId, setCompanyId] = useState(resolvedCompanyId ?? "");
  const [showInactive, setShowInactive] = useState(false);

  const [editing, setEditing] = useState<EditingState>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const selectedCompanyId = useMemo(() => {
    return superAdmin ? companyId || undefined : resolvedCompanyId;
  }, [superAdmin, companyId, resolvedCompanyId]);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    void load();
  }, [canView, selectedCompanyId, showInactive]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const requests: Promise<unknown>[] = [
        getTags({
          ...(selectedCompanyId ? { companyId: selectedCompanyId } : {}),
          ...(showInactive ? {} : { active: true }),
        }),
      ];

      if (superAdmin) {
        requests.push(getCompanies());
      }

      const [tagsData, companiesData] = await Promise.all(requests);

      setTags(Array.isArray(tagsData) ? (tagsData as Tag[]) : []);
      setCompanies(Array.isArray(companiesData) ? (companiesData as Company[]) : []);
    } catch {
      setError("Não foi possível carregar as tags.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setColor("#0ea5e9");
  }

  async function handleCreate() {
    if (!canManage) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Informe o nome da tag.");
      return;
    }

    if (superAdmin && !selectedCompanyId) {
      setError("Selecione a empresa da tag.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createTag({
        name: trimmedName,
        color: color?.trim() || null,
        companyId: superAdmin ? selectedCompanyId : resolvedCompanyId,
      });

      resetForm();
      await load();
    } catch {
      setError("Não foi possível criar a tag.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleStartEdit(tag: Tag) {
    setEditing({
      id: tag.id,
      name: tag.name ?? "",
      color: tag.color ?? "#0ea5e9",
    });
  }

  function handleCancelEdit() {
    setEditing(null);
  }

  async function handleSaveEdit(tag: Tag) {
    if (!canManage || !editing) return;

    const trimmedName = editing.name.trim();
    if (!trimmedName) {
      setError("Informe o nome da tag.");
      return;
    }

    try {
      setSavingEdit(true);
      setError("");

      await updateTag(tag.id, {
        name: trimmedName,
        color: editing.color?.trim() || null,
        companyId: superAdmin ? tag.companyId ?? selectedCompanyId : resolvedCompanyId,
      });

      setEditing(null);
      await load();
    } catch {
      setError("Não foi possível atualizar a tag.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeactivate(tag: Tag) {
    if (!canManage) return;

    const confirmed = window.confirm(`Deseja desativar a tag "${tag.name}"?`);
    if (!confirmed) return;

    try {
      setProcessingId(tag.id);
      setError("");

      await deactivateTag(
        tag.id,
        superAdmin ? tag.companyId ?? selectedCompanyId : resolvedCompanyId
      );

      await load();
    } catch {
      setError("Não foi possível desativar a tag.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleActivate(tag: Tag) {
    if (!canManage) return;

    const confirmed = window.confirm(`Deseja ativar a tag "${tag.name}"?`);
    if (!confirmed) return;

    try {
      setProcessingId(tag.id);
      setError("");

      await activateTag(
        tag.id,
        superAdmin ? tag.companyId ?? selectedCompanyId : resolvedCompanyId
      );

      await load();
    } catch {
      setError("Não foi possível ativar a tag.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleHardDelete(tag: Tag) {
    if (!canDeletePermanently) return;

    const confirmed = window.confirm(
      `Deseja excluir definitivamente a tag "${tag.name}"?\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmed) return;

    try {
      setProcessingId(tag.id);
      setError("");

      await hardDeleteTag(tag.id, tag.companyId ?? selectedCompanyId);

      await load();
    } catch {
      setError("Não foi possível excluir definitivamente a tag.");
    } finally {
      setProcessingId(null);
    }
  }

  if (!canView) {
    return (
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Acesso negado
        </h1>
        <p className="text-slate-600">
          Você não tem permissão para acessar a página de tags.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Tags
        </h1>
        <p className="text-slate-600">
          Gerencie os motivos exibidos no kiosk conforme o escopo do seu perfil.
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
            <h2 className="text-xl font-semibold text-slate-900">Nova tag</h2>
            <p className="text-sm text-slate-500">
              Cadastre uma nova tag no escopo permitido pelo seu usuário.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Atendimento"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
            />

            <div className="flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-transparent p-0"
              />
              <span className="text-sm text-slate-600">{color}</span>
            </div>

            {superAdmin ? (
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-sky-500"
              >
                <option value="">Selecione a empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={
                  currentUser?.companyId
                    ? "Empresa vinculada ao seu usuário"
                    : "Sem empresa vinculada"
                }
                disabled
                className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
              />
            )}

            <button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Criando..." : "Criar tag"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Tags cadastradas</h2>
            <p className="text-sm text-slate-500">
              {loading ? "Carregando..." : `${tags.length} item(ns)`}
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
            Carregando tags...
          </div>
        ) : tags.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Nenhuma tag cadastrada.
          </div>
        ) : (
          <div className="grid gap-4">
            {tags.map((tag) => {
              const isEditing = editing?.id === tag.id;
              const isProcessing = processingId === tag.id;

              return (
                <article
                  key={tag.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      {isEditing ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            value={editing.name}
                            onChange={(e) =>
                              setEditing((prev) =>
                                prev ? { ...prev, name: e.target.value } : prev
                              )
                            }
                            className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                          />

                          <div className="flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-3">
                            <input
                              type="color"
                              value={editing.color}
                              onChange={(e) =>
                                setEditing((prev) =>
                                  prev ? { ...prev, color: e.target.value } : prev
                                )
                              }
                              className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-transparent p-0"
                            />
                            <span className="text-sm text-slate-600">
                              {editing.color}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span
                            className="inline-block h-4 w-4 rounded-full border border-slate-200"
                            style={{ backgroundColor: tag.color ?? "#cbd5e1" }}
                          />
                          <h3 className="text-lg font-semibold text-slate-900">
                            {tag.name}
                          </h3>
                        </div>
                      )}

                      <div className="space-y-1 text-sm text-slate-600">
                        <p>ID: {tag.id}</p>
                        {superAdmin ? (
                          <p>Empresa: {tag.company?.name ?? tag.companyId ?? "-"}</p>
                        ) : null}
                        <p>Cor: {tag.color ?? "-"}</p>
                        <p>Status: {tag.active === false ? "Inativa" : "Ativa"}</p>
                      </div>
                    </div>

                    {(canManage || canDeletePermanently) && (
                      <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(tag)}
                              disabled={savingEdit}
                              className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingEdit ? "Salvando..." : "Salvar"}
                            </button>

                            <button
                              onClick={handleCancelEdit}
                              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            {canManage ? (
                              <button
                                onClick={() => handleStartEdit(tag)}
                                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
                              >
                                Editar
                              </button>
                            ) : null}

                            {canManage && tag.active !== false ? (
                              <button
                                onClick={() => handleDeactivate(tag)}
                                disabled={isProcessing}
                                className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isProcessing ? "Processando..." : "Desativar"}
                              </button>
                            ) : null}

                            {canManage && tag.active === false ? (
                              <button
                                onClick={() => handleActivate(tag)}
                                disabled={isProcessing}
                                className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isProcessing ? "Processando..." : "Ativar"}
                              </button>
                            ) : null}

                            {canDeletePermanently ? (
                              <button
                                onClick={() => handleHardDelete(tag)}
                                disabled={isProcessing}
                                className="rounded-xl bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isProcessing ? "Processando..." : "Excluir definitivo"}
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    )}
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