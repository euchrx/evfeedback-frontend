import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "../../../services/auth";
import { getCompanies, type Company } from "../../../services/companies";
import {
  getMySettings,
  sendTestEmail,
  updateMySettings,
} from "../../../services/settings";
import {
  canManageOperationalModules,
  canViewOperationalModules,
  getResolvedCompanyId,
  isSuperAdmin,
} from "../../../utils/permissions";

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
}

export default function SettingsPage() {
  const currentUser = getStoredUser();

  const canView = canViewOperationalModules(currentUser);
  const canManage = canManageOperationalModules(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState(
    resolvedCompanyId ?? currentUser?.companyId ?? "",
  );

  const selectedCompanyId = useMemo(() => {
    if (superAdmin) {
      return companyId || currentUser?.companyId || undefined;
    }

    return resolvedCompanyId;
  }, [superAdmin, companyId, resolvedCompanyId, currentUser?.companyId]);

  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  const [kioskResetSeconds, setKioskResetSeconds] = useState(5);
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#020617");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [cardBackgroundColor, setCardBackgroundColor] = useState(
    "rgba(15,23,42,0.72)",
  );
  const [textColor, setTextColor] = useState("#ffffff");
  const [buttonTextColor, setButtonTextColor] = useState("#0f172a");
  const [notificationEmails, setNotificationEmails] = useState("");
  const [dailyNotificationEnabled, setDailyNotificationEnabled] = useState(true);
  const [monthlyNotificationEnabled, setMonthlyNotificationEnabled] =
    useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const previewCompanyName = companyName.trim() || "EvFeedback";
  const previewHeroTitle = heroTitle.trim() || "Como foi sua experiência hoje?";
  const previewHeroSubtitle =
    heroSubtitle.trim() || "Toque em uma opção para avaliar rapidamente.";
  const previewThankYouMessage =
    thankYouMessage.trim() || "Sua opinião é muito importante para nós.";
  const previewResetSeconds = kioskResetSeconds > 0 ? kioskResetSeconds : 5;
  const previewBackgroundStyle = backgroundImageUrl.trim()
    ? {
        backgroundColor: backgroundColor.trim() || "#020617",
        backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.55), rgba(2, 6, 23, 0.78)), url(${backgroundImageUrl.trim()})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }
    : {
        backgroundColor: backgroundColor.trim() || "#020617",
      };

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    void load();
  }, [canView, selectedCompanyId]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (superAdmin) {
        const companiesData = await getCompanies();
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
      }

      const settings = await getMySettings(selectedCompanyId);

      setCompanyName(settings.companyName ?? "");
      setLogoUrl(settings.logoUrl ?? "");
      setThankYouMessage(settings.thankYouMessage ?? "");
      setPrimaryColor(settings.primaryColor ?? "#0ea5e9");
      setKioskResetSeconds(settings.kioskResetSeconds ?? 5);
      setHeroTitle(settings.heroTitle ?? "");
      setHeroSubtitle(settings.heroSubtitle ?? "");
      setBackgroundColor(settings.backgroundColor ?? "#020617");
      setBackgroundImageUrl(settings.backgroundImageUrl ?? "");
      setCardBackgroundColor(
        settings.cardBackgroundColor ?? "rgba(15,23,42,0.72)",
      );
      setTextColor(settings.textColor ?? "#ffffff");
      setButtonTextColor(settings.buttonTextColor ?? "#0f172a");
      setNotificationEmails(settings.notificationEmails ?? "");
      setDailyNotificationEnabled(settings.dailyNotificationEnabled ?? true);
      setMonthlyNotificationEnabled(settings.monthlyNotificationEnabled ?? true);
    } catch {
      setError("Não foi possível carregar as configurações.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendTestEmail() {
    if (!canManage) return;

    if (superAdmin && !selectedCompanyId) {
      setError("Selecione uma empresa.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const result = await sendTestEmail(selectedCompanyId);

      setSuccess(
        `E-mail de teste enviado com sucesso para: ${result.recipients.join(", ")}`,
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Não foi possível enviar o e-mail de teste."));
    }
  }

  async function handleSave() {
    if (!canManage) return;

    if (superAdmin && !selectedCompanyId) {
      setError("Selecione uma empresa.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await updateMySettings(
        {
          companyName: companyName.trim() || null,
          logoUrl: logoUrl.trim() || null,
          thankYouMessage: thankYouMessage.trim() || null,
          primaryColor: primaryColor.trim() || null,
          kioskResetSeconds,
          heroTitle: heroTitle.trim() || null,
          heroSubtitle: heroSubtitle.trim() || null,
          backgroundColor: backgroundColor.trim() || null,
          backgroundImageUrl: backgroundImageUrl.trim() || null,
          cardBackgroundColor: cardBackgroundColor.trim() || null,
          textColor: textColor.trim() || null,
          buttonTextColor: buttonTextColor.trim() || null,
          notificationEmails: notificationEmails.trim() || null,
          dailyNotificationEnabled,
          monthlyNotificationEnabled,
        },
        selectedCompanyId,
      );

      setSuccess("Configurações salvas com sucesso.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Não foi possível salvar as configurações."));
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return (
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Acesso negado
        </h1>
        <p className="text-slate-600">
          Você não tem permissão para acessar a página de configurações.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Configurações
        </h1>
        <p className="text-slate-600">
          Personalize o kiosk e configure notificações por e-mail.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
          Carregando configurações...
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">
                Identidade e layout
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {superAdmin ? (
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
                >
                  <option value="">Selecione a empresa</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              ) : null}

              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nome exibido da empresa"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />

              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="URL da logo"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />

              <input
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="Título principal"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />

              <input
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                placeholder="Subtítulo"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />

              <input
                value={thankYouMessage}
                onChange={(e) => setThankYouMessage(e.target.value)}
                placeholder="Mensagem de agradecimento"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />

              <div className="flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-transparent p-0"
                />
                <span className="text-sm text-slate-600">Cor principal</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-3">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-transparent p-0"
                />
                <span className="text-sm text-slate-600">Cor de fundo</span>
              </div>

              <input
                value={backgroundImageUrl}
                onChange={(e) => setBackgroundImageUrl(e.target.value)}
                placeholder="URL da imagem de fundo"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />

              <input
                value={cardBackgroundColor}
                onChange={(e) => setCardBackgroundColor(e.target.value)}
                placeholder="Cor do card"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />

              <input
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                placeholder="Cor do texto"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />

              <input
                value={buttonTextColor}
                onChange={(e) => setButtonTextColor(e.target.value)}
                placeholder="Cor do texto do botão"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />

              <input
                type="number"
                min={1}
                value={kioskResetSeconds}
                onChange={(e) => setKioskResetSeconds(Number(e.target.value) || 5)}
                placeholder="Tempo de reset"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">Preview</h2>
              <p className="text-sm text-slate-500">
                Veja em tempo real como a configuração aparece no kiosk.
              </p>
            </div>

            <div
              className="overflow-hidden rounded-[32px] border border-slate-200 p-4 shadow-inner"
              style={previewBackgroundStyle}
            >
              <div className="mx-auto max-w-4xl rounded-[28px] border border-white/10 p-4 backdrop-blur-sm sm:p-6">
                <div
                  className="mx-auto flex min-h-[440px] max-w-2xl flex-col justify-between rounded-[28px] border border-white/10 p-6 shadow-2xl"
                  style={{
                    background: cardBackgroundColor.trim() || "rgba(15,23,42,0.72)",
                    color: textColor.trim() || "#ffffff",
                  }}
                >
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      {logoUrl.trim() ? (
                        <img
                          src={logoUrl.trim()}
                          alt={previewCompanyName}
                          className="h-16 w-16 rounded-2xl border border-white/15 bg-white/10 object-cover p-2"
                        />
                      ) : (
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold"
                          style={{ backgroundColor: primaryColor.trim() || "#0ea5e9" }}
                        >
                          {previewCompanyName.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] opacity-70">
                          Kiosk Preview
                        </p>
                        <h3 className="text-2xl font-bold">{previewCompanyName}</h3>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-3xl font-bold leading-tight">
                        {previewHeroTitle}
                      </h4>
                      <p className="max-w-xl text-sm opacity-80">
                        {previewHeroSubtitle}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      {[
                        { label: "Péssimo", emoji: "😠" },
                        { label: "Ruim", emoji: "🙁" },
                        { label: "Ok", emoji: "😐" },
                        { label: "Bom", emoji: "🙂" },
                        { label: "Excelente", emoji: "🤩" },
                      ].map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          className="rounded-2xl px-4 py-4 text-center text-sm font-semibold shadow-sm transition"
                          style={{
                            backgroundColor: primaryColor.trim() || "#0ea5e9",
                            color: buttonTextColor.trim() || "#0f172a",
                          }}
                        >
                          <span className="block text-2xl">{option.emoji}</span>
                          <span className="mt-2 block">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="font-semibold">Mensagem final</p>
                      <p className="mt-1 opacity-80">{previewThankYouMessage}</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center">
                      <p className="text-xs uppercase tracking-[0.24em] opacity-70">
                        Reset
                      </p>
                      <p className="mt-1 text-lg font-bold">
                        {previewResetSeconds}s
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">
                Notificações por e-mail
              </h2>
              <p className="text-sm text-slate-500">
                Informe um ou mais e-mails separados por vírgula.
              </p>
            </div>

            <div className="grid gap-4">
              <textarea
                value={notificationEmails}
                onChange={(e) => setNotificationEmails(e.target.value)}
                placeholder="exemplo1@empresa.com, exemplo2@empresa.com"
                className="min-h-[120px] resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />

              <label className="inline-flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={dailyNotificationEnabled}
                  onChange={(e) => setDailyNotificationEnabled(e.target.checked)}
                />
                Enviar resumo diário com os feedbacks do dia anterior
              </label>

              <label className="inline-flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={monthlyNotificationEnabled}
                  onChange={(e) => setMonthlyNotificationEnabled(e.target.checked)}
                />
                Enviar resumo mensal com os feedbacks do mês anterior
              </label>
            </div>
          </div>

          {superAdmin ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSendTestEmail}
                className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white transition hover:bg-emerald-400"
              >
                Enviar e-mail de teste
              </button>
            </div>
          ) : null}

          {canManage ? (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar configurações"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
