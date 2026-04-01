import { useState, useEffect, useMemo } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { usersApi } from "@/lib/api";
import type { User, SharedData } from "@/types";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
    ArrowLeft,
    DollarSign,
    Users,
    Percent,
    Plus,
    TrendingUp,
    Landmark,
    Truck,
    Search,
    Save,
} from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
    "super-admin": "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
    admin: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
    employee: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    cashier: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
    warehouse: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
    client: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100",
};

const ROLE_LABELS: Record<string, string> = {
    "super-admin": "Super Admin",
    admin: "Administrador",
    employee: "Empleado",
    cashier: "Cajero",
    warehouse: "Bodeguero",
    client: "Cliente",
};

export default function BulkSalaryPage() {
    const { auth } = usePage<SharedData>().props;
    const currentUser = auth.user;

    const [users, setUsers] = useState<User[]>([]);
    const [payrollConfig, setPayrollConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [newSalaries, setNewSalaries] = useState<Record<number, string>>({});
    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [filterBranch, setFilterBranch] = useState("all");
    const [pctInput, setPctInput] = useState("");
    const [fixedInput, setFixedInput] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);

    // Fetch users and payroll config on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [usersData, configData] = await Promise.all([
                    usersApi.getAll(),
                    usersApi.getPayrollConfig(),
                ]);
                // Filter out clients
                const nonClients = usersData.filter(
                    (u) => !u.roles?.some((r) => r.slug === "client")
                );
                setUsers(nonClients);
                setPayrollConfig(configData?.data ?? configData);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los datos.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Derived: unique roles and branches for filters
    const uniqueRoles = useMemo(() => {
        const roles = new Map<string, string>();
        users.forEach((u) =>
            u.roles?.forEach((r) => {
                if (r.slug !== "client") roles.set(r.slug, r.name);
            })
        );
        return Array.from(roles.entries());
    }, [users]);

    const uniqueBranches = useMemo(() => {
        const branches = new Map<number, string>();
        users.forEach((u) => {
            if (u.branch) branches.set(u.branch.id, u.branch.name);
        });
        return Array.from(branches.entries());
    }, [users]);

    // Filtered users
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            const matchSearch =
                !search ||
                u.name.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase());

            const matchRole =
                filterRole === "all" ||
                u.roles?.some((r) => r.slug === filterRole);

            const matchBranch =
                filterBranch === "all" ||
                u.branch?.id === Number(filterBranch);

            return matchSearch && matchRole && matchBranch;
        });
    }, [users, search, filterRole, filterBranch]);

    // Changed users (those with a different new salary)
    const changedUsers = useMemo(() => {
        return users.filter((u) => {
            const newVal = newSalaries[u.id];
            if (newVal === undefined || newVal === "") return false;
            const parsed = parseFloat(newVal);
            return !isNaN(parsed) && parsed !== (u.salary ?? 0);
        });
    }, [users, newSalaries]);

    // Handlers
    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredUsers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredUsers.map((u) => u.id)));
        }
    };

    const applySmmlv = () => {
        if (selectedIds.size === 0) {
            toast({ title: "Atención", description: "Selecciona al menos un usuario.", variant: "destructive" });
            return;
        }
        if (!payrollConfig?.smmlv) return;
        setNewSalaries((prev) => {
            const next = { ...prev };
            selectedIds.forEach((id) => {
                next[id] = String(payrollConfig.smmlv);
            });
            return next;
        });
        toast({ title: "SMMLV aplicado", description: `Se asignó ${formatCurrency(payrollConfig.smmlv)} a ${selectedIds.size} usuario(s).` });
    };

    const applyPercentage = () => {
        if (selectedIds.size === 0) {
            toast({ title: "Atención", description: "Selecciona al menos un usuario.", variant: "destructive" });
            return;
        }
        const pct = parseFloat(pctInput);
        if (isNaN(pct) || pct === 0) {
            toast({ title: "Atención", description: "Ingresa un porcentaje válido.", variant: "destructive" });
            return;
        }
        setNewSalaries((prev) => {
            const next = { ...prev };
            selectedIds.forEach((id) => {
                const user = users.find((u) => u.id === id);
                if (user) {
                    const current = user.salary ?? 0;
                    const newSalary = Math.round(current * (1 + pct / 100));
                    next[id] = String(newSalary);
                }
            });
            return next;
        });
        toast({ title: "Porcentaje aplicado", description: `Incremento del ${pct}% aplicado a ${selectedIds.size} usuario(s).` });
    };

    const applyFixed = () => {
        if (selectedIds.size === 0) {
            toast({ title: "Atención", description: "Selecciona al menos un usuario.", variant: "destructive" });
            return;
        }
        const amount = parseFloat(fixedInput);
        if (isNaN(amount) || amount === 0) {
            toast({ title: "Atención", description: "Ingresa un monto válido.", variant: "destructive" });
            return;
        }
        setNewSalaries((prev) => {
            const next = { ...prev };
            selectedIds.forEach((id) => {
                const user = users.find((u) => u.id === id);
                if (user) {
                    const current = user.salary ?? 0;
                    const newSalary = Math.round(current + amount);
                    next[id] = String(newSalary);
                }
            });
            return next;
        });
        toast({ title: "Incremento aplicado", description: `+${formatCurrency(amount)} aplicado a ${selectedIds.size} usuario(s).` });
    };

    const handleSave = async () => {
        setShowConfirm(false);
        setSaving(true);
        try {
            const updates = changedUsers.map((u) => ({
                user_id: u.id,
                salary: parseFloat(newSalaries[u.id]),
            }));
            await usersApi.bulkSalaryUpdate(updates);
            toast({ title: "Salarios actualizados", description: `Se actualizaron ${updates.length} salario(s) correctamente.` });
            // Reload users
            const usersData = await usersApi.getAll();
            const nonClients = usersData.filter(
                (u) => !u.roles?.some((r) => r.slug === "client")
            );
            setUsers(nonClients);
            setNewSalaries({});
            setSelectedIds(new Set());
        } catch (error) {
            toast({ title: "Error", description: "Ocurrió un error al actualizar los salarios.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const getDifference = (user: User) => {
        const newVal = newSalaries[user.id];
        if (newVal === undefined || newVal === "") return null;
        const parsed = parseFloat(newVal);
        if (isNaN(parsed)) return null;
        return parsed - (user.salary ?? 0);
    };

    // Helpers for formatted number inputs (thousand separators)
    const formatInputNumber = (value: string): string => {
        const digits = value.replace(/\D/g, "");
        if (!digits) return "";
        return Number(digits).toLocaleString("es-CO");
    };

    const parseInputNumber = (value: string): string => {
        return value.replace(/\D/g, "");
    };

    const smmlvTotal = payrollConfig
        ? (payrollConfig.smmlv ?? 0) + (payrollConfig.auxilio_transporte ?? 0)
        : 0;

    if (!hasPermission("users.bulk-salary", currentUser) && !isSuperAdmin(currentUser)) {
        return (
            <AppLayout>
                <Head title="Sin permisos" />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Head title="Ajuste Masivo de Salarios" />

            <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
                {/* Header */}
                <div className="bg-card border-b border-[#e1e7ef]">
                    <div className="max-w-[1400px] mx-auto px-4 py-5">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.visit("/admin/users")}
                                className="shrink-0"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-[#2463eb]/10 flex items-center justify-center">
                                    <DollarSign className="h-5 w-5 text-[#2463eb]" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-semibold tracking-tight">
                                        Ajuste Masivo de Salarios
                                    </h1>
                                    <p className="text-sm text-muted-foreground">
                                        Actualiza los salarios de multiples empleados
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
                    {/* SMMLV Info Card */}
                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
                        <CardContent className="p-6">
                            {payrollConfig ? (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-blue-900">
                                            SMMLV {payrollConfig.year} - Colombia
                                        </h3>
                                        {payrollConfig.decree_number && (
                                            <Badge className="bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-100">
                                                {payrollConfig.decree_number}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div className="flex items-center gap-3 bg-white/70 rounded-lg p-4">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                                <Landmark className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                                    SMMLV
                                                </p>
                                                <p className="text-lg font-bold text-blue-900">
                                                    {formatCurrency(payrollConfig.smmlv)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white/70 rounded-lg p-4">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                <Truck className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">
                                                    Auxilio de Transporte
                                                </p>
                                                <p className="text-lg font-bold text-indigo-900">
                                                    {formatCurrency(payrollConfig.auxilio_transporte)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white/70 rounded-lg p-4">
                                            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                <TrendingUp className="h-5 w-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">
                                                    Total con Auxilio
                                                </p>
                                                <p className="text-lg font-bold text-emerald-900">
                                                    {formatCurrency(smmlvTotal)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-blue-700">
                                        Incremento del {payrollConfig.increase_percentage}% respecto al año anterior ({formatCurrency(payrollConfig.smmlv_previous)})
                                    </p>
                                </>
                            ) : (
                                <div className="flex items-center justify-center py-8">
                                    <Spinner className="h-6 w-6 text-blue-600" />
                                    <span className="ml-2 text-blue-700 text-sm">Cargando configuración salarial...</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Acciones Rapidas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap items-end gap-6">
                                {/* Apply SMMLV */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Aplicar SMMLV
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={applySmmlv}
                                        disabled={!payrollConfig?.smmlv}
                                        className="gap-2"
                                    >
                                        <Landmark className="h-4 w-4" />
                                        Aplicar SMMLV
                                    </Button>
                                </div>

                                <div className="h-8 w-px bg-border hidden sm:block" />

                                {/* Apply Percentage */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Incremento %
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="Ej: 5.0"
                                            value={pctInput}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9.,]/g, "");
                                                setPctInput(val);
                                            }}
                                            className="w-28 h-9"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={applyPercentage}
                                            className="gap-2"
                                        >
                                            <Percent className="h-4 w-4" />
                                            Aplicar %
                                        </Button>
                                    </div>
                                </div>

                                <div className="h-8 w-px bg-border hidden sm:block" />

                                {/* Apply Fixed */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Incremento Fijo
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="Ej: 100.000"
                                            value={formatInputNumber(fixedInput)}
                                            onChange={(e) => setFixedInput(parseInputNumber(e.target.value))}
                                            className="w-36 h-9"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={applyFixed}
                                            className="gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Aplicar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Users Table */}
                    <Card className="shadow-xl">
                        <CardContent className="p-0">
                            {/* Filter Bar */}
                            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[#e1e7ef]">
                                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nombre o email..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-9 h-10"
                                    />
                                </div>
                                <Select value={filterRole} onValueChange={setFilterRole}>
                                    <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background">
                                        <SelectValue placeholder="Filtrar por rol" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card z-50">
                                        <SelectItem value="all">Todos los roles</SelectItem>
                                        {uniqueRoles.map(([slug, name]) => (
                                            <SelectItem key={slug} value={slug}>
                                                {ROLE_LABELS[slug] ?? name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={filterBranch} onValueChange={setFilterBranch}>
                                    <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background">
                                        <SelectValue placeholder="Filtrar por sucursal" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card z-50">
                                        <SelectItem value="all">Todas las sucursales</SelectItem>
                                        {uniqueBranches.map(([id, name]) => (
                                            <SelectItem key={id} value={String(id)}>
                                                {name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Table */}
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Spinner className="h-8 w-8" />
                                    <span className="ml-3 text-muted-foreground">Cargando usuarios...</span>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <Users className="h-12 w-12 mb-3 opacity-30" />
                                    <p className="text-sm">No se encontraron usuarios</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="h-12 px-4 w-12">
                                                    <Checkbox
                                                        checked={
                                                            filteredUsers.length > 0 &&
                                                            selectedIds.size === filteredUsers.length
                                                        }
                                                        onCheckedChange={toggleSelectAll}
                                                    />
                                                </TableHead>
                                                <TableHead className="h-12 px-4">Nombre</TableHead>
                                                <TableHead className="h-12 px-4">Rol</TableHead>
                                                <TableHead className="h-12 px-4">Sucursal</TableHead>
                                                <TableHead className="h-12 px-4 text-right">Salario Actual</TableHead>
                                                <TableHead className="h-12 px-4 text-right">Nuevo Salario</TableHead>
                                                <TableHead className="h-12 px-4 text-right">Diferencia</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredUsers.map((user) => {
                                                const diff = getDifference(user);
                                                const primaryRole = user.roles?.[0];

                                                return (
                                                    <TableRow key={user.id}>
                                                        <TableCell className="p-4 w-12">
                                                            <Checkbox
                                                                checked={selectedIds.has(user.id)}
                                                                onCheckedChange={() => toggleSelect(user.id)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-4">
                                                            <div>
                                                                <p className="font-medium text-sm">{user.name}</p>
                                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="p-4">
                                                            {primaryRole && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className={ROLE_COLORS[primaryRole.slug] ?? ""}
                                                                >
                                                                    {ROLE_LABELS[primaryRole.slug] ?? primaryRole.name}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="p-4 text-sm">
                                                            {user.branch?.name ?? (
                                                                <span className="text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="p-4 text-right text-sm text-muted-foreground">
                                                            {formatCurrency(user.salary ?? 0)}
                                                        </TableCell>
                                                        <TableCell className="p-4 text-right">
                                                            <Input
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={formatInputNumber(newSalaries[user.id] ?? "")}
                                                                onChange={(e) =>
                                                                    setNewSalaries((prev) => ({
                                                                        ...prev,
                                                                        [user.id]: parseInputNumber(e.target.value),
                                                                    }))
                                                                }
                                                                placeholder={formatCurrency(user.salary ?? 0)}
                                                                className="w-40 h-9 text-right ml-auto"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-4 text-right text-sm font-medium">
                                                            {diff !== null ? (
                                                                <span
                                                                    className={
                                                                        diff > 0
                                                                            ? "text-emerald-600"
                                                                            : diff < 0
                                                                              ? "text-red-600"
                                                                              : "text-muted-foreground"
                                                                    }
                                                                >
                                                                    {diff > 0 && "+"}
                                                                    {formatCurrency(diff)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Action Footer */}
                    <div className="sticky bottom-0 bg-card border border-[#e1e7ef] rounded-lg shadow-lg p-4 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{selectedIds.size}</span> usuario(s) seleccionado(s)
                            {" · "}
                            <span className="font-medium text-foreground">{changedUsers.length}</span> con cambios
                        </p>
                        <Button
                            onClick={() => setShowConfirm(true)}
                            disabled={changedUsers.length === 0 || saving}
                            className="gap-2 bg-[#2463eb] hover:bg-[#1d4ed8] text-white"
                        >
                            {saving ? (
                                <Spinner className="h-4 w-4" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Estas seguro de actualizar {changedUsers.length} salario(s)?
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>Esta accion actualizará los siguientes salarios:</p>
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                    {changedUsers.map((u) => {
                                        const newVal = parseFloat(newSalaries[u.id]);
                                        const diff = newVal - (u.salary ?? 0);
                                        return (
                                            <div
                                                key={u.id}
                                                className="flex items-center justify-between text-sm py-1 border-b border-dashed last:border-0"
                                            >
                                                <span className="font-medium">{u.name}</span>
                                                <span>
                                                    {formatCurrency(u.salary ?? 0)}
                                                    {" → "}
                                                    <span className="font-semibold">{formatCurrency(newVal)}</span>
                                                    <span
                                                        className={
                                                            diff > 0
                                                                ? " text-emerald-600 ml-2"
                                                                : diff < 0
                                                                  ? " text-red-600 ml-2"
                                                                  : " ml-2"
                                                        }
                                                    >
                                                        ({diff > 0 && "+"}{formatCurrency(diff)})
                                                    </span>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSave}
                            className="bg-[#2463eb] hover:bg-[#1d4ed8] text-white"
                        >
                            Confirmar Actualización
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
