import { useEffect, useState } from "react";
import { FormDialog } from "../../../components/ui/FormDialog";
import type { Company } from "../../../services/companies";

type TagFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  companies: Company[];
  loading?: boolean;
  isSuperAdmin: boolean;
  defaultCompanyId?: string;
  initialData?: {
    name: string;
    color?: string;
    companyId?: string;
  };
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    color?: string | null;
    companyId?: string;
  }) => Promise<void> | void;
};

export function TagFormModal({
  open,
  mode,
  loading = false,
  isSuperAdmin,
  defaultCompanyId,
  initialData,
  onClose,
  onSubmit,
}: TagFormModalProps) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [color, setColor] = useState("#0ea5e9");
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    if (!open) return;

    setName(initialData?.name ?? "");
    setColor(initialData?.color ?? "#0ea5e9");
    setCompanyId(initialData?.companyId ?? defaultCompanyId ?? "");
  }, [open, initialData, defaultCompanyId]);

  const isInvalid = !name.trim() || (isSuperAdmin && !companyId);

  async function handleSubmit() {
    await onSubmit({
      name: name.trim(),
      color: color?.trim() || null,
      companyId: isSuperAdmin ? companyId : defaultCompanyId,
    });
  }

  return (
    <FormDialog
      open={open}
      title={isEdit ? "Editar tag" : "Nova tag"}
      description={
        isEdit
          ? "Atualize os dados da tag para manter a classificação padronizada."
          : "Cadastre uma nova tag para ser utilizada nos feedbacks do kiosk."
      }
      confirmText={isEdit ? "Salvar alterações" : "Criar tag"}
      confirmLoading={loading}
      confirmDisabled={isInvalid}
      onConfirm={() => void handleSubmit()}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="tag-name"
            className="block text-sm font-medium text-slate-700"
          >
            Nome da tag
          </label>
          <input
            id="tag-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Atendimento"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="tag-color"
            className="block text-sm font-medium text-slate-700"
          >
            Cor
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <input
              id="tag-color"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 w-11 cursor-pointer rounded border border-slate-200 bg-transparent p-0"
            />
            <span className="text-sm font-medium text-slate-600">{color}</span>
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
