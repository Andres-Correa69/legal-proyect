import { useState, useEffect } from "react";
import { Head, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { accountingApi } from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { usePermissions } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import type { JournalEntry } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  XCircle,
  FileText,
  FileSpreadsheet,
  Calendar,
  User,
  Hash,
  Loader2,
  AlertTriangle,
  Download,
} from "lucide-react";

const STATUS_CONFIG: Record<JournalEntry["status"], { label: string; className: string }> = {
  draft: {
    label: "Borrador",
    className: "bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-amber-500/15",
  },
  posted: {
    label: "Publicado",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/15",
  },
  voided: {
    label: "Anulado",
    className: "bg-red-500/15 text-red-700 border-red-500/20 hover:bg-red-500/15",
  },
};

const SOURCE_CONFIG: Record<JournalEntry["source"], { label: string; className: string }> = {
  manual: {
    label: "Manual",
    className: "bg-blue-500/15 text-blue-700 border-blue-500/20 hover:bg-blue-500/15",
  },
  automatic: {
    label: "Automatico",
    className: "bg-purple-500/15 text-purple-700 border-purple-500/20 hover:bg-purple-500/15",
  },
};

interface Props {
  entryId: number;
}

export default function JournalEntryShow({ entryId }: Props) {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  useEffect(() => {
    const fetchEntry = async () => {
      setLoading(true);
      try {
        const data = await accountingApi.journalEntries.getById(entryId);
        setEntry(data);
      } catch (error) {
        console.error("Error fetching journal entry:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar el registro contable.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchEntry();
  }, [entryId]);

  const handlePost = async () => {
    if (!entry) return;
    setPosting(true);
    try {
      const updated = await accountingApi.journalEntries.post(entry.id);
      setEntry(updated);
      toast({
        title: "Registro publicado",
        description: `El registro ${updated.entry_number} fue publicado exitosamente.`,
      });
    } catch (error: any) {
      console.error("Error posting journal entry:", error);
      toast({
        title: "Error al publicar",
        description: error.message || "No se pudo publicar el registro.",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  const handleVoid = async () => {
    if (!entry || !voidReason.trim()) return;
    setVoiding(true);
    try {
      const updated = await accountingApi.journalEntries.void(entry.id, voidReason.trim());
      setEntry(updated);
      setShowVoidDialog(false);
      setVoidReason("");
      toast({
        title: "Registro anulado",
        description: `El registro ${updated.entry_number} fue anulado.`,
      });
    } catch (error: any) {
      console.error("Error voiding journal entry:", error);
      toast({
        title: "Error al anular",
        description: error.message || "No se pudo anular el registro.",
        variant: "destructive",
      });
    } finally {
      setVoiding(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!entry) return;
    setExporting(true);
    try {
      const blob = await accountingApi.journalEntries.exportSingle(entry.id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante_${entry.entry_number}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast({
        title: "Error al exportar",
        description: error.message || "No se pudo generar el archivo.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Registro Contable">
        <Head title="Registro Contable" />
        <div className="flex items-center justify-center py-24 gap-2">
          <Spinner size="md" />
          <span className="text-muted-foreground">Cargando registro...</span>
        </div>
      </AppLayout>
    );
  }

  if (!entry) {
    return (
      <AppLayout title="Registro Contable">
        <Head title="Registro Contable" />
        <div className="text-center py-24 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No se encontro el registro contable.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.visit("/admin/accounting/journal-entries")}
          >
            Volver al listado
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Registro ${entry.entry_number}`}>
      <Head title={`Registro ${entry.entry_number}`} />

      <div className="min-h-screen bg-background -mx-4 sm:-mx-6 lg:-mx-8 -mt-6">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-semibold text-foreground">
                      {entry.entry_number}
                    </h1>
                    <Badge className={`${STATUS_CONFIG[entry.status].className} border`}>
                      {STATUS_CONFIG[entry.status].label}
                    </Badge>
                    <Badge className={`${SOURCE_CONFIG[entry.source].className} border`}>
                      {SOURCE_CONFIG[entry.source].label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" disabled={exporting}>
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card z-50">
                    <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2 cursor-pointer">
                      <FileText className="h-4 w-4" />
                      Exportar PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2 cursor-pointer">
                      <FileSpreadsheet className="h-4 w-4" />
                      Exportar Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {entry.status === "draft" && hasPermission("accounting.entries.post") && (
                  <Button
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={handlePost}
                    disabled={posting}
                  >
                    {posting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Publicar
                  </Button>
                )}
                {entry.status === "posted" && hasPermission("accounting.entries.void") && (
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => setShowVoidDialog(true)}
                  >
                    <XCircle className="h-4 w-4" />
                    Anular
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Entry Details Card */}
          <Card className="shadow-sm border border-border">
            <CardHeader>
              <CardTitle className="text-base">Detalles del Registro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Numero</p>
                    <p className="font-medium">{entry.entry_number}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha</p>
                    <p className="font-medium">{formatDate(entry.date)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Creado por</p>
                    <p className="font-medium">{entry.created_by?.name || "N/A"}</p>
                  </div>
                </div>

                {entry.source === "automatic" && entry.auto_source && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fuente automatica</p>
                      <p className="font-medium">{entry.auto_source}</p>
                    </div>
                  </div>
                )}

                {entry.source === "automatic" && entry.reference_type && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Referencia</p>
                      <p className="font-medium">
                        {entry.reference_type}
                        {entry.reference_id ? ` #${entry.reference_id}` : ""}
                      </p>
                    </div>
                  </div>
                )}

                {entry.posted_at && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Publicado</p>
                      <p className="font-medium">{formatDate(entry.posted_at)}</p>
                    </div>
                  </div>
                )}

                {entry.voided_at && (
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Anulado</p>
                      <p className="font-medium">{formatDate(entry.voided_at)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Void reason */}
              {entry.status === "voided" && entry.void_reason && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-700">Razon de anulacion</p>
                      <p className="text-sm text-red-600">{entry.void_reason}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {entry.notes && (
                <div className="mt-4 p-3 bg-muted/50 border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm">{entry.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lines Table */}
          <Card className="shadow-sm border border-border">
            <CardHeader>
              <CardTitle className="text-base">Lineas del Registro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuenta</TableHead>
                      <TableHead className="text-right">Debito</TableHead>
                      <TableHead className="text-right">Credito</TableHead>
                      <TableHead>Descripcion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.lines?.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium text-muted-foreground">
                              {line.accounting_account?.code}
                            </span>{" "}
                            <span className="font-medium">
                              {line.accounting_account?.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {line.debit > 0 ? formatCurrency(line.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {line.credit > 0 ? formatCurrency(line.credit) : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {line.description || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-semibold">Totales</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(entry.total_debit)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(entry.total_credit)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Void Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Anular Registro
            </DialogTitle>
            <DialogDescription>
              Esta accion es irreversible. El registro{" "}
              <strong>{entry.entry_number}</strong> sera marcado como anulado y sus
              efectos contables seran revertidos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="void_reason">Razon de anulacion</Label>
            <Input
              id="void_reason"
              placeholder="Ingrese la razon de anulacion..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVoidDialog(false);
                setVoidReason("");
              }}
              disabled={voiding}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleVoid}
              disabled={voiding || !voidReason.trim()}
            >
              {voiding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Anular Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
