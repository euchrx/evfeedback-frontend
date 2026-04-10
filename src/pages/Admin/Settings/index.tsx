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

export default function SettingsPage() {
  const currentUser = getStoredUser();

  const canView = canViewOperationalModules(currentUser);
  const canManage = canManageOperationalModules(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState(
    resolvedCompanyId ?? currentUser?.companyId ?? ""
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
  const [cardBackgroundColor, setCardBackgroundColor] = useState("rgba(15,23,42,0.72)");
  const [textColor, setTextColor] = useState("#ffffff");
  const [buttonTextColor, setButtonTextColor] = useState("#0f172a");
  const [notificationEmails, setNotificationEmails] = useState("");
  const [dailyNotificationEnabled, setDailyNotificationEnabled] = useState(true);
  const [monthlyNotificationEnabled, setMonthlyNotificationEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
        settings.cardBackgroundColor ?? "rgba(15,23,42,0.72)"
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
        `E-mail de teste enviado com sucesso para: ${result.recipients.join(", ")}`
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        "Não foi possível enviar o e-mail de teste."
      );
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
        selectedCompanyId
      );

      setSuccess("Configurações salvas com sucesso.");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        "Não foi possível salvar as configurações."
      );
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
                className="min-h-[120px] rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 resize-none"
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