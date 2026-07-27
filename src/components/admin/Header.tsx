import { useLocation, useNavigate } from "react-router-dom";
import { getStoredUser, logout } from "../../services/auth";

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

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/admin/dashboard")) return "Dashboard";
  if (pathname.startsWith("/admin/companies")) return "Empresas";
  if (pathname.startsWith("/admin/users")) return "Usuários";
  if (pathname.startsWith("/admin/branches")) return "Filiais";
  if (pathname.startsWith("/admin/kiosks")) return "Kiosks";
  if (pathname.startsWith("/admin/tags")) return "Tags";
  if (pathname.startsWith("/admin/feedbacks")) return "Feedbacks";
  if (pathname.startsWith("/admin/settings")) return "Configurações";
  return "Painel administrativo";
}

function getPageDescription(pathname: string) {
  if (pathname.startsWith("/admin/dashboard")) {
    return "Acompanhe os principais indicadores e a visão geral da operação.";
  }

  if (pathname.startsWith("/admin/companies")) {
    return "Gerencie as empresas cadastradas no ambiente administrativo.";
  }

  if (pathname.startsWith("/admin/users")) {
    return "Controle usuários, acessos e permissões do sistema.";
  }

  if (pathname.startsWith("/admin/branches")) {
    return "Organize a estrutura operacional das filiais.";
  }

  if (pathname.startsWith("/admin/kiosks")) {
    return "Administre kiosks, tokens e pontos de coleta.";
  }

  if (pathname.startsWith("/admin/tags")) {
    return "Padronize as tags utilizadas nas avaliações.";
  }

  if (pathname.startsWith("/admin/feedbacks")) {
    return "Visualize, filtre e acompanhe os feedbacks recebidos.";
  }

  if (pathname.startsWith("/admin/settings")) {
    return "Configure identidade visual, mensagens e parâmetros do sistema.";
  }

  return "Gerencie o ambiente administrativo do EvFeedback.";
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  const pageTitle = getPageTitle(location.pathname);
  const pageDescription = getPageDescription(location.pathname);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="flex flex-col gap-6 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            EvFeedback Admin
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {pageTitle}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-[15px]">
            {pageDescription}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:min-w-[320px]">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Sessão ativa
            </p>

            <div className="mt-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.name ?? "Usuário"}
                </p>
                <p className="mt-1 truncate text-sm text-slate-400">
                  {user?.email ?? "-"}
                </p>
                <p className="mt-2 inline-flex rounded-full border border-cyan-200 bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-700">
                  {formatRoleLabel(user?.role)}
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-sm font-semibold text-cyan-700 ring-1 ring-cyan-300/20">
                {(user?.name?.trim()?.charAt(0) || "U").toUpperCase()}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
          >
            Encerrar sessão
          </button>
        </div>
      </div>
    </header>
  );
}