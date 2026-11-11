import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type ResponsiveDatePickerProps = {
  label: string;
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  helperText?: string;
  required?: boolean;
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

type CalendarDay = {
  date: Date;
  currentMonth: boolean;
};

type PopupPosition = {
  top: number;
  left: number;
  openAbove: boolean;
};

function parseDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parts = value.split("-").map(Number);

  if (
    parts.length !== 3 ||
    parts.some(Number.isNaN)
  ) {
    return null;
  }

  const [year, month, day] = parts;

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function toDateString(date: Date): string {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(
    2,
    "0"
  );

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string): string {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function getFirstDayOfMonth(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
}

function getToday(): string {
  return toDateString(new Date());
}

export default function ResponsiveDatePicker({
  label,
  value,
  onChange,
  minDate,
  helperText,
  required = false,
}: ResponsiveDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [visibleMonth, setVisibleMonth] = useState<Date>(
    () => {
      const initialDate = parseDate(value) ?? new Date();

      return getFirstDayOfMonth(initialDate);
    }
  );

  const [popupPosition, setPopupPosition] =
    useState<PopupPosition>({
      top: 0,
      left: 12,
      openAbove: false,
    });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const minimumDate = useMemo(
    () => parseDate(minDate ?? ""),
    [minDate]
  );

  const selectedDate = useMemo(
    () => parseDate(value),
    [value]
  );

  const todayString = getToday();

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const firstDayOfWeek = new Date(
    year,
    month,
    1
  ).getDay();

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const days: CalendarDay[] = [];

    const previousMonthDays = new Date(
      year,
      month,
      0
    ).getDate();

    // Days from the previous month.
    for (let index = 0; index < firstDayOfWeek; index++) {
      const day = previousMonthDays - firstDayOfWeek + index + 1;

      days.push({
        date: new Date(year, month - 1, day),
        currentMonth: false,
      });
    }

    // Days in the current month.
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        currentMonth: true,
      });
    }

    // Days from the next month.
    let nextMonthDay = 1;

    while (days.length % 7 !== 0) {
      days.push({
        date: new Date(year, month + 1, nextMonthDay),
        currentMonth: false,
      });

      nextMonthDay++;
    }

    return days;
  }, [year, month, firstDayOfWeek, daysInMonth]);

  /**
   * Position the popup relative to the viewport.
   *
   * This prevents the calendar from opening outside
   * the left or right edges of the mobile screen.
   */
  const updatePopupPosition = useCallback(() => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const margin = 12;
    const gap = 8;

    const popupWidth = Math.max(
      0,
      Math.min(320, viewportWidth - margin * 2)
    );

    // Estimate the calendar's height before rendering.
    const estimatedPopupHeight = 350;

    // Clamp the popup horizontally to the viewport.
    const maxLeft = Math.max(
      margin,
      viewportWidth - popupWidth - margin
    );

    const left = Math.max(
      margin,
      Math.min(rect.left, maxLeft)
    );

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const openAbove =
      spaceBelow < estimatedPopupHeight + gap &&
      spaceAbove > spaceBelow;

    let top = openAbove
      ? rect.top - estimatedPopupHeight - gap
      : rect.bottom + gap;

    // Keep the popup within the visible viewport.
    const maxTop = Math.max(
      margin,
      viewportHeight - estimatedPopupHeight - margin
    );

    top = Math.max(
      margin,
      Math.min(top, maxTop)
    );

    setPopupPosition({
      top,
      left,
      openAbove,
    });
  }, []);

  /**
   * Open the calendar on the selected date's month.
   * If there is no selected date, use the current month.
   */
  function handleOpenCalendar() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    const initialDate = selectedDate ?? new Date();

    setVisibleMonth(
      getFirstDayOfMonth(initialDate)
    );

    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePopupPosition();

    function handleOutsideClick(event: PointerEvent) {
      const target = event.target as Node;

      if (
        containerRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handleViewportChange() {
      updatePopupPosition();
    }

    document.addEventListener(
      "pointerdown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    window.addEventListener(
      "resize",
      handleViewportChange
    );

    window.addEventListener(
      "scroll",
      handleViewportChange,
      true
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );

      window.removeEventListener(
        "resize",
        handleViewportChange
      );

      window.removeEventListener(
        "scroll",
        handleViewportChange,
        true
      );
    };
  }, [isOpen, updatePopupPosition]);

  function previousMonth() {
    setVisibleMonth(
      new Date(year, month - 1, 1)
    );
  }

  function nextMonth() {
    setVisibleMonth(
      new Date(year, month + 1, 1)
    );
  }

  const previousMonthEnd = toDateString(
    new Date(year, month, 0)
  );

  const canNavigatePrevious =
    !minimumDate ||
    previousMonthEnd >= toDateString(minimumDate);

  function handleSelectDate(date: Date) {
    const selectedDateString = toDateString(date);

    if (
      minimumDate &&
      selectedDateString < toDateString(minimumDate)
    ) {
      return;
    }

    onChange(selectedDateString);
    setIsOpen(false);
  }

  function handleClear() {
    onChange("");
    setIsOpen(false);
  }

  function handleToday() {
    const today = new Date();
    const todayStringValue = toDateString(today);

    if (
      minimumDate &&
      todayStringValue < toDateString(minimumDate)
    ) {
      return;
    }

    onChange(todayStringValue);

    setVisibleMonth(
      getFirstDayOfMonth(today)
    );

    setIsOpen(false);
  }

  const isTodayDisabled =
    !!minimumDate &&
    todayString < toDateString(minimumDate);

  return (
    <div
      ref={containerRef}
      className="responsive-date-picker relative w-full min-w-0"
    >
      {/* Label */}
      <label className="mb-1 block text-xs font-bold uppercase text-gray-700">
        {label}

        {required && (
          <span className="ml-1 text-rose-500">*</span>
        )}
      </label>

      {/* Date field */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpenCalendar}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`${label}: ${
          formatDate(value) || "Select date"
        }`}
        className="flex min-h-[42px] w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-left text-sm font-semibold text-gray-900 outline-none transition-colors hover:border-amber-500 focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
      >
        <span
          className={
            value
              ? "min-w-0 truncate"
              : "min-w-0 truncate text-gray-400"
          }
        >
          {formatDate(value) || "mm/dd/yyyy"}
        </span>

        <CalendarDays
          size={16}
          className="shrink-0 text-gray-500"
        />
      </button>

      {/* Helper text */}
      {helperText && (
        <p className="mt-1 text-[10px] text-gray-500">
          {helperText}
        </p>
      )}

      {/* Calendar popup */}
      {isOpen && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label={`${label} calendar`}
          style={{
            position: "fixed",
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            width: "min(320px, calc(100vw - 24px))",
            maxWidth: "calc(100vw - 24px)",
            boxSizing: "border-box",
            zIndex: 99999,
          }}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-xl sm:p-4"
        >
          {/* Month header */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-bold text-gray-900">
              {visibleMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={previousMonth}
                disabled={!canNavigatePrevious}
                aria-label="Previous month"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={19} />
              </button>

              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>

          {/* Weekday headings */}
          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((day, index) => (
              <div
                key={`${day}-${index}`}
                className="flex h-9 min-w-0 items-center justify-center text-xs font-semibold text-gray-500"
              >
                {day}
              </div>
            ))}

            {/* Calendar dates */}
            {calendarDays.map(({ date, currentMonth }) => {
              const dateString = toDateString(date);

              const isDisabled =
                !!minimumDate &&
                dateString < toDateString(minimumDate);

              const isSelected = dateString === value;

              const isToday = dateString === todayString;

              return (
                <button
                  key={dateString}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDate(date)}
                  aria-label={date.toLocaleDateString(
                    "en-US",
                    {
                      dateStyle: "full",
                    }
                  )}
                  aria-pressed={isSelected}
                  className={[
                    "flex h-9 min-w-0 items-center justify-center rounded-lg text-xs transition-colors",
                    currentMonth
                      ? "text-gray-800"
                      : "text-gray-300",
                    isDisabled
                      ? "cursor-not-allowed opacity-30"
                      : "cursor-pointer hover:bg-amber-50",
                    isSelected
                      ? "bg-amber-600 font-bold text-white hover:bg-amber-700"
                      : "",
                    isToday && !isSelected
                      ? "border border-amber-500 font-bold"
                      : "",
                  ].join(" ")}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={handleToday}
              disabled={isTodayDisabled}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}