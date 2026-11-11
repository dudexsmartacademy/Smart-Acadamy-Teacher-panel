import { useEffect } from "react";
import { Trash2, X } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  message?: string;
  confirmText?: string;
  loading?: boolean;
}

export default function DeleteModal({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = "Delete Confirmation",
  itemName,
  message,
  confirmText = "Delete",
  loading = false,
}: DeleteModalProps) {
  const handleClose = () => {
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose, loading]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      {/* Backdrop click handler */}
      <div
        className="fixed inset-0"
        onClick={loading ? undefined : handleClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl transition-all duration-200">
        {/* Close Icon Button */}
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-100">
            <Trash2 size={22} className="text-red-600" />
          </div>

          <div className="min-w-0 flex-1">
            <h3
              id="delete-modal-title"
              className="text-base font-semibold text-gray-900"
            >
              {title}
            </h3>
            {itemName && (
              <p className="mt-0.5 text-xs font-semibold text-[#b08e67] truncate">
                {itemName}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
              {message ||
                "Are you sure you want to delete this item? This action cannot be undone."}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 active:scale-[0.98] transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
