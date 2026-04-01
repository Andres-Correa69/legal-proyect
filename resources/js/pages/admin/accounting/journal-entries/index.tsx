import { useState, useEffect, useCallback, useMemo } from "react";
import { Head, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { accountingApi } from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { usePermissions } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import type { JournalEntry } from "@/types";
import {
  Search,
  Plus,
  BookOpen,
  FileText,
  Download,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  XCircle,
  CalendarIcon,
} from "lucide-react";

const STATUS_LABELS: Record<JournalEntry["status"], { label: string; className: string }> = {
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

const SOURCE_LABELS: Record<JournalEntry["source"], { label: string; className: string }> = {
  manual: {
    label: "Manual",
    className: "bg-blue-500/15 text-blue-700 border-blue-500/20 hover:bg-blue-500/15",
  },
  automatic: {
    label: "Automatico",
    className: "bg-purple-500/15 text-purple-700 border-purple-500/20 hover:bg-purple-500/15",
  },
};

export default function JournalEntriesIndex() {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const stats = useMemo(() => {
    const total = entries.length;
    const posted = entries.filter((e) => e.status === "posted").length;
    const draft = entries.filter((e) => e.status === "draft").length;
    const voided = entries.filter((e) => e.status === "voided").length;
    const totalDebit = entries.reduce((sum, e) => sum + Number(e.total_debit || 0), 0);
    return { total, posted, draft, voided, totalDebit };
  }, [entries]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      if (sourceFilter !== "all") params.source = sourceFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await accountingApi.journalEntries.getAll(params);
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sourceFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchEntries();
  }, [statusFilter, sourceFilter, dateFrom, dateTo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEntries();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRowClick = (id: number) => {
    router.visit(`/admin/accounting/journal-entries/${id}`);
  };

  const handleExport = useCallback(
    async (format: "pdf" | "excel") => {
      setExporting(true);
      try {
        const params: { format: 'pdf' | 'excel'; status?: string; source?: string; date_from?: string; date_to?: string; search?: string } = { format };
        if (statusFilter !== "all") params.status = statusFilter;
        if (sourceFilter !== "all") params.source = sourceFilter;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        if (search) params.search = search;

        const blob = await accountingApi.journalEntries.exportEntries(params);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = format === "pdf"
          ? "Registros_Contables.pdf"
          : "Registros_Contables.xlsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({
          title: "Exportación exitosa",
          description: `Los registros se exportaron en formato ${format === "pdf" ? "PDF" : "Excel"}.`,
        });
      } catch (error) {
        console.error("Error exporting:", error);
        toast({
          title: "Error",
          description: "No se pudo exportar los registros contables.",
          variant: "destructive",
        });
      } finally {
        setExporting(false);
      }
    },
    [statusFilter, sourceFilter, dateFrom, dateTo, search, toast]
  );

  return (
    <AppLayout title="Registros Contables">
      <Head title="Registros Contables" />

      <div className="space-y-6">
        {/* Header + Stats */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                <BookOpen className="h-5 w-5 text-[#2463eb]" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-foreground">Registros Contables</h1>
                <p className="text-sm text-muted-foreground">
                  Gestiona los registros del libro diario
                </p>
              </div>
              {!loading && entries.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" disabled={exporting}>
                      {exporting ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card">
                    <DropdownMenuItem onClick={() => handleExport("pdf")}>
                      <FileText className="h-4 w-4 mr-2 text-red-600" />
                      Exportar PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("excel")}>
                      <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                      Exportar Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {!loading && entries.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-4 w-4 text-[#2463eb]" />
                      <span className="text-xs text-muted-foreground">Total Registros</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs text-muted-foreground">Publicados</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.posted}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-xs text-muted-foreground">Borradores</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.draft}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-muted-foreground">Anulados</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.voided}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Table Card */}
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <Spinner size="md" />
            <span className="text-muted-foreground">Cargando registros...</span>
          </div>
        ) : (
          <Card className="shadow-xl border border-border">
            <CardContent className="p-4 sm:p-6">
              {/* Filters + Button */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por numero o descripcion..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="posted">Publicado</SelectItem>
                    <SelectItem value="voided">Anulado</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Fuente" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todas las fuentes</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="automatic">Automatico</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-10 w-full sm:w-[160px] justify-start text-left font-normal text-sm", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                      {dateFrom ? new Date(dateFrom + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DatePickerReport
                      selected={dateFrom ? new Date(dateFrom + 'T12:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, '0');
                          const d = String(date.getDate()).padStart(2, '0');
                          setDateFrom(`${y}-${m}-${d}`);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-10 w-full sm:w-[160px] justify-start text-left font-normal text-sm", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                      {dateTo ? new Date(dateTo + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DatePickerReport
                      selected={dateTo ? new Date(dateTo + 'T12:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, '0');
                          const d = String(date.getDate()).padStart(2, '0');
                          setDateTo(`${y}-${m}-${d}`);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>

                {hasPermission("accounting.entries.create") && (
                  <Button
                    onClick={() => router.visit("/admin/accounting/journal-entries/create")}
                    size="sm"
                    className="gap-2 w-full sm:w-auto sm:ml-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Nuevo Registro
                  </Button>
                )}
              </div>

              {/* Count */}
              <div className="text-sm text-muted-foreground mb-3">
                Mostrando <span className="font-semibold">{entries.length}</span> registros
              </div>

              {/* Table */}
              {entries.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No se encontraron registros contables</p>
                </div>
              )}
              {entries.length > 0 && (
                <div className="overflow-x-auto -mx-4 sm:-mx-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numero</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="min-w-[200px]">Descripcion</TableHead>
                        <TableHead className="text-right">Total Debito</TableHead>
                        <TableHead>Fuente</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow
                          key={entry.id}
                          className="cursor-pointer hover:bg-accent/5"
                          onClick={() => handleRowClick(entry.id)}
                        >
                          <TableCell className="font-medium">{entry.entry_number}</TableCell>
                          <TableCell>{formatDate(entry.date)}</TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {entry.description}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(entry.total_debit)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${SOURCE_LABELS[entry.source].className} border`}>
                              {SOURCE_LABELS[entry.source].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${STATUS_LABELS[entry.status].className} border`}>
                              {STATUS_LABELS[entry.status].label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
