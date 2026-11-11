import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { OptionItem } from "./CustomSelect";

interface MultiSelectChecklistProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: OptionItem[];
  placeholder?: string;
  /** Label of the "select every option" row; omit to hide it. */
  allLabel?: string;
  disabled?: boolean;
  emptyText?: string;
}

/** Dropdown with a checkbox per option, styled like CustomSelect. */
export default function MultiSelectChecklist({
  values,
  onChange,
  options,
  placeholder = "Select options",
  allLabel = "All Batches",
  disabled = false,
  emptyText = "No options available",
}: MultiSelectChecklistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const allSelected = options.length > 0 && options.every((o) => values.includes(o.value));
  const toggle = (value: string) =>
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  const toggleAll = () => onChange(allSelected ? [] : options.map((o) => o.value));

  const selectedLabels = options.filter((o) => values.includes(o.value)).map((o) => o.label);
  const summary =
    selectedLabels.length === 0
      ? placeholder
      : allSelected && allLabel
        ? `${allLabel} (${options.length})`
        : selectedLabels.length <= 2
          ? selectedLabels.join(", ")
          : `${selectedLabels.length} selected`;

  const box = (checked: boolean) => (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
        checked ? "border-[#9c7449] bg-[#9c7449] text-white" : "border-gray-300 bg-white"
      }`}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </span>
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-[#fffdf9] px-3.5 py-2.5 text-left text-xs sm:text-sm font-medium text-gray-900 shadow-2xs transition outline-none focus:border-[#b08e67] focus:ring-1 focus:ring-[#b08e67] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${selectedLabels.length === 0 ? "text-gray-400" : "text-gray-900"}`}>{summary}</span>
        <ChevronDown
          size={16}
          className={`ml-2 shrink-0 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180 text-gray-800" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl border border-[#e7ded3] bg-[#fffdf9] p-1.5 shadow-xl animate-in fade-in-50 duration-150"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-center text-xs text-gray-400">{emptyText}</div>
          ) : (
            <>
              {allLabel && (
                <button
                  type="button"
                  role="option"
                  aria-selected={allSelected}
                  onClick={toggleAll}
                  className="flex w-full items-center gap-2.5 rounded-xl border-b border-[#efe6db] px-3.5 py-2.5 text-left text-xs sm:text-sm font-semibold text-gray-900 hover:bg-[#f3ece3] cursor-pointer"
                >
                  {box(allSelected)}
                  <span className="truncate">{allLabel}</span>
                </button>
              )}
              {options.map((opt) => {
                const checked = values.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={checked}
                    onClick={() => toggle(opt.value)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-xs sm:text-sm font-medium transition cursor-pointer ${
                      checked ? "bg-[#e9ded0] text-[#1b1c1e]" : "text-gray-700 hover:bg-[#f3ece3] hover:text-[#1b1c1e]"
                    }`}
                  >
                    {box(checked)}
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
