import { useState, useEffect } from 'react';
import { X, Home, LayoutGrid, Award, Tag, Mail } from 'lucide-react';

export function LandingNavbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [bannerVisible, setBannerVisible] = useState(true);
    const [activeSection, setActiveSection] = useState('');

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
            const sections = ['funcionalidades', 'modulos', 'ventajas', 'precios', 'contacto'];
            let current = '';
            for (const id of sections) {
                const el = document.getElementById(id);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top <= 200) current = id;
                }
            }
            setActiveSection(current);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollTo = (id: string) => {
        if (id === 'top') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const mobileNavItems = [
        { id: 'top', icon: Home, label: 'Inicio' },
        { id: 'funcionalidades', icon: LayoutGrid, label: 'Features' },
        { id: 'ventajas', icon: Award, label: 'Ventajas' },
        { id: 'precios', icon: Tag, label: 'Precios' },
        { id: 'contacto', icon: Mail, label: 'Contacto' },
    ];

    return (
        <>
            <header className="sticky top-0 z-50">
                {/* Banner marquee animado */}
                {bannerVisible && (
                    <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white overflow-hidden">
                        <a href="/registro" className="block py-2.5 transition-opacity hover:opacity-90">
                            <div className="flex whitespace-nowrap" style={{ animation: 'marquee 25s linear infinite' }}>
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="flex shrink-0 items-center gap-8 px-8">
                                        <span className="flex items-center gap-1.5 text-sm font-medium">🎉 ¡1 MES GRATIS! Prueba nuestro Software de Gestión Legal &rarr;</span>
                                        <span className="flex items-center gap-1.5 text-sm font-medium">🚀 Gestión de casos + Expedientes + Facturación DIAN + Agenda &rarr;</span>
                                        <span className="flex items-center gap-1.5 text-sm font-medium">✨ Regístrate gratis y empieza a gestionar tu firma hoy &rarr;</span>
                                    </div>
                                ))}
                            </div>
                        </a>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBannerVisible(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 p-1 transition-colors hover:bg-white/20" aria-label="Cerrar"><X size={14} /></button>
                    </div>
                )}

                {/* Navbar */}
                <nav className={`transition-all duration-500 ${isScrolled ? 'bg-white/70 backdrop-blur-2xl border-b border-slate-200/60 shadow-lg shadow-slate-900/5 [backdrop-saturate:180%]' : 'bg-white/90 backdrop-blur-lg'}`}>
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 items-center justify-between">
                            <a href="/" className="flex items-center"><span className="text-xl font-bold text-slate-900">Legal Sistema</span></a>

                            <div className="hidden items-center gap-8 md:flex">
                                <button onClick={() => scrollTo('funcionalidades')} className="text-sm text-slate-600 transition-colors hover:text-slate-900">Funcionalidades</button>
                                <button onClick={() => scrollTo('modulos')} className="text-sm text-slate-600 transition-colors hover:text-slate-900">Módulos</button>
                                <button onClick={() => scrollTo('ventajas')} className="text-sm text-slate-600 transition-colors hover:text-slate-900">Ventajas</button>
                                <button onClick={() => scrollTo('precios')} className="text-sm text-slate-600 transition-colors hover:text-slate-900">Precios</button>
                                <button onClick={() => scrollTo('faq')} className="text-sm text-slate-600 transition-colors hover:text-slate-900">FAQ</button>
                                <button onClick={() => scrollTo('contacto')} className="text-sm text-slate-600 transition-colors hover:text-slate-900">Contacto</button>
                            </div>

                            <div className="hidden items-center gap-3 md:flex">
                                <a href="/login" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50">Iniciar Sesión</a>
                                <a href="/registro" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25">Prueba Gratis</a>
                            </div>
                        </div>
                    </div>
                </nav>
            </header>

            {/* Mobile Bottom Tab Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
                <div className="border-t border-slate-200 bg-white/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                    <div className="flex items-center justify-around px-2 py-1.5">
                        {mobileNavItems.map((item) => {
                            const isActive = item.id === 'top' ? activeSection === '' : activeSection === item.id;
                            return (
                                <button key={item.id} onClick={() => scrollTo(item.id)} className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                                    <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="h-[env(safe-area-inset-bottom)]" />
                </div>
            </nav>
        </>
    );
}
