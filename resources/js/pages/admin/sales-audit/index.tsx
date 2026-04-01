import { Head, usePage } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { salesAuditApi } from "@/lib/api";
import type { SalesAuditData, SalesAuditCompany, SalesAuditSale, SalesAuditEvent } from "@/lib/api";
import type { SharedData } from "@/types";
import { isSuperAdmin } from "@/lib/permissions";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import { cn, formatCurrency } from "@/lib/utils";
import {
  CalendarIcon,
  Receipt,
  Building2,
  AlertCircle,
  Search,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  FileText,
  CreditCard,
  FileX,
  FilePlus,
  XCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Ban,
  User,
  Globe,
} from "lucide-react";

const TYPE_OPTIONS = [
  { value: 'pos', label: 'Factura POS' },
  { value: 'electronic', label: 'Factura Electronica' },
  { value: 'account', label: 'Cuenta de Cobro' },
  { value: 'credit', label: 'Credito' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
];

const getTypeBadge = (type: string, label: string) => {
  const colors: Record<string, string> = {
    pos: 'bg-blue-500/15 text-blue-700',
    electronic: 'bg-green-500/15 text-green-700',
    account: 'bg-amber-500/15 text-amber-700',
    credit: 'bg-purple-500/15 text-purple-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-muted text-foreground'}`}>
      {label}
    </span>
  );
};

const getStatusBadge = (status: string, label: string) => {
  const variant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: 'outline',
    pending: 'secondary',
    completed: 'default',
    cancelled: 'destructive',
  };
  return <Badge variant={variant[status] || 'outline'}>{label}</Badge>;
};

const getPaymentStatusBadge = (status: string, label: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-red-500/15 text-red-700',
    partial: 'bg-amber-500/15 text-amber-700',
    paid: 'bg-green-500/15 text-green-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-muted text-foreground'}`}>
      {label}
    </span>
  );
};

const getEventBadge = (event: string) => {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    created: { label: 'Creado', variant: 'default' },
    updated: { label: 'Actualizado', variant: 'secondary' },
    deleted: { label: 'Eliminado', variant: 'destructive' },
    cancelled: { label: 'Anulado', variant: 'destructive' },
    price_changed: { label: 'Precio cambiado', variant: 'outline' },
  };
  const c = config[event] || { label: event, variant: 'outline' as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatShortDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

function SaleTimeline({ events }: { events: SalesAuditEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">No hay eventos registrados para esta venta.</p>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="flex gap-3 items-start">
          <div className="mt-1 flex-shrink-0">
            <div className={`w-2 h-2 rounded-full ${
              event.event === 'created' ? 'bg-green-500/100' :
              event.event === 'deleted' ? 'bg-red-500/100' :
              'bg-blue-500/100'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {getEventBadge(event.event)}
              <span className="text-sm">{event.description}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {event.user}
              </span>
              {event.ip_address && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {event.ip_address}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(event.created_at)}
              </span>
            </div>
            {event.properties && Object.keys(event.properties).length > 0 && (
              <details className="mt-1">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Ver detalles
                </summary>
                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto max-h-40">
                  {JSON.stringify(event.properties, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SaleRow({ sale }: { sale: SalesAuditSale }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg hover:bg-muted/30 transition-colors">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Invoice number */}
        <div className="w-36 flex-shrink-0">
          <span className="text-sm font-mono font-medium">{sale.invoice_number}</span>
        </div>

        {/* Type */}
        <div className="w-36 flex-shrink-0">
          {getTypeBadge(sale.type, sale.type_label)}
        </div>

        {/* Client */}
        <div className="flex-1 min-w-0">
          <span className="text-sm truncate block">{sale.client_name}</span>
        </div>

        {/* Total */}
        <div className="w-32 flex-shrink-0 text-right">
          <span className="text-sm font-medium">{formatCurrency(sale.total_amount)}</span>
        </div>

        {/* Status */}
        <div className="w-28 flex-shrink-0">
          {getStatusBadge(sale.status, sale.status_label)}
        </div>

        {/* Payment Status */}
        <div className="w-24 flex-shrink-0">
          {getPaymentStatusBadge(sale.payment_status, sale.payment_status_label)}
        </div>

        {/* Notes indicators */}
        <div className="w-24 flex-shrink-0 flex gap-1">
          {sale.has_credit_note && (
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              sale.credit_note_type === 'void' ? 'bg-red-500/15 text-red-700' : 'bg-orange-500/15 text-orange-700'
            }`}>
              NC
            </span>
          )}
          {sale.has_debit_note && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-500/15 text-yellow-700">
              ND
            </span>
          )}
          {sale.is_cancelled && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-700">
              <Ban className="h-3 w-3" />
            </span>
          )}
        </div>

        {/* Date */}
        <div className="w-28 flex-shrink-0 text-right">
          <span className="text-xs text-muted-foreground">{formatShortDate(sale.created_at)}</span>
        </div>

        {/* Creator */}
        <div className="w-28 flex-shrink-0 text-right">
          <span className="text-xs text-muted-foreground truncate block">{sale.created_by}</span>
        </div>
      </div>

      {/* Expanded timeline */}
      {expanded && (
        <div className="border-t px-4 py-3 bg-muted/20">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Historial de eventos
          </h4>
          <SaleTimeline events={sale.events} />
        </div>
      )}
    </div>
  );
}

