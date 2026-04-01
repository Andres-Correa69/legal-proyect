import { useState, useEffect, useCallback } from 'react';
import {
    ShoppingCart,
    Package,
    Calculator,
    FileText,
    Users,
    BarChart3,
    Wallet,
    Calendar,
    CheckCircle2,
    DollarSign,
    TrendingUp,
    ArrowUpRight,
    Search,
    Filter,
    Plus,
    MessageCircle,
    Truck,
    ShieldCheck,
    Building2,
} from 'lucide-react';

const modules = [
    {
        id: 'ventas',
        icon: ShoppingCart,
        title: 'Ventas y POS',
        color: 'text-green-600',
        borderColor: 'border-green-300',
        bgColor: 'bg-green-50',
        screenshot: '/images/modules/ventas.png',
        capabilities: [
            'Punto de venta con interfaz rápida e intuitiva',
            'Múltiples métodos de pago y cajas registradoras',
            'Borradores de venta y cotizaciones',
            'Auditoría completa de ventas y modificaciones',
            'Cierres de caja automatizados con reportes',
            'Transferencias entre cajas en tiempo real',
        ],
    },
    {
        id: 'inventario',
        icon: Package,
        title: 'Inventario',
        color: 'text-amber-600',
        borderColor: 'border-amber-300',
        bgColor: 'bg-amber-50',
        screenshot: '/images/modules/inventario.png',
        capabilities: [
            'Multi-bodega con ubicaciones y estantes',
            'Compras con proveedores y ordenes de compra',
            'Traslados entre bodegas con trazabilidad',
            'Ajustes y reconciliaciones de inventario',
            'Historial de movimientos por producto',
            'Alertas de stock mínimo y máximo',
        ],
    },
    {
        id: 'contabilidad',
        icon: Calculator,
        title: 'Contabilidad',
        color: 'text-purple-600',
        borderColor: 'border-purple-300',
        bgColor: 'bg-purple-50',
        screenshot: '/images/modules/contabilidad.png',
        capabilities: [
            'Plan de cuentas PUC colombiano',
            'Asientos contables manuales y automáticos',
            'Balance de comprobación y balance general',
            'Estado de resultados e informes fiscales',
            'Libro mayor y auxiliares por cuenta',
            'Periodos contables con cierre automático',
        ],
    },
    {
        id: 'facturacion',
        icon: FileText,
        title: 'Facturación Electrónica',
        color: 'text-blue-600',
        borderColor: 'border-blue-300',
        bgColor: 'bg-blue-50',
        screenshot: '/images/modules/facturacion.png',
        capabilities: [
            'Emisión de facturas electrónicas validadas por DIAN',
            'Notas crédito y notas débito electrónicas',
            'Resoluciones de numeración y rangos de facturación',
            'Habilitación y configuración paso a paso',
            'Descarga de XML y representación gráfica',
            'Sincronización automática con contabilidad',
        ],
    },
    {
        id: 'nomina',
        icon: Wallet,
        title: 'Nómina Electrónica',
        color: 'text-cyan-600',
        borderColor: 'border-cyan-300',
        bgColor: 'bg-cyan-50',
        screenshot: '/images/modules/nomina.png',
        capabilities: [
            'Liquidación de nómina electrónica DIAN',
            'Cálculo automático de seguridad social',
            'Prestaciones sociales y vacaciones',
            'Desprendibles de pago por empleado',
            'Notas de ajuste de nómina',
            'Reportes de costos laborales',
        ],
    },
    {
        id: 'clientes',
        icon: Users,
        title: 'Clientes y Cartera',
        color: 'text-pink-600',
        borderColor: 'border-pink-300',
        bgColor: 'bg-pink-50',
        screenshot: '/images/modules/clientes.png',
        capabilities: [
            'Gestión completa de clientes y terceros',
            'Cuentas por cobrar con vencimientos',
            'Historial de pagos y abonos',
            'Estados de cuenta por cliente',
            'Importación masiva desde Excel/CSV',
            'Notas internas y seguimiento',
        ],
    },
    {
        id: 'reportes',
        icon: BarChart3,
        title: 'Reportes y Analítica',
        color: 'text-teal-600',
        borderColor: 'border-teal-300',
        bgColor: 'bg-teal-50',
        screenshot: '/images/modules/reportes.png',
        capabilities: [
            'Dashboard con KPIs en tiempo real',
            'Reporte de ventas por producto y periodo',
            'Productos más vendidos y utilidades',
            'Reporte de impuestos recaudados',
            'Exportación a PDF y Excel',
            'Análisis de crecimiento mensual',
        ],
    },
    {
        id: 'calendario',
        icon: Calendar,
        title: 'Calendario y Citas',
        color: 'text-orange-600',
        borderColor: 'border-orange-300',
        bgColor: 'bg-orange-50',
        screenshot: '/images/modules/calendario.png',
        capabilities: [
            'Calendario visual con vista diaria/semanal/mensual',
            'Sincronización con Google Calendar',
            'Gestión de citas y recordatorios',
            'Notificaciones automáticas por email',
            'Asignación de citas a empleados',
            'Vista de disponibilidad en tiempo real',
        ],
    },
    {
        id: 'chat',
        icon: MessageCircle,
        title: 'Chat en Tiempo Real',
        color: 'text-indigo-600',
        borderColor: 'border-indigo-300',
        bgColor: 'bg-indigo-50',
        screenshot: '/images/modules/chat.png',
        capabilities: [
            'Mensajería instantánea entre empleados',
            'Canales por sucursal o departamento',
            'Envío de archivos e imágenes',
            'Notificaciones en tiempo real con WebSocket',
            'Historial de conversaciones completo',
            'Soporte técnico integrado en el chat',
        ],
    },
    {
        id: 'proveedores',
        icon: Truck,
        title: 'Proveedores y CxP',
        color: 'text-rose-600',
        borderColor: 'border-rose-300',
        bgColor: 'bg-rose-50',
        screenshot: '/images/modules/proveedores.png',
        capabilities: [
            'Directorio completo de proveedores',
            'Cuentas por pagar con vencimientos',
            'Historial de compras por proveedor',
            'Estados de cuenta y abonos',
            'Retenciones automáticas (IVA, fuente, ICA)',
            'Importación masiva desde Excel/CSV',
        ],
    },
    {
        id: 'sucursales',
        icon: Building2,
        title: 'Multi-Sucursal',
        color: 'text-sky-600',
        borderColor: 'border-sky-300',
        bgColor: 'bg-sky-50',
        screenshot: '/images/modules/sucursales.png',
        capabilities: [
            'Gestión centralizada de múltiples sedes',
            'Inventario independiente por sucursal',
            'Reportes consolidados y por sucursal',
            'Usuarios asignados por sede',
            'Bodegas y ubicaciones por sucursal',
            'Soporte para franquicias con empresa padre',
        ],
    },
    {
        id: 'seguridad',
        icon: ShieldCheck,
        title: 'Seguridad y Auditoría',
        color: 'text-red-600',
        borderColor: 'border-red-300',
        bgColor: 'bg-red-50',
        screenshot: '/images/modules/seguridad.png',
        capabilities: [
            'Autenticación de dos factores (2FA)',
            'Roles y permisos granulares por usuario',
            'Logs de auditoría de todas las acciones',
            'Historial de cambios por registro',
            'Sesiones activas y control de acceso',
            'Alertas de seguridad automáticas',
        ],
    },
];

