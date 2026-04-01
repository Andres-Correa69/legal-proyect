import { useState } from 'react';
import {
    Cloud,
    Shield,
    Zap,
    Globe,
    Clock,
    Smartphone,
    Lock,
    HeadphonesIcon,
    CheckCircle2,
    X,
    Cpu,
    RefreshCw,
    Layers,
    Settings,
    ChevronDown,
    ChevronUp,
    Award,
} from 'lucide-react';

const advantages = [
    {
        icon: Cloud,
        title: '100% en la Nube',
        description: 'Accede desde cualquier lugar, sin instalaciones. Tus datos siempre seguros y respaldados en AWS.',
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        border: 'hover:border-blue-200',
    },
    {
        icon: Zap,
        title: 'Tiempo Real',
        description: 'Ventas, inventario y reportes actualizados al instante con tecnología WebSocket.',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
        border: 'hover:border-amber-200',
    },
    {
        icon: Globe,
        title: 'Multi-Sucursal y Franquicias',
        description: 'Gestiona múltiples sedes y franquicias desde un panel centralizado con datos independientes.',
        iconBg: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        border: 'hover:border-indigo-200',
    },
    {
        icon: Shield,
        title: 'Cumplimiento DIAN',
        description: 'Facturación y nómina electrónica certificada. Siempre actualizado con la normativa colombiana.',
        iconBg: 'bg-green-50',
        iconColor: 'text-green-600',
        border: 'hover:border-green-200',
    },
    {
        icon: Lock,
        title: 'Seguridad Empresarial',
        description: 'Autenticación de dos factores, roles y permisos granulares, logs de auditoría completos.',
        iconBg: 'bg-red-50',
        iconColor: 'text-red-600',
        border: 'hover:border-red-200',
    },
    {
        icon: Clock,
        title: 'Soporte en Tiempo Real',
        description: 'Chat integrado con soporte técnico directo. Resolvemos tus dudas sin salir del sistema.',
        iconBg: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        border: 'hover:border-cyan-200',
    },
    {
        icon: Smartphone,
        title: 'Diseño Responsivo',
        description: 'Interfaz adaptada a cualquier dispositivo. Vende desde tu computador, tablet o celular.',
        iconBg: 'bg-violet-50',
        iconColor: 'text-violet-600',
        border: 'hover:border-violet-200',
    },
    {
        icon: HeadphonesIcon,
        title: 'Actualizaciones Constantes',
        description: 'Nuevas funcionalidades cada mes sin costo adicional. Tu software siempre evoluciona.',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-600',
        border: 'hover:border-orange-200',
    },
    {
        icon: Cpu,
        title: 'Automatización Inteligente',
        description: 'Asientos contables automáticos, cierres de caja, alertas de stock y retenciones al instante.',
        iconBg: 'bg-teal-50',
        iconColor: 'text-teal-600',
        border: 'hover:border-teal-200',
    },
    {
        icon: RefreshCw,
        title: 'Integración Total',
        description: 'Todos los módulos conectados: ventas genera facturas, mueve inventario y crea asientos contables.',
        iconBg: 'bg-sky-50',
        iconColor: 'text-sky-600',
        border: 'hover:border-sky-200',
    },
    {
        icon: Layers,
        title: 'Escalable sin Límites',
        description: 'Desde un emprendimiento hasta una cadena de franquicias. Crece sin cambiar de software.',
        iconBg: 'bg-rose-50',
        iconColor: 'text-rose-600',
        border: 'hover:border-rose-200',
    },
    {
        icon: Settings,
        title: 'Personalización Total',
        description: 'Configura roles, permisos, impuestos, resoluciones y métodos de pago según tu negocio.',
        iconBg: 'bg-purple-50',
        iconColor: 'text-purple-600',
        border: 'hover:border-purple-200',
    },
];

import {
    FileText,
    Package,
    Calculator,
    ShoppingCart,
    BarChart3,
    Building2,
    type LucideIcon,
} from 'lucide-react';

interface ComparisonCategory {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
    iconBg: string;
    items: { feature: string; legal: string; others: string; legalScore: number; othersScore: number }[];
}

