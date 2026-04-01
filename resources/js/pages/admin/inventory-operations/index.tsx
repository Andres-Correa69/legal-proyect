import { Head, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeftRight,
  SlidersHorizontal,
  ListChecks,
  History,
  ClipboardList,
} from "lucide-react";
import {
  inventoryTransfersApi,
  inventoryAdjustmentsApi,
  adjustmentReasonsApi,
  inventoryMovementsApi,
  productsApi,
  warehousesApi,
  locationsApi,
  type InventoryTransfer,
  type InventoryAdjustment,
  type AdjustmentReason,
  type InventoryMovement,
  type Product,
  type Warehouse,
  type Location,
} from "@/lib/api";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import type { User } from "@/types";
import { TransfersTab } from "@/components/inventory/TransfersTab";
import { AdjustmentsTab } from "@/components/inventory/AdjustmentsTab";
import { ReasonsTab } from "@/components/inventory/ReasonsTab";
import { MovementsTab } from "@/components/inventory/MovementsTab";

export default function InventoryOperationsIndex() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;

  // Permissions
  const canCreateTransfer = isSuperAdmin(user) || hasPermission('inventory.transfers.create', user);
  const canApproveTransfer = isSuperAdmin(user) || hasPermission('inventory.transfers.approve', user);
  const canCompleteTransfer = isSuperAdmin(user) || hasPermission('inventory.transfers.complete', user);
  const canCreateAdjustment = isSuperAdmin(user) || hasPermission('inventory.adjustments.create', user);
  const canApproveAdjustment = isSuperAdmin(user) || hasPermission('inventory.adjustments.approve', user);
  const canManageReasons = isSuperAdmin(user) || hasPermission('inventory.adjustments.manage', user);

  // Data
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [reasons, setReasons] = useState<AdjustmentReason[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        transfersData,
        adjustmentsData,
        reasonsData,
        movementsData,
        productsData,
        warehousesData,
        locationsData,
      ] = await Promise.all([
        inventoryTransfersApi.getAll(),
        inventoryAdjustmentsApi.getAll(),
        adjustmentReasonsApi.getAll({ is_active: 'all' }),
        inventoryMovementsApi.getAll(),
        productsApi.getAll(),
        warehousesApi.getAll(),
        locationsApi.getAll(),
      ]);
      setTransfers(transfersData);
      setAdjustments(adjustmentsData);
      setReasons(reasonsData);
      setMovements(movementsData);
      setProducts(productsData);
      setWarehouses(warehousesData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const pendingTransfers = transfers.filter(t => t.status === 'requested').length;
  const pendingAdjustments = adjustments.filter(a => a.status === 'pending').length;

  return (
    <AppLayout title="Operaciones de Inventario">
      <Head title="Operaciones de Inventario" />

      <div className="space-y-6">
        {/* Header + Stats */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Operaciones de Inventario</h1>
                <p className="text-sm text-muted-foreground">Transferencias, ajustes, motivos y movimientos de inventario</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500/100" />
                    <span className="text-xs text-muted-foreground">Transferencias</span>
                  </div>
                  <p className="text-2xl font-bold">{transfers.length}</p>
                  {pendingTransfers > 0 && (
                    <p className="text-xs text-amber-600 mt-1">{pendingTransfers} pendiente(s)</p>
                  )}
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-orange-500/100" />
                    <span className="text-xs text-muted-foreground">Ajustes</span>
                  </div>
                  <p className="text-2xl font-bold">{adjustments.length}</p>
                  {pendingAdjustments > 0 && (
                    <p className="text-xs text-amber-600 mt-1">{pendingAdjustments} pendiente(s)</p>
                  )}
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-amber-500/100" />
                    <span className="text-xs text-muted-foreground">Motivos</span>
                  </div>
                  <p className="text-2xl font-bold">{reasons.length}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-green-500/100" />
                    <span className="text-xs text-muted-foreground">Movimientos</span>
                  </div>
                  <p className="text-2xl font-bold">{movements.length}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transfers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="transfers" className="gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              <span className="hidden sm:inline">Transferencias</span>
              <span className="sm:hidden">Trans.</span>
              {pendingTransfers > 0 && (
                <span className="bg-amber-500/15 text-amber-700 border border-amber-500/20 text-[10px] font-medium rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{pendingTransfers}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="adjustments" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Ajustes</span>
              <span className="sm:hidden">Ajust.</span>
              {pendingAdjustments > 0 && (
                <span className="bg-amber-500/15 text-amber-700 border border-amber-500/20 text-[10px] font-medium rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{pendingAdjustments}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reasons" className="gap-2">
              <ListChecks className="h-4 w-4" />
              <span className="hidden sm:inline">Motivos</span>
              <span className="sm:hidden">Motiv.</span>
            </TabsTrigger>
            <TabsTrigger value="movements" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Movimientos</span>
              <span className="sm:hidden">Mov.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transfers" className="space-y-4 mt-4">
            <TransfersTab
              transfers={transfers}
              setTransfers={setTransfers}
              warehouses={warehouses}
              locations={locations}
              products={products}
              loading={loading}
              canCreate={canCreateTransfer}
              canApprove={canApproveTransfer}
              canComplete={canCompleteTransfer}
            />
          </TabsContent>

          <TabsContent value="adjustments" className="space-y-4 mt-4">
            <AdjustmentsTab
              adjustments={adjustments}
              setAdjustments={setAdjustments}
              products={products}
              reasons={reasons}
              loading={loading}
              canCreate={canCreateAdjustment}
              canApprove={canApproveAdjustment}
            />
          </TabsContent>

          <TabsContent value="reasons" className="space-y-4 mt-4">
            <ReasonsTab
              reasons={reasons}
              setReasons={setReasons}
              loading={loading}
              canManage={canManageReasons}
            />
          </TabsContent>

          <TabsContent value="movements" className="space-y-4 mt-4">
            <MovementsTab
              movements={movements}
              products={products}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
