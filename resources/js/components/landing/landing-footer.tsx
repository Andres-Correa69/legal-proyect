import { Mail, MessageCircle } from 'lucide-react';

function InstagramIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
    );
}

const WHATSAPP_URL = 'https://wa.me/573004301499?text=Hola%2C%20me%20interesa%20Legal%20Sistema';
const INSTAGRAM_URL = 'https://www.instagram.com/zyscoreing?igsh=MWQwam1oOWNlamtlYQ==';

export function LandingFooter() {
    const currentYear = new Date().getFullYear();

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <footer className="border-t border-slate-200 bg-slate-50 pb-20 md:pb-0">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="lg:col-span-1">
                        <a href="/" className="flex items-center"><span className="text-xl font-bold text-slate-900">Legal Sistema</span></a>
                        <p className="mt-3 text-sm text-slate-500 leading-relaxed">Software de gestión para firmas de abogados con facturación electrónica DIAN para Colombia.</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Navegación</h4>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => scrollTo('funcionalidades')} className="text-left text-sm text-slate-500 hover:text-slate-900 transition-colors">Funcionalidades</button>
                            <button onClick={() => scrollTo('modulos')} className="text-left text-sm text-slate-500 hover:text-slate-900 transition-colors">Módulos</button>
                            <button onClick={() => scrollTo('ventajas')} className="text-left text-sm text-slate-500 hover:text-slate-900 transition-colors">Ventajas</button>
                            <button onClick={() => scrollTo('precios')} className="text-left text-sm text-slate-500 hover:text-slate-900 transition-colors">Precios</button>
                            <button onClick={() => scrollTo('faq')} className="text-left text-sm text-slate-500 hover:text-slate-900 transition-colors">Preguntas Frecuentes</button>
                            <a href="/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Iniciar Sesión</a>
                            <a href="/registro" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Registrarse</a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Módulos</h4>
                        <div className="flex flex-col gap-2">
                            <span className="text-sm text-slate-500">Facturación Electrónica</span>
                            <span className="text-sm text-slate-500">Punto de Venta (POS)</span>
                            <span className="text-sm text-slate-500">Inventario</span>
                            <span className="text-sm text-slate-500">Contabilidad</span>
                            <span className="text-sm text-slate-500">Nómina Electrónica</span>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Contacto</h4>
                        <div className="flex flex-col gap-3">
                            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 transition-colors"><MessageCircle size={14} /> +57 300 430 1499</a>
                            <a href="mailto:hola@grupo-cp.com" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"><Mail size={14} /> hola@grupo-cp.com</a>
                            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-pink-600 transition-colors"><InstagramIcon size={14} /> @zyscoreing</a>
                        </div>
                    </div>
                </div>

                <div className="mt-10 border-t border-slate-200 pt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                    <p className="text-sm text-slate-500">&copy; {currentYear} LEGAL SISTEMA. Todos los derechos reservados.</p>
                    <p className="text-xs text-slate-400">Certificado DIAN · Software hecho en Colombia</p>
                </div>
            </div>
        </footer>
    );
}
