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
  defaultBranchId?: string;
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
  branches,
  loading = false,
  isSuperAdmin,
  defaultCompanyId,
  defaultBranchId,
  initialData,
  onClose,
  onSubmit,
}: KioskFormModalProps) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branchQuery, setBranchQuery] = useState("");
  const [showBranchSuggestions, setShowBranchSuggestions] = useState(false);
  const [locationDescription, setLocationDescription] = useState("");
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    if (!open) return;

    setName(initialData?.name ?? "");
    const nextBranchId = initialData?.branchId ?? defaultBranchId ?? "";
    const selectedBranch = branches.find((branch) => branch.id === nextBranchId);
    setBranchId(nextBranchId);
    setBranchQuery(selectedBranch?.name ?? "");
    setLocationDescription(initialData?.locationDescription ?? "");
    setCompanyId(initialData?.companyId ?? defaultCompanyId ?? "");
  }, [open, initialData, defaultCompanyId, defaultBranchId, branches]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const branchStillExists = branches.some(
      (branch) => branch.id === branchId && branch.companyId === companyId,
    );

    if (branchId && !branchStillExists) {
      setBranchId("");
      setBranchQuery("");
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

  function handleBranchQueryChange(value: string) {
    setBranchQuery(value);
    setShowBranchSuggestions(true);
    const normalizedValue = value.trim().toLocaleLowerCase("pt-BR");
    const matchedBranch = filteredBranches.find(
      (branch) => branch.name.trim().toLocaleLowerCase("pt-BR") === normalizedValue,
    );
    setBranchId(matchedBranch?.id ?? "");
  }

  const branchSuggestions = useMemo(() => {
    const query = branchQuery.trim().toLocaleLowerCase("pt-BR");
    if (!query) return filteredBranches;

    return filteredBranches.filter((branch) =>
      branch.name.toLocaleLowerCase("pt-BR").includes(query),
    );
  }, [branchQuery, filteredBranches]);

  function selectBranch(branch: Branch) {
    setBranchId(branch.id);
    setBranchQuery(branch.name);
    setShowBranchSuggestions(false);
  }

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
            className="block text-sm font-medium text-slate-700"
          >
            Nome do kiosk
          </label>
          <input
            id="kiosk-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Tablet Atendimento 01"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="kiosk-location"
            className="block text-sm font-medium text-slate-700"
          >
            Localização
          </label>
          <input
            id="kiosk-location"
            value={locationDescription}
            onChange={(event) => setLocationDescription(event.target.value)}
            placeholder="Ex.: Balcão principal"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">

          <div className="relative space-y-2">
            <label
              htmlFor="kiosk-branch"
              className="block text-sm font-medium text-slate-700"
            >
              Filial
            </label>
            <input
              id="kiosk-branch"
              type="text"
              autoComplete="off"
              value={branchQuery}
              onChange={(event) => handleBranchQueryChange(event.target.value)}
              onFocus={() => setShowBranchSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowBranchSuggestions(false), 150)}
              placeholder="Digite para buscar uma filial"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
            />
            {showBranchSuggestions ? (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_16px_40px_-16px_rgba(15,23,42,0.35)]">
                {branchSuggestions.length ? (
                  branchSuggestions.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectBranch(branch)}
                      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${branch.id === branchId ? "bg-cyan-50 font-medium text-cyan-800" : "text-slate-700"}`}
                    >
                      {branch.name}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-3 text-sm text-slate-500">Nenhuma filial encontrada.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
