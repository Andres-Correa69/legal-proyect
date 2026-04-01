import { Head, Link } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import { router } from "@inertiajs/react";

import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";
import { accountingApi } from "@/lib/api";
import type { AccountingAccount } from "@/types";
import { ArrowLeft, Save, Plus } from "lucide-react";

const ACCOUNT_TYPES = [
    { value: "asset", label: "Activo" },
    { value: "liability", label: "Pasivo" },
    { value: "equity", label: "Patrimonio" },
    { value: "revenue", label: "Ingreso" },
    { value: "expense", label: "Gasto" },
    { value: "cost", label: "Costo" },
] as const;

type AccountType = (typeof ACCOUNT_TYPES)[number]["value"];

function getNatureForType(type: AccountType): "debit" | "credit" {
    switch (type) {
        case "asset":
        case "expense":
        case "cost":
            return "debit";
        case "liability":
        case "equity":
        case "revenue":
            return "credit";
    }
}

function buildAccountLabel(account: AccountingAccount, depth: number = 0): string {
    const prefix = "\u00A0\u00A0".repeat(depth);
    return `${prefix}${account.code} - ${account.name}`;
}

function flattenTree(accounts: AccountingAccount[], depth: number = 0): { account: AccountingAccount; depth: number }[] {
    const result: { account: AccountingAccount; depth: number }[] = [];
    for (const account of accounts) {
        result.push({ account, depth });
        if (account.children && account.children.length > 0) {
            result.push(...flattenTree(account.children, depth + 1));
        }
    }
    return result;
}

