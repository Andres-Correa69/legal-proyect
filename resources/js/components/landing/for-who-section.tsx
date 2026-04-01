import { ShoppingBag, Utensils, Stethoscope, Wrench, Building, Truck, Scissors, Store, CheckCircle2 } from 'lucide-react';

const industries = [
    { icon: ShoppingBag, title: 'Tiendas y Retail', description: 'Punto de venta ágil, control de inventario multi-bodega y facturación electrónica para tu tienda.', highlights: ['POS con código de barras', 'Inventario en tiempo real', 'Reportes de ventas'], color: 'text-blue-600', iconBg: 'bg-blue-50', border: 'hover:border-blue-200' },
    { icon: Utensils, title: 'Restaurantes y Cafés', description: 'POS rápido con múltiples métodos de pago, control de insumos y reportes de ventas en tiempo real.', highlights: ['Cierres de caja', 'Control de insumos', 'Múltiples métodos de pago'], color: 'text-orange-600', iconBg: 'bg-orange-50', border: 'hover:border-orange-200' },
    { icon: Stethoscope, title: 'Consultorios y Clínicas', description: 'Gestión de citas con Google Calendar, facturación de servicios y control de pacientes.', highlights: ['Calendario integrado', 'Recordatorios automáticos', 'Historial de pacientes'], color: 'text-emerald-600', iconBg: 'bg-emerald-50', border: 'hover:border-emerald-200' },
    { icon: Wrench, title: 'Servicios Profesionales', description: 'Facturación electrónica, cotizaciones, cartera de clientes y contabilidad integrada.', highlights: ['Cotizaciones rápidas', 'Cartera de clientes', 'Contabilidad automática'], color: 'text-purple-600', iconBg: 'bg-purple-50', border: 'hover:border-purple-200' },
    { icon: Building, title: 'Empresas con Sucursales', description: 'Gestión centralizada multi-sede, reportes consolidados e inventario independiente por sucursal.', highlights: ['Panel centralizado', 'Inventario por sede', 'Reportes consolidados'], color: 'text-sky-600', iconBg: 'bg-sky-50', border: 'hover:border-sky-200' },
    { icon: Truck, title: 'Distribuidoras', description: 'Control de inventario avanzado, gestión de proveedores, cuentas por pagar y trazabilidad completa.', highlights: ['Órdenes de compra', 'Trazabilidad completa', 'Cuentas por pagar'], color: 'text-rose-600', iconBg: 'bg-rose-50', border: 'hover:border-rose-200' },
    { icon: Scissors, title: 'Salones y Spas', description: 'Calendario de citas, recordatorios automáticos, facturación de servicios y control de productos.', highlights: ['Agenda de citas', 'Google Calendar sync', 'Facturación de servicios'], color: 'text-pink-600', iconBg: 'bg-pink-50', border: 'hover:border-pink-200' },
    { icon: Store, title: 'Franquicias', description: 'Soporte nativo para franquicias con empresa padre, datos independientes y reportes consolidados.', highlights: ['Empresa padre/hija', 'Datos independientes', 'Control centralizado'], color: 'text-amber-600', iconBg: 'bg-amber-50', border: 'hover:border-amber-200' },
];

export function ForWhoSection() {
    return (
        <section className="relative py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white" />
            <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-blue-50 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-purple-50 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-14 text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5">
                        <Building size={14} className="text-purple-600" />
                        <span className="text-xs font-semibold text-purple-700">Para todo tipo de negocio</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                        ¿Para quién es <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Legal Sistema</span>?
                    </h2>
                    <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">Diseñado para firmas de abogados, abogados independientes, consultorios jurídicos, notarías y todo profesional del derecho que necesite gestionar su práctica de forma profesional.</p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {industries.map((industry) => (
                        <div key={industry.title} className={`group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 ${industry.border}`}>
                            <div className={`mb-4 inline-flex self-start rounded-xl p-3 ${industry.iconBg}`}><industry.icon size={22} className={industry.color} /></div>
                            <h3 className="mb-2 text-base font-bold text-slate-900">{industry.title}</h3>
                            <p className="text-sm leading-relaxed text-slate-500 mb-4 flex-1">{industry.description}</p>
                            <div className="space-y-1.5 pt-4 border-t border-slate-100">
                                {industry.highlights.map((h) => (
                                    <div key={h} className="flex items-center gap-2">
                                        <CheckCircle2 size={13} className={`shrink-0 ${industry.color}`} />
                                        <span className="text-xs text-slate-600">{h}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
