import { ArrowRight, Rocket } from 'lucide-react';

export function CtaSection() {
    return (
        <section className="relative py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-800 via-indigo-900 to-slate-900" />
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
            <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl" />

            <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                <div className="mb-8 flex justify-center"><span className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">Legal Sistema</span></div>

                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 border border-white/10">
                    <Rocket size={14} className="text-cyan-300" />
                    <span className="text-xs font-medium text-blue-100">Únete a cientos de empresas colombianas</span>
                </div>

                <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">¿Listo para transformar <span className="text-cyan-300">tu firma</span>?</h2>

                <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-100/70">Configura tu firma en minutos, empieza a facturar hoy mismo y lleva tu firma al siguiente nivel con Legal Sistema.</p>

                <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                    <a href="/registro" className="group inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-base font-semibold text-blue-700 shadow-lg transition-all hover:bg-blue-50 hover:shadow-xl">
                        Inicia tu prueba gratuita de 30 días <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </a>
                    <a href="/login" className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-8 py-4 text-base font-medium text-white transition-all hover:bg-white/10 hover:border-white/30">Ya tengo cuenta</a>
                </div>

                <p className="mt-6 text-sm text-blue-200/50">Sin tarjeta de crédito · Sin compromiso · Cancela cuando quieras</p>
            </div>
        </section>
    );
}