const comparisonCategories: ComparisonCategory[] = [
    {
        id: 'facturacion',
        label: 'Facturación',
        icon: FileText,
        color: 'text-blue-600',
        iconBg: 'bg-blue-50',
        items: [
            { feature: 'Facturación electrónica DIAN', legal: 'Completo', others: 'Parcial', legalScore: 100, othersScore: 40 },
            { feature: 'Notas crédito y débito', legal: 'Incluido', others: 'Limitado', legalScore: 100, othersScore: 50 },
            { feature: 'Punto de Venta (POS)', legal: 'Incluido', others: 'Costo adicional', legalScore: 100, othersScore: 20 },
        ],
    },
    {
        id: 'inventario',
        label: 'Inventario',
        icon: Package,
        color: 'text-amber-600',
        iconBg: 'bg-amber-50',
        items: [
            { feature: 'Inventario multi-bodega', legal: 'Completo', others: 'Limitado', legalScore: 100, othersScore: 35 },
            { feature: 'Traslados y trazabilidad', legal: 'Incluido', others: 'No disponible', legalScore: 100, othersScore: 0 },
            { feature: 'Alertas de stock', legal: 'Automático', others: 'Manual', legalScore: 100, othersScore: 25 },
        ],
    },
    {
        id: 'contabilidad',
        label: 'Contabilidad',
        icon: Calculator,
        color: 'text-purple-600',
        iconBg: 'bg-purple-50',
        items: [
            { feature: 'Contabilidad PUC integrada', legal: 'Completo', others: 'Módulo aparte', legalScore: 100, othersScore: 45 },
            { feature: 'Automatización contable', legal: 'Automático', others: 'Manual', legalScore: 100, othersScore: 15 },
            { feature: 'Nómina electrónica', legal: 'Incluido', others: 'No incluido', legalScore: 100, othersScore: 0 },
        ],
    },
    {
        id: 'gestion',
        label: 'Gestión',
        icon: Building2,
        color: 'text-emerald-600',
        iconBg: 'bg-emerald-50',
        items: [
            { feature: 'Multi-sucursal y franquicias', legal: 'Incluido', others: 'Plan premium', legalScore: 100, othersScore: 30 },
            { feature: 'Google Calendar integrado', legal: 'Incluido', others: 'No disponible', legalScore: 100, othersScore: 0 },
            { feature: 'Roles y permisos granulares', legal: 'Completo', others: 'Básico', legalScore: 100, othersScore: 25 },
        ],
    },
    {
        id: 'ventas',
        label: 'Ventas',
        icon: ShoppingCart,
        color: 'text-rose-600',
        iconBg: 'bg-rose-50',
        items: [
            { feature: 'CRM y cartera de clientes', legal: 'Completo', others: 'Básico', legalScore: 100, othersScore: 30 },
            { feature: 'Cotizaciones y borradores', legal: 'Incluido', others: 'No incluido', legalScore: 100, othersScore: 0 },
            { feature: 'Múltiples métodos de pago', legal: 'Incluido', others: 'Limitado', legalScore: 100, othersScore: 40 },
        ],
    },
    {
        id: 'soporte',
        label: 'Soporte',
        icon: BarChart3,
        color: 'text-cyan-600',
        iconBg: 'bg-cyan-50',
        items: [
            { feature: 'Chat de soporte integrado', legal: 'Tiempo real', others: 'Solo tickets', legalScore: 100, othersScore: 20 },
            { feature: 'Reportes en tiempo real', legal: 'Completo', others: 'Solo diarios', legalScore: 100, othersScore: 35 },
            { feature: 'Actualizaciones mensuales', legal: 'Gratis', others: 'Costo extra', legalScore: 100, othersScore: 15 },
        ],
    },
];

const VISIBLE_COUNT = 8;

