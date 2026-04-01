import { useState } from 'react';
import { CheckCircle2, ArrowRight, MessageCircle, Sparkles, Zap, Crown, Gift } from 'lucide-react';

const WHATSAPP_BASE = 'https://wa.me/573004301499';

const allFeatures = [
    { text: 'Facturación electrónica DIAN ilimitada', highlight: true },
    { text: 'Punto de venta (POS) completo', highlight: true },
    { text: 'Inventario multi-bodega', highlight: true },
    { text: 'Contabilidad PUC integrada', highlight: true },
    { text: 'Nómina electrónica', highlight: false },
    { text: 'CRM y gestión de clientes', highlight: false },
    { text: 'Reportes y analítica avanzada', highlight: false },
    { text: 'Multi-sucursal y franquicias', highlight: false },
    { text: 'Chat y soporte en tiempo real', highlight: false },
    { text: 'Google Calendar integrado', highlight: false },
    { text: 'Roles y permisos personalizables', highlight: false },
    { text: 'Proveedores y cuentas por pagar', highlight: false },
    { text: 'Auditoría y seguridad avanzada', highlight: false },
    { text: 'Autenticación 2FA', highlight: false },
    { text: 'Usuarios ilimitados', highlight: false },
    { text: 'Actualizaciones automáticas', highlight: false },
    { text: 'Respaldos en la nube (AWS)', highlight: false },
    { text: 'Soporte técnico incluido', highlight: false },
];