export default function CreateAccountPage() {
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [treeLoading, setTreeLoading] = useState(true);
    const [treeAccounts, setTreeAccounts] = useState<AccountingAccount[]>([]);
    const [flatAccounts, setFlatAccounts] = useState<{ account: AccountingAccount; depth: number }[]>([]);

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [type, setType] = useState<AccountType | "">("");
    const [nature, setNature] = useState<"debit" | "credit" | "">("");
    const [parentId, setParentId] = useState<string>("");
    const [level, setLevel] = useState<string>("");
    const [description, setDescription] = useState("");

    // Load tree accounts
    useEffect(() => {
        const loadTree = async () => {
            setTreeLoading(true);
            try {
                const data = await accountingApi.accounts.getTree();
                setTreeAccounts(data);
                setFlatAccounts(flattenTree(data));
            } catch (error: any) {
                console.error("Error loading accounts tree:", error);
                toast({
                    title: "Error",
                    description: "No se pudieron cargar las cuentas",
                    variant: "destructive",
                });
            } finally {
                setTreeLoading(false);
            }
        };
        loadTree();
    }, []);

    // Auto-set nature when type changes
    useEffect(() => {
        if (type) {
            setNature(getNatureForType(type));
        }
    }, [type]);

    // Auto-calculate level from code or parent
    useEffect(() => {
        if (parentId && parentId !== "none") {
            const parent = flatAccounts.find((f) => f.account.id.toString() === parentId);
            if (parent) {
                setLevel((parent.account.level + 1).toString());
                return;
            }
        }
        // Fallback: determine level from code length
        if (code) {
            const cleanCode = code.replace(/\D/g, "");
            if (cleanCode.length <= 1) setLevel("1");
            else if (cleanCode.length <= 2) setLevel("2");
            else if (cleanCode.length <= 4) setLevel("3");
            else if (cleanCode.length <= 6) setLevel("4");
            else setLevel("5");
        }
    }, [code, parentId, flatAccounts]);

    const handleSubmit = async () => {
        if (!code.trim()) {
            toast({ title: "Campo requerido", description: "Ingrese el codigo de la cuenta", variant: "destructive" });
            return;
        }
        if (!name.trim()) {
            toast({ title: "Campo requerido", description: "Ingrese el nombre de la cuenta", variant: "destructive" });
            return;
        }
        if (!type) {
            toast({ title: "Campo requerido", description: "Seleccione el tipo de cuenta", variant: "destructive" });
            return;
        }
        if (!nature) {
            toast({ title: "Campo requerido", description: "Seleccione la naturaleza de la cuenta", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            await accountingApi.accounts.create({
                code: code.trim(),
                name: name.trim(),
                type: type as AccountingAccount["type"],
                nature: nature as AccountingAccount["nature"],
                parent_id: parentId && parentId !== "none" ? parseInt(parentId) : null,
                level: level ? parseInt(level) : 1,
                description: description.trim() || undefined,
            });
            toast({ title: "Cuenta creada", description: "La cuenta contable ha sido creada exitosamente" });
            router.visit("/admin/accounting/accounts");
        } catch (error: any) {
            const msg = error?.message || "Error al crear la cuenta";
            toast({ title: "Error", description: msg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Nueva Cuenta Contable" />

            <div className="-mt-4 sm:-mt-6">
                {/* Header */}
                <div className="bg-card border-b sticky top-14 z-10 shadow-sm -mx-2 sm:-mx-4 lg:-mx-6">
                    <div className="px-3 sm:px-4 lg:px-6 py-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.visit("/admin/accounting/accounts")}
                                    className="h-8 w-8 flex-shrink-0"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center border flex-shrink-0">
                                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-sm sm:text-lg font-bold truncate">Nueva Cuenta Contable</h1>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                                        Complete la informacion de la cuenta
                                    </p>
                                </div>
                            </div>
                            <Button onClick={handleSubmit} size="sm" className="gap-1.5 shadow-lg h-8 px-3 text-xs sm:text-sm" disabled={loading}>
                                {loading ? <Spinner className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                                <span>Guardar</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="py-4">
                    <Card className="border shadow-sm">
                        <CardContent className="p-4">
                            <div className="space-y-4">
                                {/* Row 1: Code + Name */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">
                                            Codigo <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            placeholder="Ej: 1105, 4135..."
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1 lg:col-span-2">
                                        <Label className="text-xs text-muted-foreground">
                                            Nombre <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            placeholder="Nombre de la cuenta contable"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Type + Nature + Level */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">
                                            Tipo <span className="text-destructive">*</span>
                                        </Label>
                                        <Select value={type} onValueChange={(val) => setType(val as AccountType)}>
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue placeholder="Seleccionar tipo..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card z-50">
                                                {ACCOUNT_TYPES.map((t) => (
                                                    <SelectItem key={t.value} value={t.value}>
                                                        {t.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">
                                            Naturaleza <span className="text-destructive">*</span>
                                        </Label>
                                        <Select value={nature} onValueChange={(val) => setNature(val as "debit" | "credit")}>
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue placeholder="Seleccionar naturaleza..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card z-50">
                                                <SelectItem value="debit">Debito</SelectItem>
                                                <SelectItem value="credit">Credito</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {type && (
                                            <p className="text-[10px] text-muted-foreground">
                                                Auto-asignada: {getNatureForType(type) === "debit" ? "Debito" : "Credito"}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Nivel</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={10}
                                            placeholder="Auto-calculado"
                                            value={level}
                                            onChange={(e) => setLevel(e.target.value)}
                                            className="h-9 text-sm"
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            Se calcula automaticamente segun el codigo o cuenta padre
                                        </p>
                                    </div>
                                </div>

                                {/* Row 3: Parent Account */}
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Cuenta Padre</Label>
                                    {treeLoading ? (
                                        <div className="flex items-center gap-2 h-9 px-3 text-sm text-muted-foreground">
                                            <Spinner className="h-4 w-4" />
                                            Cargando cuentas...
                                        </div>
                                    ) : (
                                        <Select value={parentId} onValueChange={setParentId}>
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue placeholder="Sin cuenta padre (cuenta raiz)" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card z-50 max-h-64">
                                                <SelectItem value="none">Sin cuenta padre (cuenta raiz)</SelectItem>
                                                {flatAccounts.map(({ account, depth }) => (
                                                    <SelectItem key={account.id} value={account.id.toString()}>
                                                        {buildAccountLabel(account, depth)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                {/* Row 4: Description */}
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Descripcion</Label>
                                    <Textarea
                                        placeholder="Descripcion opcional de la cuenta contable..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="min-h-[80px] text-sm"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 mt-4 pb-6">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.visit("/admin/accounting/accounts")}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleSubmit} size="sm" className="gap-2" disabled={loading}>
                            {loading ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                            Guardar Cuenta
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
