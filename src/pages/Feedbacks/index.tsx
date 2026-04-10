import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { api } from "../../services/api";
import {
  getPublicKioskConfig,
  getPublicKioskTags,
  type PublicEnvironmentType,
  type PublicKioskConfig,
} from "../../services/publicKiosk";

type Step =
  | "rating"
  | "tags"
  | "comment"
  | "contact"
  | "done"
  | "error";

type KioskErrorType = "missing_token" | "invalid_token" | "request_error" | null;

type RatingOption = {
  value: number;
  emoji: string;
  label: string;
};

type TagOption = {
  id: string;
  name: string;
};

const RATING_OPTIONS: RatingOption[] = [
  { value: 1, emoji: "😡", label: "Péssimo" },
  { value: 2, emoji: "😐", label: "Ruim" },
  { value: 3, emoji: "🙂", label: "Ok" },
  { value: 4, emoji: "😃", label: "Bom" },
  { value: 5, emoji: "🤩", label: "Excelente" },
];

const DEFAULT_RESET_DELAY_MS = 3000;
const INACTIVITY_TIMEOUT_MS = 30000;

function getKioskTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token")?.trim() || "";
}

function getEnvironmentLabel(environment?: PublicEnvironmentType) {
  switch (environment) {
    case "POSTO":
      return "Posto";
    case "CONVENIENCIA":
      return "Conveniência";
    case "RESTAURANTE":
      return "Restaurante";
    default:
      return "Atendimento";
  }
}

