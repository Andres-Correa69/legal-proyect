import { Head, usePage } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { externalApiLogsApi } from "@/lib/api";
import type { ExternalApiLog } from "@/lib/api";
import type { SharedData } from "@/types";
import { isSuperAdmin } from "@/lib/permissions";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import {
  Globe,
  BookOpen,
  Building2,
  Settings,
  FileText,
  FileX,
  FilePlus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RotateCcw,
} from "lucide-react";

const ACTION_OPTIONS = [
  { value: 'catalogs', label: 'Consultar Catálogos' },
  { value: 'register_company', label: 'Registrar Empresa' },
  { value: 'update_company', label: 'Actualizar Empresa' },
  { value: 'set_environment', label: 'Configurar Ambiente' },
  { value: 'send_invoice', label: 'Enviar Factura' },
  { value: 'send_invoice_raw', label: 'Enviar Factura (Raw)' },
  { value: 'send_credit_note', label: 'Enviar Nota Crédito' },
  { value: 'send_debit_note', label: 'Enviar Nota Débito' },
];

export default function ExternalApiLogsIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const userIsSuperAdmin = isSuperAdmin(user);

  const [logs, setLogs] = useState<ExternalApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [generalError, setGeneralError] = useState<string>('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
      if (actionFilter) params.action = actionFilter;
      if (successFilter !== '') params.response_success = successFilter;
      if (companyFilter.companyIdParam) params.company_id = String(companyFilter.companyIdParam);
      const data = await externalApiLogsApi.getAll(params);
      setLogs(data);
    } catch (error: any) {
      console.error('Error loading external api logs:', error);
      setGeneralError(error.message || 'Error al cargar los registros');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadData();
  };

  const handleReset = () => {
    setSearch('');
    setActionFilter('');
    setSuccessFilter('');
    setTimeout(() => loadData(), 0);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'catalogs':
        return <BookOpen className="h-4 w-4" />;
      case 'register_company':
      case 'update_company':
        return <Building2 className="h-4 w-4" />;
      case 'set_environment':
        return <Settings className="h-4 w-4" />;
      case 'send_invoice':
      case 'send_invoice_raw':
        return <FileText className="h-4 w-4" />;
      case 'send_credit_note':
        return <FileX className="h-4 w-4" />;
      case 'send_debit_note':
        return <FilePlus className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-500/15 text-blue-700';
      case 'POST':
        return 'bg-green-500/15 text-green-700';
      case 'PUT':
        return 'bg-amber-500/15 text-amber-700';
      case 'DELETE':
        return 'bg-red-500/15 text-red-700';
      default:
        return 'bg-muted text-foreground';
    }
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

  const formatDuration = (ms?: number): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <AppLayout title="Auditoría API Externa">
      <Head title="Auditoría API Externa" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Auditoría API Externa</h2>
            <p className="text-muted-foreground">
              Registro de peticiones de proyectos externos a la API DIAN
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {logs.length} registros
          </Badge>
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
        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-0 sm:min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Proyecto, empresa, NIT, usuario..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-full sm:w-[200px]">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Accion</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todas las acciones" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todas las acciones</SelectItem>
                    {ACTION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-[160px]">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Estado</label>
                <Select value={successFilter} onValueChange={setSuccessFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="true">Exitosos</SelectItem>
                    <SelectItem value="false">Fallidos</SelectItem>
                  </SelectContent>
                </Select>
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
              <div className="flex items-center justify-center">
                <Spinner className="mr-2" />
                <p>Cargando...</p>
              </div>
            </CardContent>
          </Card>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No hay registros de peticiones externas
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Los registros aparecerán cuando un proyecto externo consuma la API
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Peticiones Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    {/* Row principal */}
                    <div className="flex items-start gap-4 p-4">
                      {/* Icono de acción */}
                      <div className={`p-2 rounded-full ${log.response_success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {getActionIcon(log.action)}
                      </div>

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {/* Método HTTP */}
                          <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold ${getMethodBadgeColor(log.method)}`}>
                            {log.method}
                          </span>
                          {/* Acción */}
                          <span className="text-sm font-medium">{log.action_label}</span>
                          {/* Estado */}
                          {log.response_success ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Exitoso
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Error {log.response_status}
                            </Badge>
                          )}
                        </div>

                        {/* Resumen */}
                        {log.response_summary && (
                          <p className="text-sm text-foreground mb-1 truncate">
                            {log.response_summary}
                          </p>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="font-medium text-foreground">
                            {log.api_client_name}
                          </span>
                          {log.company_name && (
                            <span>
                              {log.company_name}
                              {log.company_nit && ` (${log.company_nit})`}
                            </span>
                          )}
                          {log.user_name && (
                            <span>{log.user_name}</span>
                          )}
                          {log.user_email && !log.user_name && (
                            <span>{log.user_email}</span>
                          )}
                          {log.ip_address && (
                            <span>IP: {log.ip_address}</span>
                          )}
                          {log.duration_ms != null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(log.duration_ms)}
                            </span>
                          )}
                        </div>

                        {/* Fecha */}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(log.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Detalle expandido */}
                    {expandedId === log.id && (
                      <div className="border-t px-4 py-3 bg-muted/30">
                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-muted-foreground">Proyecto:</span>{' '}
                            <span className="font-medium">{log.api_client_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Endpoint:</span>{' '}
                            <span className="font-mono text-xs">{log.method} /{log.endpoint}</span>
                          </div>
                          {log.company_name && (
                            <div>
                              <span className="text-muted-foreground">Empresa:</span>{' '}
                              <span className="font-medium">{log.company_name}</span>
                              {log.company_nit && <span className="text-muted-foreground"> (NIT: {log.company_nit})</span>}
                            </div>
                          )}
                          {(log.user_name || log.user_email) && (
                            <div>
                              <span className="text-muted-foreground">Usuario:</span>{' '}
                              <span className="font-medium">{log.user_name || log.user_email}</span>
                              {log.user_name && log.user_email && <span className="text-muted-foreground"> ({log.user_email})</span>}
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Estado HTTP:</span>{' '}
                            <span className="font-medium">{log.response_status}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Duracion:</span>{' '}
                            <span className="font-medium">{formatDuration(log.duration_ms)}</span>
                          </div>
                          {log.ip_address && (
                            <div>
                              <span className="text-muted-foreground">IP:</span>{' '}
                              <span className="font-mono text-xs">{log.ip_address}</span>
                            </div>
                          )}
                          {log.user_agent && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">User Agent:</span>{' '}
                              <span className="font-mono text-xs truncate block">{log.user_agent}</span>
                            </div>
                          )}
                        </div>
                        {log.request_payload && Object.keys(log.request_payload).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Ver payload de la peticion
                            </summary>
                            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto max-h-64">
                              {JSON.stringify(log.request_payload, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        </>
        )}
      </div>
    </AppLayout>
  );
}
