import { Head, Link } from "@inertiajs/react";
import { useState, useEffect } from "react";

import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useToast } from "@/hooks/use-toast";
import { accountingApi } from "@/lib/api";
import type { AccountingPeriod } from "@/types";
import { Calendar, Lock, Unlock } from "lucide-react";

const MONTH_NAMES: Record<number, string> = {
    1: "Enero",
    2: "Febrero",
    3: "Marzo",
    4: "Abril",
    5: "Mayo",
    6: "Junio",
    7: "Julio",
    8: "Agosto",
    9: "Septiembre",
    10: "Octubre",
    11: "Noviembre",
    12: "Diciembre",
};

export default function PeriodsIndexPage() {
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const loadPeriods = async () => {
        setLoading(true);
        try {
            const data = await accountingApi.periods.getAll();
            setPeriods(data);
        } catch (error: any) {
            console.error("Error loading periods:", error);
            toast({
                title: "Error",
                description: "No se pudieron cargar los periodos contables",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPeriods();
    }, []);

    const handleClose = async (period: AccountingPeriod) => {
        setActionLoading(period.id);
        try {
            await accountingApi.periods.close(period.year, period.month);
            toast({
                title: "Periodo cerrado",
                description: `El periodo ${MONTH_NAMES[period.month]} ${period.year} ha sido cerrado exitosamente`,
            });
            await loadPeriods();
        } catch (error: any) {
            const msg = error?.message || "Error al cerrar el periodo";
            toast({ title: "Error", description: msg, variant: "destructive" });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReopen = async (period: AccountingPeriod) => {
        setActionLoading(period.id);
        try {
            await accountingApi.periods.reopen(period.id);
            toast({
                title: "Periodo reabierto",
                description: `El periodo ${MONTH_NAMES[period.month]} ${period.year} ha sido reabierto exitosamente`,
            });
            await loadPeriods();
        } catch (error: any) {
            const msg = error?.message || "Error al reabrir el periodo";
            toast({ title: "Error", description: msg, variant: "destructive" });
        } finally {
            setActionLoading(null);
        }
    };

    const formatClosedDate = (dateString?: string) => {
        if (!dateString) return "-";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("es-CO", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return dateString;
        }
    };

    return (
        <AppLayout>
            <Head title="Periodos Contables" />

            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center border flex-shrink-0">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-sm sm:text-lg font-bold">Periodos Contables</h1>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Gestion de apertura y cierre de periodos contables mensuales
                        </p>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                            <Spinner className="h-8 w-8" />
                            <p className="text-sm text-muted-foreground">Cargando periodos...</p>
                        </div>
                    </div>
                ) : periods.length === 0 ? (
                    <Card className="border shadow-sm">
                        <CardContent className="py-12">
                            <div className="flex flex-col items-center justify-center text-center">
                                <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    No hay periodos contables registrados
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Los periodos se crean automaticamente al registrar registros contables
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border shadow-sm">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="h-12 px-4">Ano</TableHead>
                                            <TableHead className="h-12 px-4">Mes</TableHead>
                                            <TableHead className="h-12 px-4">Estado</TableHead>
                                            <TableHead className="h-12 px-4">Cerrado Por</TableHead>
                                            <TableHead className="h-12 px-4">Fecha Cierre</TableHead>
                                            <TableHead className="h-12 px-4 text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {periods.map((period) => {
                                            const isOpen = period.status === "open";
                                            const isProcessing = actionLoading === period.id;

                                            return (
                                                <TableRow key={period.id}>
                                                    <TableCell className="p-4 text-sm font-medium">
                                                        {period.year}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-sm">
                                                        {MONTH_NAMES[period.month] || period.month}
                                                    </TableCell>
                                                    <TableCell className="p-4">
                                                        {isOpen ? (
                                                            <Badge variant="success" className="gap-1">
                                                                <Unlock className="h-3 w-3" />
                                                                Abierto
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive" className="gap-1">
                                                                <Lock className="h-3 w-3" />
                                                                Cerrado
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-sm text-muted-foreground">
                                                        {period.closed_by?.name || "-"}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-sm text-muted-foreground">
                                                        {formatClosedDate(period.closed_at)}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-right">
                                                        {isOpen ? (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="gap-1.5 h-8 text-xs"
                                                                        disabled={isProcessing}
                                                                    >
                                                                        {isProcessing ? (
                                                                            <Spinner className="h-3.5 w-3.5" />
                                                                        ) : (
                                                                            <Lock className="h-3.5 w-3.5" />
                                                                        )}
                                                                        Cerrar
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Cerrar Periodo Contable</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Esta seguro de cerrar el periodo{" "}
                                                                            <strong>{MONTH_NAMES[period.month]} {period.year}</strong>?
                                                                            Una vez cerrado, no se podran registrar ni modificar registros
                                                                            contables en este periodo.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleClose(period)}>
                                                                            Si, cerrar periodo
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        ) : (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="gap-1.5 h-8 text-xs"
                                                                        disabled={isProcessing}
                                                                    >
                                                                        {isProcessing ? (
                                                                            <Spinner className="h-3.5 w-3.5" />
                                                                        ) : (
                                                                            <Unlock className="h-3.5 w-3.5" />
                                                                        )}
                                                                        Reabrir
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Reabrir Periodo Contable</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Esta seguro de reabrir el periodo{" "}
                                                                            <strong>{MONTH_NAMES[period.month]} {period.year}</strong>?
                                                                            Esto permitira registrar y modificar registros contables
                                                                            nuevamente en este periodo.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleReopen(period)}>
                                                                            Si, reabrir periodo
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
