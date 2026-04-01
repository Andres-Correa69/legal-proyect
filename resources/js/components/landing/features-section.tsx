import { useState } from 'react';
import { FileText, ShoppingCart, Package, Calculator, Users, BarChart3, Building2, Wallet, Calendar, MessageCircle, Truck, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

const features = [
    { icon: FileText, title: 'Facturación Electrónica DIAN', description: 'Emite facturas, notas crédito y débito validadas por la DIAN. Cumplimiento normativo automático y en tiempo real.' },
    { icon: ShoppingCart, title: 'Punto de Venta (POS)', description: 'Sistema POS completo con lectores de código de barras, múltiples métodos de pago y cajas registradoras.' },
    { icon: Package, title: 'Inventario Inteligente', description: 'Control total de stock, bodegas, movimientos, compras, traslados, ajustes y reconciliaciones automáticas.' },
    { icon: Calculator, title: 'Contabilidad Completa', description: 'Plan de cuentas PUC, asientos contables, balance general, estado de resultados y libros mayores.' },
    { icon: Wallet, title: 'Nómina Electrónica', description: 'Genera nómina electrónica, desprendibles de pago, seguridad social y prestaciones laborales.' },
    { icon: Users, title: 'CRM y Clientes', description: 'Gestión de clientes, historial de compras, cartera, cuentas por cobrar y seguimiento de pagos.' },
    { icon: BarChart3, title: 'Reportes y Analítica', description: 'Dashboards en tiempo real, reportes de ventas, productos más vendidos, utilidades y tendencias.' },
    { icon: Building2, title: 'Multi-Sucursal', description: 'Gestiona múltiples sedes, franquicias y empresas desde una sola plataforma centralizada.' },
    { icon: Calendar, title: 'Calendario y Citas', description: 'Calendario visual con sincronización a Google Calendar, gestión de citas y recordatorios automáticos.' },
    { icon: MessageCircle, title: 'Chat en Tiempo Real', description: 'Mensajería instantánea entre empleados, canales por sucursal y soporte técnico integrado.' },
    { icon: Truck, title: 'Proveedores y Compras', description: 'Directorio de proveedores, cuentas por pagar, órdenes de compra y retenciones automáticas.' },
    { icon: ShieldCheck, title: 'Seguridad y Auditoría', description: 'Autenticación 2FA, roles y permisos granulares, logs de auditoría y alertas de seguridad.' },
];

const VISIBLE_COUNT = 8;

export function FeaturesSection() {
    const [showAll, setShowAll] = useState(false);
    const visibleFeatures = showAll ? features : features.slice(0, VISIBLE_COUNT);

    return (
        <section id="funcionalidades" className="relative py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900" />
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
            <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-16 text-center">
                    <h2 className="text-3xl font-bold text-white sm:text-4xl">Todo lo que necesitas en <span className="text-cyan-300">un solo lugar</span></h2>
                    <p className="mt-4 text-lg text-blue-100/80 max-w-2xl mx-auto">Legal Sistema centraliza todas las herramientas para gestionar tu firma de forma eficiente. 12 módulos especializados en una sola plataforma.</p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleFeatures.map((feature) => (
                        <div key={feature.title} className="group rounded-xl border border-white/10 bg-white/10 p-6 backdrop-blur-sm transition-all hover:bg-white/15 hover:border-white/20 hover:-translate-y-1">
                            <div className="mb-4 inline-flex rounded-lg bg-white/15 p-3"><feature.icon size={24} className="text-cyan-300" /></div>
                            <h3 className="mb-2 text-lg font-semibold text-white">{feature.title}</h3>
                            <p className="text-sm leading-relaxed text-blue-100/70">{feature.description}</p>
                        </div>
                    ))}
                </div>

                {features.length > VISIBLE_COUNT && (
                    <div className="mt-10 text-center">
                        <button onClick={() => setShowAll(!showAll)} className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:border-white/30">
                            {showAll ? <>Ver menos <ChevronUp size={16} /></> : <>Ver más funcionalidades <ChevronDown size={16} /></>}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
