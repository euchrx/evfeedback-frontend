import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Delete, CornerDownLeft, ChevronUp } from "lucide-react";
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

type ActiveField =
  | "comment"
  | "contactName"
  | "contactPhone"
  | "contactMessage"
  | null;

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
const KEYBOARD_CLOSE_ANIMATION_MS = 260;

const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  [".", ",", "z", "x", "c", "v", "b", "n", "m"],
];

const EXTRA_PUNCTUATION_KEYS = ["?", "!", ";", ":", "@"];

const PHONE_KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["+", "0", "-"],
];

const ACCENTED_VARIANTS: Record<string, string[]> = {
  a: ["á", "à", "â", "ã"],
  e: ["é", "ê"],
  i: ["í"],
  o: ["ó", "ô", "õ"],
  u: ["ú"],
};

const LONG_PRESS_MS = 350;

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

function sanitizePhoneValue(value: string) {
  return value.replace(/[^\d+\-()\s]/g, "");
}

function clampText(value: string, maxLength: number) {
  return value.slice(0, maxLength);
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

  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [keyboardUppercase, setKeyboardUppercase] = useState(false);
  const [keyboardClosing, setKeyboardClosing] = useState(false);
  const [accentMenu, setAccentMenu] = useState<{
    key: string;
    options: string[];
  } | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const inactivityTimerRef = useRef<number | null>(null);
  const delayedResetTimerRef = useRef<number | null>(null);
  const keyboardCloseTimerRef = useRef<number | null>(null);
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
  const keyboardOpen = activeField !== null;


  function clearInactivityTimer() {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }

  function clearDelayedResetTimer() {
    if (delayedResetTimerRef.current) {
      window.clearTimeout(delayedResetTimerRef.current);
      delayedResetTimerRef.current = null;
    }
  }

  function clearKeyboardCloseTimer() {
    if (keyboardCloseTimerRef.current) {
      window.clearTimeout(keyboardCloseTimerRef.current);
      keyboardCloseTimerRef.current = null;
    }
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function blurNativeActiveElement() {
    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLElement) {
      activeEl.blur();
    }
  }

  function hardResetFlow() {
    clearInactivityTimer();
    clearDelayedResetTimer();
    clearKeyboardCloseTimer();
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    setAccentMenu(null);
    setActiveField(null);
    setKeyboardUppercase(false);
    setKeyboardClosing(false);

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

  function closeKeyboard(animated = true) {
    clearKeyboardCloseTimer();
    setAccentMenu(null);
    clearLongPressTimer();
    longPressTriggeredRef.current = false;

    if (!keyboardOpen) {
      setActiveField(null);
      setKeyboardUppercase(false);
      setKeyboardClosing(false);
      return;
    }

    if (!animated) {
      setActiveField(null);
      setKeyboardUppercase(false);
      setKeyboardClosing(false);
      blurNativeActiveElement();
      return;
    }

    setKeyboardClosing(true);
    blurNativeActiveElement();

    keyboardCloseTimerRef.current = window.setTimeout(() => {
      setActiveField(null);
      setKeyboardUppercase(false);
      setKeyboardClosing(false);
      keyboardCloseTimerRef.current = null;
    }, KEYBOARD_CLOSE_ANIMATION_MS);
  }

  function resetFlow(animatedKeyboard = false) {
    if (animatedKeyboard && keyboardOpen) {
      clearInactivityTimer();
      clearDelayedResetTimer();
      setKeyboardClosing(true);
      blurNativeActiveElement();

      delayedResetTimerRef.current = window.setTimeout(() => {
        hardResetFlow();
      }, KEYBOARD_CLOSE_ANIMATION_MS);

      return;
    }

    hardResetFlow();
  }

  function restartInactivityTimer() {
    if (!rating || step === "rating" || step === "done" || step === "error") {
      clearInactivityTimer();
      return;
    }

    clearInactivityTimer();

    inactivityTimerRef.current = window.setTimeout(() => {
      resetFlow(true);
    }, INACTIVITY_TIMEOUT_MS);
  }

  function openKeyboard(field: ActiveField) {
    setAccentMenu(null);
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    clearDelayedResetTimer();
    blurNativeActiveElement();
    setKeyboardClosing(false);
    setActiveField(field);

    if (field === "contactPhone") {
      setKeyboardUppercase(false);
      return;
    }

    const currentValue =
      field === "comment"
        ? comment
        : field === "contactName"
          ? contactName
          : field === "contactMessage"
            ? contactMessage
            : "";

    setKeyboardUppercase(currentValue.trim().length === 0);
  }

  function updateActiveFieldValue(
    updater: (current: string) => string,
    fieldOverride?: ActiveField,
  ) {
    const field = fieldOverride ?? activeField;
    if (!field) return;

    if (field === "comment") {
      setComment((current) => clampText(updater(current), 300));
      if (commentError) setCommentError("");
      return;
    }

    if (field === "contactName") {
      setContactName((current) => clampText(updater(current), 80));
      if (contactNameError) setContactNameError("");
      return;
    }

    if (field === "contactPhone") {
      setContactPhone((current) =>
        clampText(sanitizePhoneValue(updater(current)), 25),
      );
      if (contactPhoneError) setContactPhoneError("");
      return;
    }

    if (field === "contactMessage") {
      setContactMessage((current) => clampText(updater(current), 300));
    }
  }

  function handleKeyboardKey(key: string) {
    setAccentMenu(null);
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    if (!activeField || keyboardClosing) return;

    switch (key) {
      case "BACKSPACE":
        updateActiveFieldValue((current) => {
          const next = current.slice(0, -1);

          if (activeField !== "contactPhone") {
            setKeyboardUppercase(next.trim().length === 0);
          }

          return next;
        });
        return;
      case "CLEAR":
        updateActiveFieldValue(() => "");
        return;
      case "SPACE":
        if (activeField !== "contactPhone") {
          updateActiveFieldValue((current) => `${current} `);
        }
        return;
      case "DONE":
        closeKeyboard(true);
        return;
      case "SHIFT":
        if (activeField !== "contactPhone") {
          setKeyboardUppercase((current) => !current);
        }
        return;
      default: {
        insertCharacter(key);
        return;
      }
    }
  }

  function handleKeyPress(key: string) {
    return (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      handleKeyboardKey(key);
    };
  }

  function insertCharacter(rawKey: string) {
    if (!activeField || keyboardClosing) return;

    const key =
      activeField === "contactPhone"
        ? rawKey
        : keyboardUppercase
          ? rawKey.toUpperCase()
          : rawKey.toLowerCase();

    updateActiveFieldValue((current) => `${current}${key}`);

    if (activeField !== "contactPhone") {
      setKeyboardUppercase(false);
    }
  }

  function getAccentOptions(key: string) {
    const lower = key.toLowerCase();
    return ACCENTED_VARIANTS[lower] ?? [];
  }

  function handleLetterPointerDown(key: string) {
    return (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();

      if (!activeField || keyboardClosing) return;

      const options = getAccentOptions(key);
      longPressTriggeredRef.current = false;

      if (options.length === 0) {
        insertCharacter(key);
        return;
      }

      clearLongPressTimer();

      longPressTimerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = true;
        setAccentMenu({
          key,
          options: keyboardUppercase
            ? options.map((item) => item.toUpperCase())
            : options,
        });
      }, LONG_PRESS_MS);
    };
  }

  function handleLetterPointerUp(key: string) {
    return (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();

      const options = getAccentOptions(key);

      if (options.length === 0) return;

      const triggered = longPressTriggeredRef.current;
      clearLongPressTimer();

      if (!triggered) {
        insertCharacter(key);
      }
    };
  }

  function handleLetterPointerLeave() {
    clearLongPressTimer();
  }

  function handleAccentSelect(accentedChar: string) {
    updateActiveFieldValue((current) => `${current}${accentedChar}`);
    setAccentMenu(null);
    clearLongPressTimer();
    longPressTriggeredRef.current = false;

    if (activeField !== "contactPhone") {
      setKeyboardUppercase(false);
    }
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
    setActiveField(null);
    setKeyboardUppercase(false);
    setKeyboardClosing(false);
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
      openKeyboard("comment");
      return;
    }

    setCommentError("");
    closeKeyboard(true);

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
      if (!trimmedName) {
        openKeyboard("contactName");
      } else if (!trimmedPhone) {
        openKeyboard("contactPhone");
      }
      return;
    }

    closeKeyboard(true);
    void handleSubmit(false, "send");
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
      setSubmittingAction(action);
      clearInactivityTimer();
      clearDelayedResetTimer();
      closeKeyboard(false);

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
    activeField,
    keyboardClosing,
  ]);

  useEffect(() => {
    if (step !== "done") return;

    const timer = window.setTimeout(() => {
      hardResetFlow();
    }, RESET_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "error") return;

    if (
      kioskErrorType === "missing_token" ||
      kioskErrorType === "invalid_token"
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      hardResetFlow();
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
      clearDelayedResetTimer();
      clearKeyboardCloseTimer();
      clearLongPressTimer();
      longPressTriggeredRef.current = false;
      setAccentMenu(null);
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.classList.add("overflow-hidden", "overscroll-none");
    body.classList.add("overflow-hidden", "overscroll-none");

    const previousHtmlStyle = {
      height: html.style.height,
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior,
    };

    const previousBodyStyle = {
      height: body.style.height,
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
      touchAction: body.style.touchAction,
    };

    html.style.height = "100%";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    body.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "manipulation";

    return () => {
      html.classList.remove("overflow-hidden", "overscroll-none");
      body.classList.remove("overflow-hidden", "overscroll-none");

      html.style.height = previousHtmlStyle.height;
      html.style.overflow = previousHtmlStyle.overflow;
      html.style.overscrollBehavior = previousHtmlStyle.overscrollBehavior;

      body.style.height = previousBodyStyle.height;
      body.style.overflow = previousBodyStyle.overflow;
      body.style.overscrollBehavior = previousBodyStyle.overscrollBehavior;
      body.style.touchAction = previousBodyStyle.touchAction;
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

    document.addEventListener("gesturestart", preventGesture, {
      passive: false,
    });
    document.addEventListener("gesturechange", preventGesture, {
      passive: false,
    });
    document.addEventListener("gestureend", preventGesture, {
      passive: false,
    });
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

  useEffect(() => {
    if (step !== "comment" && step !== "contact") {
      closeKeyboard(false);
    }
  }, [step]);

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

  function renderTextKeyboard() {
    return (
      <div className="w-full">
        <div className="space-y-2">
          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="flex justify-center gap-2"
            >
              {row.map((key) => {
                const label = keyboardUppercase ? key.toUpperCase() : key;

                return (
                  <div key={key} className="relative">
                    {accentMenu?.key === key ? (
                      <div
                        className="absolute -top-14 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-2xl border border-white/10 bg-slate-900/95 px-2 py-2 shadow-2xl"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {accentMenu.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAccentSelect(option);
                            }}
                            className="flex h-10 min-w-[2.5rem] items-center justify-center rounded-xl border border-white/8 bg-white/10 px-2 text-base font-medium transition-transform active:scale-95"
                            style={{ color: resolvedTextColor }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onPointerDown={handleLetterPointerDown(key)}
                      onPointerUp={handleLetterPointerUp(key)}
                      onPointerLeave={handleLetterPointerLeave}
                      className="flex h-12 min-w-[2.5rem] items-center justify-center rounded-2xl border border-white/8 bg-white/12 px-3 text-[17px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-transform active:scale-95 md:h-14 md:min-w-[3.2rem] md:text-[18px]"
                      style={{ color: resolvedTextColor }}
                    >
                      {label}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2">
            <button
              type="button"
              onPointerDown={handleKeyPress("SHIFT")}
              className="flex h-12 min-w-[72px] items-center justify-center rounded-2xl border px-4 transition-transform active:scale-95 md:h-14 md:min-w-[88px]"
              style={{
                borderColor: keyboardUppercase
                  ? resolvedPrimaryColor
                  : "rgba(255,255,255,0.08)",
                backgroundColor: keyboardUppercase
                  ? resolvedPrimaryColor
                  : "rgba(255,255,255,0.12)",
                color: keyboardUppercase
                  ? resolvedButtonTextColor
                  : resolvedTextColor,
              }}
            >
              <ChevronUp className="h-5 w-5" />
            </button>

            <button
              type="button"
              onPointerDown={handleKeyPress("SPACE")}
              className="flex h-12 items-center justify-center rounded-2xl border border-white/8 bg-white/12 px-5 text-sm font-medium transition-transform active:scale-95 md:h-14"
              style={{ color: resolvedTextColor }}
            >
              espaço
            </button>

            <button
              type="button"
              onPointerDown={handleKeyPress("BACKSPACE")}
              className="flex h-12 min-w-[72px] items-center justify-center rounded-2xl border border-white/8 bg-white/12 px-4 transition-transform active:scale-95 md:h-14 md:min-w-[88px]"
              style={{ color: resolvedTextColor }}
            >
              <Delete className="h-5 w-5" />
            </button>

            <button
              type="button"
              onPointerDown={handleKeyPress("DONE")}
              className="flex h-12 min-w-[72px] items-center justify-center rounded-2xl px-4 transition-transform active:scale-95 md:h-14 md:min-w-[88px]"
              style={{
                backgroundColor: resolvedPrimaryColor,
                color: resolvedButtonTextColor,
              }}
            >
              <CornerDownLeft className="h-5 w-5" />
            </button>
          </div>

          <div className="flex justify-center gap-2">
            {EXTRA_PUNCTUATION_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onPointerDown={handleKeyPress(key)}
                className="flex h-10 min-w-[58px] items-center justify-center rounded-2xl border border-white/8 bg-white/12 px-3 text-sm font-medium transition-transform active:scale-95 md:h-11 md:min-w-[68px]"
                style={{ color: resolvedTextColor }}
              >
                {key}
              </button>
            ))}

            <button
              type="button"
              onPointerDown={handleKeyPress("CLEAR")}
              className="flex h-10 min-w-[92px] items-center justify-center rounded-2xl border border-white/8 bg-white/12 px-4 text-sm font-medium transition-transform active:scale-95 md:h-11 md:min-w-[108px]"
              style={{ color: resolvedTextColor }}
            >
              Limpar
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderPhoneKeyboard() {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="space-y-3">
          {PHONE_KEYS.map((row, rowIndex) => (
            <div
              key={`phone-row-${rowIndex}`}
              className="grid grid-cols-3 gap-3"
            >
              {row.map((key) => (
                <button
                  key={key}
                  type="button"
                  onPointerDown={handleKeyPress(key)}
                  className="flex h-14 items-center justify-center rounded-2xl border border-white/8 bg-white/12 text-xl font-medium transition-transform active:scale-95 md:h-16"
                  style={{ color: resolvedTextColor }}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onPointerDown={handleKeyPress("CLEAR")}
              className="flex h-14 items-center justify-center rounded-2xl border border-white/8 bg-white/12 text-sm font-medium transition-transform active:scale-95 md:h-16"
              style={{ color: resolvedTextColor }}
            >
              Limpar
            </button>

            <button
              type="button"
              onPointerDown={handleKeyPress("BACKSPACE")}
              className="flex h-14 items-center justify-center rounded-2xl border border-white/8 bg-white/12 transition-transform active:scale-95 md:h-16"
              style={{ color: resolvedTextColor }}
            >
              <Delete className="h-5 w-5" />
            </button>

            <button
              type="button"
              onPointerDown={handleKeyPress("DONE")}
              className="flex h-14 items-center justify-center rounded-2xl transition-transform active:scale-95 md:h-16"
              style={{
                backgroundColor: resolvedPrimaryColor,
                color: resolvedButtonTextColor,
              }}
            >
              <CornerDownLeft className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main
      className="relative h-screen overflow-hidden select-none px-4 py-4 md:px-8 md:py-6"
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

      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center overflow-hidden">
        <div
          className={`flex w-full flex-col overflow-hidden rounded-[32px] border border-white/10 p-5 shadow-2xl backdrop-blur md:p-8 transition-[max-height] duration-300 ${keyboardOpen || keyboardClosing
            ? "max-h-[calc(100vh-20rem)] md:max-h-[calc(100vh-24rem)]"
            : "max-h-full"
            }`}
          style={{ backgroundColor: cardBackgroundColor }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            {step !== "error" && step !== "done" ? (
              <header className="mb-6 text-center">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={companyName}
                    className="mx-auto mb-4 h-14 w-auto object-contain md:h-18"
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
                    onClick={() => {
                      setStep("comment");
                      openKeyboard("comment");
                    }}
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
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openKeyboard("comment")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openKeyboard("comment");
                      }
                    }}
                    className={`min-h-[180px] w-full rounded-3xl border bg-black/10 px-5 py-4 text-left text-base outline-none md:text-lg ${activeField === "comment"
                      ? "border-white/30"
                      : "border-white/10"
                      }`}
                    style={{ color: resolvedTextColor }}
                  >
                    {comment ? (
                      <span className="whitespace-pre-wrap break-words">
                        {comment}
                      </span>
                    ) : (
                      <span className="opacity-45">
                        Escreva aqui sua experiência...
                      </span>
                    )}
                  </div>

                  {commentError ? (
                    <p className="mt-3 text-sm text-rose-300">{commentError}</p>
                  ) : null}
                </div>

                <div className="mt-8 flex flex-col gap-3 md:flex-row md:justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      closeKeyboard(false);
                      setStep("tags");
                    }}
                    className="rounded-2xl bg-black/15 px-8 py-4 text-lg font-semibold transition hover:bg-black/25"
                  >
                    Voltar
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitCommentStep}
                    disabled={submittingAction !== null}
                    className="rounded-2xl px-8 py-4 text-lg font-semibold transition disabled:opacity-60"
                    style={{
                      backgroundColor: resolvedPrimaryColor,
                      color: resolvedButtonTextColor,
                    }}
                  >
                    {isNegativeRating
                      ? "Continuar"
                      : submittingAction === "send"
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
                    <label className="mb-2 block text-left text-sm font-medium opacity-80">
                      Seu nome
                    </label>
                    <button
                      type="button"
                      onClick={() => openKeyboard("contactName")}
                      className={`w-full rounded-2xl border bg-black/10 px-5 py-4 text-left text-base md:text-lg ${activeField === "contactName"
                        ? "border-white/30"
                        : "border-white/10"
                        }`}
                      style={{ color: resolvedTextColor }}
                    >
                      {contactName || (
                        <span className="opacity-45">Toque para digitar</span>
                      )}
                    </button>
                    {contactNameError ? (
                      <p className="mt-2 text-left text-sm text-rose-300">
                        {contactNameError}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-left text-sm font-medium opacity-80">
                      Telefone ou WhatsApp
                    </label>
                    <button
                      type="button"
                      onClick={() => openKeyboard("contactPhone")}
                      className={`w-full rounded-2xl border bg-black/10 px-5 py-4 text-left text-base md:text-lg ${activeField === "contactPhone"
                        ? "border-white/30"
                        : "border-white/10"
                        }`}
                      style={{ color: resolvedTextColor }}
                    >
                      {contactPhone || (
                        <span className="opacity-45">Toque para digitar</span>
                      )}
                    </button>
                    {contactPhoneError ? (
                      <p className="mt-2 text-left text-sm text-rose-300">
                        {contactPhoneError}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-left text-sm font-medium opacity-80">
                      Mensagem adicional
                    </label>

                    <button
                      type="button"
                      onClick={() => openKeyboard("contactMessage")}
                      className={`flex min-h-[120px] w-full items-start rounded-2xl border bg-black/10 px-5 py-4 text-left text-base md:text-lg ${activeField === "contactMessage"
                        ? "border-white/30"
                        : "border-white/10"
                        }`}
                      style={{ color: resolvedTextColor }}
                    >
                      {contactMessage ? (
                        <span className="whitespace-pre-wrap break-words leading-relaxed">
                          {contactMessage}
                        </span>
                      ) : (
                        <span className="opacity-45">Toque para digitar</span>
                      )}
                    </button>
                  </div>

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

                <div className="mt-8 flex flex-col gap-3 md:flex-row md:justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      closeKeyboard(false);
                      setStep("comment");
                    }}
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
                      backgroundColor: resolvedPrimaryColor,
                      color: resolvedButtonTextColor,
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
                    onClick={() => hardResetFlow()}
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
      </div>

      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-all duration-300 ease-out ${keyboardOpen && !keyboardClosing
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-full opacity-0 pointer-events-none"
          }`}
      >
        <div className="mx-auto w-full max-w-6xl px-3 pb-3 md:px-6 md:pb-6">
          <div
            className="rounded-t-[28px] border border-white/10 border-b-0 p-4 shadow-2xl backdrop-blur-xl md:p-5"
            style={{ backgroundColor: "rgba(2, 6, 23, 0.97)" }}
          >
            <div className="mb-3 flex items-center justify-end">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  closeKeyboard(true);
                }}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium transition-transform active:scale-95"
                style={{ color: resolvedTextColor }}
              >
                Fechar
              </button>
            </div>

            {activeField === "contactPhone" ? renderPhoneKeyboard() : null}
            {activeField === "comment" ||
              activeField === "contactName" ||
              activeField === "contactMessage"
              ? renderTextKeyboard()
              : null}
          </div>
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