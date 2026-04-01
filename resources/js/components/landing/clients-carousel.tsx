import { Building2 } from 'lucide-react';

const clients = [
    { src: '/images/clients/angel-arte.png', alt: 'Angel Arte' },
    { src: '/images/clients/el-sabor.png', alt: 'El Sabor' },
    { src: '/images/clients/tarjeta-carolina.png', alt: 'Carolina' },
    { src: '/images/clients/vetlatam.png', alt: 'VetLatam' },
    { src: '/images/clients/animales.png', alt: 'Animales' },
    { src: '/images/clients/lo1.png', alt: 'Cliente 1' },
    { src: '/images/clients/lo2.png', alt: 'Cliente 2' },
    { src: '/images/clients/lo3.png', alt: 'Cliente 3' },
    { src: '/images/clients/logolau.png', alt: 'LogoLau' },
    { src: '/images/clients/loguito-r.png', alt: 'Loguito R' },
];

export function ClientsCarousel() {
    return (
        <section className="relative py-20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-12 text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 shadow-sm">
                        <Building2 size={14} className="text-blue-600" />
                        <span className="text-xs font-semibold text-slate-700">Empresas que confían en nosotros</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                        Ellos ya usan{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Legal Sistema</span>
                    </h2>
                </div>
            </div>

            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent sm:w-40" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent sm:w-40" />

                <div className="flex" style={{ animation: 'scroll-left 35s linear infinite' }}>
                    {[0, 1, 2].map((set) => (
                        <div key={set} className="flex shrink-0 items-center gap-8 px-4">
                            {clients.map((client, i) => (
                                <div key={`${set}-${i}`} className="group flex h-20 w-44 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5">
                                    <img src={client.src} alt={client.alt} className="max-h-12 max-w-full object-contain opacity-70 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0" />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="mt-5 flex" style={{ animation: 'scroll-right 40s linear infinite' }}>
                    {[0, 1, 2].map((set) => (
                        <div key={set} className="flex shrink-0 items-center gap-8 px-4">
                            {[...clients].reverse().map((client, i) => (
                                <div key={`${set}-${i}`} className="group flex h-20 w-44 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5">
                                    <img src={client.src} alt={client.alt} className="max-h-12 max-w-full object-contain opacity-70 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0" />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
