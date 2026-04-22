import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/auth";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isFormInvalid = useMemo(() => {
    return !email.trim() || !password.trim() || isSubmitting;
  }, [email, password, isSubmitting]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password.trim()) {
      setError("Preencha e-mail e senha para continuar.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      await login({
        email: normalizedEmail,
        password,
      });

      navigate("/admin/dashboard", { replace: true });
    } catch {
      setError("Não foi possível entrar. Verifique suas credenciais e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_35%),linear-gradient(to_bottom,rgba(15,23,42,0.9),rgba(2,6,23,1))]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:grid lg:grid-cols-2 lg:gap-10 lg:px-8">
        <section className="hidden lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 backdrop-blur">
              Plataforma de gestão de feedbacks presenciais
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight text-white xl:text-5xl">
              Centralize a operação dos seus kiosks, equipes e avaliações em um único painel.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 xl:text-lg">
              Acompanhe feedbacks, organize unidades, configure a experiência do kiosk e
              mantenha a gestão do sistema com mais controle, padronização e clareza.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="text-sm text-slate-400">Gestão</div>
                <div className="mt-2 text-sm font-medium text-white">Empresas e filiais</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="text-sm text-slate-400">Operação</div>
                <div className="mt-2 text-sm font-medium text-white">Kiosks e tags</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="text-sm text-slate-400">Visão</div>
                <div className="mt-2 text-sm font-medium text-white">Feedbacks e indicadores</div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full max-w-md lg:ml-auto">
          <div className="rounded-[28px] border border-white/10 bg-white/8 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div className="mb-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 ring-1 ring-cyan-300/20">
                <span className="text-lg font-semibold text-cyan-300">EV</span>
              </div>

              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white">
                Acessar painel administrativo
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Entre com sua conta para gerenciar o ambiente administrativo do EvFeedback.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@empresa.com"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite sua senha"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/10"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isFormInvalid}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Entrando..." : "Entrar no sistema"}
              </button>
            </form>

            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-center text-xs leading-5 text-slate-400">
                Acesso restrito ao ambiente administrativo.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}