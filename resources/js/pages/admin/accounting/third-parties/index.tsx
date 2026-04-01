import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { clientsApi, suppliersApi, thirdPartiesApi } from "@/lib/api";
import type { Supplier, ThirdParty } from "@/lib/api";
import type { User, SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { Users, Truck, FileText, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

type TerceroTabValue = 'clientes' | 'proveedores' | 'otros';

type TerceroItem = {
  id: number;
  tipo: 'cliente' | 'proveedor' | 'otro';
  documentType: string;
  documentId: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  isActive: boolean;
  originalClient?: User;
  originalSupplier?: Supplier;
  originalThirdParty?: ThirdParty;
};

export default function ThirdPartiesIndex() {
  const { auth } = usePage<SharedData>().props;
  const canManage = hasPermission('third-parties.manage', auth.user);
  const canViewClients = hasPermission('clients.view', auth.user);
  const canViewSuppliers = hasPermission('suppliers.view', auth.user);

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<User[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([]);

  const [activeTab, setActiveTab] = useState<TerceroTabValue>('clientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const loadData = async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [];

      if (canViewClients) {
        promises.push(clientsApi.getAll().catch(() => []));
      } else {
        promises.push(Promise.resolve([]));
      }

      if (canViewSuppliers) {
        promises.push(suppliersApi.getAll().catch(() => []));
      } else {
        promises.push(Promise.resolve([]));
      }

      promises.push(thirdPartiesApi.getAll().catch(() => []));

      const [clientsData, suppliersData, thirdPartiesData] = await Promise.all(promises);
      setClients(clientsData);
      setSuppliers(suppliersData);
      setThirdParties(thirdPartiesData);
    } catch (error) {
      console.error('Error cargando terceros:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Transform all sources into unified TerceroItem
  const terceroItems = useMemo((): TerceroItem[] => {
    const clientItems: TerceroItem[] = clients.map(c => ({
      id: c.id,
      tipo: 'cliente',
      documentType: c.document_type || '',
      documentId: c.document_id || '',
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      city: c.city_name || '',
      isActive: c.is_active !== false,
      originalClient: c,
    }));

    const supplierItems: TerceroItem[] = suppliers.map(s => ({
      id: s.id,
      tipo: 'proveedor',
      documentType: s.document_type || '',
      documentId: s.tax_id || '',
      name: s.name || '',
      email: s.email || '',
      phone: s.phone || '',
      city: '',
      isActive: s.is_active !== false,
      originalSupplier: s,
    }));

    const thirdPartyItems: TerceroItem[] = thirdParties.map(tp => ({
      id: tp.id,
      tipo: 'otro',
      documentType: tp.document_type || '',
      documentId: tp.document_id || '',
      name: tp.name || '',
      email: tp.email || '',
      phone: tp.phone || '',
      city: tp.city_name || '',
      isActive: tp.is_active !== false,
      originalThirdParty: tp,
    }));

    return [...clientItems, ...supplierItems, ...thirdPartyItems];
  }, [clients, suppliers, thirdParties]);

  // Filter by tab + search + status
  const filteredItems = useMemo(() => {
    return terceroItems.filter(item => {
      // Tab filter
      if (activeTab === 'clientes' && item.tipo !== 'cliente') return false;
      if (activeTab === 'proveedores' && item.tipo !== 'proveedor') return false;
      if (activeTab === 'otros' && item.tipo !== 'otro') return false;

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          item.name.toLowerCase().includes(term) ||
          item.documentId.toLowerCase().includes(term) ||
          item.email.toLowerCase().includes(term) ||
          item.phone.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterEstado === 'activo' && !item.isActive) return false;
      if (filterEstado === 'inactivo' && item.isActive) return false;

      return true;
    });
  }, [terceroItems, activeTab, searchTerm, filterEstado]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEstado, activeTab, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TerceroTabValue);
    setFilterEstado('all');
    setSearchTerm('');
  };

  const handleItemClick = (item: TerceroItem) => {
    if (item.originalClient) {
      router.visit(`/admin/clients/${item.id}`);
    } else if (item.originalSupplier) {
      router.visit(`/admin/accounting/third-parties/create?mode=view&entityId=${item.id}&source=proveedor`);
    } else if (item.originalThirdParty) {
      router.visit(`/admin/accounting/third-parties/create?mode=view&entityId=${item.id}`);
    }
  };

  const handleCreate = () => {
    if (activeTab === 'clientes') {
      router.visit('/admin/clients/create');
    } else if (activeTab === 'proveedores') {
      router.visit('/admin/suppliers/create');
    } else {
      router.visit('/admin/accounting/third-parties/create');
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'cliente':
        return <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/20 border text-[10px]">Cliente</Badge>;
      case 'proveedor':
        return <Badge className="bg-purple-500/15 text-purple-700 border-purple-500/20 border text-[10px]">Proveedor</Badge>;
      case 'otro':
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 border text-[10px]">Otro Tercero</Badge>;
    }
  };

  // Stats
  const stats = useMemo(() => ({
    totalClientes: clients.length,
    totalProveedores: suppliers.length,
    totalOtros: thirdParties.length,
    total: clients.length + suppliers.length + thirdParties.length,
  }), [clients, suppliers, thirdParties]);

  return (
    <AppLayout>
      <Head title="Terceros" />

      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                  <Users className="h-5 w-5 text-[#2463eb]" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Terceros</h1>
                  <p className="text-sm text-muted-foreground">Gestiona clientes, proveedores y otros terceros</p>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-muted p-2 rounded-lg">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total</h3>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Todos los terceros</p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-500/15 p-2 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Clientes</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalClientes}</p>
                  <p className="text-xs text-muted-foreground mt-1">Registrados</p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-purple-500/15 p-2 rounded-lg">
                      <Truck className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Proveedores</h3>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalProveedores}</p>
                  <p className="text-xs text-muted-foreground mt-1">Registrados</p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-amber-500/15 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Otros Terceros</h3>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{stats.totalOtros}</p>
                  <p className="text-xs text-muted-foreground mt-1">Registrados</p>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          <Card className="shadow-xl border border-border p-4 sm:p-6">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
              <TabsList className="grid w-full max-w-[500px] grid-cols-3 h-auto">
                <TabsTrigger value="clientes" className="text-xs sm:text-sm">
                  <Users className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Clientes</span>
                </TabsTrigger>
                <TabsTrigger value="proveedores" className="text-xs sm:text-sm">
                  <Truck className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Proveedores</span>
                </TabsTrigger>
                <TabsTrigger value="otros" className="text-xs sm:text-sm">
                  <FileText className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Otros Terceros</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search and Filters */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, documento, email o telefono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                {canManage && (
                  <Button size="sm" onClick={handleCreate} className="gap-2 whitespace-nowrap">
                    <Plus className="h-4 w-4" />
                    {activeTab === 'clientes' ? 'Nuevo Cliente' : activeTab === 'proveedores' ? 'Nuevo Proveedor' : 'Nuevo Tercero'}
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2">
                <Spinner className="h-5 w-5" />
                <span className="text-muted-foreground text-sm">Cargando terceros...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No se encontraron terceros</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchTerm ? 'Intenta con otro termino de busqueda' : 'Agrega un nuevo tercero para comenzar'}
                </p>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="h-12 px-4 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                        <th className="h-12 px-4 text-left text-xs font-medium text-muted-foreground">Documento</th>
                        <th className="h-12 px-4 text-left text-xs font-medium text-muted-foreground">Nombre / Razon Social</th>
                        <th className="h-12 px-4 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Email</th>
                        <th className="h-12 px-4 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Telefono</th>
                        <th className="h-12 px-4 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Ciudad</th>
                        <th className="h-12 px-4 text-left text-xs font-medium text-muted-foreground">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.map((item) => (
                        <tr
                          key={`${item.tipo}-${item.id}`}
                          className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleItemClick(item)}
                        >
                          <td className="p-4">{getTipoBadge(item.tipo)}</td>
                          <td className="p-4">
                            <div className="text-sm">
                              {item.documentType && <span className="text-muted-foreground text-xs">{item.documentType} </span>}
                              {item.documentId || '-'}
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-sm font-medium">{item.name}</p>
                          </td>
                          <td className="p-4 hidden md:table-cell">
                            <p className="text-sm text-muted-foreground">{item.email || '-'}</p>
                          </td>
                          <td className="p-4 hidden lg:table-cell">
                            <p className="text-sm text-muted-foreground">{item.phone || '-'}</p>
                          </td>
                          <td className="p-4 hidden lg:table-cell">
                            <p className="text-sm text-muted-foreground">{item.city || '-'}</p>
                          </td>
                          <td className="p-4">
                            <Badge variant={item.isActive ? "default" : "secondary"} className={item.isActive ? "bg-green-500/15 text-green-700 border-green-500/20 border text-[10px]" : "text-[10px]"}>
                              {item.isActive ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredItems.length)} de {filteredItems.length}</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(parseInt(v))}>
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>por pagina</span>
                  </div>

                  {totalPages > 1 && (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <Button variant="ghost" size="sm" onClick={() => handlePageChange(safePage - 1)} disabled={safePage <= 1}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </PaginationItem>
                        {getPageNumbers().map((page, idx) =>
                          page === 'ellipsis' ? (
                            <PaginationItem key={`ellipsis-${idx}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          ) : (
                            <PaginationItem key={page}>
                              <PaginationLink
                                isActive={page === safePage}
                                onClick={() => handlePageChange(page)}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        )}
                        <PaginationItem>
                          <Button variant="ghost" size="sm" onClick={() => handlePageChange(safePage + 1)} disabled={safePage >= totalPages}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
