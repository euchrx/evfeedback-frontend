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
    {
      label: "Dashboard",
      to: "/admin",
      visible: !!user,
    },
    {
      label: "Empresas",
      to: "/admin/companies",
      visible: canAccessCompanies(user),
    },
    {
      label: "Usuários",
      to: "/admin/users",
      visible: canAccessUsers(user),
    },
    {
      label: "Filiais",
      to: "/admin/branches",
      visible: canViewOperationalModules(user),
    },
    {
      label: "Kiosks",
      to: "/admin/kiosks",
      visible: canViewOperationalModules(user),
    },
    {
      label: "Tags",
      to: "/admin/tags",
      visible: canViewOperationalModules(user),
    },
    {
      label: "Feedbacks",
      to: "/admin/feedbacks",
      visible: canViewOperationalModules(user),
    },
    {
      label: "Configurações",
      to: "/admin/settings",
      visible: canViewOperationalModules(user),
    },
  ];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-200 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
          EvFeedback
        </p>

        <h1 className="mt-2 text-xl font-bold text-slate-900">Painel Admin</h1>

        {user ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="mt-1 break-all text-xs text-slate-600">{user.email}</p>
            <p className="mt-2 inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
              {user.role}
            </p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {menuItems
          .filter((item) => item.visible)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) =>
                [
                  "block rounded-xl px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-sky-500 text-slate-950"
                    : "text-slate-700 hover:bg-slate-100",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <button
          onClick={handleLogout}
          className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}