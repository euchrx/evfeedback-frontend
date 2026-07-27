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
            className="block text-sm font-medium text-slate-700"
          >
            Nome da filial
          </label>
          <input
            id="branch-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Unidade Centro"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="branch-code"
            className="block text-sm font-medium text-slate-700"
          >
            Código
          </label>
          <input
            id="branch-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Ex.: CTR-01"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
          />
        </div>
      </div>
    </FormDialog>
  );
}
