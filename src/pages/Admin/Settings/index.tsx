import { useEffect, useState } from "react";
import { getStoredUser } from "../../../services/auth";
import { getCompanies, type Company } from "../../../services/companies";
import {
  getCompanySettings,
  getMySettings,
  updateCompanySettings,
  updateMySettings,
  type CompanySettings,
} from "../../../services/settings";

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";
  companyId?: string | null;
};

export default function SettingsPage() {
  const currentUser = getStoredUser() as StoredUser | null;

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const canEdit = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "COMPANY_ADMIN";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    isSuperAdmin ? "" : currentUser?.companyId ?? "",
  );

  const [settings, setSettings] = useState<CompanySettings | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  const [kioskResetSeconds, setKioskResetSeconds] = useState("5");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#020617");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [cardBackgroundColor, setCardBackgroundColor] = useState("rgba(15,23,42,0.72)");
  const [textColor, setTextColor] = useState("#ffffff");
  const [buttonTextColor, setButtonTextColor] = useState("#0f172a");

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function applySettings(data: CompanySettings) {
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

  async function loadSettings(companyIdOverride?: string) {
    try {
      setError("");
      setLoading(true);

      let data: CompanySettings;

      if (isSuperAdmin) {
        const targetCompanyId = companyIdOverride ?? selectedCompanyId;

        if (!targetCompanyId) {
          setSettings(null);
          setLoading(false);
          return;
        }

        data = await getCompanySettings(targetCompanyId);
      } else {
        data = await getMySettings();
      }

      applySettings(data);
    } catch {
      setError("Não foi possível carregar as configurações.");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanies() {
    if (!isSuperAdmin) return;

    const data = await getCompanies();
    setCompanies(Array.isArray(data) ? data : []);
  }

  async function handleSave() {
    try {
      setError("");
      setIsSaving(true);

      const payload = {
        companyName: companyName.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        thankYouMessage: thankYouMessage.trim() || undefined,
        primaryColor: primaryColor.trim() || undefined,
        kioskResetSeconds: Number(kioskResetSeconds) || 5,
        heroTitle: heroTitle.trim() || undefined,
        heroSubtitle: heroSubtitle.trim() || undefined,
        backgroundColor: backgroundColor.trim() || undefined,
        backgroundImageUrl: backgroundImageUrl.trim() || undefined,
        cardBackgroundColor: cardBackgroundColor.trim() || undefined,
        textColor: textColor.trim() || undefined,
        buttonTextColor: buttonTextColor.trim() || undefined,
      };

      const data = isSuperAdmin
        ? await updateCompanySettings(selectedCompanyId, payload)
        : await updateMySettings(payload);

      applySettings(data);
      window.alert("Configurações salvas com sucesso.");
    } catch {
      setError("Não foi possível salvar as configurações.");
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        if (isSuperAdmin) {
          await loadCompanies();
        }

        await loadSettings(isSuperAdmin ? selectedCompanyId : undefined);
      } catch {
        setError("Não foi possível iniciar a página.");
        setLoading(false);
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (isSuperAdmin && selectedCompanyId) {
      loadSettings(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="mt-1 text-sm text-slate-600">
          Personalize totalmente o branding do kiosk da sua empresa.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {isSuperAdmin ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Empresa alvo
          </h2>

          <div className="mt-4 max-w-md">
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
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
        </div>
      ) : null}

      {!isSuperAdmin || selectedCompanyId ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Branding do kiosk
            </h2>

            {loading ? (
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
                Carregando configurações...
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Nome da empresa"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100"
                  />

                  <input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="URL da logo"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100"
                  />

                  <input
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Título principal"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100"
                  />

                  <input
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Subtítulo"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100"
                  />

                  <input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    disabled={!canEdit}
                    placeholder="#0ea5e9"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100"
                  />

                  <input
                    value={kioskResetSeconds}
                    onChange={(e) => setKioskResetSeconds(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Tempo de reset (segundos)"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100"
                  />

                  <input
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    disabled={!canEdit}
                    placeholder="#020617"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100"
                  />

                  <input
                    value={backgroundImageUrl}
                    onChange={(e) => setBackgroundImageUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="URL da imagem de fundo"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100"
                  />

                  <input
                    value={cardBackgroundColor}
                    onChange={(e) => setCardBackgroundColor(e.target.value)}
                    disabled={!canEdit}
                    placeholder="rgba(15,23,42,0.72)"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100"
                  />

                  <input
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    disabled={!canEdit}
                    placeholder="#ffffff"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100"
                  />

                  <input
                    value={buttonTextColor}
                    onChange={(e) => setButtonTextColor(e.target.value)}
                    disabled={!canEdit}
                    placeholder="#0f172a"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100"
                  />

                  <textarea
                    value={thankYouMessage}
                    onChange={(e) => setThankYouMessage(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Mensagem de agradecimento"
                    className="min-h-[120px] w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 disabled:bg-slate-100 md:col-span-2"
                  />
                </div>

                {canEdit ? (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || (isSuperAdmin && !selectedCompanyId)}
                      className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? "Salvando..." : "Salvar branding"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Preview visual</h2>
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
                  {heroSubtitle || "Toque em uma opção para avaliar rapidamente."}
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
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-600">
          Selecione uma empresa para editar o branding.
        </div>
      )}
    </div>
  );
}