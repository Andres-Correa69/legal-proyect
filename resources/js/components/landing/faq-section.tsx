import { useState } from 'react';
import { ChevronDown, MessageCircle, HelpCircle, Search, ArrowRight } from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/573004301499?text=Hola%2C%20tengo%20una%20pregunta%20sobre%20Legal%20Sistema';

const categories = [
    { id: 'all', label: 'Todas' },
    { id: 'general', label: 'General' },
    { id: 'features', label: 'Funcionalidades' },
    { id: 'security', label: 'Seguridad' },
    { id: 'support', label: 'Soporte' },
];

const faqs = [
    { question: '¿Qué es Legal Sistema?', answer: 'Legal Sistema es un software integral de facturación electrónica, inventario, contabilidad, nómina y gestión empresarial diseñado específicamente para empresas colombianas. Funciona 100% en la nube y está certificado por la DIAN.', category: 'general' },
    { question: '¿Legal Sistema está certificado por la DIAN?', answer: 'Sí, Legal Sistema está completamente certificado por la DIAN para facturación electrónica y nómina electrónica. Cumplimos con toda la normativa colombiana vigente y nos mantenemos actualizados con cada cambio regulatorio.', category: 'general' },
    { question: '¿Necesito instalar algo en mi computador?', answer: 'No. Legal Sistema es 100% en la nube. Solo necesitas un navegador web y conexión a internet. Puedes acceder desde cualquier computador, tablet o celular sin instalar nada.', category: 'general' },
    { question: '¿Puedo gestionar múltiples sucursales?', answer: 'Sí. Legal Sistema soporta multi-sucursal y franquicias. Puedes gestionar inventario independiente por sucursal, generar reportes consolidados y controlar el acceso por sede.', category: 'features' },
    { question: '¿Cuántos usuarios puedo tener?', answer: 'Dependiendo del plan, puedes tener desde 1 hasta usuarios ilimitados. Cada usuario puede tener roles y permisos personalizados para controlar exactamente qué puede hacer en el sistema.', category: 'features' },
    { question: '¿Mis datos están seguros?', answer: 'Absolutamente. Tus datos están alojados en AWS (Amazon Web Services), con respaldos automáticos, cifrado de datos, autenticación de dos factores (2FA) y logs de auditoría completos.', category: 'security' },
    { question: '¿Qué módulos incluye Legal Sistema?', answer: 'Legal Sistema incluye 12 módulos: Ventas y POS, Inventario, Contabilidad, Facturación Electrónica, Nómina Electrónica, Clientes y Cartera, Reportes, Calendario, Chat, Proveedores, Multi-Sucursal y Seguridad.', category: 'features' },
    { question: '¿Puedo importar mis datos existentes?', answer: 'Sí. Legal Sistema permite la importación masiva de clientes, productos, proveedores y terceros desde archivos Excel o CSV. Te acompañamos en todo el proceso de migración.', category: 'features' },
    { question: '¿Cómo funciona el soporte técnico?', answer: 'Ofrecemos soporte técnico directamente dentro del sistema a través de chat en tiempo real. También puedes contactarnos por WhatsApp o email. Nuestro equipo está disponible para resolver cualquier duda.', category: 'support' },
    { question: '¿Qué pasa si necesito una funcionalidad que no existe?', answer: 'Estamos en constante desarrollo y lanzamos nuevas funcionalidades cada mes. Puedes sugerirnos mejoras y priorizamos según las necesidades de nuestros clientes.', category: 'support' },
    { question: '¿Legal Sistema genera automáticamente los asientos contables?', answer: 'Sí. Cada venta, compra y movimiento de inventario genera automáticamente los asientos contables correspondientes, ahorrándote horas de trabajo manual.', category: 'features' },
    { question: '¿Cómo puedo empezar a usar Legal Sistema?', answer: 'Regístrate gratis en nuestra página. Configura tu empresa en minutos y empieza tu prueba gratuita de 30 días con acceso completo a todas las funcionalidades.', category: 'general' },
];

export function FaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFaqs = faqs.filter((faq) => {
        const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
        const matchesSearch = searchQuery === '' || faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <section id="faq" className="relative py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
            <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-blue-50 blur-3xl" />
            <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-indigo-50 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-12 text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5">
                        <HelpCircle size={14} className="text-blue-600" />
                        <span className="text-xs font-semibold text-blue-700">Resolvemos tus dudas</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Preguntas <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">frecuentes</span></h2>
                    <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">Encuentra respuestas rápidas sobre Legal Sistema</p>
                </div>

                <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
                    <div className="space-y-6">
                        <div className="relative">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Buscar pregunta..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setOpenIndex(null); }} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 shadow-sm transition-all focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                        </div>

                        <div className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
                            {categories.map((cat) => {
                                const count = cat.id === 'all' ? faqs.length : faqs.filter(f => f.category === cat.id).length;
                                return (
                                    <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }} className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${activeCategory === cat.id ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
                                        <span>{cat.label}</span>
                                        <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${activeCategory === cat.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="hidden lg:block rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-center">
                            <p className="text-sm font-bold text-white mb-2">¿Listo para empezar?</p>
                            <p className="text-xs text-blue-100/70 mb-4">Prueba todas las funcionalidades gratis</p>
                            <a href="/registro" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-blue-700 shadow-md transition-all hover:bg-blue-50 hover:shadow-lg">
                                Prueba Gratis <ArrowRight size={14} />
                            </a>
                        </div>
                    </div>

                    <div>
                        {filteredFaqs.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                                <HelpCircle size={40} className="mx-auto mb-4 text-slate-300" />
                                <p className="text-base font-semibold text-slate-700">No se encontraron resultados</p>
                                <p className="mt-1 text-sm text-slate-500">Intenta con otra búsqueda o categoría</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredFaqs.map((faq, index) => {
                                    const isOpen = openIndex === index;
                                    return (
                                        <div key={faq.question} className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all ${isOpen ? 'border-blue-200 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
                                            <button onClick={() => setOpenIndex(isOpen ? null : index)} className="flex w-full items-center justify-between px-6 py-5 text-left">
                                                <div className="flex items-center gap-3 pr-4">
                                                    <div className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isOpen ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}><HelpCircle size={16} /></div>
                                                    <span className={`text-[15px] font-semibold transition-colors ${isOpen ? 'text-blue-700' : 'text-slate-800'}`}>{faq.question}</span>
                                                </div>
                                                <div className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full transition-all ${isOpen ? 'bg-blue-100 text-blue-600 rotate-180' : 'bg-slate-100 text-slate-400'}`}><ChevronDown size={15} /></div>
                                            </button>
                                            {isOpen && (
                                                <div className="px-6 pb-5">
                                                    <div className="ml-11 rounded-xl bg-slate-50 p-4"><p className="text-sm leading-relaxed text-slate-600">{faq.answer}</p></div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-8 text-center lg:hidden">
                            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-green-700 hover:shadow-lg">
                                <MessageCircle size={16} /> ¿Otra pregunta? Escríbenos
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
