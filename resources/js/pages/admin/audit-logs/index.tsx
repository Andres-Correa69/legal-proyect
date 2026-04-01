import { Head, usePage } from "@inertiajs/react";
import { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { auditLogsApi } from "@/lib/api";
import type { AuditLog } from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import { History, User, FileText, Settings, AlertCircle, Package, Building2, Truck, Warehouse, MapPin, ArrowLeftRight, ShoppingCart, ClipboardList, CreditCard, DollarSign, BookOpen, Calculator, Receipt, Send, Briefcase, Tag, Layers, LayoutGrid } from "lucide-react";

export default function AuditLogsIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const userIsSuperAdmin = isSuperAdmin(user);
  const canView = hasPermission('audit-logs.view', user) || userIsSuperAdmin;

  // ALL useState hooks must be declared before any conditional returns
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [generalError, setGeneralError] = useState<string>('');

  const companyFilter = useSuperAdminCompanyFilter();

  useEffect(() => {
    if (!canView) {
      window.location.href = '/admin/dashboard';
      return;
    }
    if (companyFilter.shouldLoadData) {
      loadData();
    }
  }, [canView, companyFilter.isFiltered, companyFilter.selectedCompanyId]);

  // Return null after hooks if no permission
  if (!canView) {
    return null;
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await auditLogsApi.getAll({ company_id: companyFilter.companyIdParam });
      setAuditLogs(data);
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
      setGeneralError(error.message || 'Error al cargar registros de auditoría');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeVariant = (action?: string): "default" | "secondary" | "destructive" | "outline" => {
    if (!action) return 'outline';
    switch (action.toLowerCase()) {
      case 'created':
      case 'create':
        return 'default';
      case 'updated':
      case 'update':
        return 'secondary';
      case 'deleted':
      case 'delete':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getActionLabel = (action?: string): string => {
    if (!action) return 'Acción';
    switch (action.toLowerCase()) {
      case 'created':
      case 'create':
        return 'Creado';
      case 'updated':
      case 'update':
        return 'Actualizado';
      case 'deleted':
      case 'delete':
        return 'Eliminado';
      case 'login':
        return 'Inicio de sesión';
      case 'logout':
        return 'Cierre de sesión';
      default:
        return action;
    }
  };

  const getModelLabel = (modelType?: string): string => {
    if (!modelType) return 'Sistema';
    const parts = modelType.split('\\');
    const model = parts[parts.length - 1];
    const labels: Record<string, string> = {
      // Configuración y Usuarios
      'User': 'Usuario',
      'Company': 'Empresa',
      'Branch': 'Sucursal',
      'Role': 'Rol',
      'PaymentMethod': 'Método de Pago',
      'Location': 'Ubicación',
      'AdjustmentReason': 'Motivo de Ajuste',
      // Inventario
      'Product': 'Producto',
      'Service': 'Servicio',
      'ProductCategory': 'Categoría de Producto',
      'ProductArea': 'Área de Producto',
      'ProductType': 'Tipo de Producto',
      'Supplier': 'Proveedor',
      'Warehouse': 'Bodega',
      'InventoryTransfer': 'Transferencia',
      'InventoryPurchase': 'Compra',
      'InventoryAdjustment': 'Ajuste de Inventario',
      'InventoryMovement': 'Movimiento de Inventario',
      // Ventas y Cartera
      'Sale': 'Venta',
      'Payment': 'Pago',
      // Cajas
      'CashRegister': 'Caja Registradora',
      'CashRegisterSession': 'Sesión de Caja',
      'CashRegisterTransfer': 'Transferencia de Caja',
      // Contabilidad
      'AccountingAccount': 'Cuenta Contable',
      'AccountingPeriod': 'Período Contable',
      'JournalEntry': 'Registro Contable',
      // Facturación Electrónica DIAN
      'ElectronicInvoice': 'Factura Electrónica',
      'ElectronicCreditNote': 'Nota Crédito Electrónica',
      'ElectronicDebitNote': 'Nota Débito Electrónica',
    };
    return labels[model] || model;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getIcon = (modelType?: string) => {
    if (!modelType) return <Settings className="h-4 w-4" />;
    const parts = modelType.split('\\');
    const model = parts[parts.length - 1];
    switch (model) {
      // Configuración y Usuarios
      case 'User':
        return <User className="h-4 w-4" />;
      case 'Company':
      case 'Branch':
        return <Building2 className="h-4 w-4" />;
      case 'Role':
        return <Briefcase className="h-4 w-4" />;
      case 'PaymentMethod':
        return <CreditCard className="h-4 w-4" />;
      case 'Location':
        return <MapPin className="h-4 w-4" />;
      case 'AdjustmentReason':
        return <ClipboardList className="h-4 w-4" />;
      // Inventario
      case 'Product':
      case 'Service':
        return <Package className="h-4 w-4" />;
      case 'ProductCategory':
        return <Tag className="h-4 w-4" />;
      case 'ProductArea':
        return <LayoutGrid className="h-4 w-4" />;
      case 'ProductType':
        return <Layers className="h-4 w-4" />;
      case 'Supplier':
        return <Truck className="h-4 w-4" />;
      case 'Warehouse':
        return <Warehouse className="h-4 w-4" />;
      case 'InventoryTransfer':
        return <ArrowLeftRight className="h-4 w-4" />;
      case 'InventoryPurchase':
        return <ShoppingCart className="h-4 w-4" />;
      case 'InventoryAdjustment':
      case 'InventoryMovement':
        return <ClipboardList className="h-4 w-4" />;
      // Ventas y Cartera
      case 'Sale':
        return <Receipt className="h-4 w-4" />;
      case 'Payment':
        return <DollarSign className="h-4 w-4" />;
      // Cajas
      case 'CashRegister':
      case 'CashRegisterSession':
      case 'CashRegisterTransfer':
        return <Calculator className="h-4 w-4" />;
      // Contabilidad
      case 'AccountingAccount':
      case 'AccountingPeriod':
      case 'JournalEntry':
        return <BookOpen className="h-4 w-4" />;
      // Facturación DIAN
      case 'ElectronicInvoice':
      case 'ElectronicCreditNote':
      case 'ElectronicDebitNote':
        return <Send className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <AppLayout title="Auditoría">
      <Head title="Auditoría" />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Registros de Auditoría</h2>
            <p className="text-muted-foreground">Historial de actividades del sistema</p>
          </div>
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
        {generalError && (
          <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {generalError}
          </div>
        )}

        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center">
                <Spinner className="mr-2" />
                <p>Cargando...</p>
              </div>
            </CardContent>
          </Card>
        ) : auditLogs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No hay registros de auditoría
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 bg-muted rounded-full">
                      {getIcon(log.subject_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getActionBadgeVariant(log.event)}>
                          {getActionLabel(log.event)}
                        </Badge>
                        <span className="text-sm font-medium">
                          {getModelLabel(log.subject_type)}
                        </span>
                        {log.subject_id && (
                          <span className="text-xs text-muted-foreground">
                            #{log.subject_id}
                          </span>
                        )}
                      </div>
                      {log.description && (
                        <p className="text-sm text-foreground mb-1">
                          {log.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {log.causer && (
                          <span className="font-medium text-foreground">
                            {log.causer.name}
                          </span>
                        )}
                        {log.ip_address && (
                          <span>IP: {log.ip_address}</span>
                        )}
                      </div>
                      {log.created_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(log.created_at)}
                        </p>
                      )}
                      {log.properties && Object.keys(log.properties).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Ver detalles
                          </summary>
                          <div className="mt-2 text-xs">
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.properties, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
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
