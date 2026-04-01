import { useState, useEffect, useMemo } from "react";
import { Head, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { Spinner } from "@/components/ui/spinner";
import { accountingApi } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { AccountingAccount } from "@/types";
import {
  ArrowLeft,
  Plus,
  X,
  Save,
  Send,
  BookOpen,
  Loader2,
  CalendarIcon,
} from "lucide-react";

interface LineItem {
  id: string;
  account_id: number | null;
  debit: number;
  credit: number;
  description: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createEmptyLine(): LineItem {
  return {
    id: generateId(),
    account_id: null,
    debit: 0,
    credit: 0,
    description: "",
  };
}

export default function JournalEntriesCreate() {
  const { toast } = useToast();

  // Form state
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([createEmptyLine(), createEmptyLine()]);
  const [submitting, setSubmitting] = useState(false);

  // Accounts
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const data = await accountingApi.accounts.getLeaf();
        setAccounts(data);
      } catch (error) {
        console.error("Error fetching accounts:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las cuentas contables.",
          variant: "destructive",
        });
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, []);

  // Totals
  const totals = useMemo(() => {
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    const difference = Math.abs(totalDebit - totalCredit);
    return { totalDebit, totalCredit, difference };
  }, [lines]);

  const isBalanced = totals.difference < 0.01;

  // Line handlers
  const updateLine = (id: string, field: keyof LineItem, value: unknown) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;

        if (field === "debit" && typeof value === "number" && value > 0) {
          return { ...line, debit: value, credit: 0 };
        }
        if (field === "credit" && typeof value === "number" && value > 0) {
          return { ...line, credit: value, debit: 0 };
        }

        return { ...line, [field]: value };
      })
    );
  };

  const addLine = () => {
    setLines((prev) => [...prev, createEmptyLine()]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((line) => line.id !== id));
  };

  // Validation
  const validate = (): string | null => {
    if (!date) return "La fecha es obligatoria.";
    if (!description.trim()) return "La descripcion es obligatoria.";
    if (lines.length < 2) return "Se requieren al menos 2 lineas.";

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].account_id) {
        return `La linea ${i + 1} debe tener una cuenta seleccionada.`;
      }
      if (lines[i].debit === 0 && lines[i].credit === 0) {
        return `La linea ${i + 1} debe tener un valor de debito o credito.`;
      }
    }

    if (!isBalanced) {
      return "El registro debe estar balanceado (debitos = creditos).";
    }

    return null;
  };

  const handleSubmit = async (autoPost: boolean) => {
    const error = validate();
    if (error) {
      toast({ title: "Error de validacion", description: error, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        date,
        description: description.trim(),
        notes: notes.trim() || undefined,
        auto_post: autoPost,
        lines: lines.map((line) => ({
          account_id: line.account_id!,
          debit: line.debit,
          credit: line.credit,
          description: line.description.trim() || undefined,
        })),
      };

      const entry = await accountingApi.journalEntries.create(payload);

      toast({
        title: autoPost ? "Registro publicado" : "Borrador guardado",
        description: `Registro ${entry.entry_number} creado exitosamente.`,
      });

      router.visit(`/admin/accounting/journal-entries/${entry.id}`);
    } catch (error: any) {
      console.error("Error creating journal entry:", error);
      toast({
        title: "Error al crear registro",
        description: error.message || "Ocurrio un error inesperado.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Nuevo Registro Contable">
      <Head title="Nuevo Registro Contable" />

      <div className="min-h-screen bg-background -mx-4 sm:-mx-6 lg:-mx-8 -mt-6">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.visit("/admin/accounting/journal-entries")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                <BookOpen className="h-5 w-5 text-[#2463eb]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Nuevo Registro Contable</h1>
                <p className="text-sm text-muted-foreground">
                  Crea un registro manual en el libro diario
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* General Info Card */}
          <Card className="shadow-sm border border-border">
            <CardHeader>
              <CardTitle className="text-base">Informacion General</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !date && "text-muted-foreground")}>
                        <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                        {date ? new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DatePickerReport
                        selected={date ? new Date(date + 'T12:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            setDate(`${y}-${m}-${d}`);
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripcion</Label>
                  <Input
                    id="description"
                    placeholder="Ej: Registro de pago a proveedor"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notas adicionales del registro..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lines Card */}
          <Card className="shadow-sm border border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Lineas del Registro</CardTitle>
              <Button variant="outline" size="sm" className="gap-2" onClick={addLine}>
                <Plus className="h-4 w-4" />
                Agregar Linea
              </Button>
            </CardHeader>
            <CardContent>
              {loadingAccounts ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Spinner size="md" />
                  <span className="text-muted-foreground">Cargando cuentas...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[250px]">Cuenta</TableHead>
                        <TableHead className="w-[150px] text-right">Debito</TableHead>
                        <TableHead className="w-[150px] text-right">Credito</TableHead>
                        <TableHead className="min-w-[200px]">Descripcion</TableHead>
                        <TableHead className="w-[50px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, index) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <Combobox
                              value={line.account_id?.toString() ?? ""}
                              onValueChange={(val) =>
                                updateLine(line.id, "account_id", val ? parseInt(val, 10) : null)
                              }
                              placeholder="Seleccionar cuenta..."
                              searchPlaceholder="Buscar cuenta..."
                              emptyText="No se encontraron cuentas"
                              options={accounts.map((a) => ({
                                value: String(a.id),
                                label: `${a.code} - ${a.name}`,
                              }))}
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              className="text-right"
                              value={line.debit || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                updateLine(line.id, "debit", val);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              className="text-right"
                              value={line.credit || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                updateLine(line.id, "credit", val);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Descripcion de la linea..."
                              value={line.description}
                              onChange={(e) =>
                                updateLine(line.id, "description", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeLine(line.id)}
                              disabled={lines.length <= 2}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell className="font-semibold">Totales</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(totals.totalDebit)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(totals.totalCredit)}
                        </TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}

              {/* Totals Bar */}
              <div
                className={cn(
                  "mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-lg border",
                  isBalanced
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-red-500/10 border-red-500/20"
                )}
              >
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span>
                    <span className="font-medium">Total Debito:</span>{" "}
                    <span className="font-semibold">{formatCurrency(totals.totalDebit)}</span>
                  </span>
                  <span>
                    <span className="font-medium">Total Credito:</span>{" "}
                    <span className="font-semibold">{formatCurrency(totals.totalCredit)}</span>
                  </span>
                  <span>
                    <span className="font-medium">Diferencia:</span>{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        isBalanced ? "text-emerald-700" : "text-red-700"
                      )}
                    >
                      {formatCurrency(totals.difference)}
                    </span>
                  </span>
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    isBalanced ? "text-emerald-700" : "text-red-700"
                  )}
                >
                  {isBalanced ? "Balanceado" : "No balanceado"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.visit("/admin/accounting/journal-entries")}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar Borrador
            </Button>
            <Button
              className="gap-2 bg-[#2463eb] hover:bg-[#2463eb]/90"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Guardar y Publicar
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
