import React from 'react';
import type { MCQAssessmentStatus } from '../../types/mcqAssessment';

interface Props {
  status: MCQAssessmentStatus;
  className?: string;
}

export const MCQStatusBadge: React.FC<Props> = ({ status, className = '' }) => {
  const getStyles = () => {
    switch (status) {
      case 'Active':
        return 'bg-[#5E8065]/15 text-[#5E8065] border-[#5E8065]/30';
      case 'Scheduled':
        return 'bg-[#E9DED0] text-[#1B1C1E] border-[#B08E67]/50 font-semibold';
      case 'Draft':
        return 'bg-[#FAF7F2] text-[#8C857D] border-[#E7DED3]';
      case 'Completed':
        return 'bg-[#F3ECE3] text-[#625D57] border-[#E7DED3]';
      case 'Cancelled':
        return 'bg-[#A75B52]/15 text-[#A75B52] border-[#A75B52]/30';
      case 'Archived':
        return 'bg-gray-100 text-gray-400 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDotColor = () => {
    switch (status) {
      case 'Active':
        return 'bg-[#5E8065] animate-pulse';
      case 'Scheduled':
        return 'bg-[#B08E67]';
      case 'Draft':
        return 'bg-[#8C857D]';
      case 'Completed':
        return 'bg-[#625D57]';
      case 'Cancelled':
        return 'bg-[#A75B52]';
      case 'Archived':
        return 'bg-gray-400';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide ${getStyles()} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`} />
      {status}
    </span>
  );
};
