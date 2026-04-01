import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, formatCurrency } from "@/lib/utils";
import {
  internalNotesApi,
  type Sale,
  type InternalNote,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { CreditNoteDialog } from "./CreditNoteDialog";
import { DebitNoteDialog } from "./DebitNoteDialog";
import {
  Minus,
  Plus,
  ChevronDown,
  ChevronUp,
  XCircle,
  FileText,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface InternalNotesSectionProps {
  sale: Sale;
  onNoteCreated: () => void;
  showCreditDialog: boolean;
  onCreditDialogChange: (open: boolean) => void;
  showDebitDialog: boolean;
  onDebitDialogChange: (open: boolean) => void;
}

export function InternalNotesSection({
  sale,
  onNoteCreated,
  showCreditDialog,
  onCreditDialogChange,
  showDebitDialog,
  onDebitDialogChange,
}: InternalNotesSectionProps) {
  const [cancellingNoteId, setCancellingNoteId] = useState<number | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);

  // Only show for account/credit sale types
  if (sale.type !== "account" && sale.type !== "credit") {
    return null;
  }

  const notes = sale.internal_notes || [];
  const isCancelled = sale.status === "cancelled";

  const { totalCredit, totalDebit } = useMemo(() => {
    let totalCredit = 0;
    let totalDebit = 0;
    for (const note of notes) {
      if (note.status === "cancelled") continue;
      if (note.type === "credit") {
        totalCredit += Number(note.total_amount);
      } else {
        totalDebit += Number(note.total_amount);
      }
    }
    return { totalCredit, totalDebit };
  }, [notes]);

  const effectiveTotal =
    Number(sale.total_amount) - totalCredit + totalDebit;

  const handleCancelNote = async (noteId: number) => {
    setCancellingNoteId(noteId);
    try {
      await internalNotesApi.cancel(noteId);
      toast({
        title: "Nota anulada",
        description: "La nota interna se anuló exitosamente.",
      });
      setConfirmCancelId(null);
      onNoteCreated();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Error al anular la nota.",
      });
    } finally {
      setCancellingNoteId(null);
    }
  };

  const toggleExpand = (noteId: number) => {
    setExpandedNoteId((prev) => (prev === noteId ? null : noteId));
  };

  return (
    <>
      <section data-section="notas-internas">
        <div
          className={cn(
            "flex items-center justify-between mb-3 px-3 py-2 rounded-lg",
            "bg-violet-50"
          )}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-600" />
            <h2 className="font-semibold text-sm text-foreground">
              Notas Internas
            </h2>
            {notes.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {notes.length}
              </Badge>
            )}
          </div>
          {notes.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-green-700 font-medium">NC: −{formatCurrency(totalCredit)}</span>
              <span className="text-blue-700 font-medium">ND: +{formatCurrency(totalDebit)}</span>
            </div>
          )}
        </div>

        {notes.length > 0 ? (
          <div className="space-y-2">
            {notes.map((note: InternalNote) => {
              const isExpanded = expandedNoteId === note.id;
              const isCancelledNote = note.status === "cancelled";
              const isCredit = note.type === "credit";

              return (
                <div
                  key={note.id}
                  className={cn(
                    "border rounded-lg overflow-hidden",
                    isCancelledNote && "opacity-60"
                  )}
                >
                  {/* Note Header */}
                  <div
                    className={cn(
                      "px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30",
                      isCredit ? "bg-green-500/10/50" : "bg-blue-500/10/50"
                    )}
                    onClick={() => toggleExpand(note.id)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge
                        className={cn(
                          "text-xs shrink-0",
                          isCredit
                            ? "bg-green-500/15 text-green-700 border-green-500/20"
                            : "bg-blue-500/15 text-blue-700 border-blue-500/20"
                        )}
                      >
                        {isCredit ? "NC" : "ND"}
                      </Badge>
                      <span
                        className={cn(
                          "font-medium text-sm",
                          isCancelledNote && "line-through"
                        )}
                      >
                        {note.note_number}
                      </span>
                      {isCancelledNote && (
                        <Badge className="bg-red-500/15 text-red-700 border-red-500/20 text-xs">
                          Anulada
                        </Badge>
                      )}
                      {!isCancelledNote && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                        >
                          Activa
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={cn(
                          "font-semibold text-sm",
                          isCancelledNote
                            ? "text-muted-foreground"
                            : isCredit
                            ? "text-green-700"
                            : "text-blue-700"
                        )}
                      >
                        {isCredit ? "−" : "+"}
                        {formatCurrency(Number(note.total_amount))}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-3">
                      {/* Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Razón</p>
                          <p className="font-medium">{note.reason}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Fecha</p>
                          <p>
                            {format(
                              new Date(note.issue_date),
                              "dd/MM/yyyy",
                              { locale: es }
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Creado por
                          </p>
                          <p>{note.created_by?.name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-semibold">
                            {formatCurrency(Number(note.total_amount))}
                          </p>
                        </div>
                      </div>

                      {/* Items */}
                      {note.items && note.items.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs font-semibold h-9 px-3">
                                  Descripción
                                </TableHead>
                                <TableHead className="text-xs font-semibold h-9 px-3 text-center">
                                  Cant.
                                </TableHead>
                                <TableHead className="text-xs font-semibold h-9 px-3 text-right">
                                  Precio
                                </TableHead>
                                <TableHead className="text-xs font-semibold h-9 px-3 text-right">
                                  Total
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {note.items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-sm py-2 px-3">
                                    {item.description}
                                  </TableCell>
                                  <TableCell className="text-sm py-2 px-3 text-center">
                                    {Number(item.quantity)}
                                  </TableCell>
                                  <TableCell className="text-sm py-2 px-3 text-right">
                                    {formatCurrency(Number(item.unit_price))}
                                  </TableCell>
                                  <TableCell className="text-sm py-2 px-3 text-right font-medium">
                                    {formatCurrency(Number(item.total))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Cancel Button */}
                      {!isCancelledNote && (
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 text-red-600 border-red-500/30 hover:bg-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmCancelId(note.id);
                            }}
                            disabled={cancellingNoteId === note.id}
                          >
                            {cancellingNoteId === note.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Anular
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Summary */}
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Notas Crédito
                  </p>
                  <p className="font-semibold text-green-700">
                    −{formatCurrency(totalCredit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Notas Débito
                  </p>
                  <p className="font-semibold text-blue-700">
                    +{formatCurrency(totalDebit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Total Efectivo
                  </p>
                  <p className="font-bold text-foreground">
                    {formatCurrency(effectiveTotal)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm">No hay notas internas registradas</p>
            <p className="text-xs mt-1">
              Crea una nota crédito o débito interna para ajustar esta venta.
            </p>
          </div>
        )}
      </section>

      {/* Credit Note Dialog */}
      <CreditNoteDialog
        open={showCreditDialog}
        onOpenChange={onCreditDialogChange}
        sale={sale}
        onCreated={onNoteCreated}
      />

      {/* Debit Note Dialog */}
      <DebitNoteDialog
        open={showDebitDialog}
        onOpenChange={onDebitDialogChange}
        sale={sale}
        onCreated={onNoteCreated}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={confirmCancelId !== null}
        onOpenChange={(open) => !open && setConfirmCancelId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular nota interna</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción anulará la nota interna y revertirá sus efectos
              sobre el saldo de la venta. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancellingNoteId !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => confirmCancelId && handleCancelNote(confirmCancelId)}
              disabled={cancellingNoteId !== null}
            >
              {cancellingNoteId !== null && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Sí, anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
