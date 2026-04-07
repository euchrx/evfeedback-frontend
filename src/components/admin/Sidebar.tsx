import { NavLink, useNavigate } from "react-router-dom";
import { getStoredUser, logout } from "../../services/auth";
import {
  canAccessCompanies,
  canAccessUsers,
  canViewOperationalModules,
} from "../../utils/permissions";

type MenuItem = {
  label: string;
  to: string;
  visible: boolean;
};

export function Sidebar() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const menuItems: MenuItem[] = [
    { label: "Dashboard", to: "/admin/dashboard", visible: !!user },
    { label: "Empresas", to: "/admin/companies", visible: canAccessCompanies(user) },
    { label: "Usuários", to: "/admin/users", visible: canAccessUsers(user) },
    { label: "Filiais", to: "/admin/branches", visible: canViewOperationalModules(user) },
    { label: "Kiosks", to: "/admin/kiosks", visible: canViewOperationalModules(user) },
    { label: "Tags", to: "/admin/tags", visible: canViewOperationalModules(user) },
    { label: "Feedbacks", to: "/admin/feedbacks", visible: canViewOperationalModules(user) },
    { label: "Configurações", to: "/admin/settings", visible: canViewOperationalModules(user) },
  ];

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="flex h-full w-full flex-col rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
      <div className="mb-6 border-b border-slate-800 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/80">
          EvFeedback
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight">
          Painel administrativo
        </h2>
      </div>

      {user ? (
        <div className="mb-6 rounded-2xl bg-slate-900 p-4">
          <p className="font-semibold text-white">{user.name}</p>
          <p className="text-sm text-slate-300">{user.email}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-sky-300">
            {user.role}
          </p>
        </div>
      ) : null}

      <nav className="flex flex-1 flex-col gap-2">
        {menuItems
          .filter((item) => item.visible)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "block rounded-xl px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-sky-500 text-slate-950"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
      </nav>

      <button
        onClick={handleLogout}
        className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
      >
        Sair
      </button>
    </aside>
  );
}