import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DateFilterWithCustomProps {
  value: string;
  onChange: (value: string) => void;
  customDateRange: { from: Date | undefined; to: Date | undefined };
  onCustomDateChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  placeholder?: string;
  className?: string;
}

export const DateFilterWithCustom = ({
  value,
  onChange,
  customDateRange,
  onCustomDateChange,
  placeholder = "Fecha",
  className,
}: DateFilterWithCustomProps) => {
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const handleValueChange = (newValue: string) => {
    onChange(newValue);
    if (newValue === "personalizada") {
      setIsCustomOpen(true);
    }
  };

  const formatCustomRange = () => {
    if (customDateRange.from && customDateRange.to) {
      return `${format(customDateRange.from, "dd/MM", { locale: es })} - ${format(customDateRange.to, "dd/MM", { locale: es })}`;
    }
    if (customDateRange.from) {
      return `Desde ${format(customDateRange.from, "dd/MM", { locale: es })}`;
    }
    return "Personalizada";
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <CalendarIcon className="h-4 w-4 mr-2" />
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-card z-50">
          <SelectItem value="todos">Todo el tiempo</SelectItem>
          <SelectItem value="hoy">Hoy</SelectItem>
          <SelectItem value="ayer">Ayer</SelectItem>
          <SelectItem value="7dias">Ultimos 7 dias</SelectItem>
          <SelectItem value="30dias">Ultimos 30 dias</SelectItem>
          <SelectItem value="estemes">Este mes</SelectItem>
          <SelectItem value="trimestre">Ultimos 3 meses</SelectItem>
          <SelectItem value="personalizada">Personalizada...</SelectItem>
        </SelectContent>
      </Select>

      {value === "personalizada" && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <CalendarIcon className="h-3 w-3" />
              {formatCustomRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card z-50" align="start">
            <Calendar
              mode="range"
              selected={{ from: customDateRange.from, to: customDateRange.to }}
              onSelect={(range) => {
                onCustomDateChange({ from: range?.from, to: range?.to });
              }}
              numberOfMonths={2}
              locale={es}
              className="p-3 pointer-events-auto"
            />
            <div className="p-3 border-t flex justify-end">
              <Button size="sm" onClick={() => setIsCustomOpen(false)}>
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
