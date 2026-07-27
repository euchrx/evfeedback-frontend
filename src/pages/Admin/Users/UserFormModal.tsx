import { useEffect, useMemo, useState } from "react";
import { FormDialog } from "../../../components/ui/FormDialog";
import type { Company } from "../../../services/companies";
import type { UserRole } from "../../../services/users";

type UserFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  companies: Company[];
  loading?: boolean;
  allowSuperAdminRole?: boolean;
  defaultCompanyId?: string;
  initialData?: {
    name: string;
    email: string;
    role: UserRole;
    companyId?: string;
  };
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    companyId?: string;
  }) => Promise<void> | void;
};

const ALL_ROLES: UserRole[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"];

function getRoleLabel(role: UserRole) {
  switch (role) {
    case "SUPER_ADMIN":
      return "SUPER_ADMIN";
    case "COMPANY_ADMIN":
      return "COMPANY_ADMIN";
    case "MANAGER":
      return "MANAGER";
    default:
      return role;
  }
}

export function UserFormModal({
  open,
  mode,
  loading = false,
  allowSuperAdminRole = true,
  defaultCompanyId,
  initialData,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("MANAGER");
  const [companyId, setCompanyId] = useState("");

  const availableRoles = useMemo(() => {
    if (allowSuperAdminRole) return ALL_ROLES;
    return ALL_ROLES.filter((item) => item !== "SUPER_ADMIN");
  }, [allowSuperAdminRole]);

  useEffect(() => {
    if (!open) return;

    const nextRole =
      initialData?.role && availableRoles.includes(initialData.role)
        ? initialData.role
        : availableRoles.includes("MANAGER") ? "MANAGER" : availableRoles[0] ?? "MANAGER";

    setName(initialData?.name ?? "");
    setEmail(initialData?.email ?? "");
    setPassword("");
    setRole(nextRole);
    setCompanyId(initialData?.companyId ?? defaultCompanyId ?? "");
  }, [open, initialData, availableRoles, defaultCompanyId]);

  useEffect(() => {
    if (role === "SUPER_ADMIN") {
      setCompanyId("");
    }
  }, [role]);

  const requiresCompany = role !== "SUPER_ADMIN";
  const isInvalid =
    !name.trim() ||
    !email.trim() ||
    (!isEdit && !password.trim()) ||
    (requiresCompany && !companyId);

  async function handleSubmit() {
    await onSubmit({
      name: name.trim(),
      email: email.trim(),
      password: isEdit ? undefined : password,
      role,
      companyId: requiresCompany ? companyId : undefined,
    });
  }

  return (
    <FormDialog
      open={open}
      title={isEdit ? "Editar usuário" : "Novo usuário"}
      description={
        isEdit
          ? "Atualize os dados do usuário e mantenha os acessos alinhados à operação."
          : "Cadastre um novo usuário para acesso ao painel administrativo."
      }
      confirmText={isEdit ? "Salvar alterações" : "Criar usuário"}
      confirmLoading={loading}
      confirmDisabled={isInvalid}
      onConfirm={() => void handleSubmit()}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="user-name"
            className="block text-sm font-medium text-slate-700"
          >
            Nome
          </label>
          <input
            id="user-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: João da Silva"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="user-email"
            className="block text-sm font-medium text-slate-700"
          >
            E-mail
          </label>
          <input
            id="user-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="usuario@empresa.com"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
          />
        </div>

        {!isEdit ? (
          <div className="space-y-2">
            <label
              htmlFor="user-password"
              className="block text-sm font-medium text-slate-700"
            >
              Senha
            </label>
            <input
              id="user-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Defina uma senha"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
            />
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="user-role"
              className="block text-sm font-medium text-slate-700"
            >
              Role
            </label>
            <select
              id="user-role"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400/60 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
            >
              {availableRoles.map((itemRole) => (
                <option key={itemRole} value={itemRole}>
                  {getRoleLabel(itemRole)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
