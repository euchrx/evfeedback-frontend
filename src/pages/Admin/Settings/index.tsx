import { useEffect, useMemo, useState } from "react";
import {
  getCompanySettings,
  getMySettings,
  updateCompanySettings,
  updateMySettings,
  type CompanySettings,
  type UpdateCompanySettingsInput,
} from "../../../services/settings";
import { getCompanies, type Company } from "../../../services/companies";
import { getStoredUser } from "../../../services/auth";
import {
  canManageOperationalModules,
  canViewOperationalModules,
  getResolvedCompanyId,
  isSuperAdmin,
} from "../../../utils/permissions";

function buildPayload(params: {
  companyName: string;
  logoUrl: string;
  thankYouMessage: string;
  primaryColor: string;
  kioskResetSeconds: string;
  heroTitle: string;
  heroSubtitle: string;
  backgroundColor: string;
  backgroundImageUrl: string;
  cardBackgroundColor: string;
  textColor: string;
  buttonTextColor: string;
}): UpdateCompanySettingsInput {
  return {
    companyName: params.companyName.trim() || undefined,
    logoUrl: params.logoUrl.trim() || undefined,
    thankYouMessage: params.thankYouMessage.trim() || undefined,
    primaryColor: params.primaryColor.trim() || undefined,
    kioskResetSeconds: Number(params.kioskResetSeconds) || 5,
    heroTitle: params.heroTitle.trim() || undefined,
    heroSubtitle: params.heroSubtitle.trim() || undefined,
    backgroundColor: params.backgroundColor.trim() || undefined,
    backgroundImageUrl: params.backgroundImageUrl.trim() || undefined,
    cardBackgroundColor: params.cardBackgroundColor.trim() || undefined,
    textColor: params.textColor.trim() || undefined,
    buttonTextColor: params.buttonTextColor.trim() || undefined,
  };
}

