import { useState, useEffect, useMemo, useCallback } from "react";
import { Head, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    Plus,
    Trash2,
    ClipboardList,
    Save,
    User as UserIcon,
    Calendar,
    CalendarIcon,
    Wrench,
} from "lucide-react";
import {
    serviceOrdersApi,
    clientsApi,
    usersApi,
    productsApi,
    servicesApi,
    type Product,
    type Service,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { User, ServiceOrder, ServiceOrderItem } from "@/types";

// Helpers for formatted number inputs
const formatInputNumber = (value: string | number): string => {
    const digits = String(value).replace(/\D/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("es-CO");
};

const parseInputNumber = (value: string): number => {
    return Number(value.replace(/\D/g, "")) || 0;
};

const ORDER_TYPES = [
    { value: "repair", label: "Reparacion" },
    { value: "maintenance", label: "Mantenimiento" },
    { value: "installation", label: "Instalacion" },
    { value: "inspection", label: "Inspeccion" },
    { value: "custom", label: "Personalizado" },
];

const PRIORITY_OPTIONS = [
    { value: "low", label: "Baja" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "Alta" },
    { value: "urgent", label: "Urgente" },
];

const ITEM_TYPES = [
    { value: "service", label: "Servicio" },
    { value: "product", label: "Producto" },
    { value: "labor", label: "Mano de obra" },
];

interface OrderItemForm {
    type: "service" | "product" | "labor";
    product_id?: number;
    service_id?: number;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
}

interface FormErrors {
    title?: string;
    type?: string;
    items?: string;
    [key: string]: string | undefined;
}

interface Props {
    pageMode?: "create" | "edit";
    entityId?: number;
}

export default function CreateServiceOrderPage({ pageMode = "create", entityId }: Props) {
    const { toast } = useToast();

    const isEdit = pageMode === "edit";
    const pageTitle = isEdit ? "Editar Orden de Servicio" : "Nueva Orden de Servicio";

    // Catalogs
    const [clients, setClients] = useState<User[]>([]);
    const [employees, setEmployees] = useState<User[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    // Form fields
    const [title, setTitle] = useState("");
    const [type, setType] = useState("repair");
    const [priority, setPriority] = useState("normal");
    const [equipmentInfo, setEquipmentInfo] = useState("");
    const [description, setDescription] = useState("");
    const [clientId, setClientId] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");
    const [estimatedDuration, setEstimatedDuration] = useState("");

    // Dynamic items
    const [items, setItems] = useState<OrderItemForm[]>([
        { type: "service", description: "", quantity: 1, unit_price: 0, tax_rate: 19 },
    ]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [clientsData, employeesData, productsData, servicesData] = await Promise.all([
                clientsApi.getAll(),
                usersApi.getAll(),
                productsApi.getAll(),
                servicesApi.getAll(),
            ]);
            setClients(clientsData);
            setEmployees(employeesData);
            setProducts(productsData);
            setServices(servicesData);

            if (isEdit && entityId) {
                await loadOrder(entityId);
            }
        } catch (error) {
            console.error("Error loading data:", error);
            toast({
                title: "Error",
                description: "No se pudieron cargar los datos",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const loadOrder = async (id: number) => {
        try {
            const order = await serviceOrdersApi.getById(id);
            setTitle(order.title || "");
            setType(order.type || "repair");
            setPriority(order.priority || "normal");
            setEquipmentInfo(order.equipment_info || "");
            setDescription(order.description || "");
            setClientId(order.client_id ? String(order.client_id) : "");
            setAssignedTo(order.assigned_to ? String(order.assigned_to) : "");
            setScheduledDate(order.scheduled_date || "");
            setScheduledTime(order.scheduled_time || "");
            setEstimatedDuration(order.estimated_duration ? String(order.estimated_duration) : "");

            if (order.items && order.items.length > 0) {
                setItems(
                    order.items.map((item) => ({
                        type: item.type,
                        product_id: item.product_id ?? undefined,
                        service_id: item.service_id ?? undefined,
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        tax_rate: item.tax_rate ?? 19,
                    }))
                );
            }
        } catch (error) {
            console.error("Error loading order:", error);
            toast({
                title: "Error",
                description: "No se pudo cargar la orden de servicio",
                variant: "destructive",
            });
        }
    };

    // Items management
    const addItem = () => {
        setItems([...items, { type: "service", description: "", quantity: 1, unit_price: 0, tax_rate: 19 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof OrderItemForm, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        // Reset product/service IDs when changing type
        if (field === "type") {
            newItems[index].product_id = undefined;
            newItems[index].service_id = undefined;
            newItems[index].description = "";
            newItems[index].unit_price = 0;
            newItems[index].tax_rate = 19;
        }
        setItems(newItems);
    };

    const selectProduct = (index: number, productId: string) => {
        const newItems = [...items];
        if (productId === "manual") {
            newItems[index] = { ...newItems[index], product_id: undefined, description: "", unit_price: 0, tax_rate: 19 };
        } else {
            const product = products.find((p) => p.id === Number(productId));
            if (product) {
                newItems[index] = {
                    ...newItems[index],
                    product_id: product.id,
                    description: product.name,
                    unit_price: product.sale_price,
                    tax_rate: 19,
                };
            }
        }
        setItems(newItems);
    };

    const selectService = (index: number, serviceId: string) => {
        const newItems = [...items];
        if (serviceId === "manual") {
            newItems[index] = { ...newItems[index], service_id: undefined, description: "", unit_price: 0, tax_rate: 19 };
        } else {
            const service = services.find((s) => s.id === Number(serviceId));
            if (service) {
                newItems[index] = {
                    ...newItems[index],
                    service_id: service.id,
                    description: service.name,
                    unit_price: service.price,
                    tax_rate: service.tax_rate ?? 19,
                };
            }
        }
        setItems(newItems);
    };

    // Combobox options
    const clientOptions: ComboboxOption[] = useMemo(() =>
        clients.map((c) => ({
            value: String(c.id),
            label: c.name + (c.document_id ? ` - ${c.document_id}` : ""),
        })),
        [clients]
    );

    const employeeOptions: ComboboxOption[] = useMemo(() =>
        employees.map((e) => ({
            value: String(e.id),
            label: e.name,
        })),
        [employees]
    );

    const productOptions: ComboboxOption[] = useMemo(() => [
        { value: "manual", label: "-- Producto manual (no inventario) --" },
        ...products.map((p) => ({
            value: String(p.id),
            label: `${p.name}${p.sku ? ` (${p.sku})` : ""} - ${formatCurrency(p.sale_price)} | Stock: ${p.current_stock}`,
        })),
    ], [products]);

    const serviceOptions: ComboboxOption[] = useMemo(() => [
        { value: "manual", label: "-- Servicio manual --" },
        ...services.map((s) => ({
            value: String(s.id),
            label: `${s.name} - ${formatCurrency(s.price)}`,
        })),
    ], [services]);

    const subtotal = useMemo(
        () => items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
        [items]
    );

    const totalTax = useMemo(
        () => items.reduce((sum, item) => sum + (item.quantity * item.unit_price * item.tax_rate / 100), 0),
        [items]
    );

    const grandTotal = subtotal + totalTax;

    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!title.trim()) {
            setErrors({ title: "El titulo es obligatorio" });
            return;
        }

        const validItems = items.filter((item) => item.description.trim() && item.quantity > 0);

        setFormLoading(true);
        try {
            const data = {
                title: title.trim(),
                type,
                priority,
                equipment_info: equipmentInfo.trim() || undefined,
                description: description.trim() || undefined,
                client_id: clientId ? parseInt(clientId) : undefined,
                assigned_to: assignedTo ? parseInt(assignedTo) : undefined,
                scheduled_date: scheduledDate || undefined,
                scheduled_time: scheduledTime || undefined,
                estimated_duration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
                items: validItems.length > 0
                    ? validItems.map((item) => ({
                          type: item.type,
                          description: item.description,
                          quantity: item.quantity,
                          unit_price: item.unit_price,
                          tax_rate: item.tax_rate,
                          product_id: item.product_id || undefined,
                          service_id: item.service_id || undefined,
                      }))
                    : undefined,
            };

            let result: ServiceOrder;
            if (isEdit && entityId) {
                result = await serviceOrdersApi.update(entityId, data);
                toast({
                    title: "Orden actualizada",
                    description: "La orden de servicio se actualizo correctamente",
                });
            } else {
                result = await serviceOrdersApi.create(data);
                toast({
                    title: "Orden creada",
                    description: `Orden ${result.order_number} creada exitosamente`,
                });
            }
            router.visit(`/admin/service-orders/${result.id}`);
        } catch (error: unknown) {
            console.error("Error saving order:", error);
            if (error && typeof error === "object") {
                if ("errors" in error && (error as any).errors) {
                    setErrors((error as { errors: FormErrors }).errors);
                }
                if ("message" in error && (error as any).message) {
                    toast({
                        title: "Error",
                        description: (error as { message: string }).message,
                        variant: "destructive",
                    });
                }
            }
        } finally {
            setFormLoading(false);
        }
    };

    if (loading) {
        return (
            <AppLayout title={pageTitle}>
                <Head title={pageTitle} />
                <div className="flex justify-center py-24">
                    <Spinner className="h-8 w-8" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title={pageTitle}>
            <Head title={pageTitle} />

            <div className="space-y-6">
                {/* Header */}
                <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
                    <div className="px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.visit("/admin/service-orders")}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div className="bg-primary/10 p-2.5 rounded-lg">
                                <ClipboardList className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold text-foreground">
                                    {pageTitle}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {isEdit
                                        ? "Modifique los datos de la orden de servicio"
                                        : "Complete los datos para crear una nueva orden de servicio"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Informacion General */}
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Informacion General
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <Label className="mb-2 block">Titulo *</Label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Ej: Reparacion de equipo de computo"
                                        disabled={formLoading}
                                    />
                                    {errors.title && (
                                        <p className="text-sm text-destructive mt-1">{errors.title}</p>
                                    )}
                                </div>
                                <div>
                                    <Label className="mb-2 block">Tipo</Label>
                                    <Select
                                        value={type}
                                        onValueChange={setType}
                                        disabled={formLoading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar tipo" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card z-50">
                                            {ORDER_TYPES.map((t) => (
                                                <SelectItem key={t.value} value={t.value}>
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="mb-2 block">Prioridad</Label>
                                    <Select
                                        value={priority}
                                        onValueChange={setPriority}
                                        disabled={formLoading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar prioridad" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card z-50">
                                            {PRIORITY_OPTIONS.map((p) => (
                                                <SelectItem key={p.value} value={p.value}>
                                                    {p.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="mb-2 block">Equipo o referencia</Label>
                                    <Input
                                        value={equipmentInfo}
                                        onChange={(e) => setEquipmentInfo(e.target.value)}
                                        placeholder="Ej: Laptop Dell Latitude 5520 - S/N ABC123"
                                        disabled={formLoading}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="mb-2 block">Descripcion</Label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Descripcion detallada del servicio requerido..."
                                        rows={3}
                                        disabled={formLoading}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cliente y Asignacion */}
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <UserIcon className="h-4 w-4" />
                                Cliente y Asignacion
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-2 block">Cliente</Label>
                                    <Combobox
                                        options={clientOptions}
                                        value={clientId}
                                        onValueChange={setClientId}
                                        placeholder="Seleccionar cliente..."
                                        searchPlaceholder="Buscar cliente..."
                                        emptyText="No se encontro el cliente"
                                        disabled={formLoading}
                                    />
                                </div>
                                <div>
                                    <Label className="mb-2 block">Asignado a</Label>
                                    <Combobox
                                        options={employeeOptions}
                                        value={assignedTo}
                                        onValueChange={setAssignedTo}
                                        placeholder="Seleccionar empleado..."
                                        searchPlaceholder="Buscar empleado..."
                                        emptyText="No se encontro el empleado"
                                        disabled={formLoading}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Programacion */}
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Programacion
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label className="mb-2 block">Fecha programada</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn("h-10 w-full justify-start text-left font-normal text-sm", !scheduledDate && "text-muted-foreground")}
                                                disabled={formLoading}
                                            >
                                                <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                                                {scheduledDate
                                                    ? new Date(scheduledDate + "T12:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
                                                    : "Seleccionar fecha"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <DatePickerReport
                                                selected={scheduledDate ? new Date(scheduledDate + "T12:00:00") : undefined}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        const y = date.getFullYear();
                                                        const m = String(date.getMonth() + 1).padStart(2, "0");
                                                        const d = String(date.getDate()).padStart(2, "0");
                                                        setScheduledDate(`${y}-${m}-${d}`);
                                                    }
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div>
                                    <Label className="mb-2 block">Hora programada</Label>
                                    <Input
                                        type="time"
                                        value={scheduledTime}
                                        onChange={(e) => setScheduledTime(e.target.value)}
                                        disabled={formLoading}
                                    />
                                </div>
                                <div>
                                    <Label className="mb-2 block">Duracion estimada (minutos)</Label>
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        value={estimatedDuration}
                                        onChange={(e) => setEstimatedDuration(e.target.value.replace(/\D/g, ""))}
                                        placeholder="Ej: 60"
                                        disabled={formLoading}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items de la Orden */}
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4" />
                                    Items de la Orden
                                </h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addItem}
                                    disabled={formLoading}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Agregar Item
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="border rounded-lg p-3"
                                    >
                                        <div className="flex flex-wrap lg:flex-nowrap items-end gap-2">
                                            {/* Tipo */}
                                            <div className="w-full sm:w-28 shrink-0">
                                                <Label className="mb-1 block text-xs">Tipo</Label>
                                                <Select
                                                    value={item.type}
                                                    onValueChange={(v) => updateItem(index, "type", v)}
                                                    disabled={formLoading}
                                                >
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-card z-50">
                                                        {ITEM_TYPES.map((t) => (
                                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Producto/Servicio selector */}
                                            {item.type === "product" && (
                                                <div className="w-full sm:flex-1 min-w-[180px]">
                                                    <Label className="mb-1 block text-xs">Producto</Label>
                                                    <Combobox
                                                        options={productOptions}
                                                        value={item.product_id ? String(item.product_id) : "manual"}
                                                        onValueChange={(v) => selectProduct(index, v)}
                                                        placeholder="Buscar producto..."
                                                        searchPlaceholder="Buscar en inventario..."
                                                        emptyText="No se encontro"
                                                        disabled={formLoading}
                                                        className="h-9"
                                                    />
                                                </div>
                                            )}
                                            {item.type === "service" && (
                                                <div className="w-full sm:flex-1 min-w-[180px]">
                                                    <Label className="mb-1 block text-xs">Servicio</Label>
                                                    <Combobox
                                                        options={serviceOptions}
                                                        value={item.service_id ? String(item.service_id) : "manual"}
                                                        onValueChange={(v) => selectService(index, v)}
                                                        placeholder="Buscar servicio..."
                                                        searchPlaceholder="Buscar servicio..."
                                                        emptyText="No se encontro"
                                                        disabled={formLoading}
                                                        className="h-9"
                                                    />
                                                </div>
                                            )}

                                            {/* Descripcion */}
                                            <div className={cn("w-full min-w-[120px]", item.type === "labor" ? "sm:flex-1" : "sm:flex-[0.7]")}>
                                                <Label className="mb-1 block text-xs">{item.type === "labor" ? "Descripcion" : "Detalle"}</Label>
                                                <Input
                                                    className="h-9"
                                                    value={item.description}
                                                    onChange={(e) => updateItem(index, "description", e.target.value)}
                                                    placeholder={item.product_id || item.service_id ? "Opcional" : "Descripcion"}
                                                    disabled={formLoading}
                                                />
                                            </div>

                                            {/* Cantidad */}
                                            <div className="w-20 shrink-0">
                                                <Label className="mb-1 block text-xs">Cant.</Label>
                                                <Input
                                                    className="h-9 text-center"
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={item.quantity || ""}
                                                    onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
                                                    disabled={formLoading}
                                                />
                                            </div>

                                            {/* Precio unitario */}
                                            <div className="w-28 shrink-0">
                                                <Label className="mb-1 block text-xs">Precio</Label>
                                                <Input
                                                    className="h-9 text-right"
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={formatInputNumber(item.unit_price)}
                                                    onChange={(e) => updateItem(index, "unit_price", parseInputNumber(e.target.value))}
                                                    disabled={formLoading}
                                                />
                                            </div>

                                            {/* IVA % */}
                                            <div className="w-16 shrink-0">
                                                <Label className="mb-1 block text-xs">IVA %</Label>
                                                <Input
                                                    className="h-9 text-center"
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={item.tax_rate || ""}
                                                    onChange={(e) => updateItem(index, "tax_rate", parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
                                                    disabled={formLoading}
                                                />
                                            </div>

                                            {/* Total */}
                                            <div className="w-28 shrink-0 text-right">
                                                <Label className="mb-1 block text-xs">Total</Label>
                                                <p className="text-sm font-semibold h-9 flex items-center justify-end">
                                                    {formatCurrency(item.quantity * item.unit_price * (1 + item.tax_rate / 100))}
                                                </p>
                                            </div>

                                            {/* Delete */}
                                            <div className="shrink-0">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-destructive hover:text-destructive"
                                                    onClick={() => removeItem(index)}
                                                    disabled={formLoading || items.length <= 1}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {errors.items && (
                                <p className="text-sm text-destructive">{errors.items}</p>
                            )}

                            <Separator />

                            <div className="flex justify-end">
                                <div className="space-y-1 text-right min-w-[200px]">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal:</span>
                                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">IVA:</span>
                                        <span className="font-medium">{formatCurrency(totalTax)}</span>
                                    </div>
                                    <div className="border-t pt-1 flex justify-between text-base">
                                        <span className="font-semibold">Total:</span>
                                        <span className="font-bold">{formatCurrency(grandTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit("/admin/service-orders")}
                            disabled={formLoading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={formLoading}>
                            {formLoading ? (
                                <Spinner className="h-4 w-4 mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            {isEdit ? "Guardar Cambios" : "Crear Orden"}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
