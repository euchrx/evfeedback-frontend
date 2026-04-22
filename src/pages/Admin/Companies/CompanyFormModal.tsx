import { useEffect, useState } from "react";
import { FormDialog } from "../../../components/ui/FormDialog";

type CompanyFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialName?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string }) => Promise<void> | void;
};

export function CompanyFormModal({
  open,
  mode,
  initialName = "",
  loading = false,
  onClose,
  onSubmit,
}: CompanyFormModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setName(initialName);
    }
  }, [open, initialName]);

  async function handleSubmit() {
    await onSubmit({
      name: name.trim(),
    });
  }

  const isEdit = mode === "edit";

  return (
    <FormDialog
      open={open}
      title={isEdit ? "Editar empresa" : "Nova empresa"}
      description={
        isEdit
          ? "Atualize o nome da empresa para manter o cadastro padronizado."
          : "Cadastre uma nova empresa para disponibilizar sua estrutura no sistema."
      }
      confirmText={isEdit ? "Salvar alterações" : "Criar empresa"}
      confirmLoading={loading}
      confirmDisabled={!name.trim()}
      onConfirm={() => void handleSubmit()}
      onClose={onClose}
    >
      <div className="space-y-2">
        <label
          htmlFor="company-name"
          className="block text-sm font-medium text-slate-200"
        >
          Nome da empresa
        </label>

        <input
          id="company-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Rede Centro Sul"
          className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
        />
      </div>
    </FormDialog>
  );
}