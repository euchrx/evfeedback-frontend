import { useNavigate } from "react-router-dom";
import { removeAuthToken } from "../../services/authToken";

export function Header() {
  const navigate = useNavigate();

  function handleLogout() {
    removeAuthToken();
    navigate("/login");
  }

  return (
    <header className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Admin</h2>
        <p className="text-sm text-slate-500">
          Gerencie kiosks, feedbacks e filiais
        </p>
      </div>

      <button
        onClick={handleLogout}
        className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition"
      >
        Sair
      </button>
    </header>
  );
}