import { Building2, Users, ShoppingCart, Globe, Award, Clock, ArrowRight, Sparkles } from 'lucide-react';

const stats = [
    { icon: Building2, value: '12+', label: 'Módulos integrados', description: 'Todo en una sola plataforma', color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100' },
    { icon: ShoppingCart, value: '100%', label: 'Automatizado', description: 'Facturación, inventario y contabilidad', color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
    { icon: Users, value: 'Ilimitados', label: 'Usuarios', description: 'Sin restricciones por usuario', color: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-100' },
    { icon: Globe, value: '24/7', label: 'Disponibilidad', description: 'Acceso desde cualquier lugar', color: 'text-cyan-600', bg: 'bg-cyan-50', ring: 'ring-cyan-100' },
    { icon: Award, value: 'DIAN', label: 'Certificado', description: 'Facturación y nómina electrónica', color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100' },
    { icon: Clock, value: '5 min', label: 'Configuración', description: 'Empieza a usar en minutos', color: 'text-rose-600', bg: 'bg-rose-50', ring: 'ring-rose-100' },
];

export function StatsSection() {
    return (
        <section className="relative py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900" />
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
            <div className="absolute left-1/3 top-0 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute right-1/4 bottom-0 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-14 text-center">
                    <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">Números que <span className="text-cyan-300">hablan por sí solos</span></h2>
                    <p className="mt-4 text-lg text-blue-100/60 max-w-xl mx-auto">La plataforma más completa para empresas colombianas</p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.map((stat) => (
                        <div key={stat.label} className="group rounded-2xl bg-white/10 border border-white/10 p-6 backdrop-blur-sm text-center transition-all hover:bg-white/15 hover:border-white/20 hover:-translate-y-1">
                            <div className={`mx-auto mb-4 inline-flex rounded-2xl ${stat.bg} p-4 ring-4 ${stat.ring}`}><stat.icon size={28} className={stat.color} /></div>
                            <p className="text-4xl font-extrabold text-white tracking-tight">{stat.value}</p>
                            <p className="mt-1.5 text-sm font-bold text-blue-200">{stat.label}</p>
                            <p className="mt-1 text-xs text-blue-200/50">{stat.description}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-14 text-center">
                    <a href="/registro" className="group inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:border-white/30">
                        <Sparkles size={16} className="text-cyan-300" />
                        Prueba gratis por 30 días
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </a>
                </div>
            </div>
        </section>
    );
}
