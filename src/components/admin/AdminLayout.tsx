import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { getStoredUser, logout } from "../../services/auth";

export function AdminLayout() {
  const navigate = useNavigate();
  const user = getStoredUser();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <Sidebar />
        </div>

        <main className="min-w-0 space-y-6">
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Usuário logado</p>
              <h1 className="text-lg font-semibold text-slate-900">
                {user?.name ?? "Usuário"}
              </h1>
              <p className="text-sm text-slate-500">
                {user?.email ?? "-"} • {user?.role ?? "-"}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Sair
            </button>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  );
}