function CompanySection({ company }: { company: SalesAuditCompany }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-base">
            {expanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
            <Building2 className="h-5 w-5 text-indigo-600" />
            <span>{company.name}</span>
            {company.nit && (
              <span className="text-sm text-muted-foreground font-normal">NIT: {company.nit}</span>
            )}
          </CardTitle>
          <Badge variant="outline">{company.sales_count} ventas</Badge>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {/* Table header */}
          <div className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground border-b mb-2">
            <div className="w-4 flex-shrink-0" />
            <div className="w-36 flex-shrink-0">Nro. Factura</div>
            <div className="w-36 flex-shrink-0">Tipo</div>
            <div className="flex-1">Cliente</div>
            <div className="w-32 flex-shrink-0 text-right">Total</div>
            <div className="w-28 flex-shrink-0">Estado</div>
            <div className="w-24 flex-shrink-0">Pago</div>
            <div className="w-24 flex-shrink-0">Notas</div>
            <div className="w-28 flex-shrink-0 text-right">Fecha</div>
            <div className="w-28 flex-shrink-0 text-right">Creado por</div>
          </div>
          <div className="space-y-2">
            {company.sales.map((sale) => (
              <SaleRow key={sale.id} sale={sale} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function SalesAuditIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const userIsSuperAdmin = isSuperAdmin(user);

  const [data, setData] = useState<SalesAuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generalError, setGeneralError] = useState<string>('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const companyFilter = useSuperAdminCompanyFilter();

  useEffect(() => {
    if (!userIsSuperAdmin) {
      window.location.href = '/admin/dashboard';
      return;
    }
    if (companyFilter.shouldLoadData) {
      loadData();
    }
  }, [userIsSuperAdmin, companyFilter.isFiltered, companyFilter.selectedCompanyId]);

  if (!userIsSuperAdmin) {
    return null;
  }

  const loadData = async () => {
    try {
      setLoading(true);
      setGeneralError('');
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (companyFilter.companyIdParam) params.company_id = String(companyFilter.companyIdParam);
      if (typeFilter && typeFilter !== 'all') params.type = typeFilter;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const result = await salesAuditApi.getAll(params);
      setData(result);
    } catch (error: any) {
      console.error('Error loading sales audit:', error);
      setGeneralError(error.message || 'Error al cargar la auditoria de facturacion');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadData();
  };

  const handleReset = () => {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setTimeout(() => loadData(), 0);
  };

  const summary = data?.summary;

  return (
    <AppLayout title="Auditoria de Facturacion">
      <Head title="Auditoria de Facturacion" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Auditoria de Facturacion</h2>
            <p className="text-muted-foreground">
              Seguimiento de facturas, notas credito/debito y anulaciones de todas las empresas
            </p>
          </div>
          {summary && (
            <Badge variant="outline" className="text-sm">
              {summary.total_sales} ventas totales
            </Badge>
          )}
        </div>

        {companyFilter.isSuperAdmin && (
          <SuperAdminCompanyFilter
            companies={companyFilter.companies}
            loadingCompanies={companyFilter.loadingCompanies}
            selectedCompanyId={companyFilter.selectedCompanyId}
            setSelectedCompanyId={companyFilter.setSelectedCompanyId}
            isFiltered={companyFilter.isFiltered}
            handleFilter={companyFilter.handleFilter}
            handleClear={companyFilter.handleClear}
          />
        )}

        {companyFilter.isSuperAdmin && !companyFilter.isFiltered && <SuperAdminEmptyState />}

        {companyFilter.shouldLoadData && (
        <>
        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
                <p className="text-xl font-bold">{summary.total_sales}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">POS</span>
                </div>
                <p className="text-xl font-bold">{summary.by_type.pos || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Electronica</span>
                </div>
                <p className="text-xl font-bold">{summary.by_type.electronic || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                  <span className="text-xs text-muted-foreground">Cuenta Cobro</span>
                </div>
                <p className="text-xl font-bold">{summary.by_type.account || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileX className="h-4 w-4 text-orange-600" />
                  <span className="text-xs text-muted-foreground">Notas Credito</span>
                </div>
                <p className="text-xl font-bold">{summary.total_credit_notes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <FilePlus className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs text-muted-foreground">Notas Debito</span>
                </div>
                <p className="text-xl font-bold">{summary.total_debit_notes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Ban className="h-4 w-4 text-red-600" />
                  <span className="text-xs text-muted-foreground">Anuladas</span>
                </div>
                <p className="text-xl font-bold">{summary.total_cancelled}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-0 sm:min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Numero de factura..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-full sm:w-[180px]">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Tipo</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-[160px]">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Estado</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todos</SelectItem>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[150px]">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Desde</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !dateFrom && "text-muted-foreground")}>
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
              </div>
              <div className="w-[150px]">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Hasta</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !dateTo && "text-muted-foreground")}>
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
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSearch} size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filtrar
                </Button>
                <Button onClick={handleReset} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {generalError && (
          <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {generalError}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-2" />
                <p>Cargando auditoria de facturacion...</p>
              </div>
            </CardContent>
          </Card>
        ) : !data || data.companies.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No hay ventas registradas
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Las ventas aparecern cuando las empresas comiencen a facturar
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.companies.map((company) => (
              <CompanySection key={company.id} company={company} />
            ))}
          </div>
        )}
        </>
        )}
      </div>
    </AppLayout>
  );
}
