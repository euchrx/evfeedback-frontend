import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { api } from "../../services/api";
import {
  getPublicKioskConfig,
  getPublicKioskTags,
  type PublicKioskConfig,
} from "../../services/publicKiosk";

type Step = "rating" | "tags" | "comment" | "contact" | "done" | "error";
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
  { value: 1, emoji: "😠", label: "Péssimo" },
  { value: 2, emoji: "🙁", label: "Ruim" },
  { value: 3, emoji: "😐", label: "Ok" },
  { value: 4, emoji: "🙂", label: "Bom" },
  { value: 5, emoji: "🤩", label: "Excelente" },
];

const RESET_DELAY_MS = 5000;
const INACTIVITY_TIMEOUT_MS = 30000;
const CONFIG_REFRESH_MS = 90000;

function getConfigSnapshot(data: PublicKioskConfig) {
  return JSON.stringify({
    kiosk: data.kiosk,
    company: data.company,
    branch: data.branch,
    settings: data.settings,
  });
}

function getTagsSnapshot(tags: TagOption[]) {
  return JSON.stringify(
    [...tags].sort((a, b) => a.id.localeCompare(b.id)).map((tag) => ({
      id: tag.id,
      name: tag.name,
    })),
  );
}

function getKioskTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token")?.trim() || "";
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

  const [submittingAction, setSubmittingAction] = useState<
    "skip" | "send" | null
  >(null);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [config, setConfig] = useState<PublicKioskConfig | null>(null);
  const [apiWarning, setApiWarning] = useState("");

  const [contactNameError, setContactNameError] = useState("");
  const [contactPhoneError, setContactPhoneError] = useState("");
  const [commentError, setCommentError] = useState("");

  const inactivityTimerRef = useRef<number | null>(null);
  const configSnapshotRef = useRef("");
  const tagsSnapshotRef = useRef("");
  const pendingConfigRef = useRef<PublicKioskConfig | null>(null);
  const pendingTagsRef = useRef<TagOption[] | null>(null);

  const kioskToken = useMemo(() => getKioskTokenFromUrl(), []);

  const settings = config?.settings;
  const companyName =
    settings?.companyName?.trim() || config?.company?.name || "EvFeedback";
  const logoUrl = settings?.logoUrl?.trim() || "";
  const thankYouMessage =
    settings?.thankYouMessage?.trim() || "Sua opinião é muito importante para nós.";
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

  const resolvedPrimaryColor = primaryColor || "#0ea5e9";
  const resolvedTextColor = textColor || "#ffffff";
  const resolvedButtonTextColor = buttonTextColor || "#0f172a";

  const isNegativeRating = rating === 1 || rating === 2;
  const selectedRating = RATING_OPTIONS.find((item) => item.value === rating);
  const canApplyLiveRefresh = step === "rating" || step === "done";

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
      setCommentError("");
      setContactName("");
      setContactPhone("");
      setContactNameError("");
      setContactPhoneError("");
      setContactMessage("");
      setContactConsent(false);
      setSubmittingAction(null);
      return;
    }

    setStep("rating");
    setKioskErrorType(null);
    setRating(null);
    setTagIds([]);
    setComment("");
    setCommentError("");
    setContactName("");
    setContactPhone("");
    setContactNameError("");
    setContactPhoneError("");
    setContactMessage("");
    setContactConsent(false);
    setSubmittingAction(null);
  }

  function handleTextareaEnterBlur(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
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
    setCommentError("");
    setContactName("");
    setContactPhone("");
    setContactNameError("");
    setContactPhoneError("");
    setContactMessage("");
    setContactConsent(false);
    setStep("tags");
  }

  function handleToggleTag(id: string) {
    setTagIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function handleSubmitCommentStep() {
    const trimmedComment = comment.trim();

    if (!trimmedComment) {
      setCommentError("Informe seu comentário para continuar.");
      return;
    }

    setCommentError("");

    if (isNegativeRating) {
      setStep("contact");
      return;
    }

    void handleSubmit(false, "send");
  }

  function handleSubmitWithContact() {
    if (!isNegativeRating) {
      void handleSubmit(false, "send");
      return;
    }

    const trimmedName = contactName.trim();
    const trimmedPhone = contactPhone.trim();

    let hasError = false;

    if (!trimmedName) {
      setContactNameError("Informe seu nome.");
      hasError = true;
    } else {
      setContactNameError("");
    }

    if (!trimmedPhone) {
      setContactPhoneError("Informe seu telefone ou WhatsApp.");
      hasError = true;
    } else {
      setContactPhoneError("");
    }

    if (hasError) {
      return;
    }

    void handleSubmit(false);
  }

  async function syncKioskData(options?: { initial?: boolean }) {
    if (!kioskToken) return;

    try {
      const [configData, tagsData] = await Promise.all([
        getPublicKioskConfig(kioskToken),
        getPublicKioskTags(kioskToken),
      ]);

      const normalizedTags = Array.isArray(tagsData) ? tagsData : [];
      const nextConfigSnapshot = getConfigSnapshot(configData);
      const nextTagsSnapshot = getTagsSnapshot(normalizedTags);

      const configChanged = configSnapshotRef.current !== nextConfigSnapshot;
      const tagsChanged = tagsSnapshotRef.current !== nextTagsSnapshot;

      if (options?.initial || canApplyLiveRefresh) {
        if (options?.initial || configChanged) {
          configSnapshotRef.current = nextConfigSnapshot;
          setConfig(configData);
        }

        if (options?.initial || tagsChanged) {
          tagsSnapshotRef.current = nextTagsSnapshot;
          setTagOptions(normalizedTags);
        }

        pendingConfigRef.current = null;
        pendingTagsRef.current = null;
      } else if (configChanged || tagsChanged) {
        pendingConfigRef.current = configData;
        pendingTagsRef.current = normalizedTags;
      }

      setApiWarning("");

      if (options?.initial) {
        setKioskErrorType(null);
        setStep("rating");
      }
    } catch (error) {
      console.error("Erro ao sincronizar kiosk:", error);

      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 404 || error.response?.status === 400)
      ) {
        setKioskErrorType("invalid_token");
        setStep("error");
        return;
      }

      if (options?.initial || !configSnapshotRef.current) {
        setKioskErrorType("request_error");
        setStep("error");
        return;
      }

      setApiWarning(
        "API instável no momento. Mantendo a última configuração carregada.",
      );
    }
  }

  async function handleSubmit(
    skipComment = false,
    action: "skip" | "send" = "send",
  ) {
    if (!rating || !kioskToken || submittingAction) return;

    try {
      setSubmittingAction(null);
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
      setSubmittingAction(null);
    }
  }

  useEffect(() => {
    restartInactivityTimer();

    return () => {
      clearInactivityTimer();
    };
  }, [
    step,
    rating,
    tagIds,
    comment,
    contactName,
    contactPhone,
    contactMessage,
    contactConsent,
  ]);

  useEffect(() => {
    if (step !== "done") return;

    const timer = window.setTimeout(() => {
      resetFlow();
    }, RESET_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [step]);

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
    if (!canApplyLiveRefresh) return;

    const pendingConfig = pendingConfigRef.current;
    const pendingTags = pendingTagsRef.current;

    if (!pendingConfig || !pendingTags) {
      return;
    }

    configSnapshotRef.current = getConfigSnapshot(pendingConfig);
    tagsSnapshotRef.current = getTagsSnapshot(pendingTags);
    setConfig(pendingConfig);
    setTagOptions(pendingTags);
    pendingConfigRef.current = null;
    pendingTagsRef.current = null;
    setApiWarning("");
  }, [canApplyLiveRefresh]);

  useEffect(() => {
    void syncKioskData({ initial: true });
  }, [kioskToken]);

  useEffect(() => {
    if (!kioskToken) return;

    const timer = window.setInterval(() => {
      void syncKioskData();
    }, CONFIG_REFRESH_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [kioskToken]);

  useEffect(() => {
    if (tagOptions.length === 0) {
      setTagIds([]);
      return;
    }

    const availableIds = new Set(tagOptions.map((tag) => tag.id));
    setTagIds((current) => current.filter((id) => availableIds.has(id)));
  }, [tagOptions]);

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
      className="relative min-h-screen select-none overflow-hidden px-4 py-6 md:px-8 md:py-10"
      style={{
        backgroundColor,
        color: textColor,
        backgroundImage: backgroundImageUrl
          ? `linear-gradient(rgba(2,6,23,0.55), rgba(2,6,23,0.75)), url(${backgroundImageUrl})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
    >
      {apiWarning ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 w-[min(92vw,680px)] -translate-x-1/2">
          <div className="rounded-2xl border border-amber-300/30 bg-amber-500/15 px-4 py-3 text-center text-sm font-medium text-amber-100 backdrop-blur">
            {apiWarning}
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center justify-center">
        <div
          className="w-full rounded-[32px] border border-white/10 p-6 shadow-2xl backdrop-blur md:p-10"
          style={{ backgroundColor: cardBackgroundColor }}
        >
          {step !== "error" && step !== "done" ? (
            <header className="mb-8 text-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={companyName}
                  className="mx-auto mb-5 h-16 w-auto object-contain md:h-20"
                />
              ) : null}

              <p
                className="text-sm uppercase tracking-[0.28em] opacity-90"
                style={{ color: resolvedPrimaryColor }}
              >
                {companyName}
              </p>
            </header>
          ) : null}

          {step === "rating" && (
            <section className="text-center">
              <h1 className="text-3xl font-bold md:text-5xl">{heroTitle}</h1>

              <p className="mx-auto mt-4 max-w-2xl text-base opacity-90 md:text-xl">
                {heroSubtitle}
              </p>

              <div
                className="mx-auto mt-6 h-1.5 w-28 rounded-full"
                style={{ backgroundColor: resolvedPrimaryColor }}
              />

              <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-5">
                {RATING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelectRating(option.value)}
                    className="flex min-h-[150px] flex-col items-center justify-center rounded-3xl p-6 transition active:scale-95 md:min-h-[190px] md:p-8"
                    style={{
                      border: `1px solid ${resolvedPrimaryColor}55`,
                      backgroundColor: `${resolvedPrimaryColor}14`,
                      boxShadow: `inset 0 0 0 1px ${resolvedPrimaryColor}10`,
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
          )}

          {step === "tags" && (
            <section className="text-center">
              <p className="text-sm md:text-base opacity-80">
                Avaliação selecionada:
                <span className="ml-2 font-semibold">
                  {selectedRating?.emoji} {selectedRating?.label}
                </span>
              </p>

              <h2 className="mt-4 text-3xl font-bold md:text-5xl">
                O que mais influenciou sua experiência?
              </h2>

              <p className="mt-4 text-lg opacity-90">
                Você pode marcar uma ou mais opções.
              </p>

              {tagOptions.length > 0 ? (
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {tagOptions.map((tag) => {
                    const active = tagIds.includes(tag.id);

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleToggleTag(tag.id)}
                        className={`rounded-2xl border px-4 py-5 text-base font-medium transition active:scale-95 md:px-6 md:py-6 md:text-lg ${active
                          ? ""
                          : "border-white/10 bg-black/10 hover:bg-black/20"
                          }`}
                        style={
                          active
                            ? {
                              borderColor: resolvedPrimaryColor,
                              backgroundColor: resolvedPrimaryColor,
                              color: resolvedButtonTextColor,
                            }
                            : { color: resolvedTextColor }
                        }
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-8 text-base opacity-75">
                  Nenhuma opção cadastrada no momento.
                </p>
              )}

              <div className="mt-10 flex flex-col gap-3 md:flex-row md:justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep("rating");
                    clearInactivityTimer();
                  }}
                  className="rounded-2xl bg-black/15 px-8 py-4 text-lg font-semibold transition hover:bg-black/25"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={() => setStep("comment")}
                  className="rounded-2xl px-8 py-4 text-lg font-semibold transition"
                  style={{
                    backgroundColor: resolvedPrimaryColor,
                    color: resolvedButtonTextColor,
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

              <h2 className="mt-4 text-3xl font-bold md:text-5xl">
                Deseja deixar um comentário?
              </h2>

              <p className="mt-4 text-lg opacity-90">Essa etapa é obrigatória.</p>

              <div className="mx-auto mt-8 max-w-3xl">
                <textarea
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                    if (commentError) setCommentError("");
                  }}
                  onKeyDown={handleTextareaEnterBlur}
                  placeholder="Escreva aqui sua experiência..."
                  className="min-h-[180px] w-full resize-none rounded-3xl border border-white/10 bg-black/10 px-5 py-4 text-base outline-none placeholder:text-white/45 focus:border-white/30 md:text-lg"
                  style={{
                    color: resolvedTextColor,
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitTouchCallout: "none",
                  }}
                />

                {commentError ? (
                  <p className="mt-3 text-sm text-rose-300">{commentError}</p>
                ) : null}
              </div>

              <div className="mt-10 flex flex-col gap-3 md:flex-row md:justify-center">
                <button
                  type="button"
                  onClick={() => setStep("tags")}
                  className="rounded-2xl bg-black/15 px-8 py-4 text-lg font-semibold transition hover:bg-black/25"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={handleSubmitCommentStep}
                  disabled={isSubmitting}
                  className="rounded-2xl px-8 py-4 text-lg font-semibold transition disabled:opacity-60"
                  style={{
                    backgroundColor: resolvedPrimaryColor,
                    color: resolvedButtonTextColor,
                  }}
                >
                  {isNegativeRating
                    ? "Continuar"
                    : isSubmitting
                      ? "Enviando..."
                      : "Enviar"}
                </button>
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

              <h2 className="mt-4 text-3xl font-bold md:text-5xl">
                Deseja se identificar?
              </h2>

              <p className="mt-4 text-lg opacity-90">
                Se quiser, deixe seus dados para que a equipe possa entrar em
                contato sobre sua experiência.
              </p>

              <div className="mx-auto mt-8 grid max-w-3xl gap-4">
                <div>
                  <input
                    value={contactName}
                    onChange={(e) => {
                      setContactName(e.target.value);
                      if (contactNameError) setContactNameError("");
                    }}
                    placeholder="Seu nome"
                    className="w-full rounded-2xl border border-white/10 bg-black/10 px-5 py-4 text-base outline-none placeholder:text-white/45 focus:border-white/30 md:text-lg"
                    style={{ color: resolvedTextColor }}
                  />
                  {contactNameError ? (
                    <p className="mt-2 text-left text-sm text-rose-300">
                      {contactNameError}
                    </p>
                  ) : null}
                </div>

                <div>
                  <input
                    value={contactPhone}
                    onChange={(e) => {
                      setContactPhone(e.target.value);
                      if (contactPhoneError) setContactPhoneError("");
                    }}
                    placeholder="Telefone ou WhatsApp"
                    className="w-full rounded-2xl border border-white/10 bg-black/10 px-5 py-4 text-base outline-none placeholder:text-white/45 focus:border-white/30 md:text-lg"
                    style={{ color: resolvedTextColor }}
                  />
                  {contactPhoneError ? (
                    <p className="mt-2 text-left text-sm text-rose-300">
                      {contactPhoneError}
                    </p>
                  ) : null}
                </div>

                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Mensagem adicional (opcional)"
                  className="min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-black/10 px-5 py-4 text-base outline-none placeholder:text-white/45 focus:border-white/30 md:text-lg"
                  style={{
                    color: resolvedTextColor,
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitTouchCallout: "none",
                  }}
                />

                <label className="mt-1 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={contactConsent}
                    onChange={(e) => setContactConsent(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-white/20"
                  />
                  <span className="text-sm opacity-90 md:text-base">
                    Autorizo o contato da equipe sobre este atendimento.
                  </span>
                </label>
              </div>

              <div className="mt-10 flex flex-col gap-3 md:flex-row md:justify-center">
                <button
                  type="button"
                  onClick={() => setStep("comment")}
                  className="rounded-2xl bg-black/15 px-8 py-4 text-lg font-semibold transition hover:bg-black/25"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={() => void handleSubmit(false, "skip")}
                  disabled={submittingAction !== null}
                  className="rounded-2xl bg-black/15 px-8 py-4 text-lg font-semibold transition hover:bg-black/25 disabled:opacity-60"
                >
                  {submittingAction === "skip" ? "Enviando..." : "Pular e enviar"}
                </button>

                <button
                  type="button"
                  onClick={handleSubmitWithContact}
                  disabled={submittingAction !== null}
                  className="rounded-2xl px-8 py-4 text-lg font-semibold transition disabled:opacity-60"
                  style={{
                    backgroundColor: primaryColor,
                    color: buttonTextColor,
                  }}
                >
                  {submittingAction === "send" ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </section>
          )}

          {step === "done" && (
            <section className="text-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={companyName}
                  className="mx-auto mb-5 h-16 w-auto object-contain md:h-20"
                />
              ) : null}

              <p
                className="text-sm uppercase tracking-[0.28em] opacity-90"
                style={{ color: resolvedPrimaryColor }}
              >
                {companyName}
              </p>

              <h2 className="mt-6 text-3xl font-bold md:text-5xl">
                Obrigado pela sua avaliação
              </h2>

              <div
                className="mx-auto mt-6 h-1.5 w-28 rounded-full"
                style={{ backgroundColor: resolvedPrimaryColor }}
              />

              <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">
                {thankYouMessage}
              </p>

              <p className="mt-6 text-sm opacity-70 md:text-base">
                Esta tela será reiniciada automaticamente.
              </p>
            </section>
          )}

          {step === "error" && (
            <section className="text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-rose-500/15 text-5xl">
                {getErrorEmoji()}
              </div>

              <h2 className="mt-6 text-3xl font-bold md:text-5xl">
                {getErrorTitle()}
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">
                {getErrorDescription()}
              </p>

              {kioskErrorType === "request_error" ? (
                <button
                  type="button"
                  onClick={() => resetFlow()}
                  className="mt-8 rounded-2xl px-8 py-4 text-lg font-semibold transition"
                  style={{
                    backgroundColor: resolvedPrimaryColor,
                    color: resolvedButtonTextColor,
                  }}
                >
                  Tentar novamente
                </button>
              ) : null}
            </section>
          )}
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-3 left-1/2 z-10 -translate-x-1/2">
        <span
          className="text-[10px] font-medium uppercase tracking-[0.22em] opacity-40 md:text-xs"
          style={{ color: resolvedTextColor }}
        >
          www.evsystem.com.br
        </span>
      </div>
    </main>
  );
}