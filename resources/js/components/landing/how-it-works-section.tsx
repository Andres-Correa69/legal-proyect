import { UserPlus, Settings, Rocket, Headphones } from 'lucide-react';

const steps = [
    { number: '01', icon: UserPlus, title: 'Regístrate gratis', description: 'Crea tu cuenta en segundos. 30 días gratis con acceso completo a todas las funcionalidades sin tarjeta de crédito.', color: 'from-green-500 to-emerald-600', iconBg: 'bg-green-50', iconColor: 'text-green-600', borderHover: 'hover:border-green-200' },
    { number: '02', icon: Settings, title: 'Configuramos tu empresa', description: 'En menos de 5 minutos configuramos tu empresa, sucursales, productos y resoluciones de facturación.', color: 'from-blue-500 to-indigo-600', iconBg: 'bg-blue-50', iconColor: 'text-blue-600', borderHover: 'hover:border-blue-200' },
    { number: '03', icon: Rocket, title: 'Empieza a facturar', description: 'Ya estás listo para emitir facturas electrónicas, gestionar inventario y controlar tu contabilidad.', color: 'from-purple-500 to-violet-600', iconBg: 'bg-purple-50', iconColor: 'text-purple-600', borderHover: 'hover:border-purple-200' },
    { number: '04', icon: Headphones, title: 'Soporte continuo', description: 'Te acompañamos en todo momento. Soporte técnico integrado en el sistema para resolver cualquier duda.', color: 'from-amber-500 to-orange-600', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', borderHover: 'hover:border-amber-200' },
];

export function HowItWorksSection() {
    return (
        <section className="relative py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/50 to-white" />
            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-16 text-center">
                    <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">¿Cómo <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">funciona</span>?</h2>
                    <p className="mt-4 text-lg text-slate-600">Empieza a usar Legal Sistema en 4 simples pasos</p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {steps.map((step, index) => (
                        <div key={step.number} className="relative">
                            {index < steps.length - 1 && (
                                <div className="hidden lg:block absolute top-14 left-[calc(100%+2px)] w-[calc(100%-40px)] z-0">
                                    <div className="h-[2px] w-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-full" />
                                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-slate-300" />
                                </div>
                            )}
                            <div className={`relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 ${step.borderHover} z-10`}>
                                <div className="flex items-center gap-3 mb-5">
                                    <span className={`text-4xl font-extrabold bg-gradient-to-r ${step.color} bg-clip-text text-transparent leading-none`}>{step.number}</span>
                                    <div className={`rounded-xl p-2.5 ${step.iconBg}`}><step.icon size={20} className={step.iconColor} /></div>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-3">{step.title}</h3>
                                <p className="text-sm leading-relaxed text-slate-500 flex-1">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
