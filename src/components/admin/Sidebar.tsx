import { NavLink, useNavigate } from "react-router-dom";
import { getStoredUser, logout } from "../../services/auth";
import {
  canAccessBranches,
  canAccessCompanies,
  canAccessDashboard,
  canAccessFeedbacks,
  canAccessKiosks,
  canAccessSettings,
  canAccessTags,
  canAccessUsers,
} from "../../utils/permissions";

type MenuItem = {
  label: string;
  to: string;
  visible: boolean;
  description: string;
};

function formatRoleLabel(role?: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "COMPANY_ADMIN":
      return "Administrador";
    case "MANAGER":
      return "Gerente";
    default:
      return "Usuário";
  }
}

export function Sidebar() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      to: "/admin/dashboard",
      visible: canAccessDashboard(user),
      description: "Indicadores e visão geral",
    },
    {
      label: "Empresas",
      to: "/admin/companies",
      visible: canAccessCompanies(user),
      description: "Gestão das empresas",
    },
    {
      label: "Usuários",
      to: "/admin/users",
      visible: canAccessUsers(user),
      description: "Acessos e permissões",
    },
    {
      label: "Filiais",
      to: "/admin/branches",
      visible: canAccessBranches(user),
      description: "Estrutura operacional",
    },
    {
      label: "Kiosks",
      to: "/admin/kiosks",
      visible: canAccessKiosks(user),
      description: "Dispositivos e tokens",
    },
    {
      label: "Tags",
      to: "/admin/tags",
      visible: canAccessTags(user),
      description: "Classificações e categorias",
    },
    {
      label: "Feedbacks",
      to: "/admin/feedbacks",
      visible: canAccessFeedbacks(user),
      description: "Avaliações recebidas",
    },
    {
      label: "Configurações",
      to: "/admin/settings",
      visible: canAccessSettings(user),
      description: "Parâmetros do sistema",
    },
  ];

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/5 text-white shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-lg font-semibold text-cyan-300 ring-1 ring-cyan-300/20">
          EV
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            EvFeedback
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
            Painel administrativo
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Gestão centralizada de kiosks, unidades, usuários e feedbacks.
          </p>
        </div>
      </div>

      {user ? (
        <div className="border-b border-white/10 p-5 sm:p-6">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-sm font-semibold text-cyan-300 ring-1 ring-cyan-300/20">
                {(user.name?.trim()?.charAt(0) || "U").toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user.name}
                </p>
                <p className="mt-1 truncate text-sm text-slate-400">
                  {user.email}
                </p>
                <p className="mt-3 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-200">
                  {formatRoleLabel(user.role)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="mb-3 px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Navegação
          </p>
        </div>

        <nav className="flex flex-col gap-2">
          {menuItems
            .filter((item) => item.visible)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "group rounded-2xl border px-4 py-3 transition",
                    isActive
                      ? "border-cyan-400/20 bg-cyan-400/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                      : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/5",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={[
                          "truncate text-sm font-semibold transition",
                          isActive ? "text-cyan-200" : "text-slate-200 group-hover:text-white",
                        ].join(" ")}
                      >
                        {item.label}
                      </p>
                      <p
                        className={[
                          "mt-1 text-xs leading-5 transition",
                          isActive ? "text-cyan-100/75" : "text-slate-500 group-hover:text-slate-400",
                        ].join(" ")}
                      >
                        {item.description}
                      </p>
                    </div>

                    <div
                      className={[
                        "mt-0.5 h-2.5 w-2.5 rounded-full transition",
                        isActive ? "bg-cyan-300" : "bg-slate-700 group-hover:bg-slate-500",
                      ].join(" ")}
                    />
                  </div>
                )}
              </NavLink>
            ))}
        </nav>
      </div>

      <div className="border-t border-white/10 p-4 sm:p-5">
        <button
          onClick={handleLogout}
          className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
        >
          Encerrar sessão
        </button>
      </div>
    </aside>
  );
}