import { Head, Link } from "@inertiajs/react";

import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, BookOpen, Scale, TrendingUp, PieChart, FileSearch, Users, BarChart3 } from "lucide-react";

interface ReportCard {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
}

const REPORT_CARDS: ReportCard[] = [
    {
        title: "Libro Diario",
        description: "Registro cronológico de todas las transacciones contables con sus registros y líneas de detalle.",
        icon: FileText,
        href: "/admin/accounting/reports/journal-book",
    },
    {
        title: "Libro Mayor",
        description: "Movimientos detallados por cuenta contable con saldos acumulados en un periodo determinado.",
        icon: BookOpen,
        href: "/admin/accounting/reports/general-ledger",
    },
    {
        title: "Balance de Comprobación",
        description: "Resumen de saldos débito y crédito de todas las cuentas para verificar el equilibrio contable.",
        icon: Scale,
        href: "/admin/accounting/reports/trial-balance",
    },
    {
        title: "Estado de Resultados Integral",
        description: "Ingresos, costos y gastos del período para determinar la utilidad o pérdida neta de la empresa.",
        icon: TrendingUp,
        href: "/admin/accounting/reports/income-statement",
    },
    {
        title: "Estado de Situación Financiera",
        description: "Activos, pasivos y patrimonio en un período. Verifica la ecuación contable.",
        icon: PieChart,
        href: "/admin/accounting/reports/balance-sheet",
    },
    {
        title: "Auxiliar de Cuenta Contable",
        description: "Movimientos detallados de múltiples cuentas con saldos acumulados, filtrable por rango de códigos.",
        icon: FileSearch,
        href: "/admin/accounting/reports/account-subledger",
    },
    {
        title: "Auxiliar por Tercero",
        description: "Movimientos contables agrupados por tercero (cliente o proveedor) para análisis de cuentas por cobrar y pagar.",
        icon: Users,
        href: "/admin/accounting/reports/third-party-subledger",
    },
];

export default function ReportsIndexPage() {
    return (
        <AppLayout>
            <Head title="Reportes Contables" />

            <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
                {/* Header */}
                <div className="bg-card border-b border-border">
                    <div className="max-w-[1400px] mx-auto px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                                    <BarChart3 className="h-5 w-5 text-[#2463eb]" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-semibold text-foreground">Reportes Contables</h1>
                                    <p className="text-sm text-muted-foreground">Seleccione el reporte que desea consultar</p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                                {REPORT_CARDS.length} reportes
                            </Badge>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-blue-500/15 p-2 rounded-lg">
                                            <FileText className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Libros</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-600">2</p>
                                    <p className="text-xs text-muted-foreground mt-1">Diario y Mayor</p>
                                </div>
                            </Card>
                            <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-emerald-500/15 p-2 rounded-lg">
                                            <Scale className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Balances</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-600">2</p>
                                    <p className="text-xs text-muted-foreground mt-1">Comprobación y Situación</p>
                                </div>
                            </Card>
                            <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-amber-500/15 p-2 rounded-lg">
                                            <TrendingUp className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Resultados</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-amber-600">1</p>
                                    <p className="text-xs text-muted-foreground mt-1">Estado de Resultados</p>
                                </div>
                            </Card>
                            <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-purple-500/15 p-2 rounded-lg">
                                            <FileSearch className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Auxiliares</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-purple-600">2</p>
                                    <p className="text-xs text-muted-foreground mt-1">Por cuenta y por tercero</p>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-[1400px] mx-auto px-4 py-6">
                    <Card className="shadow-xl border border-border p-4 sm:p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {REPORT_CARDS.map((report) => {
                                const Icon = report.icon;
                                return (
                                    <Link key={report.href} href={report.href} className="block group">
                                        <Card className="border border-border shadow-sm h-full transition-all duration-200 hover:shadow-md hover:border-primary/30 group-hover:bg-muted/30">
                                            <CardContent className="p-5">
                                                <div className="flex flex-col gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <Icon className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                                                            {report.title}
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                            {report.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
