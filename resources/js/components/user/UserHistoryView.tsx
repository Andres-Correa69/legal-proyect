import { useState, useEffect, useCallback, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { usersApi, UserHistoryEvent } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
    DollarSign,
    Pencil,
    History,
    ChevronDown,
    ChevronUp,
    Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

interface UserHistoryViewProps {
    userId: number;
}

interface PaginationInfo {
    currentPage: number;
    lastPage: number;
    total: number;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
    commission: { icon: DollarSign, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500/10 dark:bg-green-500/100/20', label: 'Comisión' },
    edit: { icon: Pencil, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/10 dark:bg-amber-500/100/20', label: 'Edición' },
};

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }> = {
    paid: { label: 'Pagada', variant: 'default', className: 'bg-green-500/15 text-green-700 dark:bg-green-900 dark:text-green-300 border-transparent' },
    approved: { label: 'Aprobada', variant: 'secondary' },
    draft: { label: 'Borrador', variant: 'outline' },
    completed: { label: 'Completada', variant: 'default', className: 'bg-green-500/15 text-green-700 dark:bg-green-900 dark:text-green-300 border-transparent' },
    info: { label: 'Info', variant: 'secondary' },
};

function formatEventDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    } catch {
        return dateStr;
    }
}

function formatRelativeDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;
        return formatEventDate(dateStr);
    } catch {
        return dateStr;
    }
}

function ChangeDetail({ changes }: { changes: Record<string, { old: unknown; new: unknown }> }) {
    const fieldLabels: Record<string, string> = {
        name: 'Nombre', email: 'Correo', phone: 'Teléfono', address: 'Dirección',
        document_id: 'Documento', birth_date: 'Fecha nac.', is_active: 'Estado',
        branch_id: 'Sucursal', salary: 'Salario', contract_type: 'Tipo contrato',
        admission_date: 'Fecha ingreso', bank_name: 'Banco', account_type: 'Tipo cuenta',
        account_number: 'No. cuenta', eps_name: 'EPS', pension_fund_name: 'Fondo pensión',
        arl_name: 'ARL', compensation_fund_name: 'Caja comp.', risk_level: 'Nivel riesgo',
        roles: 'Roles', country_name: 'País', state_name: 'Departamento', city_name: 'Ciudad',
    };

    const formatValue = (key: string, value: unknown): string => {
        if (value === null || value === undefined || value === '') return 'Sin definir';
        if (key === 'is_active') return value ? 'Activo' : 'Inactivo';
        if (key === 'salary') return formatCurrency(Number(value));
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
    };

    return (
        <div className="mt-2 space-y-1.5">
            {Object.entries(changes).map(([key, change]) => (
                <div key={key} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground font-medium min-w-[100px]">
                        {fieldLabels[key] || key}:
                    </span>
                    <span className="text-red-500 line-through">
                        {formatValue(key, change.old)}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                        {formatValue(key, change.new)}
                    </span>
                </div>
            ))}
        </div>
    );
}

function EventCard({ event }: { event: UserHistoryEvent }) {
    const [expanded, setExpanded] = useState(false);
    const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.edit;
    const Icon = config.icon;
    const statusConfig = STATUS_BADGES[event.status];
    const hasChanges = event.type === 'edit' && event.meta?.changes && Object.keys(event.meta.changes as Record<string, unknown>).length > 0;

    const handleClick = () => {
        if (event.type === 'commission' && event.meta?.sale_id) {
            router.visit(`/admin/sales/${event.meta.sale_id}`);
        } else if (hasChanges) {
            setExpanded(!expanded);
        }
    };

    const isClickable = event.type === 'commission' || hasChanges;

    return (
        <div
            className={`relative flex gap-3 ${isClickable ? 'cursor-pointer' : ''}`}
            onClick={isClickable ? handleClick : undefined}
        >
            {/* Timeline dot & line */}
            <div className="flex flex-col items-center flex-shrink-0">
                <div className={`h-9 w-9 rounded-full ${config.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                <div className="w-px flex-1 bg-border" />
            </div>

            {/* Content */}
            <div className="flex-1 pb-6 min-w-0">
                <div className="bg-card border border-border rounded-lg p-3 hover:bg-accent/5 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] ${config.color} border-current`}>
                                    {config.label}
                                </Badge>
                                {statusConfig && (
                                    <Badge variant={statusConfig.variant} className={`text-[10px] ${statusConfig.className || ''}`}>
                                        {statusConfig.label}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm font-medium mt-1.5">{event.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {formatRelativeDate(event.date)}
                            </span>
                            {hasChanges && (
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
                                    {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Expandable changes detail */}
                    {expanded && hasChanges && (
                        <ChangeDetail changes={event.meta.changes as Record<string, { old: unknown; new: unknown }>} />
                    )}
                </div>
            </div>
        </div>
    );
}

export function UserHistoryView({ userId }: UserHistoryViewProps) {
    const [events, setEvents] = useState<UserHistoryEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<PaginationInfo>({
        currentPage: 1,
        lastPage: 1,
        total: 0,
    });
    const [filter, setFilter] = useState<'all' | 'commission' | 'edit'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchHistory = useCallback(async (page: number = 1) => {
        setLoading(true);
        try {
            const response = await usersApi.getHistory(userId, { per_page: 20, page });
            setEvents(response.data || []);
            setPagination({
                currentPage: response.current_page || 1,
                lastPage: response.last_page || 1,
                total: response.total || 0,
            });
        } catch (error) {
            console.error('Error al cargar historial:', error);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const filteredEvents = useMemo(() => {
        let filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);
        if (searchTerm !== '') {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter((e) =>
                (e.title || '').toLowerCase().includes(term) ||
                (e.description || '').toLowerCase().includes(term)
            );
        }
        return filtered;
    }, [events, filter, searchTerm]);

    const typeCounts = {
        all: events.length,
        commission: events.filter((e) => e.type === 'commission').length,
        edit: events.filter((e) => e.type === 'edit').length,
    };

    const filters: { value: typeof filter; label: string }[] = [
        { value: 'all', label: `Todo (${typeCounts.all})` },
        { value: 'commission', label: `Comisiones (${typeCounts.commission})` },
        { value: 'edit', label: `Ediciones (${typeCounts.edit})` },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Spinner size="lg" className="text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar en historial..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {filters.map((f) => (
                        <Button
                            key={f.value}
                            variant={filter === f.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter(f.value)}
                        >
                            {f.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Timeline */}
            {filteredEvents.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                            <History className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                            {filter === 'all'
                                ? 'No hay registros de actividad para este usuario.'
                                : `No hay registros de tipo "${filters.find((f) => f.value === filter)?.label.split(' (')[0]}" para este usuario.`}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="relative">
                    {filteredEvents.map((event, index) => (
                        <EventCard key={`${event.type}-${event.date}-${index}`} event={event} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.lastPage > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.currentPage <= 1}
                        onClick={() => fetchHistory(pagination.currentPage - 1)}
                    >
                        Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Página {pagination.currentPage} de {pagination.lastPage}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.currentPage >= pagination.lastPage}
                        onClick={() => fetchHistory(pagination.currentPage + 1)}
                    >
                        Siguiente
                    </Button>
                </div>
            )}
        </div>
    );
}
