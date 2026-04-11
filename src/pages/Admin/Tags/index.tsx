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

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const PAGE_SIZE = 10;

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
  const [createCompanyId, setCreateCompanyId] = useState(
    superAdmin ? "" : resolvedCompanyId ?? "",
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<EditingState>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Listagem global para SUPER_ADMIN; escopo fixo só para usuários vinculados.
  const selectedCompanyId = useMemo(() => {
    return superAdmin ? undefined : resolvedCompanyId;
  }, [superAdmin, resolvedCompanyId]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const requests: Promise<unknown>[] = [
        getTags({
          ...(selectedCompanyId ? { companyId: selectedCompanyId } : {}),
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
    if (superAdmin) {
      setCreateCompanyId("");
    }
  }

  async function handleCreate() {
    if (!canManage) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Informe o nome da tag.");
      return;
    }

    const targetCompanyId = superAdmin ? createCompanyId : resolvedCompanyId ?? "";

    if (!targetCompanyId) {
      setError("Selecione a empresa da tag.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createTag({
        name: trimmedName,
        color: color?.trim() || null,
        companyId: targetCompanyId,
      });

      resetForm();
      setPage(1);
      setSelectedIds([]);
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
        companyId: superAdmin ? tag.companyId ?? undefined : resolvedCompanyId,
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
        superAdmin ? tag.companyId ?? undefined : resolvedCompanyId,
      );
      await load();
      setSelectedIds((current) => current.filter((id) => id !== tag.id));
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
        superAdmin ? tag.companyId ?? undefined : resolvedCompanyId,
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
      `Deseja excluir definitivamente a tag "${tag.name}"?\n\nEssa ação não poderá ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      setProcessingId(tag.id);
      setError("");
      await hardDeleteTag(tag.id, tag.companyId ?? undefined);
      await load();
      setSelectedIds((current) => current.filter((id) => id !== tag.id));
    } catch {
      setError("Não foi possível excluir definitivamente a tag.");
    } finally {
      setProcessingId(null);
    }
  }

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setPage(1);
    setSelectedIds([]);
  }

  const filteredTags = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tags.filter((tag) => {
      const matchesSearch =
        !normalizedSearch ||
        tag.name.toLowerCase().includes(normalizedSearch) ||
        (tag.company?.name ?? "").toLowerCase().includes(normalizedSearch) ||
        (tag.color ?? "").toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && tag.active !== false) ||
        (statusFilter === "INACTIVE" && tag.active === false);

      return matchesSearch && matchesStatus;
    });
  }, [tags, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTags.length / PAGE_SIZE));

  const paginatedTags = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTags.slice(start, start + PAGE_SIZE);
  }, [filteredTags, page]);

  const currentPageIds = useMemo(
    () => paginatedTags.map((tag) => tag.id),
    [paginatedTags],
  );

  const allCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.includes(id));

  const someCurrentPageSelected =
    currentPageIds.some((id) => selectedIds.includes(id)) &&
    !allCurrentPageSelected;

  function handleToggleOne(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function handleTogglePage(ids: string[]) {
    const allSelected = ids.every((id) => selectedIds.includes(id));

    setSelectedIds((current) => {
      if (allSelected) {
        return current.filter((id) => !ids.includes(id));
      }

      const merged = new Set([...current, ...ids]);
      return Array.from(merged);
    });
  }

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    void load();
  }, [canView, selectedCompanyId]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    setSelectedIds([]);
  }, [search, statusFilter, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (!canView) {
    return (
      <section className="space-y-4">
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
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tags</h1>
        <p className="text-slate-600">
          Gerencie os motivos exibidos no kiosk.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {canManage ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Nova tag</h2>
          <p className="mt-1 text-sm text-slate-500">
            Cadastre uma nova tag no escopo permitido pelo seu usuário.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              <span className="text-sm font-medium text-slate-700">{color}</span>
            </div>

            {superAdmin ? (
              <select
                value={createCompanyId}
                onChange={(e) => setCreateCompanyId(e.target.value)}
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
              <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500">
                Empresa atual
              </div>
            )}

            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              {submitting ? "Criando..." : "Criar tag"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Tags cadastradas</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? "Carregando..." : `${filteredTags.length} item(ns)`}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, cor ou empresa"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
            >
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Ativas</option>
              <option value="INACTIVE">Inativas</option>
            </select>

            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        {selectedIds.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-slate-700">
              {selectedIds.length} selecionado(s)
            </span>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Limpar seleção
            </button>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          {loading ? (
            <div className="px-6 py-10 text-center text-slate-500">
              Carregando tags...
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">
              Nenhuma tag encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = someCurrentPageSelected;
                          }
                        }}
                        type="checkbox"
                        checked={allCurrentPageSelected}
                        onChange={() => handleTogglePage(currentPageIds)}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Empresa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedTags.map((tag) => {
                    const isEditing = editing?.id === tag.id;
                    const isProcessing = processingId === tag.id;

                    return (
                      <tr key={tag.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4 align-top">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(tag.id)}
                            onChange={() => handleToggleOne(tag.id)}
                            className="mt-2 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                        </td>

                        <td className="px-4 py-4 align-top text-sm text-slate-700">
                          {isEditing ? (
                            <input
                              value={editing?.name ?? ""}
                              onChange={(e) =>
                                setEditing((prev) =>
                                  prev ? { ...prev, name: e.target.value } : prev,
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500"
                            />
                          ) : (
                            <span className="font-medium text-slate-900">{tag.name}</span>
                          )}
                        </td>

                        <td className="px-4 py-4 align-top text-sm text-slate-600">
                          {isEditing ? (
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={editing?.color ?? "#0ea5e9"}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev ? { ...prev, color: e.target.value } : prev,
                                  )
                                }
                                className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-transparent p-0"
                              />
                              <span>{editing?.color}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span
                                className="inline-block h-4 w-4 rounded-full border border-slate-200"
                                style={{ backgroundColor: tag.color ?? "#e2e8f0" }}
                              />
                              <span>{tag.color ?? "-"}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4 align-top text-sm text-slate-600">
                          {superAdmin ? tag.company?.name ?? tag.companyId ?? "-" : "-"}
                        </td>

                        <td className="px-4 py-4 align-top text-sm">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tag.active === false
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                              }`}
                          >
                            {tag.active === false ? "Inativa" : "Ativa"}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(tag)}
                                  disabled={savingEdit}
                                  className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-60"
                                >
                                  {savingEdit ? "Salvando..." : "Salvar"}
                                </button>

                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                {canManage ? (
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(tag)}
                                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200"
                                  >
                                    Editar
                                  </button>
                                ) : null}

                                {canManage && tag.active !== false ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeactivate(tag)}
                                    disabled={isProcessing}
                                    className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-60"
                                  >
                                    Desativar
                                  </button>
                                ) : null}

                                {canManage && tag.active === false ? (
                                  <button
                                    type="button"
                                    onClick={() => handleActivate(tag)}
                                    disabled={isProcessing}
                                    className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-60"
                                  >
                                    Ativar
                                  </button>
                                ) : null}

                                {canDeletePermanently ? (
                                  <button
                                    type="button"
                                    onClick={() => handleHardDelete(tag)}
                                    disabled={isProcessing}
                                    className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-200 disabled:opacity-60"
                                  >
                                    Excluir
                                  </button>
                                ) : null}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && filteredTags.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Página {page} de {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Anterior
              </button>

              <button
                type="button"
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
        ) : null}
      </section>
    </section>
  );
}