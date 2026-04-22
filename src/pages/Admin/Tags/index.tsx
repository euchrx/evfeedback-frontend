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
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirmDialog } from "../../../components/ui/ConfirmDialogProvider";
import { TagFormModal } from "./TagFormModal";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const PAGE_SIZE = 10;

function getStatusBadgeClass(active: boolean) {
  return active
    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
    : "border-amber-400/20 bg-amber-500/10 text-amber-200";
}

export default function TagsPage() {
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const currentUser = getStoredUser();
  const canView = canViewOperationalModules(currentUser);
  const canManage = canManageOperationalModules(currentUser);
  const canDeletePermanently = canHardDelete(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);

  const [tags, setTags] = useState<Tag[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const selectedCompanyId = useMemo(() => {
    return superAdmin ? undefined : resolvedCompanyId;
  }, [superAdmin, resolvedCompanyId]);

  async function load() {
    try {
      setLoading(true);

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
      toast.error("Não foi possível carregar as tags.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload: {
    name: string;
    color?: string | null;
    companyId?: string;
  }) {
    if (!canManage) return;

    const trimmedName = payload.name.trim();

    if (!trimmedName) {
      toast.warning("Informe o nome da tag.");
      return;
    }

    const targetCompanyId = superAdmin ? payload.companyId : resolvedCompanyId ?? "";

    if (!targetCompanyId) {
      toast.warning("Selecione a empresa da tag.");
      return;
    }

    try {
      setCreateLoading(true);

      await createTag({
        name: trimmedName,
        color: payload.color?.trim() || null,
        companyId: targetCompanyId,
      });

      setCreateOpen(false);
      toast.success("Tag criada com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível criar a tag.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUpdate(payload: {
    name: string;
    color?: string | null;
    companyId?: string;
  }) {
    if (!canManage || !editingTag) return;

    const trimmedName = payload.name.trim();

    if (!trimmedName) {
      toast.warning("Informe o nome da tag.");
      return;
    }

    const targetCompanyId = superAdmin
      ? payload.companyId ?? editingTag.companyId
      : resolvedCompanyId;

    try {
      setEditLoading(true);

      await updateTag(
        editingTag.id,
        {
          name: trimmedName,
          color: payload.color?.trim() || null,
          companyId: targetCompanyId,
        },
        targetCompanyId,
      );

      setEditingTag(null);
      toast.success("Tag atualizada com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível atualizar a tag.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeactivate(tag: Tag) {
    if (!canManage) return;

    const confirmed = await confirm({
      title: "Desativar tag",
      description: `A tag "${tag.name}" deixará de ficar disponível até ser reativada novamente.`,
      confirmText: "Desativar",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!confirmed) return;

    try {
      setProcessingId(tag.id);
      await deactivateTag(
        tag.id,
        superAdmin ? tag.companyId ?? undefined : resolvedCompanyId,
      );
      toast.success("Tag desativada com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível desativar a tag.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleActivate(tag: Tag) {
    if (!canManage) return;

    try {
      setProcessingId(tag.id);
      await activateTag(
        tag.id,
        superAdmin ? tag.companyId ?? undefined : resolvedCompanyId,
      );
      toast.success("Tag ativada com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível ativar a tag.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleHardDelete(tag: Tag) {
    if (!canDeletePermanently) return;

    const confirmed = await confirm({
      title: "Excluir tag",
      description: `A tag "${tag.name}" será removida definitivamente. Essa ação não poderá ser desfeita.`,
      confirmText: "Excluir tag",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      setProcessingId(tag.id);
      await hardDeleteTag(tag.id, tag.companyId ?? undefined);
      toast.success("Tag excluída com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível excluir a tag.");
    } finally {
      setProcessingId(null);
    }
  }

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setPage(1);
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
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (!canView) {
    return (
      <section className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-white">Acesso negado</h2>
        <p className="mt-2 text-sm leading-6 text-rose-100/80">
          Você não tem permissão para acessar a página de tags.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                gestão de tags
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                Classificações e motivos
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Organize as tags utilizadas nos feedbacks e mantenha a classificação padronizada por empresa.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, cor ou empresa"
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativas</option>
                <option value="INACTIVE">Inativas</option>
              </select>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                >
                  Limpar
                </button>

                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Nova
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Tags cadastradas</h3>
              <p className="mt-1 text-sm text-slate-400">
                {loading
                  ? "Carregando dados..."
                  : `${filteredTags.length} tag(s) encontrada(s)`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">
              Carregando tags...
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto max-w-md">
                <h4 className="text-lg font-semibold text-white">
                  Nenhuma tag encontrada
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Ajuste os filtros ou cadastre uma nova tag para começar a classificar os feedbacks.
                </p>

                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Cadastrar tag
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1050px] divide-y divide-white/10">
                  <thead className="bg-white/[0.03]">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Nome
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Cor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Empresa
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {paginatedTags.map((tag) => {
                      const isProcessing = processingId === tag.id;

                      return (
                        <tr
                          key={tag.id}
                          className="transition hover:bg-white/[0.03]"
                        >
                          <td className="px-6 py-4 align-top">
                            <p className="text-sm font-semibold text-white">
                              {tag.name}
                            </p>
                          </td>

                          <td className="px-6 py-4 align-top text-sm text-slate-400">
                            <div className="flex items-center gap-3">
                              <span
                                className="inline-block h-4 w-4 rounded-full border border-white/10"
                                style={{ backgroundColor: tag.color ?? "#e2e8f0" }}
                              />
                              <span>{tag.color ?? "-"}</span>
                            </div>
                          </td>

                          <td className="px-6 py-4 align-top text-sm text-slate-400">
                            {superAdmin ? tag.company?.name ?? tag.companyId ?? "-" : "-"}
                          </td>

                          <td className="px-6 py-4 align-top">
                            <span
                              className={[
                                "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                getStatusBadgeClass(tag.active !== false),
                              ].join(" ")}
                            >
                              {tag.active === false ? "Inativa" : "Ativa"}
                            </span>
                          </td>

                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-wrap justify-end gap-2">
                              {canManage ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingTag(tag)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Editar
                                </button>
                              ) : null}

                              {canManage && tag.active !== false ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDeactivate(tag)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Desativar
                                </button>
                              ) : null}

                              {canManage && tag.active === false ? (
                                <button
                                  type="button"
                                  onClick={() => void handleActivate(tag)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Ativar
                                </button>
                              ) : null}

                              {canDeletePermanently ? (
                                <button
                                  type="button"
                                  onClick={() => void handleHardDelete(tag)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Excluir
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-400">
                  Página {page} de {totalPages}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page === totalPages}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <TagFormModal
        open={createOpen}
        mode="create"
        companies={companies}
        isSuperAdmin={superAdmin}
        defaultCompanyId={resolvedCompanyId ?? currentUser?.companyId ?? ""}
        loading={createLoading}
        onClose={() => {
          if (!createLoading) {
            setCreateOpen(false);
          }
        }}
        onSubmit={handleCreate}
      />

      <TagFormModal
        open={!!editingTag}
        mode="edit"
        companies={companies}
        isSuperAdmin={superAdmin}
        defaultCompanyId={resolvedCompanyId ?? currentUser?.companyId ?? ""}
        loading={editLoading}
        initialData={
          editingTag
            ? {
                name: editingTag.name,
                color: editingTag.color ?? "#0ea5e9",
                companyId: editingTag.companyId ?? "",
              }
            : undefined
        }
        onClose={() => {
          if (!editLoading) {
            setEditingTag(null);
          }
        }}
        onSubmit={handleUpdate}
      />
    </>
  );
}