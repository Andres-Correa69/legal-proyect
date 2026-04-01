import { useState } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
    { quote: 'Legal Sistema transformó la forma en que gestionamos nuestro negocio. Antes usábamos 3 sistemas diferentes, ahora todo está en un solo lugar.', author: 'Laura Peña', role: 'Abogada', industry: 'Servicios Legales', rating: 5 },
    { quote: 'La facturación electrónica con la DIAN era un dolor de cabeza hasta que conocimos Legal Sistema. Ahora es automático y nunca hemos tenido un problema.', author: 'Carolina Zapata', role: 'Psicóloga', industry: 'Salud Mental', rating: 5 },
    { quote: 'Con 4 sucursales, necesitábamos un sistema que centralizara todo. Legal Sistema nos da el control que necesitamos con reportes en tiempo real.', author: 'Ana Maria Jaramillo', role: 'Contadora', industry: 'Servicios Contables', rating: 5 },
    { quote: 'Legal Sistema nos permitió tener todo el control del taller en un solo sistema. Inventario, facturación y clientes organizados como nunca antes.', author: 'Oscar Alberto Valencia', role: 'Propietario', industry: 'Servi Autos JC del Quindío', rating: 5 },
    { quote: 'La contabilidad integrada con las ventas nos ahorra horas de trabajo cada semana. Los asientos se generan automáticamente.', author: 'Ana Maria Ospina', role: 'Gerente', industry: 'Vetlogy', rating: 5 },
    { quote: 'Como ingeniero de sistemas, valoro la arquitectura de Legal Sistema. Es robusto, rápido y la integración entre módulos es impecable.', author: 'Andres Correa Valencia', role: 'Ingeniero de Sistemas', industry: 'Independiente', rating: 5 },
    { quote: 'Desde que usamos Legal Sistema, cerrar ventas y hacer seguimiento a clientes es mucho más fácil. Todo queda registrado automáticamente.', author: 'Yessica Arias', role: 'Asesora Comercial', industry: 'Comercio', rating: 5 },
    { quote: 'Legal Sistema nos permitió digitalizar toda la operación de nuestra franquicia. El control multi-sucursal es espectacular.', author: 'Santiago Restrepo', role: 'CEO', industry: 'Franquicia', rating: 5 },
    { quote: 'Los reportes en tiempo real cambiaron la forma en que tomamos decisiones. Ahora todo está basado en datos concretos.', author: 'Valentina Morales', role: 'Gerente Comercial', industry: 'Tecnología', rating: 5 },
];

const avatarColors = ['from-violet-500 to-purple-600','from-blue-500 to-indigo-600','from-rose-500 to-pink-600','from-amber-500 to-orange-600','from-emerald-500 to-teal-600','from-cyan-500 to-blue-600','from-fuchsia-500 to-purple-600','from-red-500 to-rose-600','from-sky-500 to-indigo-600'];

export function TestimonialsSection() {
    const [page, setPage] = useState(0);
    const perPage = 3;
    const totalPages = Math.ceil(testimonials.length / perPage);
    const visible = testimonials.slice(page * perPage, page * perPage + perPage);

    return (
        <section className="relative py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-blue-100/40 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-14 text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5">
                        <Star size={14} className="text-amber-500 fill-amber-500" />
                        <span className="text-xs font-semibold text-blue-700">Calificación 5/5 por nuestros clientes</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                        Lo que dicen nuestros <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">clientes</span>
                    </h2>
                    <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">Empresas colombianas que ya confían en Legal Sistema para gestionar su negocio</p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map((t, i) => {
                        const globalIndex = page * perPage + i;
                        return (
                            <div key={t.author} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 hover:border-blue-200">
                                <div className="flex gap-0.5 mb-5">{Array.from({ length: t.rating }).map((_, si) => <Star key={si} size={16} className="text-amber-400 fill-amber-400" />)}</div>
                                <p className="text-[15px] leading-relaxed text-slate-600 flex-1 mb-6">"{t.quote}"</p>
                                <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
                                    <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${avatarColors[globalIndex % avatarColors.length]} flex items-center justify-center text-white font-bold text-sm shadow-md`}>{t.author.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{t.author}</p>
                                        <p className="text-xs text-slate-500">{t.role} · {t.industry}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-10 flex items-center justify-center gap-4">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={18} /></button>
                    <div className="flex gap-2">{Array.from({ length: totalPages }).map((_, i) => <button key={i} onClick={() => setPage(i)} className={`h-2.5 rounded-full transition-all ${i === page ? 'w-8 bg-blue-600' : 'w-2.5 bg-slate-200 hover:bg-slate-300'}`} />)}</div>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={18} /></button>
                </div>
            </div>
        </section>
    );
}
