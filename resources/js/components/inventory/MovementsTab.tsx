import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Spinner } from "@/components/ui/spinner";
import {
  History,
  Package,
  Search,
} from "lucide-react";
import {
  type InventoryMovement,
  type InventoryMovementType,
  type Product,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

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
  entry: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20',
  exit: 'bg-red-500/15 text-red-700 border-red-500/20',
  transfer: 'bg-blue-500/15 text-blue-700 border-blue-500/20',
  adjustment: 'bg-orange-500/15 text-orange-700 border-orange-500/20',
  sale: 'bg-purple-500/15 text-purple-700 border-purple-500/20',
  purchase: 'bg-teal-500/15 text-teal-700 border-teal-500/20',
  return: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/20',
  damage: 'bg-red-500/15 text-red-700 border-red-500/20',
  loss: 'bg-red-500/15 text-red-700 border-red-500/20',
  other: 'bg-muted text-muted-foreground border-border',
};

interface Props {
  movements: InventoryMovement[];
  products: Product[];
  loading: boolean;
}

export function MovementsTab({ movements, products, loading }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        (m.product?.name || '').toLowerCase().includes(term) ||
        (m.notes || '').toLowerCase().includes(term) ||
        (m.created_by?.name || '').toLowerCase().includes(term);
      const matchesType = filterType === '' || filterType === 'todos' || m.type === filterType;
      const matchesProduct = filterProduct === '' || filterProduct === 'todos' || m.product_id.toString() === filterProduct;
      return matchesSearch && matchesType && matchesProduct;
    });
  }, [movements, searchTerm, filterType, filterProduct]);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
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
    <div className="space-y-4">
      {/* Search & Filters */}
      {!loading && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por producto, usuario, notas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todos</SelectItem>
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
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Producto" /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todos</SelectItem>
              {products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Spinner className="mr-2" /><span className="text-muted-foreground">Cargando movimientos...</span>
        </div>
      ) : filteredMovements.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No hay movimientos</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || filterType || filterProduct ? 'No se encontraron con los filtros aplicados' : 'No hay movimientos de inventario registrados'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
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
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(movement.created_at)}</TableCell>
                    <TableCell>
                      <Badge className={`border text-xs ${movementTypeColors[movement.type]}`}>
                        {movementTypeLabels[movement.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{movement.product?.name || `#${movement.product_id}`}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">{getQuantityDisplay(movement)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{movement.stock_before}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{movement.stock_after}</TableCell>
                    <TableCell className="text-right text-sm">{movement.unit_cost ? formatCurrency(movement.unit_cost) : '-'}</TableCell>
                    <TableCell className="text-sm">{movement.created_by?.name || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{movement.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
