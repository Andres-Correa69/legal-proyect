import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowRight, ArrowLeft, PartyPopper, CheckCircle } from "lucide-react";
import { holidaysApi, type HolidayItem } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const COUNTRIES = [
    { code: "CO", name: "Colombia" },
];

interface HolidaysDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImported: () => void;
}

export function HolidaysDialog({ open, onOpenChange, onImported }: HolidaysDialogProps) {
    const { toast } = useToast();
    const currentYear = new Date().getFullYear();

    // Step 1: country/year selection. Step 2: holidays list with checkboxes
    const [step, setStep] = useState<1 | 2>(1);
    const [country, setCountry] = useState("CO");
    const [year, setYear] = useState(currentYear);
    const [holidays, setHolidays] = useState<HolidayItem[]>([]);
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);

    // Reset on open
    useEffect(() => {
        if (open) {
            setStep(1);
            setCountry("CO");
            setYear(currentYear);
            setHolidays([]);
            setSelectedDates(new Set());
        }
    }, [open, currentYear]);

    const fetchHolidays = useCallback(async () => {
        setLoading(true);
        try {
            const data = await holidaysApi.getByCountry(country, year);
            setHolidays(data);
            // Select all non-imported by default
            const notImported = new Set(data.filter((h) => !h.imported).map((h) => h.date));
            setSelectedDates(notImported);
            setStep(2);
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.message || "No se pudieron cargar los días festivos.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [country, year, toast]);

    const toggleDate = (date: string) => {
        setSelectedDates((prev) => {
            const next = new Set(prev);
            if (next.has(date)) {
                next.delete(date);
            } else {
                next.add(date);
            }
            return next;
        });
    };

    const toggleAll = () => {
        const notImported = holidays.filter((h) => !h.imported);
        if (selectedDates.size === notImported.length) {
            setSelectedDates(new Set());
        } else {
            setSelectedDates(new Set(notImported.map((h) => h.date)));
        }
    };

    const handleImport = async () => {
        if (selectedDates.size === 0) return;
        setImporting(true);
        try {
            const result = await holidaysApi.import(country, year, Array.from(selectedDates));
            toast({
                title: "Festivos importados",
                description: `${result.imported} días festivos agregados al calendario.`,
            });
            onImported();
            onOpenChange(false);
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.message || "No se pudieron importar los festivos.",
                variant: "destructive",
            });
        } finally {
            setImporting(false);
        }
    };

    const notImportedCount = holidays.filter((h) => !h.imported).length;
    const allImported = holidays.length > 0 && notImportedCount === 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card">
                {step === 1 ? (
                    <>
                        <DialogHeader className="text-center">
                            <DialogTitle className="text-lg">Días festivos</DialogTitle>
                            <DialogDescription>
                                Aquí puedes seleccionar aquellos festivos que quieres importar en tus actividades.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    País
                                </Label>
                                <Select value={country} onValueChange={setCountry}>
                                    <SelectTrigger className="h-10 bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card z-50">
                                        {COUNTRIES.map((c) => (
                                            <SelectItem key={c.code} value={c.code}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Año
                                </Label>
                                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                                    <SelectTrigger className="h-10 bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card z-50">
                                        {Array.from({ length: 5 }, (_, i) => currentYear - 1 + i).map((y) => (
                                            <SelectItem key={y} value={String(y)}>
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
                            <Button
                                className="w-full gap-2 bg-[#2463eb] hover:bg-[#1d4fc4]"
                                onClick={fetchHolidays}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ArrowRight className="h-4 w-4" />
                                )}
                                Guardar
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full text-[#2463eb]"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-lg">Configurar días festivos</DialogTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setStep(1)}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </div>
                        </DialogHeader>

                        {/* Select all */}
                        {!allImported && (
                            <div className="flex items-center justify-between px-1 pb-1">
                                <button
                                    className="text-sm text-[#2463eb] hover:underline"
                                    onClick={toggleAll}
                                >
                                    {selectedDates.size === notImportedCount
                                        ? "Deseleccionar todos"
                                        : "Seleccionar todos"}
                                </button>
                                <span className="text-xs text-muted-foreground">
                                    {selectedDates.size} seleccionados
                                </span>
                            </div>
                        )}

                        {/* Holiday list */}
                        <div className="max-h-[400px] overflow-y-auto -mx-2 px-2 space-y-1">
                            {holidays.map((h) => (
                                <label
                                    key={h.date}
                                    className={`flex items-center justify-between py-3 px-2 rounded-md cursor-pointer transition-colors ${
                                        h.imported
                                            ? "opacity-50 cursor-default"
                                            : selectedDates.has(h.date)
                                            ? "bg-blue-500/10"
                                            : "hover:bg-muted/50"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {h.imported ? (
                                            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                                        ) : (
                                            <Checkbox
                                                checked={selectedDates.has(h.date)}
                                                onCheckedChange={() => toggleDate(h.date)}
                                            />
                                        )}
                                        <span className="text-sm font-medium">{h.name}</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground font-mono">{h.date}</span>
                                </label>
                            ))}
                        </div>

                        <DialogFooter className="flex-row gap-2 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1 gap-2 bg-[#2463eb] hover:bg-[#1d4fc4]"
                                onClick={handleImport}
                                disabled={importing || selectedDates.size === 0}
                            >
                                {importing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <PartyPopper className="h-4 w-4" />
                                )}
                                Confirmar
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
