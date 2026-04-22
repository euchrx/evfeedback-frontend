import { useEffect, useMemo, useState } from "react";
import {
  activateCompany,
  createCompany,
  deactivateCompany,
  getCompanies,
  hardDeleteCompany,
  updateCompany,
  type Company,
} from "../../../services/companies";
import { getStoredUser } from "../../../services/auth";
import { canAccessCompanies, canHardDelete } from "../../../utils/permissions";
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirmDialog } from "../../../components/ui/ConfirmDialogProvider";
import { CompanyFormModal } from "./CompanyFormModal";

const PAGE_SIZE = 10;

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function CompaniesPage() {
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const currentUser = getStoredUser();
  const canView = canAccessCompanies(currentUser);
  const canDeletePermanently = canHardDelete(currentUser);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await getCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Não foi possível carregar as empresas.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload: { name: string }) {
    if (!payload.name.trim()) {
      toast.warning("Informe o nome da empresa.");
      return;
    }

    try {
      setCreateLoading(true);

      await createCompany({
        name: payload.name.trim(),
      });

      setCreateOpen(false);
      toast.success("Empresa criada com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível criar a empresa.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUpdate(payload: { name: string }) {
    if (!editingCompany) return;

    if (!payload.name.trim()) {
      toast.warning("Informe o nome da empresa.");
      return;
    }

    try {
      setEditLoading(true);

      await updateCompany(editingCompany.id, {
        name: payload.name.trim(),
      });

      setEditingCompany(null);
      toast.success("Empresa atualizada com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível atualizar a empresa.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeactivate(company: Company) {
    const confirmed = await confirm({
      title: "Desativar empresa",
      description: `A empresa "${company.name}" ficará indisponível até ser reativada novamente.`,
      confirmText: "Desativar",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!confirmed) return;

    try {
      setProcessingId(company.id);
      await deactivateCompany(company.id);
      toast.success("Empresa desativada com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível desativar a empresa.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleActivate(company: Company) {
    try {
      setProcessingId(company.id);
      await activateCompany(company.id);
      toast.success("Empresa ativada com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível ativar a empresa.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleHardDelete(company: Company) {
    if (!canDeletePermanently) return;

    const confirmed = await confirm({
      title: "Excluir empresa",
      description: `A empresa "${company.name}" será removida definitivamente. Essa ação não poderá ser desfeita.`,
      confirmText: "Excluir empresa",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      setProcessingId(company.id);
      await hardDeleteCompany(company.id);
      toast.success("Empresa excluída com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível excluir a empresa.");
    } finally {
      setProcessingId(null);
    }
  }

  function handleClearFilters() {
    setSearch("");
    setPage(1);
  }

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return companies.filter((company) =>
      company.name.toLowerCase().includes(normalizedSearch),
    );
  }, [companies, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE));

  const paginatedCompanies = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCompanies.slice(start, start + PAGE_SIZE);
  }, [filteredCompanies, page]);

  useEffect(() => {
    if (canView) {
      void load();
    } else {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    setPage(1);
  }, [search]);

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
          Apenas usuários com permissão de administração global podem acessar a página de empresas.
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
                gestão de empresas
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                Estrutura organizacional
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Cadastre e mantenha as empresas da plataforma com um fluxo consistente e pronto para operação.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar empresa por nome"
                className="h-12 min-w-[260px] rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
              />

              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
              >
                Limpar filtros
              </button>

              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Nova empresa
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Empresas cadastradas</h3>
              <p className="mt-1 text-sm text-slate-400">
                {loading
                  ? "Carregando dados..."
                  : `${filteredCompanies.length} empresa(s) encontrada(s)`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">
              Carregando empresas...
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto max-w-md">
                <h4 className="text-lg font-semibold text-white">
                  Nenhuma empresa encontrada
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Ajuste os filtros ou cadastre uma nova empresa para começar a estruturar a operação.
                </p>

                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Cadastrar empresa
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-white/[0.03]">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Nome
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Criada em
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Atualizada em
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
                    {paginatedCompanies.map((company) => {
                      const isProcessing = processingId === company.id;

                      return (
                        <tr
                          key={company.id}
                          className="transition hover:bg-white/[0.03]"
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {company.name}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-400">
                            {formatDate(company.createdAt)}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-400">
                            {formatDate(company.updatedAt)}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={[
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                                company.active
                                  ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                  : "border border-amber-400/20 bg-amber-500/10 text-amber-200",
                              ].join(" ")}
                            >
                              {company.active ? "Ativa" : "Inativa"}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingCompany(company)}
                                disabled={isProcessing}
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Editar
                              </button>

                              {company.active ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDeactivate(company)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Desativar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void handleActivate(company)}
                                  disabled={isProcessing}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Ativar
                                </button>
                              )}

                              {canDeletePermanently ? (
                                <button
                                  type="button"
                                  onClick={() => void handleHardDelete(company)}
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

      <CompanyFormModal
        open={createOpen}
        mode="create"
        loading={createLoading}
        onClose={() => {
          if (!createLoading) {
            setCreateOpen(false);
          }
        }}
        onSubmit={handleCreate}
      />

      <CompanyFormModal
        open={!!editingCompany}
        mode="edit"
        initialName={editingCompany?.name ?? ""}
        loading={editLoading}
        onClose={() => {
          if (!editLoading) {
            setEditingCompany(null);
          }
        }}
        onSubmit={handleUpdate}
      />
    </>
  );
}