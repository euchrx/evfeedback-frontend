import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "../../../services/auth";
import { getCompanies, type Company } from "../../../services/companies";
import {
  getAppApkInfo,
  getMySettings,
  sendTestEmail,
  type AppApkInfo,
  uploadAppApk,
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

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function SettingsPage() {
  const currentUser = getStoredUser();

  const canView = canViewOperationalModules(currentUser);
  const canManage = canManageOperationalModules(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState(
    superAdmin ? "" : resolvedCompanyId ?? "",
  );

  const selectedCompanyId = useMemo(() => {
    if (superAdmin) {
      return companyId || undefined;
    }

    return resolvedCompanyId;
  }, [superAdmin, companyId, resolvedCompanyId]);

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
  const [appApkInfo, setAppApkInfo] = useState<AppApkInfo>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingApk, setUploadingApk] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resolvedPrimaryColor = primaryColor.trim() || "#0ea5e9";
  const resolvedBackgroundColor = backgroundColor.trim() || "#020617";
  const resolvedTextColor = textColor.trim() || "#ffffff";
  const resolvedCardBackgroundColor =
    cardBackgroundColor.trim() || "rgba(15,23,42,0.72)";
  const resolvedButtonTextColor = buttonTextColor.trim() || "#0f172a";

  const previewCompanyName = companyName.trim() || "EvFeedback";
  const previewHeroTitle = heroTitle.trim() || "Como foi sua experiência hoje?";
  const previewHeroSubtitle =
    heroSubtitle.trim() || "Toque em uma opção para avaliar rapidamente.";

  const previewBackgroundStyle = backgroundImageUrl.trim()
    ? {
        backgroundColor: resolvedBackgroundColor,
        backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.55), rgba(2, 6, 23, 0.78)), url(${backgroundImageUrl.trim()})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }
    : {
        backgroundColor: resolvedBackgroundColor,
      };

  const appApkQrCodeUrl = appApkInfo?.downloadUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
        appApkInfo.downloadUrl,
      )}`
    : "";

  function resetSettingsForm() {
    setCompanyName("");
    setLogoUrl("");
    setThankYouMessage("");
    setPrimaryColor("#0ea5e9");
    setKioskResetSeconds(5);
    setHeroTitle("");
    setHeroSubtitle("");
    setBackgroundColor("#020617");
    setBackgroundImageUrl("");
    setCardBackgroundColor("rgba(15,23,42,0.72)");
    setTextColor("#ffffff");
    setButtonTextColor("#0f172a");
    setNotificationEmails("");
    setDailyNotificationEnabled(true);
    setMonthlyNotificationEnabled(true);
  }

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    void load();
  }, [canView, superAdmin, selectedCompanyId]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (superAdmin) {
        const companiesData = await getCompanies();
        setCompanies(Array.isArray(companiesData) ? (companiesData as Company[]) : []);

        if (!selectedCompanyId) {
          resetSettingsForm();
          setAppApkInfo(null);
          return;
        }
      }

      const [settings, apkInfo] = await Promise.all([
        getMySettings(selectedCompanyId),
        getAppApkInfo().catch(() => null),
      ]);

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
      setAppApkInfo(apkInfo ?? null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Não foi possível carregar as configurações."));
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

  async function handleUploadApk(file: File | null) {
    if (!file) return;

    try {
      setUploadingApk(true);
      setError("");
      setSuccess("");

      const apkInfo = await uploadAppApk(file);
      setAppApkInfo(apkInfo);
      setSuccess("APK enviado com sucesso.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Não foi possível enviar o APK."));
    } finally {
      setUploadingApk(false);
    }
  }

  async function handleCopyApkLink() {
    if (!appApkInfo?.downloadUrl) return;

    await navigator.clipboard.writeText(appApkInfo.downloadUrl);
    setSuccess("Link do APK copiado com sucesso.");
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
          Personalize o kiosk, configure notificações e distribua o APK.
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Empresa
                  </label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
                  >
                    <option value="">Selecione a empresa</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Nome exibido da empresa
                </label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex.: Pedro Pelanda"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  URL da logo
                </label>
                <input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Título principal
                </label>
                <input
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  placeholder="Ex.: Como foi sua experiência hoje?"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Subtítulo
                </label>
                <input
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  placeholder="Ex.: Toque em uma opção para avaliar rapidamente."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Mensagem de agradecimento
                </label>
                <input
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  placeholder="Ex.: Obrigado pela sua avaliação!"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Cor principal
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-transparent p-0"
                  />
                  <span className="text-sm text-slate-700">{primaryColor}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Cor de fundo
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-3">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-transparent p-0"
                  />
                  <span className="text-sm text-slate-700">{backgroundColor}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  URL da imagem de fundo
                </label>
                <input
                  value={backgroundImageUrl}
                  onChange={(e) => setBackgroundImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Cor do card
                </label>
                <input
                  value={cardBackgroundColor}
                  onChange={(e) => setCardBackgroundColor(e.target.value)}
                  placeholder="rgba(15,23,42,0.72)"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Cor do texto
                </label>
                <input
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  placeholder="#ffffff"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Cor do texto do botão
                </label>
                <input
                  value={buttonTextColor}
                  onChange={(e) => setButtonTextColor(e.target.value)}
                  placeholder="#0f172a"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Tempo para reset do kiosk (segundos)
                </label>
                <input
                  type="number"
                  min={1}
                  value={kioskResetSeconds}
                  onChange={(e) =>
                    setKioskResetSeconds(Number(e.target.value) || 5)
                  }
                  placeholder="5"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">Preview</h2>
              <p className="text-sm text-slate-500">
                Veja em tempo real como a configuração aparece no kiosk.
              </p>
            </div>

            <div className="overflow-hidden rounded-[32px] border border-slate-200 shadow-inner">
              <div
                className="relative min-h-[720px] overflow-hidden px-4 py-6 md:px-8 md:py-10"
                style={{
                  ...previewBackgroundStyle,
                  color: resolvedTextColor,
                }}
              >
                <div className="mx-auto flex min-h-[calc(720px-3rem)] w-full max-w-5xl items-center justify-center">
                  <div
                    className="w-full rounded-[32px] border border-white/10 p-6 shadow-2xl backdrop-blur md:p-10"
                    style={{
                      backgroundColor: resolvedCardBackgroundColor,
                    }}
                  >
                    <header className="mb-8 text-center">
                      {logoUrl.trim() ? (
                        <img
                          src={logoUrl.trim()}
                          alt={previewCompanyName}
                          className="mx-auto mb-5 h-16 w-auto object-contain md:h-20"
                        />
                      ) : (
                        <div
                          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold md:h-20 md:w-20"
                          style={{
                            backgroundColor: "#ffffff",
                            color: resolvedPrimaryColor,
                            boxShadow: `0 0 0 6px ${resolvedPrimaryColor}22`,
                          }}
                        >
                          {previewCompanyName.slice(0, 1).toUpperCase()}
                        </div>
                      )}

                      <p
                        className="text-sm uppercase tracking-[0.28em] opacity-90"
                        style={{ color: resolvedPrimaryColor }}
                      >
                        {previewCompanyName}
                      </p>
                    </header>

                    <section className="text-center">
                      <h1
                        className="text-3xl font-bold md:text-5xl"
                        style={{ color: resolvedTextColor }}
                      >
                        {previewHeroTitle}
                      </h1>

                      <p className="mx-auto mt-4 max-w-2xl text-base opacity-90 md:text-xl">
                        {previewHeroSubtitle}
                      </p>

                      <div
                        className="mx-auto mt-6 h-1.5 w-28 rounded-full"
                        style={{ backgroundColor: resolvedPrimaryColor }}
                      />

                      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-5">
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
                            className="flex min-h-[150px] flex-col items-center justify-center rounded-3xl p-6 transition md:min-h-[190px] md:p-8"
                            style={{
                              border: `1px solid ${resolvedPrimaryColor}55`,
                              backgroundColor: `${resolvedPrimaryColor}18`,
                              boxShadow: `inset 0 0 0 1px ${resolvedPrimaryColor}18`,
                            }}
                          >
                            <span className="text-5xl md:text-6xl">{option.emoji}</span>
                            <span
                              className="mt-4 text-base font-semibold md:text-lg"
                              style={{ color: resolvedButtonTextColor }}
                            >
                              {option.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>

                <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
                  <span
                    className="text-[10px] font-medium uppercase tracking-[0.22em] opacity-40 md:text-xs"
                    style={{ color: resolvedTextColor }}
                  >
                    Powered by EvFeedback
                  </span>
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

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">
                Aplicativo Android
              </h2>
              <p className="text-sm text-slate-500">
                Envie o APK e use o QR code para baixar diretamente no tablet.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_320px]">
              <div className="space-y-4">
                {superAdmin ? (
                  <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 transition hover:border-sky-400 hover:bg-sky-50">
                    <span className="font-medium text-slate-800">
                      {uploadingApk ? "Enviando APK..." : "Selecionar APK"}
                    </span>
                    <span>Escolha um arquivo `.apk` para substituir a versão atual.</span>
                    <input
                      type="file"
                      accept=".apk,application/vnd.android.package-archive"
                      disabled={uploadingApk}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        void handleUploadApk(file);
                        e.currentTarget.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                ) : null}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  {appApkInfo ? (
                    <div className="space-y-3 text-sm text-slate-700">
                      <div>
                        <p className="font-semibold text-slate-900">APK atual</p>
                        <p className="mt-1 break-all">{appApkInfo.originalName}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Tamanho
                          </p>
                          <p className="mt-1 font-medium">
                            {formatFileSize(appApkInfo.size)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Enviado em
                          </p>
                          <p className="mt-1 font-medium">
                            {formatDateTime(appApkInfo.uploadedAt)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Link público
                        </p>
                        <a
                          href={appApkInfo.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block break-all text-sky-700 hover:text-sky-800"
                        >
                          {appApkInfo.downloadUrl}
                        </a>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <a
                          href={appApkInfo.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                        >
                          Abrir link
                        </a>

                        <button
                          type="button"
                          onClick={() => void handleCopyApkLink()}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Copiar link
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Nenhum APK enviado ainda.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {appApkInfo?.downloadUrl ? (
                  <div className="space-y-3 text-center">
                    <img
                      src={appApkQrCodeUrl}
                      alt="QR code para download do APK"
                      className="mx-auto h-72 w-72 rounded-2xl border border-slate-200 bg-white p-3"
                    />
                    <p className="text-sm text-slate-600">
                      Escaneie com o tablet para abrir o download do APK.
                    </p>
                  </div>
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center text-center text-sm text-slate-500">
                    O QR code aparecerá aqui assim que um APK for enviado.
                  </div>
                )}
              </div>
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