const AUTOPLAY_INTERVAL = 5000;

function FallbackMockup({ moduleId }: { moduleId: string }) {
    const baseCard = "rounded-lg bg-white border border-slate-100 p-2";

    if (moduleId === 'ventas') return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="rounded-md bg-green-50 p-1.5"><ShoppingCart size={12} className="text-green-600" /></div>
                    <span className="text-xs font-semibold text-slate-700">Punto de Venta</span>
                </div>
                <div className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] text-white font-medium">+ Nueva venta</div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
                {['Arroz x5kg', 'Aceite 1L', 'Leche', 'Pan', 'Café 500g', 'Azúcar', 'Harina', 'Huevos'].map((p) => (
                    <div key={p} className={baseCard + " text-center hover:border-green-300 cursor-default"}>
                        <div className="h-5 w-5 mx-auto rounded bg-slate-50 mb-1" />
                        <p className="text-[8px] text-slate-600 truncate">{p}</p>
                        <p className="text-[9px] font-bold text-slate-900">${(Math.random() * 15 + 2).toFixed(0)}K</p>
                    </div>
                ))}
            </div>
            <div className="rounded-lg bg-green-50 border border-green-200 p-2 flex justify-between items-center">
                <span className="text-[10px] text-green-700 font-medium">Total: 4 items</span>
                <span className="text-xs font-bold text-green-700">$185.600</span>
            </div>
        </div>
    );

    if (moduleId === 'inventario') return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Inventario</span>
                <div className="flex gap-1">
                    <div className="rounded-md bg-slate-100 p-1"><Search size={10} className="text-slate-400" /></div>
                    <div className="rounded-md bg-slate-100 p-1"><Filter size={10} className="text-slate-400" /></div>
                </div>
            </div>
            {[
                { name: 'Arroz Diana 5kg', stock: 45, status: 'ok' },
                { name: 'Aceite Girasol 1L', stock: 8, status: 'low' },
                { name: 'Azúcar Manuelita 1kg', stock: 120, status: 'ok' },
                { name: 'Café Sello Rojo 500g', stock: 3, status: 'critical' },
                { name: 'Harina de Trigo 1kg', stock: 67, status: 'ok' },
            ].map((item) => (
                <div key={item.name} className={baseCard + " flex items-center justify-between"}>
                    <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded bg-amber-50 flex items-center justify-center"><Package size={10} className="text-amber-500" /></div>
                        <span className="text-[10px] text-slate-700">{item.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${item.status === 'critical' ? 'text-red-500' : item.status === 'low' ? 'text-amber-500' : 'text-green-600'}`}>{item.stock} uds</span>
                </div>
            ))}
        </div>
    );

    if (moduleId === 'reportes') return (
        <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700">Dashboard de Analítica</span>
            <div className="grid grid-cols-3 gap-1.5">
                {[
                    { icon: DollarSign, value: '$12.4M', label: 'Ventas', color: 'text-green-500', trend: '+12%' },
                    { icon: TrendingUp, value: '847', label: 'Facturas', color: 'text-blue-500', trend: '+8%' },
                    { icon: Users, value: '234', label: 'Clientes', color: 'text-purple-500', trend: '+5%' },
                ].map((s) => (
                    <div key={s.label} className={baseCard}>
                        <div className="flex items-center justify-between mb-0.5">
                            <s.icon size={10} className={s.color} />
                            <span className="text-[8px] text-green-500 flex items-center"><ArrowUpRight size={8} />{s.trend}</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-900">{s.value}</p>
                        <p className="text-[8px] text-slate-400">{s.label}</p>
                    </div>
                ))}
            </div>
            <div className={baseCard + " !p-3"}>
                <div className="flex items-end gap-1 h-16">
                    {[30, 50, 40, 70, 55, 85, 65, 90, 75, 60, 80, 45].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-teal-500 to-teal-400 opacity-80" style={{ height: `${h}%` }} />
                    ))}
                </div>
            </div>
        </div>
    );

    const titleMap: Record<string, string> = {
        facturacion: 'Facturas Electrónicas',
        contabilidad: 'Asientos Contables',
        nomina: 'Nómina Electrónica',
        clientes: 'Gestión de Clientes',
        calendario: 'Calendario',
        chat: 'Chat en Tiempo Real',
        proveedores: 'Proveedores',
        compras: 'Órdenes de Compra',
        seguridad: 'Logs de Auditoría',
        sucursales: 'Sucursales',
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{titleMap[moduleId] || moduleId}</span>
                <div className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] text-white font-medium flex items-center gap-0.5"><Plus size={8} /> Nuevo</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-1.5 grid grid-cols-4 gap-1">
                <span className="text-[8px] font-medium text-slate-500 px-1">Ref</span>
                <span className="text-[8px] font-medium text-slate-500 px-1">Detalle</span>
                <span className="text-[8px] font-medium text-slate-500 px-1">Valor</span>
                <span className="text-[8px] font-medium text-slate-500 px-1">Estado</span>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={baseCard + " grid grid-cols-4 gap-1 items-center"}>
                    <span className="text-[9px] text-slate-500 px-1">#{1240 + i}</span>
                    <span className="text-[9px] text-slate-700 px-1 truncate">Reg. {i}</span>
                    <span className="text-[9px] font-medium text-slate-900 px-1">${(Math.random() * 500 + 100).toFixed(0)}K</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full text-center font-medium ${i % 3 === 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                        {i % 3 === 0 ? 'Pendiente' : 'Activo'}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function ModulesSection() {
    const [activeModule, setActiveModule] = useState('ventas');
    const [imgError, setImgError] = useState<Set<string>>(new Set());
    const [paused, setPaused] = useState(false);

    const activeIndex = modules.findIndex((m) => m.id === activeModule);
    const active = modules[activeIndex] ?? modules[0];
    const hasScreenshot = active.screenshot && !imgError.has(active.id);

    const goToNext = useCallback(() => {
        setActiveModule((prev) => {
            const idx = modules.findIndex((m) => m.id === prev);
            return modules[(idx + 1) % modules.length].id;
        });
    }, []);

    useEffect(() => {
        if (paused) return;
        const timer = setInterval(goToNext, AUTOPLAY_INTERVAL);
        return () => clearInterval(timer);
    }, [paused, goToNext]);

    const handleModuleClick = (id: string) => {
        setActiveModule(id);
        setPaused(true);
        setTimeout(() => setPaused(false), 15000);
    };

    return (
        <section id="modulos" className="relative py-24">
            <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-16 text-center">
                    <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                        Módulos{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                            especializados
                        </span>{' '}
                        para cada área
                    </h2>
                    <p className="mt-4 text-lg text-slate-600">
                        Cada módulo está diseñado para cubrir las necesidades específicas de tu negocio
                    </p>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Module tabs */}
                    <div className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
                        {modules.map((mod) => (
                            <button
                                key={mod.id}
                                onClick={() => handleModuleClick(mod.id)}
                                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-all ${
                                    activeModule === mod.id
                                        ? `${mod.bgColor} ${mod.color} border ${mod.borderColor} shadow-sm`
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <mod.icon size={18} />
                                <span className="hidden sm:inline">{mod.title}</span>
                            </button>
                        ))}
                    </div>

                    {/* Active module details + browser preview */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Progress bar */}
                        <div className="flex gap-1">
                            {modules.map((mod, i) => (
                                <div key={mod.id} className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                            i < activeIndex ? 'bg-blue-500 w-full'
                                            : i === activeIndex ? 'bg-blue-500 animate-progress'
                                            : 'w-0'
                                        }`}
                                        style={i === activeIndex && !paused ? { animation: `progress ${AUTOPLAY_INTERVAL}ms linear` } : i < activeIndex ? { width: '100%' } : { width: '0%' }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Browser mockup */}
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 overflow-hidden">
                            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                                <div className="flex gap-1.5">
                                    <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                                    <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                                </div>
                                <div className="mx-auto rounded-md bg-white px-4 py-1 text-[10px] text-slate-400 border border-slate-100">
                                    app.legalsistema.co/admin/{active.id}
                                </div>
                            </div>

                            <div className="bg-slate-50/50">
                                {hasScreenshot ? (
                                    <img
                                        src={active.screenshot}
                                        alt={`Vista previa - ${active.title}`}
                                        className="w-full max-h-[400px] object-cover object-top"
                                        onError={() => setImgError((prev) => new Set(prev).add(active.id))}
                                    />
                                ) : (
                                    <div className="p-4">
                                        <FallbackMockup moduleId={active.id} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Capabilities */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center gap-3">
                                <div className={`rounded-lg p-2.5 ${active.bgColor}`}>
                                    <active.icon size={22} className={active.color} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">{active.title}</h3>
                            </div>

                            <div className="grid gap-2.5 sm:grid-cols-2">
                                {active.capabilities.map((cap) => (
                                    <div key={cap} className="flex items-start gap-2.5">
                                        <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${active.color}`} />
                                        <span className="text-sm leading-relaxed text-slate-600">{cap}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes progress {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `}</style>
        </section>
    );
}