export function AdvantagesSection() {
    const [showAll, setShowAll] = useState(false);
    const [activeCompCategory, setActiveCompCategory] = useState('facturacion');

    const visibleAdvantages = showAll ? advantages : advantages.slice(0, VISIBLE_COUNT);
    const activeComp = comparisonCategories.find(c => c.id === activeCompCategory) ?? comparisonCategories[0];

    return (
        <section id="ventajas" className="relative py-24 overflow-hidden">
            {/* Clean gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
            <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-emerald-50 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-teal-50 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-14 text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5">
                        <Award size={14} className="text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-700">
                            Todo incluido, sin costos ocultos
                        </span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                        ¿Por qué elegir{' '}
                        <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            Legal Sistema
                        </span>
                        ?
                    </h2>
                    <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
                        Ventajas que nos diferencian de otros sistemas contables en Colombia
                    </p>
                </div>

                {/* Advantages grid */}
                <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleAdvantages.map((adv) => (
                        <div
                            key={adv.title}
                            className={`group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 ${adv.border}`}
                        >
                            <div className={`mb-4 inline-flex self-start rounded-xl p-3 ${adv.iconBg}`}>
                                <adv.icon size={22} className={adv.iconColor} />
                            </div>
                            <h3 className="mb-2 text-base font-bold text-slate-900">{adv.title}</h3>
                            <p className="text-sm leading-relaxed text-slate-500">{adv.description}</p>
                        </div>
                    ))}
                </div>

                {advantages.length > VISIBLE_COUNT && (
                    <div className="mb-16 text-center">
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md hover:border-slate-400"
                        >
                            {showAll ? (
                                <>
                                    Ver menos
                                    <ChevronUp size={16} />
                                </>
                            ) : (
                                <>
                                    Ver más ventajas
                                    <ChevronDown size={16} />
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Comparison - Interactive grouped */}
                <div>
                    <div className="mb-10 text-center">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5">
                            <Shield size={14} className="text-blue-600" />
                            <span className="text-xs font-semibold text-blue-700">
                                Compara y decide con confianza
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                            Legal Sistema vs la competencia
                        </h3>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
                        {/* Category sidebar */}
                        <div className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1.5">
                            {comparisonCategories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCompCategory(cat.id)}
                                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all ${
                                        activeCompCategory === cat.id
                                            ? `${cat.iconBg} ${cat.color} border border-current/20 shadow-sm`
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                    }`}
                                >
                                    <cat.icon size={18} />
                                    <span className="hidden sm:inline">{cat.label}</span>
                                    <span className="ml-auto hidden lg:inline-flex rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold">
                                        {cat.items.length}
                                    </span>
                                </button>
                            ))}

                            {/* Score summary card */}
                            <div className="hidden lg:block mt-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-center">
                                <p className="text-3xl font-extrabold text-white">100%</p>
                                <p className="text-xs font-bold text-emerald-100 mt-1">Puntaje Legal Sistema</p>
                                <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
                                    <div className="h-full w-full rounded-full bg-white" />
                                </div>
                                <p className="mt-3 text-[11px] text-emerald-200/70">
                                    Todo incluido en cada plan
                                </p>
                            </div>
                        </div>

                        {/* Active category content */}
                        <div className="space-y-4">
                            {/* Category header */}
                            <div className={`flex items-center gap-3 rounded-2xl ${activeComp.iconBg} p-5`}>
                                <div className="rounded-xl bg-white p-2.5 shadow-sm">
                                    <activeComp.icon size={22} className={activeComp.color} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900">{activeComp.label}</h4>
                                    <p className="text-xs text-slate-500">{activeComp.items.length} funcionalidades comparadas</p>
                                </div>
                            </div>

                            {/* Comparison items */}
                            {activeComp.items.map((item) => (
                                <div
                                    key={item.feature}
                                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
                                >
                                    <p className="text-[15px] font-bold text-slate-800 mb-5">{item.feature}</p>

                                    {/* Legal Sistema bar */}
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-blue-600">Legal Sistema</span>
                                            </div>
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                                <CheckCircle2 size={13} />
                                                {item.legal}
                                            </span>
                                        </div>
                                        <div className="h-3 rounded-full bg-emerald-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                                                style={{ width: `${item.legalScore}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Others bar */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-slate-400">Otros proveedores</span>
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                                                <X size={13} />
                                                {item.others}
                                            </span>
                                        </div>
                                        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-slate-300 transition-all duration-700"
                                                style={{ width: `${item.othersScore}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
