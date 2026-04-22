import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { getStoredUser } from "../../services/auth";

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

export function AdminLayout() {
  const location = useLocation();
  const user = getStoredUser();

  const pageTitle = getPageTitle(location.pathname);
  const pageDescription = getPageDescription(location.pathname);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative min-h-screen overflow-hidden">
        {/* Background premium */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-10%] top-[-8%] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-[-12%] right-[-8%] h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.07),transparent_30%),linear-gradient(to_bottom,rgba(2,6,23,0.96),rgba(2,6,23,1))]" />
        </div>

        <div className="relative z-10 mx-auto grid min-h-screen max-w-[1600px] gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8 lg:py-6">
          
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
            <Sidebar />
          </aside>

          {/* Conteúdo */}
          <div className="min-w-0 space-y-6">
            
            {/* Header simplificado */}
            <header className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="flex flex-col gap-3">
                
                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 w-fit">
                  EvFeedback Admin
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {pageTitle}
                </h1>

                <p className="max-w-2xl text-sm text-slate-300 sm:text-[15px]">
                  {pageDescription}
                </p>

                {/* Linha de contexto leve */}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>
                    {user?.name ?? "Usuário"}
                  </span>
                  <span className="opacity-50">•</span>
                  <span>
                    {user?.email ?? "-"}
                  </span>
                </div>

              </div>
            </header>

            {/* Conteúdo da página */}
            <main className="min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}