import { useEffect, useMemo, useState } from "react";
import { FormDialog } from "../../../components/ui/FormDialog";
import type { Company } from "../../../services/companies";
import type { Branch } from "../../../services/branches";

type KioskFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  companies: Company[];
  branches: Branch[];
  loading?: boolean;
  isSuperAdmin: boolean;
  defaultCompanyId?: string;
  initialData?: {
    name: string;
    branchId: string;
    locationDescription?: string;
    companyId?: string;
  };
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    branchId: string;
    locationDescription?: string;
    companyId?: string;
  }) => Promise<void> | void;
};

export function KioskFormModal({
  open,
  mode,
  companies,
  branches,
  loading = false,
  isSuperAdmin,
  defaultCompanyId,
  initialData,
  onClose,
  onSubmit,
}: KioskFormModalProps) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    if (!open) return;

    setName(initialData?.name ?? "");
    setBranchId(initialData?.branchId ?? "");
    setLocationDescription(initialData?.locationDescription ?? "");
    setCompanyId(initialData?.companyId ?? defaultCompanyId ?? "");
  }, [open, initialData, defaultCompanyId]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const branchStillExists = branches.some(
      (branch) => branch.id === branchId && branch.companyId === companyId,
    );

    if (branchId && !branchStillExists) {
      setBranchId("");
    }
  }, [branchId, branches, companyId, isSuperAdmin]);

  const filteredBranches = useMemo(() => {
    if (!isSuperAdmin) {
      return branches;
    }

    if (!companyId) {
      return [];
    }

    return branches.filter((branch) => branch.companyId === companyId);
  }, [branches, companyId, isSuperAdmin]);

  const isInvalid =
    !name.trim() ||
    !branchId ||
    (isSuperAdmin && !companyId);

  async function handleSubmit() {
    await onSubmit({
      name: name.trim(),
      branchId,
      locationDescription: locationDescription.trim() || undefined,
      companyId: isSuperAdmin ? companyId : defaultCompanyId,
    });
  }

  return (
    <FormDialog
      open={open}
      title={isEdit ? "Editar kiosk" : "Novo kiosk"}
      description={
        isEdit
          ? "Atualize os dados do kiosk para manter a operação organizada."
          : "Cadastre um novo kiosk para disponibilizar a coleta de feedback."
      }
      confirmText={isEdit ? "Salvar alterações" : "Criar kiosk"}
      confirmLoading={loading}
      confirmDisabled={isInvalid}
      onConfirm={() => void handleSubmit()}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="kiosk-name"
            className="block text-sm font-medium text-slate-200"
          >
            Nome do kiosk
          </label>
          <input
            id="kiosk-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Tablet Atendimento 01"
            className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="kiosk-location"
            className="block text-sm font-medium text-slate-200"
          >
            Localização
          </label>
          <input
            id="kiosk-location"
            value={locationDescription}
            onChange={(event) => setLocationDescription(event.target.value)}
            placeholder="Ex.: Balcão principal"
            className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="kiosk-company"
              className="block text-sm font-medium text-slate-200"
            >
              Empresa
            </label>

            {isSuperAdmin ? (
              <select
                id="kiosk-company"
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

          <div className="space-y-2">
            <label
              htmlFor="kiosk-branch"
              className="block text-sm font-medium text-slate-200"
            >
              Filial
            </label>
            <select
              id="kiosk-branch"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
            >
              <option value="">Selecione a filial</option>
              {filteredBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </FormDialog>
  );
}