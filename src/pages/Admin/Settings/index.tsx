import { useEffect, useState } from "react";
import {
  getMySettings,
  updateMySettings,
  type CompanySettings,
} from "../../../services/settings";

export default function SettingsPage() {
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

  const [isSaving, setIsSaving] = useState(false);

  async function loadSettings() {
    const data = await getMySettings();
    setSettings(data);

    setCompanyName(data.companyName ?? "");
    setLogoUrl(data.logoUrl ?? "");
    setThankYouMessage(data.thankYouMessage ?? "");
    setPrimaryColor(data.primaryColor ?? "#0ea5e9");
    setKioskResetSeconds(String(data.kioskResetSeconds ?? 5));

    setHeroTitle((data as any).heroTitle ?? "");
    setHeroSubtitle((data as any).heroSubtitle ?? "");
    setBackgroundColor((data as any).backgroundColor ?? "#020617");
    setBackgroundImageUrl((data as any).backgroundImageUrl ?? "");
    setCardBackgroundColor((data as any).cardBackgroundColor ?? "rgba(15,23,42,0.72)");
    setTextColor((data as any).textColor ?? "#ffffff");
    setButtonTextColor((data as any).buttonTextColor ?? "#0f172a");
  }

  async function handleSave() {
    try {
      setIsSaving(true);

      const data = await updateMySettings({
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
      });

      setSettings(data);
      window.alert("Configurações salvas com sucesso.");
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-600 mt-1">
          Personalize totalmente o branding do kiosk da sua empresa.
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome da empresa
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              URL da logo
            </label>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Título principal
            </label>
            <input
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subtítulo
            </label>
            <input
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cor principal
            </label>
            <input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              placeholder="#0ea5e9"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cor de fundo
            </label>
            <input
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              placeholder="#020617"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              URL da imagem de fundo
            </label>
            <input
              value={backgroundImageUrl}
              onChange={(e) => setBackgroundImageUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cor do card
            </label>
            <input
              value={cardBackgroundColor}
              onChange={(e) => setCardBackgroundColor(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              placeholder="rgba(15,23,42,0.72)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cor do texto
            </label>
            <input
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              placeholder="#ffffff"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cor do texto do botão
            </label>
            <input
              value={buttonTextColor}
              onChange={(e) => setButtonTextColor(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              placeholder="#0f172a"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Mensagem de agradecimento
          </label>
          <textarea
            value={thankYouMessage}
            onChange={(e) => setThankYouMessage(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 min-h-[120px] resize-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 px-5 py-3 font-semibold text-slate-950 transition"
          >
            {isSaving ? "Salvando..." : "Salvar branding"}
          </button>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Preview visual</h2>
        <p className="text-sm text-slate-500 mt-1">
          Prévia simplificada do kiosk com seu branding.
        </p>

        <div
          className="mt-6 rounded-3xl p-8 relative overflow-hidden"
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
            className="rounded-3xl p-8 border border-white/10"
            style={{ backgroundColor: cardBackgroundColor }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-16 object-contain mb-4"
              />
            ) : null}

            <p className="uppercase tracking-[0.25em] text-sm font-semibold mb-3" style={{ color: primaryColor }}>
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
    </div>
  );
}