export default function FeedbackKiosk() {
  const [step, setStep] = useState<Step>("rating");
  const [kioskErrorType, setKioskErrorType] = useState<KioskErrorType>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactConsent, setContactConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [config, setConfig] = useState<PublicKioskConfig | null>(null);

  const inactivityTimerRef = useRef<number | null>(null);

  const kioskToken = useMemo(() => {
    return getKioskTokenFromUrl();
  }, []);

  const settings = config?.settings;

  const companyName =
    settings?.companyName?.trim() || config?.company?.name || "EvFeedback";

  const logoUrl = settings?.logoUrl?.trim() || "";

  const thankYouMessage =
    settings?.thankYouMessage?.trim() ||
    "Sua opinião é muito importante para nós.";

  const primaryColor = settings?.primaryColor?.trim() || "#0ea5e9";

  const heroTitle =
    settings?.heroTitle?.trim() || "Como foi sua experiência hoje?";

  const heroSubtitle =
    settings?.heroSubtitle?.trim() ||
    "Toque em uma opção para avaliar rapidamente.";

  const backgroundColor = settings?.backgroundColor?.trim() || "#020617";

  const backgroundImageUrl = settings?.backgroundImageUrl?.trim() || "";

  const cardBackgroundColor =
    settings?.cardBackgroundColor?.trim() || "rgba(15,23,42,0.72)";

  const textColor = settings?.textColor?.trim() || "#ffffff";

  const buttonTextColor = settings?.buttonTextColor?.trim() || "#0f172a";

  const resetDelayMs =
    ((settings?.kioskResetSeconds ?? 5) * 1000) || DEFAULT_RESET_DELAY_MS;

  const isNegativeRating = rating === 1 || rating === 2;
  const environmentLabel = getEnvironmentLabel(config?.kiosk?.environmentType);

  function clearInactivityTimer() {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }

  function resetFlow() {
    clearInactivityTimer();

    if (!kioskToken) {
      setStep("error");
      setKioskErrorType("missing_token");
      setRating(null);
      setTagIds([]);
      setComment("");
      setContactName("");
      setContactPhone("");
      setContactMessage("");
      setContactConsent(false);
      setIsSubmitting(false);
      return;
    }

    setStep("rating");
    setKioskErrorType(null);
    setRating(null);
    setTagIds([]);
    setComment("");
    setContactName("");
    setContactPhone("");
    setContactMessage("");
    setContactConsent(false);
    setIsSubmitting(false);
  }

  function restartInactivityTimer() {
    if (!rating || step === "rating" || step === "done" || step === "error") {
      clearInactivityTimer();
      return;
    }

    clearInactivityTimer();

    inactivityTimerRef.current = window.setTimeout(() => {
      resetFlow();
    }, INACTIVITY_TIMEOUT_MS);
  }

  function handleSelectRating(value: number) {
    setRating(value);
    setTagIds([]);
    setComment("");
    setContactName("");
    setContactPhone("");
    setContactMessage("");
    setContactConsent(false);
    setStep("tags");
  }

  function handleToggleTag(id: string) {
    setTagIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function handleAdvanceFromComment() {
    if (isNegativeRating) {
      setStep("contact");
      return;
    }

    void handleSubmit(false);
  }

  async function handleSubmit(skipComment = false) {
    if (!rating || !kioskToken || isSubmitting) return;

    try {
      setIsSubmitting(true);
      clearInactivityTimer();

      await api.post("/kiosk/feedback", {
        token: kioskToken,
        rating,
        comment: skipComment ? "" : comment.trim(),
        tagIds,
        contactName: isNegativeRating ? contactName.trim() : "",
        contactPhone: isNegativeRating ? contactPhone.trim() : "",
        contactMessage: isNegativeRating ? contactMessage.trim() : "",
        contactConsent: isNegativeRating ? contactConsent : false,
      });

      setStep("done");
    } catch (error) {
      console.error("Erro ao enviar feedback:", error);
      setKioskErrorType("request_error");
      setStep("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    restartInactivityTimer();

    return () => {
      clearInactivityTimer();
    };
  }, [step, rating]);

  useEffect(() => {
    if (step !== "done") return;

    const timer = window.setTimeout(() => {
      resetFlow();
    }, resetDelayMs);

    return () => window.clearTimeout(timer);
  }, [step, resetDelayMs]);

  useEffect(() => {
    if (step !== "error") return;
    if (kioskErrorType === "missing_token" || kioskErrorType === "invalid_token") {
      return;
    }

    const timer = window.setTimeout(() => {
      resetFlow();
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [step, kioskErrorType]);

  useEffect(() => {
    if (kioskToken) return;
    setKioskErrorType("missing_token");
    setStep("error");
  }, [kioskToken]);

  useEffect(() => {
    async function loadConfig() {
      if (!kioskToken) return;

      try {
        const data = await getPublicKioskConfig(kioskToken);
        setConfig(data);
        setKioskErrorType(null);
        setStep("rating");
      } catch (error) {
        console.error("Erro ao carregar config do kiosk:", error);

        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 404 || error.response?.status === 400)
        ) {
          setKioskErrorType("invalid_token");
        } else {
          setKioskErrorType("request_error");
        }

        setStep("error");
      }
    }

    loadConfig();
  }, [kioskToken]);

  useEffect(() => {
    async function loadTags() {
      if (!kioskToken) return;
      if (!config) return;

      try {
        const data = await getPublicKioskTags(kioskToken);
        setTagOptions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao carregar tags:", error);
        setTagOptions([]);
      }
    }

    loadTags();
  }, [kioskToken, config]);

  useEffect(() => {
    return () => {
      clearInactivityTimer();
    };
  }, []);

  useEffect(() => {
    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    const preventMultiTouchZoom = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    const preventDoubleTapZoom = (() => {
      let lastTouchEnd = 0;

      return (event: TouchEvent) => {
        const now = Date.now();

        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }

        lastTouchEnd = now;
      };
    })();

    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });
    document.addEventListener("gestureend", preventGesture, { passive: false });
    document.addEventListener("touchstart", preventMultiTouchZoom, {
      passive: false,
    });
    document.addEventListener("touchend", preventDoubleTapZoom, {
      passive: false,
    });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchstart", preventMultiTouchZoom);
      document.removeEventListener("touchend", preventDoubleTapZoom);
    };
  }, []);

  const selectedRating = RATING_OPTIONS.find((item) => item.value === rating);

  function getErrorTitle() {
    switch (kioskErrorType) {
      case "missing_token":
        return "Kiosk não identificado";
      case "invalid_token":
        return "Kiosk inválido ou inativo";
      default:
        return "Não foi possível continuar";
    }
  }

  function getErrorDescription() {
    switch (kioskErrorType) {
      case "missing_token":
        return "Este acesso é exclusivo para links válidos de atendimento. Verifique o link ou solicite um novo acesso.";
      case "invalid_token":
        return "Não foi possível localizar um kiosk válido para este link. Verifique o token informado ou contate o responsável.";
      default:
        return "Verifique a configuração do kiosk ou a conexão com a API.";
    }
  }

  function getErrorEmoji() {
    switch (kioskErrorType) {
      case "missing_token":
      case "invalid_token":
        return "🔒";
      default:
        return "⚠️";
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        backgroundColor,
        color: textColor,
        backgroundImage: backgroundImageUrl
          ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${backgroundImageUrl})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        touchAction: "manipulation",
      }}
    >
      <div className="w-full max-w-5xl">
        <div
          className="mx-auto max-w-4xl rounded-3xl border border-white/10 backdrop-blur p-6 md:p-10 shadow-2xl"
          style={{ backgroundColor: cardBackgroundColor }}
        >
          {step === "rating" && (
            <section className="text-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={companyName}
                  className="h-16 md:h-20 object-contain mx-auto mb-4"
                />
              ) : null}

              <p
                className="text-sm md:text-base font-semibold tracking-[0.25em] uppercase"
                style={{ color: primaryColor }}
              >
                {companyName}
              </p>

              <div className="mt-4 inline-flex items-center rounded-full border border-white/10 bg-black/15 px-4 py-2 text-sm md:text-base font-medium">
                Ambiente: {environmentLabel}
              </div>

              <h1 className="mt-4 text-4xl md:text-6xl font-bold leading-tight">
                {heroTitle}
              </h1>

              <p className="mt-4 text-lg md:text-xl opacity-90">
                {heroSubtitle}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-10">
                {RATING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelectRating(option.value)}
                    className="rounded-3xl border border-white/10 bg-black/10 hover:bg-black/20 active:scale-95 transition p-6 md:p-8 flex flex-col items-center justify-center min-h-[140px] md:min-h-[180px]"
                  >
                    <span className="text-5xl md:text-6xl">{option.emoji}</span>
                    <span className="mt-3 text-sm md:text-base font-medium">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === "tags" && (
            <section className="text-center">
              <p className="text-sm md:text-base opacity-80">
                Avaliação selecionada:
                <span className="ml-2 font-semibold">
                  {selectedRating?.emoji} {selectedRating?.label}
                </span>
              </p>

              <p className="mt-3 text-sm md:text-base opacity-80">
                Ambiente: <span className="font-semibold">{environmentLabel}</span>
              </p>

              <h2 className="mt-4 text-3xl md:text-5xl font-bold">
                O que mais influenciou sua experiência?
              </h2>

              <p className="mt-4 text-lg opacity-90">
                Você pode marcar uma ou mais opções.
              </p>

              {tagOptions.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-10">
                  {tagOptions.map((tag) => {
                    const active = tagIds.includes(tag.id);

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleToggleTag(tag.id)}
                        className={`rounded-2xl border px-4 py-5 md:px-6 md:py-6 text-base md:text-lg font-medium transition active:scale-95 ${active
                            ? ""
                            : "border-white/10 bg-black/10 hover:bg-black/20"
                          }`}
                        style={
                          active
                            ? {
                              borderColor: primaryColor,
                              backgroundColor: primaryColor,
                              color: buttonTextColor,
                            }
                            : {
                              color: textColor,
                            }
                        }
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-10 opacity-80">
                  Nenhuma opção cadastrada no momento.
                </p>
              )}

              <div className="mt-10 flex flex-col md:flex-row gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep("rating");
                    clearInactivityTimer();
                  }}
                  className="rounded-2xl bg-black/15 hover:bg-black/25 px-8 py-4 text-lg font-semibold transition"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={() => setStep("comment")}
                  className="rounded-2xl px-8 py-4 text-lg font-semibold transition"
                  style={{
                    backgroundColor: primaryColor,
                    color: buttonTextColor,
                  }}
                >
                  Continuar
                </button>
              </div>
            </section>
          )}

          {step === "comment" && (
            <section className="text-center">
              <p className="text-sm md:text-base opacity-80">
                Avaliação:
                <span className="ml-2 font-semibold">
                  {selectedRating?.emoji} {selectedRating?.label}
                </span>
              </p>

              <p className="mt-3 text-sm md:text-base opacity-80">
                Ambiente: <span className="font-semibold">{environmentLabel}</span>
              </p>

              <h2 className="mt-4 text-3xl md:text-5xl font-bold">
                Deseja deixar um comentário?
              </h2>

              <p className="mt-4 text-lg opacity-90">
                Essa etapa é opcional.
              </p>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escreva aqui sua opinião..."
                className="mt-8 w-full rounded-2xl border border-white/10 bg-black/10 px-5 py-4 text-lg outline-none min-h-[140px] resize-none"
                style={{ color: textColor }}
                maxLength={500}
              />

              <div className="mt-3 text-right text-sm opacity-70">
                {comment.length}/500
              </div>

              <div className="mt-8 flex flex-col md:flex-row gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => setStep("tags")}
                  disabled={isSubmitting}
                  className="rounded-2xl bg-black/15 hover:bg-black/25 disabled:opacity-60 px-8 py-4 text-lg font-semibold transition"
                >
                  Voltar
                </button>

                {isNegativeRating ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSubmit(false)}
                      disabled={isSubmitting}
                      className="rounded-2xl bg-black/25 hover:bg-black/35 disabled:opacity-60 px-8 py-4 text-lg font-semibold transition"
                    >
                      {isSubmitting ? "Enviando..." : "Enviar agora"}
                    </button>

                    <button
                      type="button"
                      onClick={handleAdvanceFromComment}
                      disabled={isSubmitting}
                      className="rounded-2xl disabled:opacity-60 px-8 py-4 text-lg font-semibold transition"
                      style={{
                        backgroundColor: primaryColor,
                        color: buttonTextColor,
                      }}
                    >
                      Próximo
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSubmit(true)}
                      disabled={isSubmitting}
                      className="rounded-2xl bg-black/25 hover:bg-black/35 disabled:opacity-60 px-8 py-4 text-lg font-semibold transition"
                    >
                      Pular
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSubmit(false)}
                      disabled={isSubmitting}
                      className="rounded-2xl disabled:opacity-60 px-8 py-4 text-lg font-semibold transition"
                      style={{
                        backgroundColor: primaryColor,
                        color: buttonTextColor,
                      }}
                    >
                      {isSubmitting ? "Enviando..." : "Enviar"}
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          {step === "contact" && (
            <section className="text-center">
              <p className="text-sm md:text-base opacity-80">
                Avaliação:
                <span className="ml-2 font-semibold">
                  {selectedRating?.emoji} {selectedRating?.label}
                </span>
              </p>

              <p className="mt-3 text-sm md:text-base opacity-80">
                Ambiente: <span className="font-semibold">{environmentLabel}</span>
              </p>

              <h2 className="mt-4 text-3xl md:text-5xl font-bold">
                Deseja se identificar?
              </h2>

              <p className="mt-4 text-lg opacity-90">
                Se quiser, deixe seus dados para que a equipe possa entrar em contato sobre sua experiência.
              </p>

              <div className="mt-10 rounded-3xl border border-white/10 bg-black/10 p-5 md:p-6 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 outline-none"
                      style={{ color: textColor }}
                      maxLength={120}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 outline-none"
                      style={{ color: textColor }}
                      maxLength={30}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Mensagem para contato
                  </label>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Se quiser, informe mais detalhes para contato."
                    className="w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 outline-none min-h-[120px] resize-none"
                    style={{ color: textColor }}
                    maxLength={500}
                  />
                  <div className="mt-2 text-right text-sm opacity-70">
                    {contactMessage.length}/500
                  </div>
                </div>

                <label className="mt-5 flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactConsent}
                    onChange={(e) => setContactConsent(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-white/20 bg-black/10"
                  />
                  <span className="text-sm md:text-base leading-relaxed opacity-90">
                    Autorizo que a empresa entre em contato comigo sobre este atendimento.
                  </span>
                </label>
              </div>

              <div className="mt-8 flex flex-col md:flex-row gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => setStep("comment")}
                  disabled={isSubmitting}
                  className="rounded-2xl bg-black/15 hover:bg-black/25 disabled:opacity-60 px-8 py-4 text-lg font-semibold transition"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className="rounded-2xl bg-black/25 hover:bg-black/35 disabled:opacity-60 px-8 py-4 text-lg font-semibold transition"
                >
                  {isSubmitting ? "Enviando..." : "Pular e enviar"}
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className="rounded-2xl disabled:opacity-60 px-8 py-4 text-lg font-semibold transition"
                  style={{
                    backgroundColor: primaryColor,
                    color: buttonTextColor,
                  }}
                >
                  {isSubmitting ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </section>
          )}

          {step === "done" && (
            <section className="text-center py-10">
              <div className="text-7xl md:text-8xl">🙏</div>

              <h2 className="mt-6 text-4xl md:text-6xl font-bold">
                Obrigado!
              </h2>

              <p className="mt-3 text-sm md:text-base opacity-80">
                Ambiente: <span className="font-semibold">{environmentLabel}</span>
              </p>

              <p className="mt-4 text-lg md:text-2xl opacity-90">
                {thankYouMessage}
              </p>

              <p className="mt-6 text-sm md:text-base opacity-70">
                A tela será reiniciada automaticamente.
              </p>
            </section>
          )}

          {step === "error" && (
            <section className="text-center py-10">
              <div className="text-7xl md:text-8xl">{getErrorEmoji()}</div>

              <h2 className="mt-6 text-3xl md:text-5xl font-bold">
                {getErrorTitle()}
              </h2>

              <p className="mt-4 text-lg opacity-90">
                {getErrorDescription()}
              </p>

              {kioskErrorType === "request_error" && (
                <button
                  type="button"
                  onClick={resetFlow}
                  className="mt-8 rounded-2xl px-8 py-4 text-lg font-semibold transition"
                  style={{
                    backgroundColor: primaryColor,
                    color: buttonTextColor,
                  }}
                >
                  Tentar novamente
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}