export default function SettingsPage() {
  const currentUser = getStoredUser();

  const canView = canViewOperationalModules(currentUser);
  const canManage = canManageOperationalModules(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const resolvedCompanyId = getResolvedCompanyId(currentUser);

  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    resolvedCompanyId ?? ""
  );

  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  const [kioskResetSeconds, setKioskResetSeconds] = useState("5");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#020617");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [cardBackgroundColor, setCardBackgroundColor] = useState(
    "rgba(15,23,42,0.72)"
  );
  const [textColor, setTextColor] = useState("#ffffff");
  const [buttonTextColor, setButtonTextColor] = useState("#0f172a");

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const effectiveCompanyId = useMemo(() => {
    return superAdmin ? selectedCompanyId || undefined : resolvedCompanyId;
  }, [superAdmin, selectedCompanyId, resolvedCompanyId]);

  function hydrateForm(data: CompanySettings) {
    setSettings(data);
    setCompanyName(data.companyName ?? "");
    setLogoUrl(data.logoUrl ?? "");
    setThankYouMessage(data.thankYouMessage ?? "");
    setPrimaryColor(data.primaryColor ?? "#0ea5e9");
    setKioskResetSeconds(String(data.kioskResetSeconds ?? 5));
    setHeroTitle(data.heroTitle ?? "");
    setHeroSubtitle(data.heroSubtitle ?? "");
    setBackgroundColor(data.backgroundColor ?? "#020617");
    setBackgroundImageUrl(data.backgroundImageUrl ?? "");
    setCardBackgroundColor(data.cardBackgroundColor ?? "rgba(15,23,42,0.72)");
    setTextColor(data.textColor ?? "#ffffff");
    setButtonTextColor(data.buttonTextColor ?? "#0f172a");
  }

  async function loadCompanies() {
    if (!superAdmin) return;

    try {
      const data = await getCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch {
      setCompanies([]);
    }
  }

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      if (superAdmin) {
        if (!effectiveCompanyId) {
          setSettings(null);
          return;
        }

        const data = await getCompanySettings(effectiveCompanyId);
        hydrateForm(data);
        return;
      }

      const data = await getMySettings();
      hydrateForm(data);
    } catch {
      setError("Não foi possível carregar as configurações.");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!canManage) return;

    try {
      setIsSaving(true);
      setError("");

      const payload = buildPayload({
        companyName,
        logoUrl,
        thankYouMessage,
        primaryColor,
        kioskResetSeconds,
        heroTitle,
        heroSubtitle,
        backgroundColor,
        backgroundImageUrl,
        cardBackgroundColor,
        textColor,
        buttonTextColor,
      });

      const data =
        superAdmin && effectiveCompanyId
          ? await updateCompanySettings(effectiveCompanyId, payload)
          : await updateMySettings(payload);

      hydrateForm(data);
      window.alert("Configurações salvas com sucesso.");
    } catch {
      setError("Não foi possível salvar as configurações.");
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    void loadCompanies();
  }, [canView, superAdmin]);

  useEffect(() => {
    if (!canView) return;
    void loadSettings();
  }, [canView, effectiveCompanyId]);

  if (!canView) {
    return (
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Acesso negado
        </h1>
        <p className="text-slate-600">
          Você não tem permissão para acessar as configurações.
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
          Personalize o branding e a experiência do kiosk.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {superAdmin ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">
              Empresa alvo
            </h2>
            <p className="text-sm text-slate-500">
              Selecione a empresa que terá o branding editado.
            </p>
          </div>

          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
          >
            <option value="">Selecione uma empresa</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-slate-500 shadow-sm">
          Carregando configurações...
        </div>
      ) : superAdmin && !effectiveCompanyId ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-slate-500 shadow-sm">
          Selecione uma empresa para editar as configurações.
        </div>
      ) : (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">
                Branding do kiosk
              </h2>
              <p className="text-sm text-slate-500">
                Ajuste os textos, cores e aparência do kiosk público.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Nome da empresa
                </label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Cor principal
                </label>
                <input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#0ea5e9"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Tempo de reset (segundos)
                </label>
                <input
                  type="number"
                  min={1}
                  value={kioskResetSeconds}
                  onChange={(e) => setKioskResetSeconds(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Cor de fundo
                </label>
                <input
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  placeholder="#020617"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  URL da imagem de fundo
                </label>
                <input
                  value={backgroundImageUrl}
                  onChange={(e) => setBackgroundImageUrl(e.target.value)}
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

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Mensagem de agradecimento
                </label>
                <textarea
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  className="min-h-[120px] w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {canManage ? (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Salvando..." : "Salvar branding"}
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Preview visual
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Prévia simplificada do kiosk com seu branding.
            </p>

            <div
              className="relative mt-6 overflow-hidden rounded-3xl p-8"
              style={{
                backgroundColor,
                color: textColor,
                backgroundImage: backgroundImageUrl
                  ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${backgroundImageUrl})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div
                className="rounded-3xl border border-white/10 p-8"
                style={{ backgroundColor: cardBackgroundColor }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="mb-4 h-16 object-contain"
                  />
                ) : null}

                <p
                  className="mb-3 text-sm font-semibold uppercase tracking-[0.25em]"
                  style={{ color: primaryColor }}
                >
                  {companyName || settings?.companyName || "Sua empresa"}
                </p>

                <h3 className="text-4xl font-bold">
                  {heroTitle || "Como foi sua experiência hoje?"}
                </h3>

                <p className="mt-3 text-lg opacity-90">
                  {heroSubtitle ||
                    "Toque em uma opção para avaliar rapidamente."}
                </p>

                <div className="mt-8">
                  <button
                    className="rounded-2xl px-6 py-3 font-semibold"
                    style={{
                      backgroundColor: primaryColor,
                      color: buttonTextColor,
                    }}
                  >
                    Exemplo de botão
                  </button>
                </div>

                <p className="mt-8 text-base opacity-90">
                  {thankYouMessage || "Obrigado pela sua avaliação!"}
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </section>
  );
}