import { AlertTriangle, HelpCircle } from "lucide-react";

export type ConfirmState = {
  title: string;
  description: string;
  warningNote?: string;
  confirmText?: string;
  onConfirm: () => void;
};

/** Confirmation & alteration dialog used by the faculty attendance screens. */
export default function ConfirmDialog({ state, onCancel }: { state: ConfirmState | null; onCancel: () => void }) {
  if (!state) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 border border-gray-200">
        <div className="flex items-start gap-3.5 mb-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <HelpCircle size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-snug">{state.title}</h3>
            <p className="mt-1 text-xs text-gray-600 leading-relaxed">{state.description}</p>
          </div>
        </div>

        {state.warningNote && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle size={15} className="text-amber-700 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{state.warningNote}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            Cancel (Keep Current)
          </button>
          <button
            type="button"
            onClick={state.onConfirm}
            className="rounded-xl bg-amber-600 px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white hover:bg-amber-700 shadow-sm transition active:scale-95 cursor-pointer"
          >
            {state.confirmText || "Yes, Confirm Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
