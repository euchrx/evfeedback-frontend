import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ConfirmDialogVariant = "danger" | "warning" | "info";

type ConfirmDialogOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
};

type ConfirmDialogState = ConfirmDialogOptions & {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
};

type ConfirmDialogContextValue = {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  close: () => void;
};

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

function getVariantStyles(variant: ConfirmDialogVariant) {
  switch (variant) {
    case "danger":
      return {
        badge:
          "border-rose-400/20 bg-rose-500/10 text-rose-200",
        confirmButton:
          "bg-rose-500 text-white hover:bg-rose-400",
      };
    case "warning":
      return {
        badge:
          "border-amber-400/20 bg-amber-500/10 text-amber-200",
        confirmButton:
          "bg-amber-400 text-slate-950 hover:bg-amber-300",
      };
    case "info":
    default:
      return {
        badge:
          "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
        confirmButton:
          "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
      };
  }
}

function ConfirmDialog({
  state,
  onConfirm,
  onCancel,
}: {
  state: ConfirmDialogState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!state.isOpen) return null;

  const styles = getVariantStyles(state.variant ?? "info");

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/40">
        <div className="border-b border-white/10 p-6">
          <div
            className={[
              "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
              styles.badge,
            ].join(" ")}
          >
            confirmação
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            {state.title}
          </h2>

          {state.description ? (
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {state.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 p-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
          >
            {state.cancelText ?? "Cancelar"}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={[
              "inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition",
              styles.confirmButton,
            ].join(" ")}
          >
            {state.confirmText ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialogProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<ConfirmDialogState>({
    isOpen: false,
    title: "",
  });

  const close = useCallback(() => {
    setState((current) => {
      current.resolve?.(false);
      return {
        isOpen: false,
        title: "",
      };
    });
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        title: options.title,
        description: options.description,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        variant: options.variant ?? "info",
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((current) => {
      current.resolve?.(true);
      return {
        isOpen: false,
        title: "",
      };
    });
  }, []);

  const handleCancel = useCallback(() => {
    setState((current) => {
      current.resolve?.(false);
      return {
        isOpen: false,
        title: "",
      };
    });
  }, []);

  const value = useMemo<ConfirmDialogContextValue>(
    () => ({
      confirm,
      close,
    }),
    [confirm, close],
  );

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <ConfirmDialog
        state={state}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);

  if (!context) {
    throw new Error("useConfirmDialog must be used within a ConfirmDialogProvider.");
  }

  return context;
}