import React from 'react';
import {
  Copy,
  Trash2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
} from 'lucide-react';
import type { MCQQuestion, MCQOptionKey } from '../../types/mcqAssessment';

interface Props {
  question: MCQQuestion;
  index: number;
  totalQuestions: number;
  onChange: (updated: MCQQuestion) => void;
  onDuplicate: () => void;
  onDeleteRequest: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  showValidationErrors?: boolean;
}

export const MCQQuestionEditor: React.FC<Props> = ({
  question,
  index,
  totalQuestions,
  onChange,
  onDuplicate,
  onDeleteRequest,
  onMoveLeft,
  onMoveRight,
  showValidationErrors = false,
}) => {
  const handleQuestionTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({
      ...question,
      questionText: e.target.value,
    });
  };

  const handleOptionTextChange = (optIndex: number, text: string) => {
    const updatedOptions = question.options.map((opt, i) =>
      i === optIndex ? { ...opt, text } : opt
    );
    onChange({
      ...question,
      options: updatedOptions,
    });
  };

  const handleCorrectOptionSelect = (optionId: string) => {
    onChange({
      ...question,
      correctOptionId: optionId,
    });
  };

  const handleMarksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onChange({
      ...question,
      marks: isNaN(val) ? 1 : Math.max(0.5, val),
    });
  };

  const handleExplanationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({
      ...question,
      explanation: e.target.value,
    });
  };

  // Validation flags
  const isQuestionEmpty = !question.questionText.trim();
  const optionErrors = question.options.map((opt) => !opt.text.trim());
  const isCorrectAnswerMissing = !question.correctOptionId;
  const isMarksInvalid = !question.marks || question.marks <= 0;

  const optionKeys: MCQOptionKey[] = ['A', 'B', 'C', 'D'];

  return (
    <div id="question-editor-card" className="rounded-2xl border border-[#E7DED3] bg-white p-6 shadow-sm scroll-mt-24">
      {/* Question Header & Tools */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7DED3] pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1B1C1E] text-xs font-bold text-white shadow-sm">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div>
            <h3 className="text-sm font-bold text-[#1B1C1E]">
              Question {index + 1} of {totalQuestions}
            </h3>
            <p className="text-xs text-[#8C857D]">
              Configure statement, multiple options, correct answer key, and marks.
            </p>
          </div>
        </div>

        {/* Action Controls: Reorder, Duplicate, Delete */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[#E7DED3] bg-[#FAF7F2] p-0.5">
            <button
              type="button"
              onClick={onMoveLeft}
              disabled={index === 0}
              title="Move Question Left"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#1B1C1E] hover:bg-[#E9DED0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft size={13} />
            </button>
            <button
              type="button"
              onClick={onMoveRight}
              disabled={index === totalQuestions - 1}
              title="Move Question Right"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#1B1C1E] hover:bg-[#E9DED0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={onDuplicate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7DED3] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#1B1C1E] hover:bg-[#E9DED0] hover:border-[#B08E67] transition-all"
            title="Duplicate Question"
          >
            <Copy size={13} />
            <span>Duplicate</span>
          </button>

          <button
            type="button"
            onClick={onDeleteRequest}
            disabled={totalQuestions <= 1}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#A75B52]/20 bg-[#A75B52]/10 px-3 py-1.5 text-xs font-semibold text-[#A75B52] hover:bg-[#A75B52] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Delete Question"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* Question Text Area */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-1.5">
              <span>Question Statement</span>
              <span className="text-[#A75B52] font-bold">*</span>
            </label>
            <span className="text-[11px] text-[#8C857D]">Markdown & Code formatting supported</span>
          </div>
          <textarea
            id="question-statement-input"
            rows={3}
            value={question.questionText}
            onChange={handleQuestionTextChange}
            placeholder="e.g. What is the time complexity of binary search in a sorted array of size n?"
            className={`w-full rounded-xl border p-3.5 text-sm leading-relaxed transition-all focus:outline-none ${
              showValidationErrors && isQuestionEmpty
                ? 'border-[#A75B52] ring-1 ring-[#A75B52] bg-[#FAF7F2]'
                : 'border-[#E7DED3] bg-[#FAF7F2]/50 focus:border-[#B08E67] focus:bg-white focus:ring-2 focus:ring-[#B08E67]/20'
            }`}
          />
          {showValidationErrors && isQuestionEmpty && (
            <p className="mt-1 text-xs font-medium text-[#A75B52] flex items-center gap-1">
              <Info size={12} /> Question statement cannot be empty.
            </p>
          )}
        </div>

        {/* Options & Correct Answer Key Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-1.5">
              <span>Answer Options & Correct Key</span>
              <span className="text-[#A75B52] font-bold">*</span>
            </label>
            <span className="text-[11px] text-[#8C857D]">
              Select the radio button next to the correct answer
            </span>
          </div>

          <div className="space-y-3">
            {question.options.map((option, optIdx) => {
              const optKey = optionKeys[optIdx] || `Option ${optIdx + 1}`;
              const isSelected = question.correctOptionId === option.id;
              const hasError = showValidationErrors && optionErrors[optIdx];

              return (
                <div
                  key={option.id || optIdx}
                  className={`group relative flex items-center gap-3 rounded-xl border p-2.5 transition-all ${
                    isSelected
                      ? 'border-[#B08E67] bg-[#FAF7F2] ring-2 ring-[#B08E67]/25'
                      : 'border-[#E7DED3] bg-white hover:border-[#CFBAA1]'
                  }`}
                >
                  {/* Correct Answer Radio */}
                  <label className="flex items-center cursor-pointer pl-1">
                    <input
                      type="radio"
                      name={`correct-answer-${question.id}`}
                      checked={isSelected}
                      onChange={() => handleCorrectOptionSelect(option.id)}
                      className="sr-only"
                    />
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-[#B08E67] bg-[#B08E67] text-white shadow-sm'
                          : 'border-[#E7DED3] bg-[#FAF7F2] text-[#625D57] group-hover:border-[#B08E67]'
                      }`}
                      title={isSelected ? 'Correct Answer Selected' : 'Mark as Correct Answer'}
                    >
                      {isSelected ? <CheckCircle2 size={14} /> : optKey}
                    </div>
                  </label>

                  {/* Option Text Input */}
                  <div className="flex-1">
                    <input
                      id={`option-input-${question.id}-${optIdx}`}
                      type="text"
                      value={option.text}
                      onChange={(e) => handleOptionTextChange(optIdx, e.target.value)}
                      placeholder={`Enter text for Option ${optKey}...`}
                      className={`w-full rounded-lg border px-3 py-2 text-xs font-medium transition-all focus:outline-none ${
                        hasError
                          ? 'border-[#A75B52] bg-white text-[#1B1C1E]'
                          : 'border-transparent bg-transparent focus:border-[#B08E67] focus:bg-white focus:ring-1 focus:ring-[#B08E67]/30'
                      }`}
                    />
                  </div>

                  {/* Right Tag */}
                  {isSelected ? (
                    <span className="shrink-0 rounded-md bg-[#B08E67]/20 px-2 py-0.5 text-[11px] font-bold text-[#9C7449]">
                      Correct Key
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCorrectOptionSelect(option.id)}
                      className="shrink-0 text-[11px] text-[#8C857D] hover:text-[#9C7449] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Set as Correct
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {showValidationErrors && isCorrectAnswerMissing && (
            <p className="mt-1.5 text-xs font-medium text-[#A75B52] flex items-center gap-1">
              <Info size={12} /> Please select the correct answer for this question.
            </p>
          )}
        </div>

        {/* Marks & Explanation Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {/* Marks Input */}
          <div className="md:col-span-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-1 mb-1.5">
              <span>Marks</span>
              <span className="text-[#A75B52] font-bold">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={question.marks}
                onChange={handleMarksChange}
                className={`w-full rounded-xl border p-2.5 text-xs font-bold transition-all focus:outline-none ${
                  showValidationErrors && isMarksInvalid
                    ? 'border-[#A75B52] bg-[#FAF7F2]'
                    : 'border-[#E7DED3] bg-[#FAF7F2]/50 focus:border-[#B08E67] focus:bg-white'
                }`}
              />
              <span className="absolute right-3 top-2.5 text-xs font-semibold text-[#8C857D]">
                pts
              </span>
            </div>
          </div>

          {/* Explanation Textarea */}
          <div className="md:col-span-3">
            <label className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-1 mb-1.5">
              <span>Solution Explanation</span>
              <span className="text-[11px] text-[#8C857D] font-normal">(Included in Teacher Preview & Results)</span>
            </label>
            <textarea
              rows={2}
              value={question.explanation || ''}
              onChange={handleExplanationChange}
              placeholder="Explain why this answer is correct to help students during post-evaluation reviews..."
              className="w-full rounded-xl border border-[#E7DED3] bg-[#FAF7F2]/50 p-2.5 text-xs transition-all focus:border-[#B08E67] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B08E67]/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
