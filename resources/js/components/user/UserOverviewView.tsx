import { useMemo } from 'react';
import { DollarSign, Calendar, Briefcase, TrendingUp, Building2, Shield, CreditCard, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { UserSummary } from '@/lib/api';
import type { User } from '@/types';

interface UserOverviewViewProps {
    user: User;
    summary: UserSummary;
}

const MONTH_NAMES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const CONTRACT_TYPE_MAP: Record<string, string> = {
    indefinido: 'Indefinido',
    fijo: 'Fijo',
    obra_labor: 'Obra/Labor',
    prestacion_servicios: 'Prestaci\u00f3n de servicios',
};

const ACCOUNT_TYPE_MAP: Record<string, string> = {
    ahorros: 'Ahorros',
    corriente: 'Corriente',
};

function calculateSeniority(admissionDate: string | undefined | null): string {
    if (!admissionDate) return 'Sin fecha';

    const admission = new Date(admissionDate);
    const now = new Date();

    let years = now.getFullYear() - admission.getFullYear();
    let months = now.getMonth() - admission.getMonth();

    if (now.getDate() < admission.getDate()) {
        months--;
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    if (years < 0) return 'Sin fecha';

    const parts: string[] = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'a\u00f1o' : 'a\u00f1os'}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);

    return parts.length > 0 ? parts.join(' ') : 'Menos de un mes';
}

function formatDateEs(dateStr: string | undefined | null): string {
    if (!dateStr) return 'Sin definir';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export function UserOverviewView({ user, summary }: UserOverviewViewProps) {
    const seniority = useMemo(() => calculateSeniority(user.admission_date), [user.admission_date]);

    const lastPayroll = summary.payroll_summary.last_payroll;

    return (
        <div className="space-y-6">
            {/* Row 1: Key Metrics */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {/* Salario Base */}
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] uppercase text-muted-foreground">Salario Base</p>
                            <p className="text-sm font-semibold truncate">
                                {formatCurrency(summary.salary_info.salary ?? 0)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Comisiones del Ano */}
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-500/100/10 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] uppercase text-muted-foreground">Comisiones del A&ntilde;o</p>
                            <p className="text-sm font-semibold truncate">
                                {formatCurrency(summary.commission_summary.total_commission)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Ventas Realizadas */}
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-500/100/10 flex items-center justify-center">
                            <Briefcase className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] uppercase text-muted-foreground">Ventas Realizadas</p>
                            <p className="text-sm font-semibold truncate">
                                {summary.sales_as_seller.count} ventas ({formatCurrency(summary.sales_as_seller.total)})
                            </p>
                        </div>
                    </div>
                </div>

                {/* Antiguedad */}
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-500/100/10 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] uppercase text-muted-foreground">Antig&uuml;edad</p>
                            <p className="text-sm font-semibold truncate">{seniority}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Ultima Nomina + Resumen de Comisiones */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Ultima Nomina */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span>&Uacute;ltima N&oacute;mina</span>
                    </div>
                    {lastPayroll ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Per&iacute;odo</span>
                                <span className="text-sm font-medium">
                                    {MONTH_NAMES_ES[lastPayroll.period_month - 1]} {lastPayroll.period_year}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Pago Neto</span>
                                <span className="text-sm font-medium">
                                    {formatCurrency(lastPayroll.net_pay)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Fecha de Pago</span>
                                <span className="text-sm font-medium">
                                    {lastPayroll.payment_date
                                        ? formatDateEs(lastPayroll.payment_date)
                                        : 'Sin fecha'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Sin registros de n&oacute;mina</p>
                    )}
                </div>

                {/* Resumen de Comisiones */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>Resumen de Comisiones</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/40 rounded-lg p-3">
                            <p className="text-[10px] uppercase text-muted-foreground">Total Ventas</p>
                            <p className="text-sm font-medium">
                                {formatCurrency(summary.commission_summary.total_sales)}
                            </p>
                        </div>
                        <div className="bg-muted/40 rounded-lg p-3">
                            <p className="text-[10px] uppercase text-muted-foreground"># Ventas</p>
                            <p className="text-sm font-medium">{summary.commission_summary.sales_count}</p>
                        </div>
                        <div className="bg-muted/40 rounded-lg p-3">
                            <p className="text-[10px] uppercase text-muted-foreground">% Promedio</p>
                            <p className="text-sm font-medium">
                                {summary.commission_summary.avg_percentage.toFixed(1)}%
                            </p>
                        </div>
                        <div className="bg-muted/40 rounded-lg p-3">
                            <p className="text-[10px] uppercase text-muted-foreground">Total Comisiones</p>
                            <p className="text-sm font-medium">
                                {formatCurrency(summary.commission_summary.total_commission)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Informacion Laboral + Seguridad Social */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Informacion Laboral */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>Informaci&oacute;n Laboral</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] uppercase text-muted-foreground">Tipo Contrato</p>
                            <p className="text-sm font-medium">
                                {summary.salary_info.contract_type
                                    ? (CONTRACT_TYPE_MAP[summary.salary_info.contract_type] ?? summary.salary_info.contract_type)
                                    : 'Sin definir'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase text-muted-foreground">Fecha Ingreso</p>
                            <p className="text-sm font-medium">
                                {formatDateEs(summary.salary_info.admission_date)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase text-muted-foreground">Nivel de Riesgo ARL</p>
                            <p className="text-sm font-medium">
                                {summary.salary_info.risk_level != null
                                    ? summary.salary_info.risk_level
                                    : 'Sin definir'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase text-muted-foreground">Sucursal</p>
                            <p className="text-sm font-medium">
                                {user.branch?.name ?? 'Sin asignar'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Seguridad Social */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        <span>Seguridad Social</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] uppercase text-muted-foreground">EPS</p>
                            <p className="text-sm font-medium">
                                {summary.salary_info.eps_name ?? 'Sin definir'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase text-muted-foreground">Fondo Pensi&oacute;n</p>
                            <p className="text-sm font-medium">
                                {summary.salary_info.pension_fund_name ?? 'Sin definir'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase text-muted-foreground">ARL</p>
                            <p className="text-sm font-medium">
                                {summary.salary_info.arl_name ?? 'Sin definir'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase text-muted-foreground">Caja Compensaci&oacute;n</p>
                            <p className="text-sm font-medium">
                                {summary.salary_info.compensation_fund_name ?? 'Sin definir'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 4: Datos Bancarios */}
            <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>Datos Bancarios</span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Banco</p>
                        <p className="text-sm font-medium">
                            {summary.salary_info.bank_name ?? 'Sin definir'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Tipo Cuenta</p>
                        <p className="text-sm font-medium">
                            {summary.salary_info.account_type
                                ? (ACCOUNT_TYPE_MAP[summary.salary_info.account_type] ?? summary.salary_info.account_type)
                                : 'Sin definir'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase text-muted-foreground">N&uacute;mero Cuenta</p>
                        <p className="text-sm font-medium">
                            {summary.salary_info.account_number ?? 'Sin definir'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
