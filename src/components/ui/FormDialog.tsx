import type { ReactNode } from "react";

type FormDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function FormDialog({
  open,
  title,
  description,
  children,
  confirmText = "Salvar",
  cancelText = "Cancelar",
  confirmDisabled = false,
  confirmLoading = false,
  onConfirm,
  onClose,
}: FormDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-xl overflow-visible rounded-3xl border border-white/80 bg-white shadow-[0_24px_70px_-22px_rgba(15,23,42,0.30)]">
        <div className="border-b border-slate-200 p-6">

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h2>

          {description ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>

        <div className="p-6">{children}</div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled || confirmLoading}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmLoading ? "Salvando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
