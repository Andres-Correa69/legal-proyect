import { Head, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { History, TrendingUp, TrendingDown, ArrowRightLeft, Package } from "lucide-react";
import { inventoryMovementsApi, productsApi, type InventoryMovement, type InventoryMovementType, type Product } from "@/lib/api";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import { formatCurrency } from "@/lib/utils";
import type { User } from "@/types";

const movementTypeLabels: Record<InventoryMovementType, string> = {
  entry: 'Entrada',
  exit: 'Salida',
  transfer: 'Transferencia',
  adjustment: 'Ajuste',
  sale: 'Venta',
  purchase: 'Compra',
  return: 'Devolucion',
  damage: 'Dano',
  loss: 'Perdida',
  other: 'Otro',
};

const movementTypeColors: Record<InventoryMovementType, string> = {
  entry: 'bg-green-500/15 text-green-700',
  exit: 'bg-red-500/15 text-red-700',
  transfer: 'bg-blue-500/15 text-blue-700',
  adjustment: 'bg-orange-500/15 text-orange-700',
  sale: 'bg-purple-500/15 text-purple-700',
  purchase: 'bg-emerald-500/15 text-emerald-700',
  return: 'bg-yellow-500/15 text-yellow-700',
  damage: 'bg-red-500/15 text-red-700',
  loss: 'bg-red-500/15 text-red-700',
  other: 'bg-muted text-foreground',
};

export default function InventoryMovementsIndex() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;
  const canView = isSuperAdmin(user) || hasPermission('inventory.movements.view', user);

  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');

  const companyFilter = useSuperAdminCompanyFilter();

  useEffect(() => {
    if (companyFilter.shouldLoadData) {
      loadData();
    }
  }, [companyFilter.isFiltered, companyFilter.selectedCompanyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = { company_id: companyFilter.companyIdParam };
      const [movementsData, productsData] = await Promise.all([
        inventoryMovementsApi.getAll(params),
        productsApi.getAll(params),
      ]);
      setMovements(movementsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter(movement => {
    const matchesType = filterType === 'all' || movement.type === filterType;
    const matchesProduct = filterProduct === 'all' || movement.product_id.toString() === filterProduct;
    return matchesType && matchesProduct;
  });

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const getQuantityDisplay = (movement: InventoryMovement) => {
    const isPositive = ['entry', 'purchase', 'return'].includes(movement.type);
    return (
      <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
        {isPositive ? '+' : '-'}{Math.abs(movement.quantity)}
      </span>
    );
  };

  return (
    <AppLayout title="Movimientos de Inventario">
      <Head title="Movimientos de Inventario" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Movimientos de Inventario</h2>
            <p className="text-muted-foreground">
              Historial de todos los movimientos de inventario
            </p>
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
        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Tipo de movimiento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="entry">Entrada</SelectItem>
              <SelectItem value="exit">Salida</SelectItem>
              <SelectItem value="transfer">Transferencia</SelectItem>
              <SelectItem value="adjustment">Ajuste</SelectItem>
              <SelectItem value="purchase">Compra</SelectItem>
              <SelectItem value="sale">Venta</SelectItem>
              <SelectItem value="return">Devolucion</SelectItem>
              <SelectItem value="damage">Dano</SelectItem>
              <SelectItem value="loss">Perdida</SelectItem>
            </SelectContent>
          </Select>

          <Combobox
            value={filterProduct === 'all' ? '' : filterProduct}
            onValueChange={(value) => setFilterProduct(value || 'all')}
            placeholder="Todos los productos"
            searchPlaceholder="Buscar producto..."
            emptyText="No se encontraron productos"
            className="w-full sm:w-[250px]"
            options={products.map((product) => ({
              value: product.id.toString(),
              label: product.name,
            }))}
          />
        </div>

        {/* Movements Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : filteredMovements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No hay movimientos registrados
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de Movimientos ({filteredMovements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Stock Antes</TableHead>
                    <TableHead className="text-right">Stock Despues</TableHead>
                    <TableHead className="text-right">Costo Unit.</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(movement.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge className={movementTypeColors[movement.type]}>
                          {movementTypeLabels[movement.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {movement.product?.name || `Producto #${movement.product_id}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {getQuantityDisplay(movement)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {movement.stock_before}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {movement.stock_after}
                      </TableCell>
                      <TableCell className="text-right">
                        {movement.unit_cost ? formatCurrency(movement.unit_cost) : '-'}
                      </TableCell>
                      <TableCell>
                        {movement.created_by?.name || '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {movement.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        </>
        )}
      </div>
    </AppLayout>
  );
}
