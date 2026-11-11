import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, AlertCircle } from 'lucide-react';
import type { MCQQuestion } from '../../types/mcqAssessment';

interface Props {
  questions: MCQQuestion[];
  activeIndex: number;
  onSelectTab: (index: number) => void;
  onAddTab: () => void;
  isQuestionValid: (q: MCQQuestion) => boolean;
}

export const MCQQuestionTabs: React.FC<Props> = ({
  questions,
  activeIndex,
  onSelectTab,
  onAddTab,
  isQuestionValid,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -180, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 180, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          inline: 'nearest',
          block: 'nearest',
        });
      }
    }
  }, [activeIndex]);

  return (
    <div className="relative flex items-center bg-[#FAF7F2] p-2 rounded-2xl border border-[#E7DED3]">
      {/* Scroll Left Button */}
      <button
        type="button"
        onClick={scrollLeft}
        aria-label="Previous Tabs"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E7DED3] bg-white text-[#1B1C1E] shadow-sm hover:bg-[#E9DED0] hover:border-[#B08E67] transition-all disabled:opacity-30 disabled:cursor-not-allowed mr-1.5"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Tabs Container */}
      <div
        ref={scrollContainerRef}
        className="flex flex-1 items-center gap-2 overflow-x-auto scrollbar-none py-1 px-1 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {questions.map((q, idx) => {
          const isActive = idx === activeIndex;
          const isValid = isQuestionValid(q);
          const tabLabel = `MCQ ${String(idx + 1).padStart(2, '0')}`;

          return (
            <button
              key={q.id || idx}
              type="button"
              onClick={() => onSelectTab(idx)}
              className={`group relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide transition-all select-none ${
                isActive
                  ? 'bg-[#1B1C1E] text-white shadow-md shadow-[#1B1C1E]/20 ring-2 ring-[#1B1C1E]'
                  : 'bg-[#E9DED0] text-[#1B1C1E] hover:bg-[#CFBAA1] hover:text-[#1B1C1E] border border-[#E7DED3]'
              }`}
            >
              <span>{tabLabel}</span>

              {/* Completion Indicator */}
              {isValid ? (
                <span
                  title="Completed"
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    isActive
                      ? 'bg-[#B08E67] text-white'
                      : 'bg-[#5E8065] text-white'
                  }`}
                >
                  <Check size={10} strokeWidth={3} />
                </span>
              ) : (
                <span
                  title="Incomplete"
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    isActive
                      ? 'bg-[#A75B52] text-white'
                      : 'bg-[#B08E67]/30 text-[#9C7449]'
                  }`}
                >
                  <AlertCircle size={10} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}

        {/* Add MCQ Tab */}
        <button
          type="button"
          onClick={onAddTab}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#B08E67] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#9C7449] active:scale-95 transition-all border border-[#9C7449]"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>+ Add MCQ</span>
        </button>
      </div>

      {/* Scroll Right Button */}
      <button
        type="button"
        onClick={scrollRight}
        aria-label="Next Tabs"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E7DED3] bg-white text-[#1B1C1E] shadow-sm hover:bg-[#E9DED0] hover:border-[#B08E67] transition-all ml-1.5"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};
