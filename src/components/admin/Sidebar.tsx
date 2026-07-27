import {
  Building2,
  ChartNoAxesCombined,
  LogOut,
  MapPin,
  MessageSquareText,
  Settings,
  Tags,
  Users,
  MonitorSmartphone,
} from "lucide-react";
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

const menuItems = [
  { label: "Dashboard", to: "/admin/dashboard", icon: ChartNoAxesCombined, permission: canAccessDashboard },
  { label: "Feedbacks", to: "/admin/feedbacks", icon: MessageSquareText, permission: canAccessFeedbacks },
  { label: "Kiosks", to: "/admin/kiosks", icon: MonitorSmartphone, permission: canAccessKiosks },
  { label: "Tags", to: "/admin/tags", icon: Tags, permission: canAccessTags },
  { label: "Empresas", to: "/admin/companies", icon: Building2, permission: canAccessCompanies },
  { label: "Filiais", to: "/admin/branches", icon: MapPin, permission: canAccessBranches },
  { label: "Usuários", to: "/admin/users", icon: Users, permission: canAccessUsers },
  { label: "Configurações", to: "/admin/settings", icon: Settings, permission: canAccessSettings },
];

export function Sidebar() {
  const navigate = useNavigate();
  const user = getStoredUser();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white text-slate-900">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-4">

        <span className="text-base font-semibold tracking-tight">EvFeedback</span>
      </div>

      <nav className="flex flex-1 gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-y-auto">
        {menuItems
          .filter((item) => item.permission(user))
          .map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                [
                  "group flex h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
                  isActive
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-600 hover:bg-white hover:text-slate-900",
                ].join(" ")
              }
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
      </nav>

      <div className="hidden border-t border-slate-200 p-2 lg:block">
        {user ? (
          <div className="mb-1 flex items-center gap-3 px-3 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-cyan-700">
              {(user.name?.trim()?.charAt(0) || "U").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          Encerrar sessão
        </button>
      </div>
    </aside>
  );
}


