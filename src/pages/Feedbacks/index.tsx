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
  | "email"
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

const KEYBOARD_NUMBER_ROW = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const EXTRA_PUNCTUATION_KEYS = ["?", "!", ";", ":", "@"];

const PHONE_KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", ""],
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
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatPhoneValue(value: string) {
  const digits = sanitizePhoneValue(value);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function getPhoneDigitsBeforeCursor(maskedValue: string, cursor: number) {
  return maskedValue.slice(0, cursor).replace(/\D/g, "").length;
}

function getPhoneCursorFromDigits(digitsValue: string, digitsCursor: number) {
  const masked = formatPhoneValue(digitsValue);

  if (digitsCursor <= 0) return 0;

  let digitCount = 0;

  for (let i = 0; i < masked.length; i++) {
    if (/\d/.test(masked[i])) {
      digitCount += 1;

      if (digitCount === digitsCursor) {
        return i + 1;
      }
    }
  }

  return masked.length;
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
  const [cursorPosition, setCursorPosition] = useState(0);
  const [activeVisualKey, setActiveVisualKey] = useState<string | null>(null);
  const [capsLock, setCapsLock] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const shiftClickTimerRef = useRef<number | null>(null);
  const lastShiftPressRef = useRef(0);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const inactivityTimerRef = useRef<number | null>(null);
  const delayedResetTimerRef = useRef<number | null>(null);
  const keyboardCloseTimerRef = useRef<number | null>(null);
  const configSnapshotRef = useRef("");
  const tagsSnapshotRef = useRef("");
  const pendingConfigRef = useRef<PublicKioskConfig | null>(null);
  const pendingTagsRef = useRef<TagOption[] | null>(null);
  const keyHighlightTimerRef = useRef<number | null>(null);

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

  function clearShiftClickTimer() {
    if (shiftClickTimerRef.current) {
      window.clearTimeout(shiftClickTimerRef.current);
      shiftClickTimerRef.current = null;
    }
  }

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

  function clearKeyHighlightTimer() {
    if (keyHighlightTimerRef.current) {
      window.clearTimeout(keyHighlightTimerRef.current);
      keyHighlightTimerRef.current = null;
    }
  }

  function flashKey(key: string) {
    setActiveVisualKey(key);
    clearKeyHighlightTimer();

    keyHighlightTimerRef.current = window.setTimeout(() => {
      setActiveVisualKey(null);
      keyHighlightTimerRef.current = null;
    }, 140);
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
    clearKeyHighlightTimer();
    clearShiftClickTimer();
    longPressTriggeredRef.current = false;
    lastShiftPressRef.current = 0;
    setAccentMenu(null);
    setActiveVisualKey(null);
    setActiveField(null);
    setKeyboardUppercase(false);
    setKeyboardClosing(false);
    setCursorPosition(0);
    setCapsLock(false);

    if (!kioskToken) {
      setStep("error");
      setKioskErrorType("missing_token");
      setRating(null);
      setTagIds([]);
      setComment("");
      setCommentError("");
      setEmail("");
      setEmailError("");
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
    setEmail("");
    setEmailError("");
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
      setCapsLock(false);
      clearShiftClickTimer();
      lastShiftPressRef.current = 0;
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

    const currentValue =
      field === "email"
        ? email
        : field === "comment"
          ? comment
          : field === "contactName"
            ? contactName
            : field === "contactPhone"
              ? contactPhone
              : field === "contactMessage"
                ? contactMessage
                : "";

    setCursorPosition(currentValue.length);

    if (field === "contactPhone") {
      setKeyboardUppercase(false);
      return;
    }

    setKeyboardUppercase(currentValue.trim().length === 0);
  }

  function handleKeyboardKey(key: string) {
    setAccentMenu(null);
    clearLongPressTimer();
    longPressTriggeredRef.current = false;

    if (!activeField || keyboardClosing) return;

    flashKey(key);

    const currentValue = getActiveFieldValue();
    const safeCursor = Math.max(0, Math.min(cursorPosition, currentValue.length));

    switch (key) {
      case "BACKSPACE": {
        if (activeField === "contactPhone") {
          const currentDigits = sanitizePhoneValue(currentValue);
          const digitsCursor = getPhoneDigitsBeforeCursor(currentValue, safeCursor);

          if (digitsCursor === 0) return;

          const nextDigits =
            currentDigits.slice(0, digitsCursor - 1) +
            currentDigits.slice(digitsCursor);

          const sanitizedNextDigits = sanitizePhoneValue(nextDigits);
          setContactPhone(formatPhoneValue(sanitizedNextDigits));
          setCursorPosition(
            getPhoneCursorFromDigits(sanitizedNextDigits, digitsCursor - 1),
          );

          if (contactPhoneError) setContactPhoneError("");
          return;
        }

        if (safeCursor === 0) return;

        const next =
          currentValue.slice(0, safeCursor - 1) +
          currentValue.slice(safeCursor);

        setActiveFieldValue(next);
        setCursorPosition(safeCursor - 1);

        if (!capsLock) {
          setKeyboardUppercase(false);
        }
        return;
      }

      case "CLEAR":
        setActiveFieldValue("");
        setCursorPosition(0);
        if (activeField !== "contactPhone") {
          setKeyboardUppercase(true);
        }
        return;

      case "SPACE":
        if (activeField !== "contactPhone") {
          insertCharacter(" ");
        }
        return;

      case "DONE":
        closeKeyboard(true);
        return;

      case "SHIFT": {
        if (activeField === "contactPhone") return;

        const now = Date.now();
        const isDoublePress = now - lastShiftPressRef.current <= 300;

        if (capsLock) {
          setCapsLock(false);
          setKeyboardUppercase(false);
          clearShiftClickTimer();
          lastShiftPressRef.current = 0;
          return;
        }

        if (isDoublePress) {
          setCapsLock(true);
          setKeyboardUppercase(true);
          clearShiftClickTimer();
          lastShiftPressRef.current = 0;
          return;
        }

        lastShiftPressRef.current = now;
        setCapsLock((currentCaps) => {
          if (currentCaps) return currentCaps;
          return false;
        });
        setKeyboardUppercase((current) => !current);

        clearShiftClickTimer();
        shiftClickTimerRef.current = window.setTimeout(() => {
          lastShiftPressRef.current = 0;
          shiftClickTimerRef.current = null;
        }, 300);

        return;
      }

      case "LEFT":
        setCursorPosition((current) => Math.max(0, current - 1));
        return;

      case "RIGHT":
        setCursorPosition((current) =>
          Math.min(getActiveFieldValue().length, current + 1),
        );
        return;

      default:
        insertCharacter(key);
        return;
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

    const currentValue = getActiveFieldValue();
    const safeCursor = Math.max(0, Math.min(cursorPosition, currentValue.length));

    if (activeField === "contactPhone") {
      const currentDigits = sanitizePhoneValue(currentValue);
      const digitsCursor = getPhoneDigitsBeforeCursor(currentValue, safeCursor);
      const nextDigits =
        currentDigits.slice(0, digitsCursor) +
        rawKey.replace(/\D/g, "") +
        currentDigits.slice(digitsCursor);

      const sanitizedNextDigits = sanitizePhoneValue(nextDigits);
      setContactPhone(formatPhoneValue(sanitizedNextDigits));
      setCursorPosition(
        getPhoneCursorFromDigits(
          sanitizedNextDigits,
          Math.min(digitsCursor + rawKey.replace(/\D/g, "").length, sanitizedNextDigits.length),
        ),
      );

      if (contactPhoneError) setContactPhoneError("");
      return;
    }

    const key = keyboardUppercase ? rawKey.toUpperCase() : rawKey.toLowerCase();

    const nextValue =
      currentValue.slice(0, safeCursor) +
      key +
      currentValue.slice(safeCursor);

    setActiveFieldValue(nextValue);
    setCursorPosition(safeCursor + key.length);
    if (!capsLock) {
      setKeyboardUppercase(false);
    }
  }

  function getAccentOptions(key: string) {
    const lower = key.toLowerCase();
    return ACCENTED_VARIANTS[lower] ?? [];
  }

  function getActiveFieldValue(fieldOverride?: ActiveField) {
    const field = fieldOverride ?? activeField;

    if (!field) return "";

    if (field === "email") return email;
    if (field === "comment") return comment;
    if (field === "contactName") return contactName;
    if (field === "contactPhone") return contactPhone;
    if (field === "contactMessage") return contactMessage;

    return "";
  }

  function setActiveFieldValue(value: string, fieldOverride?: ActiveField) {
    const field = fieldOverride ?? activeField;
    if (!field) return;

    if (field === "email") {
      setEmail(clampText(value, 120));
      if (emailError) setEmailError("");
      return;
    }

    if (field === "comment") {
      setComment(clampText(value, 300));
      if (commentError) setCommentError("");
      return;
    }

    if (field === "contactName") {
      setContactName(clampText(value, 80));
      if (contactNameError) setContactNameError("");
      return;
    }

    if (field === "contactPhone") {
      setContactPhone(formatPhoneValue(value));
      if (contactPhoneError) setContactPhoneError("");
      return;
    }

    if (field === "contactMessage") {
      setContactMessage(clampText(value, 300));
    }
  }

  function handleLetterPointerDown(key: string) {
    return (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();

      if (!activeField || keyboardClosing) return;

      flashKey(key);

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

      if (!activeField || keyboardClosing) return;

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
    const currentValue = getActiveFieldValue();
    const safeCursor = Math.max(0, Math.min(cursorPosition, currentValue.length));

    const nextValue =
      currentValue.slice(0, safeCursor) +
      accentedChar +
      currentValue.slice(safeCursor);

    setActiveFieldValue(nextValue);
    setCursorPosition(safeCursor + accentedChar.length);
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
    setEmail("");
    setEmailError("");
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

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function handleSubmitCommentStep() {
    let hasError = false;

    if (!email.trim()) {
      setEmailError("Informe seu e-mail.");
      hasError = true;
    } else if (!isValidEmail(email)) {
      setEmailError("Informe um e-mail válido.");
      hasError = true;
    } else {
      setEmailError("");
    }

    if (!comment.trim()) {
      setCommentError("Esse campo é obrigatório.");
      hasError = true;
    } else {
      setCommentError("");
    }

    if (hasError) return;

    if (isNegativeRating) {
      closeKeyboard(false);
      setStep("contact");
      return;
    }

    setSubmittingAction("send");

    try {
      await handleSubmit();
    } finally {
      setSubmittingAction(null);
    }
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
        email,
        tagIds,
        contactName: isNegativeRating ? contactName.trim() : "",
        contactPhone: isNegativeRating ? sanitizePhoneValue(contactPhone) : "",
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
    email,
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
    if (!accentMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) {
        setAccentMenu(null);
        return;
      }

      if (target.closest("[data-accent-popup='true']")) {
        return;
      }

      setAccentMenu(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [accentMenu]);

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
          <div className="flex justify-center gap-2">
            {KEYBOARD_NUMBER_ROW.map((key) => {
              const isActive = activeVisualKey === key;

              return (
                <button
                  key={key}
                  type="button"
                  onPointerDown={handleKeyPress(key)}
                  className="flex h-11 min-w-[2.4rem] items-center justify-center rounded-2xl border px-3 text-[16px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all active:scale-95 md:h-12 md:min-w-[3rem] md:text-[17px]"
                  style={{
                    borderColor: isActive
                      ? resolvedPrimaryColor
                      : "rgba(255,255,255,0.08)",
                    backgroundColor: isActive
                      ? resolvedPrimaryColor
                      : "rgba(255,255,255,0.12)",
                    color: isActive ? resolvedButtonTextColor : resolvedTextColor,
                  }}
                >
                  {key}
                </button>
              );
            })}
          </div>

          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="flex justify-center gap-2"
            >
              {row.map((key) => {
                const label = keyboardUppercase ? key.toUpperCase() : key;
                const isActive = activeVisualKey === key;

                return (
                  <div
                    key={key}
                    className="relative"
                    data-accent-trigger="true"
                  >
                    {accentMenu?.key === key ? (
                      <div
                        data-accent-popup="true"
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
                      className="flex h-12 min-w-[2.5rem] items-center justify-center rounded-2xl border px-3 text-[17px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all active:scale-95 md:h-14 md:min-w-[3.2rem] md:text-[18px]"
                      style={{
                        borderColor: isActive
                          ? resolvedPrimaryColor
                          : "rgba(255,255,255,0.08)",
                        backgroundColor: isActive
                          ? resolvedPrimaryColor
                          : "rgba(255,255,255,0.12)",
                        color: isActive
                          ? resolvedButtonTextColor
                          : resolvedTextColor,
                      }}
                    >
                      {label}
                    </button>
                  </div>
                );
              })}

              {rowIndex === 2 ? (
                <>
                  {[".", ","].map((key) => {
                    const isActive = activeVisualKey === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onPointerDown={handleKeyPress(key)}
                        className="flex h-12 min-w-[2.5rem] items-center justify-center rounded-2xl border px-3 text-[17px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all active:scale-95 md:h-14 md:min-w-[3.2rem] md:text-[18px]"
                        style={{
                          borderColor: isActive
                            ? resolvedPrimaryColor
                            : "rgba(255,255,255,0.08)",
                          backgroundColor: isActive
                            ? resolvedPrimaryColor
                            : "rgba(255,255,255,0.12)",
                          color: isActive
                            ? resolvedButtonTextColor
                            : resolvedTextColor,
                        }}
                      >
                        {key}
                      </button>
                    );
                  })}

                  {(() => {
                    const isActive = activeVisualKey === "BACKSPACE";

                    return (
                      <button
                        type="button"
                        onPointerDown={handleKeyPress("BACKSPACE")}
                        className="flex h-12 min-w-[64px] items-center justify-center rounded-2xl border px-4 transition-transform active:scale-95 md:h-14 md:min-w-[80px]"
                        style={{
                          borderColor: isActive
                            ? resolvedPrimaryColor
                            : "rgba(255,255,255,0.08)",
                          backgroundColor: isActive
                            ? resolvedPrimaryColor
                            : "rgba(255,255,255,0.12)",
                          color: isActive ? resolvedButtonTextColor : resolvedTextColor,
                        }}
                      >
                        <Delete className="h-5 w-5" />
                      </button>
                    );
                  })()}
                </>
              ) : null}
            </div>
          ))}

          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2">
            <button
              type="button"
              onPointerDown={handleKeyPress("SHIFT")}
              className="flex h-12 min-w-[64px] items-center justify-center rounded-2xl border px-4 transition-transform active:scale-95 md:h-14 md:min-w-[80px]"
              style={{
                borderColor: keyboardUppercase || capsLock
                  ? resolvedPrimaryColor
                  : "rgba(255,255,255,0.08)",
                backgroundColor: keyboardUppercase || capsLock
                  ? resolvedPrimaryColor
                  : "rgba(255,255,255,0.12)",
                color: keyboardUppercase || capsLock
                  ? resolvedButtonTextColor
                  : resolvedTextColor,
              }}
            >
              <ChevronUp className="h-5 w-5" />
            </button>

            {(() => {
              const isSpaceActive = activeVisualKey === "SPACE";
              const isLeftActive = activeVisualKey === "LEFT";
              const isRightActive = activeVisualKey === "RIGHT";

              return (
                <>
                  <button
                    type="button"
                    onPointerDown={handleKeyPress("SPACE")}
                    className="flex h-12 items-center justify-center rounded-2xl border px-5 text-sm font-medium transition-transform active:scale-95 md:h-14"
                    style={{
                      borderColor: isSpaceActive
                        ? resolvedPrimaryColor
                        : "rgba(255,255,255,0.08)",
                      backgroundColor: isSpaceActive
                        ? resolvedPrimaryColor
                        : "rgba(255,255,255,0.12)",
                      color: isSpaceActive ? resolvedButtonTextColor : resolvedTextColor,
                    }}
                  >
                    espaço
                  </button>

                  <button
                    type="button"
                    onPointerDown={handleKeyPress("LEFT")}
                    className="flex h-12 min-w-[64px] items-center justify-center rounded-2xl border px-4 text-lg transition-transform active:scale-95 md:h-14 md:min-w-[80px]"
                    style={{
                      borderColor: isLeftActive
                        ? resolvedPrimaryColor
                        : "rgba(255,255,255,0.08)",
                      backgroundColor: isLeftActive
                        ? resolvedPrimaryColor
                        : "rgba(255,255,255,0.12)",
                      color: isLeftActive ? resolvedButtonTextColor : resolvedTextColor,
                    }}
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    onPointerDown={handleKeyPress("RIGHT")}
                    className="flex h-12 min-w-[64px] items-center justify-center rounded-2xl border px-4 text-lg transition-transform active:scale-95 md:h-14 md:min-w-[80px]"
                    style={{
                      borderColor: isRightActive
                        ? resolvedPrimaryColor
                        : "rgba(255,255,255,0.08)",
                      backgroundColor: isRightActive
                        ? resolvedPrimaryColor
                        : "rgba(255,255,255,0.12)",
                      color: isRightActive ? resolvedButtonTextColor : resolvedTextColor,
                    }}
                  >
                    →
                  </button>
                </>
              );
            })()}
          </div>

          <div className="flex justify-center gap-2">
            {EXTRA_PUNCTUATION_KEYS.map((key) => {
              const isActive = activeVisualKey === key;

              return (
                <button
                  key={key}
                  type="button"
                  onPointerDown={handleKeyPress(key)}
                  className="flex h-10 min-w-[58px] items-center justify-center rounded-2xl border px-3 text-sm font-medium transition-all active:scale-95 md:h-11 md:min-w-[68px]"
                  style={{
                    borderColor: isActive
                      ? resolvedPrimaryColor
                      : "rgba(255,255,255,0.08)",
                    backgroundColor: isActive
                      ? resolvedPrimaryColor
                      : "rgba(255,255,255,0.12)",
                    color: isActive ? resolvedButtonTextColor : resolvedTextColor,
                  }}
                >
                  {key}
                </button>
              );
            })}

            {(() => {
              const isActive = activeVisualKey === "CLEAR";

              return (
                <button
                  type="button"
                  onPointerDown={handleKeyPress("CLEAR")}
                  className="flex h-10 min-w-[92px] items-center justify-center rounded-2xl border px-4 text-sm font-medium transition-transform active:scale-95 md:h-11 md:min-w-[108px]"
                  style={{
                    borderColor: isActive
                      ? resolvedPrimaryColor
                      : "rgba(255,255,255,0.08)",
                    backgroundColor: isActive
                      ? resolvedPrimaryColor
                      : "rgba(255,255,255,0.12)",
                    color: isActive ? resolvedButtonTextColor : resolvedTextColor,
                  }}
                >
                  Limpar
                </button>
              );
            })()}

            <button
              type="button"
              onPointerDown={handleKeyPress("DONE")}
              className="flex h-10 min-w-[92px] items-center justify-center rounded-2xl px-4 text-sm font-medium transition-transform active:scale-95 md:h-11 md:min-w-[108px]"
              style={{
                backgroundColor: resolvedPrimaryColor,
                color: resolvedButtonTextColor,
              }}
            >
              Concluir
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
              {row.map((key, keyIndex) =>
                key ? (
                  (() => {
                    const isActive = activeVisualKey === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onPointerDown={handleKeyPress(key)}
                        className="flex h-14 items-center justify-center rounded-2xl border text-xl font-medium transition-transform active:scale-95 md:h-16"
                        style={{
                          borderColor: isActive
                            ? resolvedPrimaryColor
                            : "rgba(255,255,255,0.08)",
                          backgroundColor: isActive
                            ? resolvedPrimaryColor
                            : "rgba(255,255,255,0.12)",
                          color: isActive
                            ? resolvedButtonTextColor
                            : resolvedTextColor,
                        }}
                      >
                        {key}
                      </button>
                    );
                  })()
                ) : (
                  <div
                    key={`empty-${rowIndex}-${keyIndex}`}
                    className="h-14 md:h-16"
                  />
                ),
              )}
            </div>
          ))}

          <div className="grid grid-cols-3 gap-3">
            {(() => {
              const isClearActive = activeVisualKey === "CLEAR";
              const isBackspaceActive = activeVisualKey === "BACKSPACE";

              return (
                <>
                  <button
                    type="button"
                    onPointerDown={handleKeyPress("CLEAR")}
                    className="flex h-14 items-center justify-center rounded-2xl border text-sm font-medium transition-transform active:scale-95 md:h-16"
                    style={{
                      borderColor: isClearActive
                        ? resolvedPrimaryColor
                        : "rgba(255,255,255,0.08)",
                      backgroundColor: isClearActive
                        ? resolvedPrimaryColor
                        : "rgba(255,255,255,0.12)",
                      color: isClearActive
                        ? resolvedButtonTextColor
                        : resolvedTextColor,
                    }}
                  >
                    Limpar
                  </button>

                  <button
                    type="button"
                    onPointerDown={handleKeyPress("BACKSPACE")}
                    className="flex h-14 items-center justify-center rounded-2xl border transition-transform active:scale-95 md:h-16"
                    style={{
                      borderColor: isBackspaceActive
                        ? resolvedPrimaryColor
                        : "rgba(255,255,255,0.08)",
                      backgroundColor: isBackspaceActive
                        ? resolvedPrimaryColor
                        : "rgba(255,255,255,0.12)",
                      color: isBackspaceActive
                        ? resolvedButtonTextColor
                        : resolvedTextColor,
                    }}
                  >
                    <Delete className="h-5 w-5" />
                  </button>
                </>
              );
            })()}

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

  function renderTextWithCursor(value: string, field: Exclude<ActiveField, null>) {
    const isActive = activeField === field;
    const safeCursor = Math.max(0, Math.min(cursorPosition, value.length));

    const before = value.slice(0, safeCursor);
    const after = value.slice(safeCursor);

    if (!value && !isActive) {
      return null;
    }

    return (
      <span className="whitespace-pre-wrap break-words leading-relaxed">
        {before}
        {isActive ? <span className="kiosk-caret" /> : null}
        {after}
      </span>
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
          className={`flex w-full flex-col overflow-hidden rounded-[32px] border border-white/10 p-5 shadow-2xl backdrop-blur md:p-8 transition-[max-height] duration-300 ${
            keyboardOpen || keyboardClosing
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
                          className={`rounded-2xl border px-4 py-5 text-base font-medium transition active:scale-95 md:px-6 md:py-6 md:text-lg ${
                            active
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
                  Label da avaliação:
                  <span className="ml-2 font-semibold">
                    {selectedRating?.emoji} {selectedRating?.label}
                  </span>
                </p>

                <h2 className="mt-4 text-3xl font-bold md:text-5xl">
                  Por favor, deixe sua avaliação abaixo.
                </h2>

                <p className="mt-4 text-lg opacity-90">
                  Comentário e e-mail são obrigatórios.
                </p>

                <div className="mx-auto mt-8 max-w-3xl space-y-5">
                  <div>
                    <label className="mb-2 block text-left text-sm font-semibold opacity-90">
                      E-mail
                    </label>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openKeyboard("email")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openKeyboard("email");
                        }
                      }}
                      className={`min-h-[64px] w-full rounded-3xl border bg-black/10 px-5 py-4 text-left text-base outline-none md:text-lg ${
                        activeField === "email"
                          ? "border-white/30"
                          : "border-white/10"
                      }`}
                      style={{ color: resolvedTextColor }}
                    >
                      {email ? (
                        renderTextWithCursor(email, "email")
                      ) : activeField === "email" ? (
                        <span className="opacity-45">
                          <span className="kiosk-caret" />
                        </span>
                      ) : (
                        <span className="opacity-45">Toque para digitar</span>
                      )}
                    </div>

                    {emailError ? (
                      <p className="mt-3 text-sm text-rose-300">{emailError}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-left text-sm font-semibold opacity-90">
                      Avaliação
                    </label>

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
                      className={`min-h-[180px] w-full rounded-3xl border bg-black/10 px-5 py-4 text-left text-base outline-none md:text-lg ${
                        activeField === "comment"
                          ? "border-white/30"
                          : "border-white/10"
                      }`}
                      style={{ color: resolvedTextColor }}
                    >
                      {comment ? (
                        renderTextWithCursor(comment, "comment")
                      ) : activeField === "comment" ? (
                        <span className="opacity-45">
                          <span className="kiosk-caret" />
                        </span>
                      ) : (
                        <span className="opacity-45">Toque aqui para digitar</span>
                      )}
                    </div>

                    {commentError ? (
                      <p className="mt-3 text-sm text-rose-300">{commentError}</p>
                    ) : null}
                  </div>
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
                      className={`w-full rounded-2xl border bg-black/10 px-5 py-4 text-left text-base md:text-lg ${
                        activeField === "contactName"
                          ? "border-white/30"
                          : "border-white/10"
                      }`}
                      style={{ color: resolvedTextColor }}
                    >
                      {contactName ? (
                        renderTextWithCursor(contactName, "contactName")
                      ) : activeField === "contactName" ? (
                        <span className="opacity-45">
                          <span className="kiosk-caret" />
                        </span>
                      ) : (
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
                      className={`w-full rounded-2xl border bg-black/10 px-5 py-4 text-left text-base md:text-lg ${
                        activeField === "contactPhone"
                          ? "border-white/30"
                          : "border-white/10"
                      }`}
                      style={{ color: resolvedTextColor }}
                    >
                      {contactPhone ? (
                        renderTextWithCursor(contactPhone, "contactPhone")
                      ) : activeField === "contactPhone" ? (
                        <span className="opacity-45">
                          <span className="kiosk-caret" />
                        </span>
                      ) : (
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
                      className={`flex min-h-[120px] w-full items-start rounded-2xl border bg-black/10 px-5 py-4 text-left text-base md:text-lg ${
                        activeField === "contactMessage"
                          ? "border-white/30"
                          : "border-white/10"
                      }`}
                      style={{ color: resolvedTextColor }}
                    >
                      {contactMessage ? (
                        renderTextWithCursor(contactMessage, "contactMessage")
                      ) : activeField === "contactMessage" ? (
                        <span className="opacity-45">
                          <span className="kiosk-caret" />
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
        className={`fixed inset-x-0 bottom-0 z-50 transition-all duration-300 ease-out ${
          keyboardOpen && !keyboardClosing
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="mx-auto w-full max-w-6xl px-3 md:px-6">
          <div
            className="rounded-t-[28px] border border-white/10 border-b-0 p-4 shadow-2xl backdrop-blur-xl md:p-5"
            style={{ backgroundColor: "rgba(2, 6, 23, 0.97)" }}
          >
            <div
              className="mb-3 flex items-center justify-end"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeKeyboard(true);
                }}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium transition-transform active:scale-95"
                style={{ color: resolvedTextColor }}
              >
                Fechar
              </button>
            </div>

            {activeField === "contactPhone" ? renderPhoneKeyboard() : null}
            {activeField === "email" ||
            activeField === "comment" ||
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