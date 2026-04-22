import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
};

type ShowToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastContextValue = {
  showToast: (input: ShowToastInput) => void;
  success: (title: string, description?: string, duration?: number) => void;
  error: (title: string, description?: string, duration?: number) => void;
  warning: (title: string, description?: string, duration?: number) => void;
  info: (title: string, description?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  toasts: ToastItem[];
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getVariantStyles(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return {
        container:
          "border-emerald-400/20 bg-emerald-500/10 text-emerald-50",
        badge:
          "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/20",
        accent: "bg-emerald-300",
        close:
          "text-emerald-100/80 hover:bg-emerald-400/10 hover:text-emerald-50",
      };

    case "error":
      return {
        container: "border-rose-400/20 bg-rose-500/10 text-rose-50",
        badge: "bg-rose-400/15 text-rose-200 ring-1 ring-rose-300/20",
        accent: "bg-rose-300",
        close:
          "text-rose-100/80 hover:bg-rose-400/10 hover:text-rose-50",
      };

    case "warning":
      return {
        container:
          "border-amber-400/20 bg-amber-500/10 text-amber-50",
        badge:
          "bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/20",
        accent: "bg-amber-300",
        close:
          "text-amber-100/80 hover:bg-amber-400/10 hover:text-amber-50",
      };

    case "info":
    default:
      return {
        container: "border-cyan-400/20 bg-cyan-500/10 text-cyan-50",
        badge: "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/20",
        accent: "bg-cyan-300",
        close:
          "text-cyan-100/80 hover:bg-cyan-400/10 hover:text-cyan-50",
      };
  }
}

function ToastViewport({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-md flex-col gap-3 sm:right-6 sm:top-6">
      {toasts.map((toast) => {
        const styles = getVariantStyles(toast.variant);

        return (
          <div
            key={toast.id}
            className={[
              "pointer-events-auto relative overflow-hidden rounded-[24px] border shadow-2xl shadow-black/25 backdrop-blur-xl",
              styles.container,
            ].join(" ")}
          >
            <div className={`absolute left-0 top-0 h-full w-1 ${styles.accent}`} />

            <div className="p-4 pr-12">
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "mt-0.5 inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                    styles.badge,
                  ].join(" ")}
                >
                  {toast.variant}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {toast.title}
                  </p>

                  {toast.description ? (
                    <p className="mt-1 text-sm leading-6 text-white/75">
                      {toast.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onRemove(toast.id)}
              className={[
                "absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm transition",
                styles.close,
              ].join(" ")}
              aria-label="Fechar notificação"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      title,
      description,
      variant = "info",
      duration = 4000,
    }: ShowToastInput) => {
      const id = createToastId();

      const nextToast: ToastItem = {
        id,
        title,
        description,
        variant,
        duration,
      };

      setToasts((current) => [...current, nextToast]);
    },
    [],
  );

  const success = useCallback(
    (title: string, description?: string, duration = 4000) => {
      showToast({ title, description, duration, variant: "success" });
    },
    [showToast],
  );

  const error = useCallback(
    (title: string, description?: string, duration = 5000) => {
      showToast({ title, description, duration, variant: "error" });
    },
    [showToast],
  );

  const warning = useCallback(
    (title: string, description?: string, duration = 4500) => {
      showToast({ title, description, duration, variant: "warning" });
    },
    [showToast],
  );

  const info = useCallback(
    (title: string, description?: string, duration = 4000) => {
      showToast({ title, description, duration, variant: "info" });
    },
    [showToast],
  );

  useEffect(() => {
    if (!toasts.length) return;

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, removeToast]);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success,
      error,
      warning,
      info,
      removeToast,
      toasts,
    }),
    [showToast, success, error, warning, info, removeToast, toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }

  return context;
}