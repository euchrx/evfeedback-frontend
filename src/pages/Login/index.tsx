import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/auth";

const REMEMBERED_EMAIL_KEY = "evfeedback.rememberedEmail";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "");
  const [password, setPassword] = useState("");
  const [rememberAccess, setRememberAccess] = useState(() => Boolean(localStorage.getItem(REMEMBERED_EMAIL_KEY)));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isFormInvalid = useMemo(() => !email.trim() || !password.trim() || isSubmitting, [email, password, isSubmitting]);

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
      await login({ email: normalizedEmail, password }, rememberAccess);

      if (rememberAccess) localStorage.setItem(REMEMBERED_EMAIL_KEY, normalizedEmail);
      else localStorage.removeItem(REMEMBERED_EMAIL_KEY);

      navigate("/admin/dashboard", { replace: true });
    } catch {
      setError("Não foi possível entrar. Verifique suas credenciais e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/30 sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 ring-1 ring-cyan-300/20">
            <span className="text-lg font-semibold text-cyan-300">EV</span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Acessar sistema</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Informe seus dados para continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-slate-200">E-mail</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-500/10" />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-200">Senha</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-500/10" />
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={rememberAccess} onChange={(event) => setRememberAccess(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-slate-950 accent-cyan-400" />
            Lembrar meu acesso
          </label>

          {error ? <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

          <button type="submit" disabled={isFormInvalid} className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
