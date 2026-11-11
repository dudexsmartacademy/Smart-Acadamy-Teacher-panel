import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import type { MCQAssessment } from '../../types/mcqAssessment';

interface Props {
  isOpen: boolean;
  assessment: MCQAssessment | null;
  onClose: () => void;
  onConfirmDelete: (assessment: MCQAssessment) => void;
  isDeleting?: boolean;
}

export const MCQDeleteModal: React.FC<Props> = ({
  isOpen,
  assessment,
  onClose,
  onConfirmDelete,
  isDeleting = false,
}) => {
  if (!isOpen || !assessment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-[#E7DED3] bg-white p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E7DED3] pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A75B52]/15 text-[#A75B52]">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1B1C1E]">
                Delete this assessment?
              </h3>
              <p className="text-xs text-[#8C857D] line-clamp-1">
                {assessment.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg p-1.5 text-[#8C857D] hover:bg-[#FAF7F2] hover:text-[#1B1C1E] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message */}
        <p className="text-xs text-[#625D57] leading-relaxed">
          This will remove the assessment from active teacher management and prevent students from
          accessing it according to the configured deletion/archival policy. Academic records and
          historical submissions will be safely archived.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E7DED3]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] px-4 py-2 text-xs font-semibold text-[#1B1C1E] hover:bg-[#E9DED0] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirmDelete(assessment)}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#A75B52] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#A75B52]/90 transition-all disabled:opacity-50"
          >
            <Trash2 size={13} />
            <span>{isDeleting ? 'Archiving...' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
