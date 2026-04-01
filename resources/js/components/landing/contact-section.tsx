import { Mail, MessageCircle, MapPin, Clock, ArrowRight, Send } from 'lucide-react';

function InstagramIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
    );
}

const WHATSAPP_URL = 'https://wa.me/573004301499?text=Hola%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20Legal%20Sistema';
const INSTAGRAM_URL = 'https://www.instagram.com/zyscoreing?igsh=MWQwam1oOWNlamtlYQ==';

export function ContactSection() {
    return (
        <section id="contacto" className="relative py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900" />
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
            <div className="absolute top-0 left-1/3 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-indigo-400/15 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-12 lg:grid-cols-2 items-center">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-1.5">
                            <Send size={13} className="text-cyan-300" />
                            <span className="text-xs font-semibold text-blue-100">Respuesta en minutos</span>
                        </div>

                        <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl leading-tight">
                            ¿Listo para <span className="text-cyan-300">empezar</span>?
                        </h2>

                        <p className="mt-5 text-lg text-blue-100/70 leading-relaxed max-w-lg">
                            Crea tu cuenta gratis y descubre cómo Legal Sistema puede transformar la gestión de tu firma. 30 días de prueba con acceso completo.
                        </p>

                        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                            <a href="/registro" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-7 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-600 hover:shadow-xl">
                                Crear Cuenta Gratis
                                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                            </a>
                            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-7 py-4 text-base font-semibold text-white transition-all hover:bg-white/10 hover:border-white/30">
                                <MessageCircle size={18} />
                                WhatsApp
                            </a>
                        </div>

                        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-200/60 transition-colors hover:text-pink-400">
                            <InstagramIcon size={16} /> Síguenos en Instagram @zyscoreing
                        </a>

                        <p className="mt-3 text-sm text-blue-200/40">Sin compromiso · 30 días gratis · Cancela cuando quieras</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white/10 border border-white/10 p-6 backdrop-blur-sm transition-all hover:bg-white/15">
                            <div className="mb-4 inline-flex rounded-xl bg-green-500/20 p-3"><MessageCircle size={22} className="text-green-400" /></div>
                            <h3 className="text-base font-bold text-white">WhatsApp</h3>
                            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="mt-1.5 block text-sm font-semibold text-green-400 hover:text-green-300 transition-colors">+57 300 430 1499</a>
                            <p className="mt-1 text-xs text-blue-200/50">Respuesta inmediata</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 border border-white/10 p-6 backdrop-blur-sm transition-all hover:bg-white/15">
                            <div className="mb-4 inline-flex rounded-xl bg-blue-500/20 p-3"><Mail size={22} className="text-blue-400" /></div>
                            <h3 className="text-base font-bold text-white">Email</h3>
                            <a href="mailto:hola@grupo-cp.com" className="mt-1.5 block text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">hola@grupo-cp.com</a>
                            <p className="mt-1 text-xs text-blue-200/50">Te respondemos en menos de 24h</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 border border-white/10 p-6 backdrop-blur-sm transition-all hover:bg-white/15">
                            <div className="mb-4 inline-flex rounded-xl bg-purple-500/20 p-3"><MapPin size={22} className="text-purple-400" /></div>
                            <h3 className="text-base font-bold text-white">Ubicación</h3>
                            <p className="mt-1.5 text-sm font-semibold text-white/80">Colombia</p>
                            <p className="mt-1 text-xs text-blue-200/50">Servicio a todo el país</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 border border-white/10 p-6 backdrop-blur-sm transition-all hover:bg-white/15">
                            <div className="mb-4 inline-flex rounded-xl bg-amber-500/20 p-3"><Clock size={22} className="text-amber-400" /></div>
                            <h3 className="text-base font-bold text-white">Horario</h3>
                            <p className="mt-1.5 text-sm font-semibold text-white/80">Lunes a Viernes</p>
                            <p className="mt-1 text-xs text-blue-200/50">8:00 AM - 6:00 PM</p>
                        </div>
                        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="group sm:col-span-2 rounded-2xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-orange-500/20 border border-white/10 p-6 backdrop-blur-sm transition-all hover:from-pink-500/30 hover:via-purple-500/30 hover:to-orange-500/30 hover:border-white/20 flex items-center gap-5">
                            <div className="shrink-0 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 p-3 shadow-lg shadow-pink-500/20"><InstagramIcon size={24} className="text-white" /></div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-white">Instagram</h3>
                                <p className="mt-0.5 text-sm font-semibold text-pink-300 group-hover:text-pink-200 transition-colors">@zyscoreing</p>
                                <p className="mt-0.5 text-xs text-blue-200/50">Síguenos para novedades y tips</p>
                            </div>
                            <ArrowRight size={18} className="shrink-0 text-white/40 transition-all group-hover:text-white/80 group-hover:translate-x-1" />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
