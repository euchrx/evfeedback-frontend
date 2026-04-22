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
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/40">
        <div className="border-b border-white/10 p-6">
          <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
            formulário
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            {title}
          </h2>

          {description ? (
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {description}
            </p>
          ) : null}
        </div>

        <div className="p-6">{children}</div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 p-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
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