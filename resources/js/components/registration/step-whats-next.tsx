import {
    Calendar,
    MessageSquare,
    FileText,
    BarChart3,
    Wallet,
    HeadphonesIcon,
    ShieldCheck,
    Building2,
} from 'lucide-react';

const upcomingFeatures = [
    {
        icon: Calendar,
        title: 'Google Calendar',
        description: 'Sincroniza tu calendario, gestiona citas y recibe recordatorios automáticos.',
        color: 'text-green-600',
        bg: 'bg-green-50',
    },
    {
        icon: MessageSquare,
        title: 'Chat en Tiempo Real',
        description: 'Comunícate con tu equipo directamente desde el sistema con mensajería instantánea.',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
    },
    {
        icon: FileText,
        title: 'Facturación Electrónica DIAN',
        description: 'Emite facturas, notas crédito y débito validadas electrónicamente por la DIAN.',
        color: 'text-purple-600',
        bg: 'bg-purple-50',
    },
    {
        icon: BarChart3,
        title: 'Reportes Avanzados',
        description: 'Dashboards con KPIs, análisis de ventas, productos más vendidos y tendencias de crecimiento.',
        color: 'text-cyan-600',
        bg: 'bg-cyan-50',
    },
    {
        icon: Wallet,
        title: 'Nómina Electrónica',
        description: 'Liquidación de nómina electrónica con seguridad social, prestaciones y desprendibles.',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
    },
    {
        icon: HeadphonesIcon,
        title: 'Soporte Técnico',
        description: 'Chat directo con nuestro equipo de soporte para resolver cualquier duda o inconveniente.',
        color: 'text-pink-600',
        bg: 'bg-pink-50',
    },
    {
        icon: ShieldCheck,
        title: 'Seguridad Avanzada',
        description: 'Autenticación de dos factores, roles y permisos personalizables para tu equipo.',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
    },
    {
        icon: Building2,
        title: 'Multi-Sucursal',
        description: 'Agrega múltiples sedes y gestiona cada una de forma independiente o centralizada.',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
    },
];

export function StepWhatsNext() {
    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900">
                    Todo esto te espera al crear tu cuenta
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                    Estas funcionalidades estarán disponibles desde tu primer día con Legal Sistema
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {upcomingFeatures.map((feature) => (
                    <div
                        key={feature.title}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
                    >
                        <div className={`shrink-0 rounded-lg p-2 ${feature.bg}`}>
                            <feature.icon size={18} className={feature.color} />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900">{feature.title}</h4>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{feature.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-center text-xs text-slate-500">
                Podrás configurar todas estas funcionalidades desde el panel de administración después de crear tu cuenta
            </p>
        </div>
    );
}
