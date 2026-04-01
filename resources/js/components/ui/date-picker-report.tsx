import * as React from "react";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const MONTHS_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const MONTHS_FULL_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const WEEKDAYS_ES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

type ViewMode = "days" | "months" | "years";

interface DatePickerReportProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  /** When "month", only year+month selection is shown (no day grid) */
  mode?: "day" | "month";
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function DatePickerReport({
  selected,
  onSelect,
  disabled,
  className,
  mode = "day",
}: DatePickerReportProps) {
  const isValidDate = (d?: Date): d is Date => !!d && !isNaN(d.getTime());
  const minYear = 2020;
  const maxYear = new Date().getFullYear() + 1;

  const [viewMode, setViewMode] = useState<ViewMode>(mode === "month" ? "months" : "days");
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (isValidDate(selected)) return new Date(selected.getFullYear(), selected.getMonth(), 1);
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const [yearPageStart, setYearPageStart] = useState<number>(() => {
    const y = viewDate.getFullYear();
    return Math.floor(y / 20) * 20;
  });

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const today = new Date();

  const yearsGrid = useMemo(() => {
    const years: number[] = [];
    for (let i = yearPageStart; i < yearPageStart + 20; i++) {
      years.push(i);
    }
    return years;
  }, [yearPageStart]);

  const handleYearPagePrev = () => setYearPageStart((p) => Math.max(minYear - (minYear % 20), p - 20));
  const handleYearPageNext = () => setYearPageStart((p) => Math.min(Math.floor(maxYear / 20) * 20, p + 20));

  const handleSelectYear = (year: number) => {
    setViewDate(new Date(year, currentMonth, 1));
    setViewMode("months");
  };

  const handleSelectMonth = (month: number) => {
    if (mode === "month") {
      onSelect?.(new Date(currentYear, month, 1));
      return;
    }
    setViewDate(new Date(currentYear, month, 1));
    setViewMode("days");
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const handlePrevMonth = () => {
    setViewDate((prev) => {
      const m = prev.getMonth() - 1;
      if (m < 0) return new Date(prev.getFullYear() - 1, 11, 1);
      return new Date(prev.getFullYear(), m, 1);
    });
  };

  const handleNextMonth = () => {
    setViewDate((prev) => {
      const m = prev.getMonth() + 1;
      if (m > 11) return new Date(prev.getFullYear() + 1, 0, 1);
      return new Date(prev.getFullYear(), m, 1);
    });
  };

  const handleSelectDay = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    if (disabled && disabled(date)) return;
    onSelect?.(date);
  };

  const handleCaptionClick = () => {
    if (viewMode === "days") {
      setYearPageStart(Math.floor(currentYear / 20) * 20);
      setViewMode("years");
    }
  };

  return (
    <div className={cn("p-3 w-[280px]", className)}>
      {viewMode === "years" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handleYearPagePrev}
              disabled={yearPageStart <= minYear - (minYear % 20)}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 disabled:opacity-20",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-foreground">
              {yearPageStart} – {Math.min(yearPageStart + 19, maxYear)}
            </span>
            <button
              type="button"
              onClick={handleYearPageNext}
              disabled={yearPageStart + 20 > maxYear}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 disabled:opacity-20",
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {yearsGrid.map((year) => {
              const isDisabled = year < minYear || year > maxYear;
              const isSelected = selected && selected.getFullYear() === year;
              const isCurrent = year === today.getFullYear();
              return (
                <button
                  key={year}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectYear(year)}
                  className={cn(
                    "h-9 rounded-md text-sm font-normal transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isDisabled && "text-muted-foreground opacity-30 pointer-events-none",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    !isSelected && isCurrent && "bg-accent text-accent-foreground",
                  )}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "months" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(currentYear - 1, currentMonth, 1))}
              disabled={currentYear <= minYear}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 disabled:opacity-20",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setYearPageStart(Math.floor(currentYear / 20) * 20);
                setViewMode("years");
              }}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              {currentYear}
            </button>
            <button
              type="button"
              onClick={() => setViewDate(new Date(currentYear + 1, currentMonth, 1))}
              disabled={currentYear >= maxYear}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 disabled:opacity-20",
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MONTHS_ES.map((month, idx) => {
              const isSelected =
                selected &&
                selected.getFullYear() === currentYear &&
                selected.getMonth() === idx;
              const isCurrent =
                today.getFullYear() === currentYear && today.getMonth() === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectMonth(idx)}
                  className={cn(
                    "h-9 rounded-md text-sm font-normal transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    !isSelected && isCurrent && "bg-accent text-accent-foreground",
                  )}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "days" && (
        <div>
          <div className="relative flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleCaptionClick}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              {MONTHS_FULL_ES[currentMonth]} {currentYear}
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS_ES.map((day) => (
              <div
                key={day}
                className="h-9 w-9 flex items-center justify-center text-muted-foreground text-[0.8rem] font-normal"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9 w-9" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(currentYear, currentMonth, day);
              const isDisabled = disabled ? disabled(date) : false;
              const isSelected = selected ? isSameDay(date, selected) : false;
              const isToday = isSameDay(date, today);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    "h-9 w-9 rounded-md text-sm font-normal transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isDisabled && "text-muted-foreground opacity-50 pointer-events-none",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    !isSelected && isToday && "bg-accent text-accent-foreground",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

DatePickerReport.displayName = "DatePickerReport";

export { DatePickerReport };
export type { DatePickerReportProps };
