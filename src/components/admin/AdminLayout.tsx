import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { getStoredUser, logout } from "../../services/auth";

export function AdminLayout() {
  const navigate = useNavigate();
  const user = getStoredUser();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col">
        <header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Painel administrativo
            </h2>
            <p className="text-sm text-slate-500">
              {user?.name} • {user?.role}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Sair
          </button>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}