export function PricingSection() {
    const [isAnnual, setIsAnnual] = useState(true);

    return (
        <section id="precios" className="relative py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white" />
            <div className="absolute top-0 left-1/3 h-96 w-96 rounded-full bg-amber-50 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-orange-50 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-10 text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5">
                        <Sparkles size={14} className="text-amber-600" />
                        <span className="text-xs font-semibold text-amber-700">Todo incluido en cada plan</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                        Empieza <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">gratis</span>, crece a tu ritmo
                    </h2>
                    <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">Prueba todas las funcionalidades durante 30 días sin compromiso. Luego elige el plan que mejor se adapte.</p>
                </div>

                {/* Toggle for paid plans */}
                <div className="flex items-center justify-center gap-3 mb-12">
                    <button onClick={() => setIsAnnual(false)} className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${!isAnnual ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>Mensual</button>
                    <button onClick={() => setIsAnnual(true)} className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 ${isAnnual ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
                        Anual
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isAnnual ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'}`}>-2 meses</span>
                    </button>
                </div>

                {/* 3 Plans grid */}
                <div className="grid gap-6 lg:grid-cols-3 max-w-6xl mx-auto">
                    {/* Prueba Gratis */}
                    <div className="relative rounded-2xl bg-white border-2 border-green-500 shadow-xl shadow-green-500/10 transition-all hover:-translate-y-1">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-1.5 text-sm font-bold text-white shadow-lg shadow-green-500/25">
                                <Gift size={14} /> Gratis
                            </span>
                        </div>
                        <div className="p-8 pb-6 rounded-t-2xl bg-gradient-to-br from-green-50 to-emerald-50">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="rounded-xl p-2.5 bg-green-100"><Gift size={20} className="text-green-600" /></div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Prueba Gratis</h3>
                                    <p className="text-xs text-slate-500">30 días sin compromiso</p>
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1 mb-2"><span className="text-4xl font-extrabold text-slate-900">$0</span><span className="text-sm text-slate-500">/ 30 días</span></div>
                            <p className="text-sm text-slate-500">Acceso completo a todas las funcionalidades. Sin tarjeta de crédito.</p>
                        </div>
                        <div className="px-8 py-6">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Todo incluido</p>
                            <div className="space-y-2.5">
                                {allFeatures.slice(0, 10).map((f) => (
                                    <div key={f.text} className="flex items-start gap-2">
                                        <CheckCircle2 size={15} className={`mt-0.5 shrink-0 ${f.highlight ? 'text-green-500' : 'text-slate-300'}`} />
                                        <span className={`text-sm ${f.highlight ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>{f.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="px-8 pb-8">
                            <a href="/registro" className="group flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-green-500/25 transition-all hover:bg-green-700 hover:shadow-xl">
                                Crear Cuenta Gratis <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                            </a>
                        </div>
                    </div>

                    {/* Plan Mensual */}
                    <div className={`relative rounded-2xl transition-all hover:-translate-y-1 ${!isAnnual ? 'bg-white border-2 border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]' : 'bg-white border border-slate-200 shadow-sm'}`}>
                        {!isAnnual && <div className="absolute -top-4 left-1/2 -translate-x-1/2"><span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-1.5 text-sm font-bold text-white shadow-lg">Flexible</span></div>}
                        <div className={`p-8 pb-6 rounded-t-2xl ${!isAnnual ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : ''}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`rounded-xl p-2.5 ${!isAnnual ? 'bg-blue-100' : 'bg-slate-100'}`}><Zap size={20} className={!isAnnual ? 'text-blue-600' : 'text-slate-400'} /></div>
                                <div><h3 className="text-lg font-bold text-slate-900">Plan Mensual</h3><p className="text-xs text-slate-500">Sin contratos de permanencia</p></div>
                            </div>
                            <p className="text-sm text-slate-500">Paga mes a mes con total flexibilidad. Cancela cuando quieras.</p>
                        </div>
                        <div className="px-8 py-6">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Todo incluido</p>
                            <div className="space-y-2.5">
                                {allFeatures.slice(0, 10).map((f) => (
                                    <div key={f.text} className="flex items-start gap-2">
                                        <CheckCircle2 size={15} className={`mt-0.5 shrink-0 ${f.highlight ? 'text-blue-500' : 'text-slate-300'}`} />
                                        <span className={`text-sm ${f.highlight ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>{f.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="px-8 pb-8">
                            <a href={`${WHATSAPP_BASE}?text=${encodeURIComponent('Hola, me interesa el plan Mensual de Legal Sistema. ¿Podrían darme más información sobre precios?')}`} target="_blank" rel="noopener noreferrer" className={`group flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold transition-all ${!isAnnual ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                <MessageCircle size={16} /> Consultar precio <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                            </a>
                        </div>
                    </div>

                    {/* Plan Anual */}
                    <div className={`relative rounded-2xl transition-all hover:-translate-y-1 ${isAnnual ? 'bg-white border-2 border-amber-500 shadow-xl shadow-amber-500/10 scale-[1.02]' : 'bg-white border border-slate-200 shadow-sm'}`}>
                        {isAnnual && <div className="absolute -top-4 left-1/2 -translate-x-1/2"><span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-1.5 text-sm font-bold text-white shadow-lg shadow-amber-500/25"><Crown size={14} className="fill-white" /> Mejor valor</span></div>}
                        <div className={`p-8 pb-6 rounded-t-2xl ${isAnnual ? 'bg-gradient-to-br from-amber-50 to-orange-50' : ''}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`rounded-xl p-2.5 ${isAnnual ? 'bg-amber-100' : 'bg-slate-100'}`}><Crown size={20} className={isAnnual ? 'text-amber-600' : 'text-slate-400'} /></div>
                                    <div><h3 className="text-lg font-bold text-slate-900">Plan Anual</h3><p className="text-xs text-slate-500">Ahorra el equivalente a 2 meses</p></div>
                                </div>
                                {isAnnual && <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">Ahorra 17%</span>}
                            </div>
                            <p className="text-sm text-slate-500">Paga anualmente y obtén el máximo valor. Soporte prioritario incluido.</p>
                        </div>
                        <div className="px-8 py-6">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Todo incluido + soporte prioritario</p>
                            <div className="space-y-2.5">
                                {allFeatures.slice(0, 10).map((f) => (
                                    <div key={f.text} className="flex items-start gap-2">
                                        <CheckCircle2 size={15} className={`mt-0.5 shrink-0 ${f.highlight ? 'text-amber-500' : 'text-slate-300'}`} />
                                        <span className={`text-sm ${f.highlight ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>{f.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="px-8 pb-8">
                            <a href={`${WHATSAPP_BASE}?text=${encodeURIComponent('Hola, me interesa el plan Anual de Legal Sistema. ¿Podrían darme más información sobre precios?')}`} target="_blank" rel="noopener noreferrer" className={`group flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold transition-all ${isAnnual ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                <MessageCircle size={16} /> Consultar precio <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
                    <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /><span>Sin tarjeta de crédito</span></div>
                    <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /><span>Actualizaciones gratis</span></div>
                    <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /><span>Soporte incluido</span></div>
                    <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /><span>Respaldos en AWS</span></div>
                </div>
            </div>
        </section>
    );
}
