import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface OptionItem {
  value: string;
  label: string;
}

export type CustomSelectOption =
  | OptionItem
  | string
  | number
  | { id: string | number; name: string }
  | { value: string | number; label: string };

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
  containerClassName = "",
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to { value: string, label: string } format
  const normalizedOptions: OptionItem[] = options.map((opt) => {
    if (typeof opt === "string" || typeof opt === "number") {
      return { value: String(opt), label: String(opt) };
    }
    if ("id" in opt && "name" in opt) {
      return { value: String(opt.id), label: String(opt.name) };
    }
    return { value: String(opt.value), label: String(opt.label) };
  });

  const stringValue = String(value ?? "");
  const selectedOption = normalizedOptions.find((opt) => opt.value === stringValue);

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
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

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${containerClassName}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between rounded-xl border border-gray-300 bg-[#fffdf9] px-3.5 py-2.5 text-left text-xs sm:text-sm font-medium text-gray-900 shadow-2xs transition outline-none focus:border-[#b08e67] focus:ring-1 focus:ring-[#b08e67] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${!selectedOption ? "text-gray-400" : "text-gray-900"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-500 transition-transform duration-200 ml-2 ${
            isOpen ? "rotate-180 text-gray-800" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu (Strictly contained within input size directly below) */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-2xl border border-[#e7ded3] bg-[#fffdf9] p-1.5 shadow-xl animate-in fade-in-50 duration-150"
        >
          {normalizedOptions.length === 0 ? (
            <div className="px-3 py-2 text-center text-xs text-gray-400">
              No options available
            </div>
          ) : (
            normalizedOptions.map((opt, index) => {
              const isSelected = opt.value === stringValue;
              return (
                <button
                  key={`${opt.value}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs sm:text-sm font-medium transition cursor-pointer ${
                    isSelected
                      ? "bg-[#e9ded0] font-semibold text-[#1b1c1e]"
                      : "text-gray-700 hover:bg-[#f3ece3] hover:text-[#1b1c1e]"
                  }`}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {isSelected && (
                    <Check size={16} className="shrink-0 text-[#9c7449]" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
