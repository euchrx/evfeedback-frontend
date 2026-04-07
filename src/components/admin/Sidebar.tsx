import { NavLink } from "react-router-dom";
import type { AuthUser } from "../../services/auth";

type SidebarProps = {
  user: AuthUser | null;
};

export function Sidebar({ user }: SidebarProps) {
  const items = [
    { label: "Dashboard", to: "/admin/dashboard" },
    ...(user?.role === "SUPER_ADMIN"
      ? [
          { label: "Empresas", to: "/admin/companies" },
          { label: "Usuários", to: "/admin/users" },
        ]
      : []),
    { label: "Kiosks", to: "/admin/kiosks" },
    { label: "Feedbacks", to: "/admin/feedbacks" },
    { label: "Filiais", to: "/admin/branches" },
    { label: "Tags", to: "/admin/tags" },
    { label: "Configurações", to: "/admin/settings" },
  ];

  return (
    <aside className="w-72 bg-slate-950 text-white border-r border-slate-800 min-h-screen">
      <div className="px-6 py-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold">EvFeedback</h1>
        <p className="text-sm text-slate-400 mt-1">Painel administrativo</p>
      </div>

      <nav className="p-4 space-y-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-sky-500 text-slate-950"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}