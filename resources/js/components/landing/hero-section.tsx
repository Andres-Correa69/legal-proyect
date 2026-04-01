import { ArrowRight, Sparkles, TrendingUp, ShieldCheck, Cloud, BarChart3, ShoppingCart, DollarSign, Package, Users } from 'lucide-react';

export function HeroSection() {
    return (
        <section className="relative flex min-h-screen items-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/60 to-white" />
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
            <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-400/10 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                <div className="grid items-center gap-12 lg:grid-cols-2">
                    <div className="text-center lg:text-left">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5">
                            <Sparkles size={14} className="text-blue-600" />
                            <span className="text-xs font-medium text-blue-700">Sistema de gestión integral para firmas de abogados en Colombia</span>
                        </div>

                        <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                            La plataforma que tu{' '}<span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">firma necesita</span>{' '}para crecer
                        </h1>

                        <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
                            Legal Sistema es el software de gestión para abogados más completo de Colombia. Administra casos, organiza expedientes, factura electrónicamente y toma decisiones con reportes en tiempo real.
                        </p>

                        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
                            <a href="/registro" className="group inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30">
                                Inicia tu prueba gratuita de 30 días
                                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                            </a>
                            <a href="/login" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-8 py-3.5 text-base font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50">Ya tengo cuenta</a>
                        </div>

                        <p className="mt-4 text-sm text-slate-500">Sin tarjeta de crédito · Configuración en 5 minutos · Cancela cuando quieras</p>
                    </div>

                    <div className="flex justify-center lg:justify-end">
                        <div className="relative w-full max-w-lg">
                            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-400/20 to-cyan-400/20 blur-2xl" />
                            <div className="relative rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 overflow-hidden">
                                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                                    <div className="flex gap-1.5"><div className="h-3 w-3 rounded-full bg-red-400/70" /><div className="h-3 w-3 rounded-full bg-yellow-400/70" /><div className="h-3 w-3 rounded-full bg-green-400/70" /></div>
                                    <div className="mx-auto rounded-md bg-white px-4 py-1 text-[11px] text-slate-400 border border-slate-100">app.legalsistema.co/admin/dashboard</div>
                                </div>
                                <div className="bg-slate-50 p-4 space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="rounded-lg bg-white p-3 border border-slate-100"><div className="flex items-center justify-between mb-1"><DollarSign size={14} className="text-green-500" /><TrendingUp size={12} className="text-green-500" /></div><p className="text-sm font-bold text-slate-900">$4.2M</p><p className="text-[10px] text-slate-400">Honorarios hoy</p></div>
                                        <div className="rounded-lg bg-white p-3 border border-slate-100"><div className="flex items-center justify-between mb-1"><ShoppingCart size={14} className="text-blue-500" /><TrendingUp size={12} className="text-blue-500" /></div><p className="text-sm font-bold text-slate-900">127</p><p className="text-[10px] text-slate-400">Casos</p></div>
                                        <div className="rounded-lg bg-white p-3 border border-slate-100"><div className="flex items-center justify-between mb-1"><Users size={14} className="text-purple-500" /><TrendingUp size={12} className="text-purple-500" /></div><p className="text-sm font-bold text-slate-900">89</p><p className="text-[10px] text-slate-400">Clientes</p></div>
                                    </div>
                                    <div className="rounded-lg bg-white p-4 border border-slate-100">
                                        <div className="flex items-center justify-between mb-3"><p className="text-xs font-semibold text-slate-700">Honorarios del mes</p><BarChart3 size={14} className="text-slate-400" /></div>
                                        <div className="flex items-end gap-1.5 h-20">{[40,65,45,80,55,90,70,85,60,95,75,50].map((h,i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-blue-400 opacity-80" style={{ height: `${h}%` }} />)}</div>
                                        <div className="flex justify-between mt-1.5"><span className="text-[9px] text-slate-400">Ene</span><span className="text-[9px] text-slate-400">Jun</span><span className="text-[9px] text-slate-400">Dic</span></div>
                                    </div>
                                    <div className="rounded-lg bg-white p-3 border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-700 mb-2">Actividad reciente</p>
                                        <div className="space-y-2">
                                            {[{ icon: ShoppingCart, text: 'Caso #1247 - Familia López', color: 'text-green-500', bg: 'bg-green-50' },{ icon: Package, text: 'Expediente actualizado', color: 'text-amber-500', bg: 'bg-amber-50' },{ icon: ShieldCheck, text: 'Factura DIAN enviada', color: 'text-blue-500', bg: 'bg-blue-50' }].map((item, i) => (
                                                <div key={i} className="flex items-center gap-2"><div className={`rounded-md p-1 ${item.bg}`}><item.icon size={10} className={item.color} /></div><span className="text-[11px] text-slate-600">{item.text}</span></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm transition-all hover:shadow-md hover:-translate-y-0.5"><div className="mx-auto mb-2 inline-flex rounded-lg p-2 bg-blue-50"><Cloud size={20} className="text-blue-600" /></div><p className="text-xl font-bold text-slate-900">100%</p><p className="mt-0.5 text-xs text-slate-500">En la nube</p></div>
                    <div className="rounded-xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center p-3"><img src="/images/logo dian.webp" alt="DIAN Certificado" className="w-full h-full object-contain max-h-20" /></div>
                    <div className="rounded-xl border border-slate-200 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm transition-all hover:shadow-md hover:-translate-y-0.5"><div className="mx-auto mb-2 inline-flex rounded-lg p-2 bg-purple-50"><TrendingUp size={20} className="text-purple-600" /></div><p className="text-xl font-bold text-slate-900">24/7</p><p className="mt-0.5 text-xs text-slate-500">Disponible</p></div>
                    <div className="rounded-xl border border-slate-200 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm transition-all hover:shadow-md hover:-translate-y-0.5"><div className="mx-auto mb-2 inline-flex rounded-lg p-2 bg-cyan-50"><BarChart3 size={20} className="text-cyan-600" /></div><p className="text-xl font-bold text-slate-900">Tiempo real</p><p className="mt-0.5 text-xs text-slate-500">Reportes</p></div>
                </div>
            </div>
        </section>
    );
}
