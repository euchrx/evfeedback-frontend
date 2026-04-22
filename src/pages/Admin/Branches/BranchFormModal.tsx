import { useEffect, useState } from "react";
import { FormDialog } from "../../../components/ui/FormDialog";
import type { Company } from "../../../services/companies";

type BranchFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  companies: Company[];
  loading?: boolean;
  isSuperAdmin: boolean;
  initialData?: {
    name: string;
    code?: string;
    companyId?: string;
  };
  defaultCompanyId?: string;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    code?: string;
    companyId?: string;
  }) => Promise<void> | void;
};

export function BranchFormModal({
  open,
  mode,
  companies,
  loading = false,
  isSuperAdmin,
  initialData,
  defaultCompanyId,
  onClose,
  onSubmit,
}: BranchFormModalProps) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    if (!open) return;

    setName(initialData?.name ?? "");
    setCode(initialData?.code ?? "");
    setCompanyId(initialData?.companyId ?? defaultCompanyId ?? "");
  }, [open, initialData, defaultCompanyId]);

  const isInvalid = !name.trim() || (isSuperAdmin && !companyId);

  async function handleSubmit() {
    await onSubmit({
      name: name.trim(),
      code: code.trim() || undefined,
      companyId: isSuperAdmin ? companyId : defaultCompanyId,
    });
  }

  return (
    <FormDialog
      open={open}
      title={isEdit ? "Editar filial" : "Nova filial"}
      description={
        isEdit
          ? "Atualize os dados da filial para manter a estrutura operacional organizada."
          : "Cadastre uma nova filial para estruturar a operação por empresa."
      }
      confirmText={isEdit ? "Salvar alterações" : "Criar filial"}
      confirmLoading={loading}
      confirmDisabled={isInvalid}
      onConfirm={() => void handleSubmit()}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="branch-name"
            className="block text-sm font-medium text-slate-200"
          >
            Nome da filial
          </label>
          <input
            id="branch-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Unidade Centro"
            className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="branch-code"
            className="block text-sm font-medium text-slate-200"
          >
            Código
          </label>
          <input
            id="branch-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Ex.: CTR-01"
            className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="branch-company"
            className="block text-sm font-medium text-slate-200"
          >
            Empresa
          </label>

          {isSuperAdmin ? (
            <select
              id="branch-company"
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
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
                companies.find((company) => company.id === defaultCompanyId)?.name ||
                "Empresa atual"
              }
              disabled
              className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/40 px-4 text-sm text-slate-400 outline-none disabled:cursor-not-allowed"
            />
          )}
        </div>
      </div>
    </FormDialog>
  );
}