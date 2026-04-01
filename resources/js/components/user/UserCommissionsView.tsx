import { useState, useCallback, useEffect, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { usersApi, UserCommissionSale } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    CalendarIcon,
    DollarSignIcon,
    ShoppingCartIcon,
    HashIcon,
    PercentIcon,
    ReceiptIcon,
    Search,
    CheckCircle2,
    Clock,
    Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';

interface UserCommissionsViewProps {
    userId: number;
}

interface PaginationInfo {
    currentPage: number;
    lastPage: number;
    total: number;
}

interface CommissionSummary {
    totalCommission: number;
    totalSales: number;
    salesCount: number;
    avgPercentage: number;
}

function formatDate(dateStr: string): string {
    try {
        return new Intl.DateTimeFormat('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(new Date(dateStr));
    } catch {
        return dateStr;
    }
}

type FilterPreset = '15d' | '1m' | '2m' | 'custom';

const FILTER_PRESETS: { value: FilterPreset; label: string }[] = [
    { value: '15d', label: 'Últimos 15 días' },
    { value: '1m', label: 'Último mes' },
    { value: '2m', label: 'Últimos 2 meses' },
    { value: 'custom', label: 'Personalizar' },
];

function getPresetDates(preset: FilterPreset): { from: string; to: string } {
    const today = new Date();
    const to = today.toISOString().split('T')[0];
    const from = new Date(today);

    switch (preset) {
        case '15d':
            from.setDate(from.getDate() - 15);
            break;
        case '1m':
            from.setMonth(from.getMonth() - 1);
            break;
        case '2m':
            from.setMonth(from.getMonth() - 2);
            break;
        default:
            return { from: '', to: '' };
    }

    return { from: from.toISOString().split('T')[0], to };
}

export function UserCommissionsView({ userId }: UserCommissionsViewProps) {
    const { toast } = useToast();
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [activePreset, setActivePreset] = useState<FilterPreset>('15d');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [commissions, setCommissions] = useState<UserCommissionSale[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [pagination, setPagination] = useState<PaginationInfo>({
        currentPage: 1,
        lastPage: 1,
        total: 0,
    });
    const [summary, setSummary] = useState<CommissionSummary>({
        totalCommission: 0,
        totalSales: 0,
        salesCount: 0,
        avgPercentage: 0,
    });

    const fetchCommissions = useCallback(async (page: number = 1, fromDate?: string, toDate?: string) => {
        const useDateFrom = fromDate ?? dateFrom;
        const useDateTo = toDate ?? dateTo;
        setLoading(true);
        setHasSearched(true);
        try {
            const response = await usersApi.getCommissions(userId, {
                date_from: useDateFrom || undefined,
                date_to: useDateTo || undefined,
                per_page: 15,
                page,
            });
            const data = response.data || [];
            setCommissions(data);
            setPagination({
                currentPage: response.current_page || 1,
                lastPage: response.last_page || 1,
                total: response.total || 0,
            });

            const totalCommission = data.reduce((acc, c) => acc + (c.commission_amount || 0), 0);
            const totalSales = data.reduce((acc, c) => acc + (c.total_amount || 0), 0);
            const salesCount = data.length;
            const avgPercentage =
                salesCount > 0
                    ? data.reduce((acc, c) => acc + (c.commission_percentage || 0), 0) / salesCount
                    : 0;

            setSummary({ totalCommission, totalSales, salesCount, avgPercentage });
        } catch (error) {
            console.error('Error al cargar comisiones:', error);
            setCommissions([]);
        } finally {
            setLoading(false);
        }
    }, [userId, dateFrom, dateTo]);

    // Auto-fetch on mount with default preset (15 days)
    useEffect(() => {
        const { from, to } = getPresetDates('15d');
        setDateFrom(from);
        setDateTo(to);
        fetchCommissions(1, from, to);
    }, [userId]);

    const handlePresetChange = (preset: FilterPreset) => {
        setActivePreset(preset);
        if (preset !== 'custom') {
            const { from, to } = getPresetDates(preset);
            setDateFrom(from);
            setDateTo(to);
            fetchCommissions(1, from, to);
        }
    };

    const handleCustomSearch = () => {
        fetchCommissions(1);
    };

    const handlePageChange = (page: number) => {
        fetchCommissions(page);
    };

    const handleInvoiceClick = (saleId: number) => {
        router.visit(`/admin/sales/${saleId}`);
    };

    const handleTogglePaid = async (commission: UserCommissionSale) => {
        setTogglingId(commission.id);
        try {
            const result = await usersApi.toggleCommissionPaid(userId, commission.id);
            const d = result.data ?? result;
            setCommissions((prev) =>
                prev.map((c) =>
                    c.id === commission.id
                        ? { ...c, commission_paid: d.commission_paid ?? !commission.commission_paid, commission_paid_at: d.commission_paid_at ?? null }
                        : c
                )
            );
            toast({ title: result.message || 'Estado actualizado' });
        } catch (error: any) {
            toast({ title: 'Error', description: error?.message || 'No se pudo actualizar', variant: 'destructive' });
        } finally {
            setTogglingId(null);
        }
    };

    const filteredCommissions = useMemo(() => {
        if (searchTerm === '') return commissions;
        const term = searchTerm.toLowerCase();
        return commissions.filter((c) =>
            (c.invoice_number || '').toLowerCase().includes(term) ||
            (c.client?.name || '').toLowerCase().includes(term) ||
            formatCurrency(c.commission_amount || 0).toLowerCase().includes(term)
        );
    }, [commissions, searchTerm]);

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por # factura, cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Preset Buttons */}
                        <div className="flex flex-wrap gap-2">
                            {FILTER_PRESETS.map((preset) => (
                                <Button
                                    key={preset.value}
                                    variant={activePreset === preset.value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handlePresetChange(preset.value)}
                                    className="gap-1.5"
                                >
                                    {preset.value === 'custom' && <CalendarIcon className="h-3.5 w-3.5" />}
                                    {preset.label}
                                </Button>
                            ))}
                        </div>

                        {/* Custom Date Range */}
                        {activePreset === 'custom' && (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end pt-1">
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-xs text-muted-foreground">Fecha desde</label>
                                    <Input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-xs text-muted-foreground">Fecha hasta</label>
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                    />
                                </div>
                                <Button onClick={handleCustomSearch} disabled={loading || !dateFrom || !dateTo}>
                                    <CalendarIcon className="h-4 w-4" />
                                    Consultar
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Spinner size="lg" className="text-muted-foreground" />
                </div>
            )}

            {/* Results */}
            {!loading && hasSearched && (
                <>
                    {commissions.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <ReceiptIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                <p className="text-sm text-muted-foreground">
                                    No se encontraron comisiones para el rango de fechas seleccionado.
                                </p>
                            </CardContent>
                        </Card>
                    ) : filteredCommissions.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                <p className="text-sm text-muted-foreground">
                                    No se encontraron comisiones con los filtros seleccionados.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <DollarSignIcon className="h-4 w-4" />
                                            Total Comisiones
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            {formatCurrency(summary.totalCommission)}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <ShoppingCartIcon className="h-4 w-4" />
                                            Total Ventas
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">
                                            {formatCurrency(summary.totalSales)}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <HashIcon className="h-4 w-4" />
                                            # Ventas
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">{summary.salesCount}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <PercentIcon className="h-4 w-4" />
                                            % Promedio
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">
                                            {summary.avgPercentage.toFixed(1)}%
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Commissions Table */}
                            <Card>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead># Factura</TableHead>
                                                <TableHead>Cliente</TableHead>
                                                <TableHead className="text-right">Total Venta</TableHead>
                                                <TableHead className="text-right">% Comisión</TableHead>
                                                <TableHead className="text-right">Monto Comisión</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredCommissions.map((commission) => (
                                                <TableRow key={commission.id}>
                                                    <TableCell>
                                                        <button
                                                            type="button"
                                                            className="text-primary hover:underline font-medium"
                                                            onClick={() => handleInvoiceClick(commission.id)}
                                                        >
                                                            {commission.invoice_number}
                                                        </button>
                                                    </TableCell>
                                                    <TableCell>
                                                        {commission.client?.name || 'Sin definir'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {formatCurrency(commission.total_amount || 0)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="secondary">
                                                            {commission.commission_percentage}%
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                                                        {formatCurrency(commission.commission_amount || 0)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {commission.commission_paid === true ? (
                                                            <Badge className="gap-1 bg-emerald-500/15 text-emerald-700">
                                                                <CheckCircle2 className="h-3 w-3" /> Pagada
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="gap-1 bg-amber-500/15 text-amber-700">
                                                                <Clock className="h-3 w-3" /> Pendiente
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatDate(commission.created_at)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className={`h-7 gap-1.5 text-xs ${commission.commission_paid === true ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700"}`}
                                                            disabled={togglingId === commission.id}
                                                            onClick={() => handleTogglePaid(commission)}
                                                        >
                                                            {togglingId === commission.id ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : commission.commission_paid === true ? (
                                                                <><Clock className="h-3.5 w-3.5" /> Marcar pendiente</>
                                                            ) : (
                                                                <><CheckCircle2 className="h-3.5 w-3.5" /> Marcar pagada</>
                                                            )}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Pagination */}
                            {pagination.lastPage > 1 && (
                                <div className="flex items-center justify-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={pagination.currentPage <= 1}
                                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                                    >
                                        Anterior
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Pagina {pagination.currentPage} de {pagination.lastPage}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={pagination.currentPage >= pagination.lastPage}
                                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                                    >
                                        Siguiente
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}
