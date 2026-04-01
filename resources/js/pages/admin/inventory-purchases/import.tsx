import { Head, router, usePage } from "@inertiajs/react";
import { useState, useRef, useCallback, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
    Upload,
    FileUp,
    Trash2,
    Plus,
    CheckCircle,
    AlertTriangle,
    XCircle,
    FileText,
    Image as ImageIcon,
    Sparkles,
    ArrowLeft,
} from "lucide-react";
import {
    inventoryPurchasesApi,
    suppliersApi,
    warehousesApi,
    productsApi,
    productCategoriesApi,
    type ParsedInvoiceInfo,
    type ParseInvoiceResponse,
    type Supplier,
    type Warehouse as WarehouseType,
    type Product,
    type ProductCategory,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { SharedData } from "@/types";

interface EditableItem {
    id: string;
    raw_text: string;
    quantity: number;
    unit_cost: number;
    product_id: string;
    confidence: number;
}

type PageStep = "upload" | "processing" | "preview";

export default function ImportInvoicePage() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [step, setStep] = useState<PageStep>("upload");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [processingMessage, setProcessingMessage] = useState("");
    const [processingProgress, setProcessingProgress] = useState(0);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Preview state
    const [items, setItems] = useState<EditableItem[]>([]);
    const [invoiceInfo, setInvoiceInfo] = useState<ParsedInvoiceInfo>({
        supplier_name: null,
        invoice_number: null,
        date: null,
    });
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [selectedWarehouse, setSelectedWarehouse] = useState("");
    const [creating, setCreating] = useState(false);
    const [rawText, setRawText] = useState("");
    const [createError, setCreateError] = useState("");
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Product creation dialog state
    const [productDialogOpen, setProductDialogOpen] = useState(false);
    const [productDialogItemId, setProductDialogItemId] = useState<string | null>(null);
    const [productFormLoading, setProductFormLoading] = useState(false);
    const [productFormError, setProductFormError] = useState("");
    const [productForm, setProductForm] = useState({
        name: "",
        sku: "",
        category_id: "",
        purchase_price: "",
        sale_price: "",
        unit_of_measure: "unidad",
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [suppliersData, warehousesData, productsData, categoriesData] = await Promise.all([
                suppliersApi.getAll(),
                warehousesApi.getAll(),
                productsApi.getAll(),
                productCategoriesApi.getAll(),
            ]);
            setSuppliers(suppliersData);
            setWarehouses(warehousesData);
            setProducts(productsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoadingData(false);
        }
    };

    const reset = useCallback(() => {
        setStep("upload");
        setSelectedFile(null);
        setDragOver(false);
        setProcessingMessage("");
        setProcessingProgress(0);
        setError("");
        setItems([]);
        setInvoiceInfo({ supplier_name: null, invoice_number: null, date: null });
        setSelectedSupplier("");
        setSelectedWarehouse("");
        setCreating(false);
        setCreateError("");
        setRawText("");
    }, []);

    const goBack = () => {
        router.visit("/admin/inventory-purchases");
    };

    const handleFileSelect = (file: File) => {
        const validTypes = [
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/jpg",
        ];
        if (!validTypes.includes(file.type)) {
            setError("Formato no soportado. Use PDF, PNG o JPG.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError("El archivo es demasiado grande (máx. 10MB).");
            return;
        }
        setError("");
        setSelectedFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    // Render PDF pages to a single image using pdfjs-dist
    const renderPdfToImage = async (pdfFile: File): Promise<Blob> => {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const maxPages = Math.min(pdf.numPages, 3);
        const pageCanvases: HTMLCanvasElement[] = [];

        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            await page.render({ canvasContext: ctx, viewport }).promise;
            pageCanvases.push(canvas);
            setProcessingProgress(30 + Math.round((i / maxPages) * 10));
        }

        const combined = document.createElement("canvas");
        combined.width = pageCanvases[0]?.width || 800;
        combined.height = pageCanvases.reduce((h, c) => h + c.height, 0);
        const ctx = combined.getContext("2d")!;
        let y = 0;
        for (const pc of pageCanvases) {
            ctx.drawImage(pc, 0, y);
            y += pc.height;
        }

        return new Promise<Blob>((resolve) => {
            combined.toBlob((blob) => resolve(blob!), "image/png");
        });
    };

    // OCR a file/blob with tesseract.js, then send text to backend for parsing
    const ocrAndParse = async (fileOrBlob: File | Blob) => {
        setProcessingMessage("Cargando motor de OCR...");
        setProcessingProgress(45);

        const Tesseract = await import("tesseract.js");
        setProcessingMessage("Extrayendo texto con OCR...");
        setProcessingProgress(50);

        const result = await Tesseract.recognize(fileOrBlob, "spa", {
            logger: (info: { status: string; progress: number }) => {
                if (info.status === "recognizing text") {
                    const pct = Math.round(50 + info.progress * 35);
                    setProcessingProgress(pct);
                    setProcessingMessage(
                        `Extrayendo texto... ${Math.round(info.progress * 100)}%`
                    );
                }
            },
        });

        const extractedText = result.data.text;
        if (!extractedText || extractedText.trim().length < 10) {
            throw new Error(
                "No se pudo extraer texto legible. Intente con una imagen más clara o de mayor resolución."
            );
        }

        setProcessingMessage("Analizando productos...");
        setProcessingProgress(90);

        const response = await inventoryPurchasesApi.parseInvoice(
            undefined,
            extractedText
        );
        handleParseResponse(response);
    };

    const processInvoice = async () => {
        if (!selectedFile) return;
        setStep("processing");
        setError("");

        try {
            const isImage = selectedFile.type.startsWith("image/");

            if (isImage) {
                await ocrAndParse(selectedFile);
            } else {
                setProcessingMessage("Analizando factura PDF...");
                setProcessingProgress(20);

                const response =
                    await inventoryPurchasesApi.parseInvoice(selectedFile);

                if (response.warning) {
                    setProcessingMessage(
                        "PDF sin texto extraíble. Renderizando para OCR..."
                    );
                    setProcessingProgress(25);
                    const imageBlob = await renderPdfToImage(selectedFile);
                    await ocrAndParse(imageBlob);
                } else {
                    setProcessingProgress(90);
                    handleParseResponse(response);
                }
            }
        } catch (err: any) {
            console.error("Error processing invoice:", err);
            setError(
                err.message || "Error al procesar la factura. Intente nuevamente."
            );
            setStep("upload");
        }
    };

    const normalize = (text: string) =>
        text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    const findSupplierMatch = (detectedName: string): Supplier | undefined => {
        const detected = normalize(detectedName);
        const detectedWords = detected.split(" ").filter((w) => w.length > 2);

        // 1. Try NIT/tax_id match - extract digits from detected name
        const digitsInDetected = detectedName.replace(/[^\d]/g, "");
        if (digitsInDetected.length >= 6) {
            const nitMatch = suppliers.find((s) => {
                if (!s.tax_id) return false;
                const supplierDigits = s.tax_id.replace(/[^\d]/g, "");
                return supplierDigits === digitsInDetected || supplierDigits.startsWith(digitsInDetected) || digitsInDetected.startsWith(supplierDigits);
            });
            if (nitMatch) return nitMatch;
        }

        // 2. Exact normalized match
        const exactMatch = suppliers.find((s) => normalize(s.name) === detected);
        if (exactMatch) return exactMatch;

        // 3. Substring match (one contains the other)
        const substringMatch = suppliers.find((s) => {
            const sNorm = normalize(s.name);
            return sNorm.includes(detected) || detected.includes(sNorm);
        });
        if (substringMatch) return substringMatch;

        // 4. Word overlap - at least 2 significant words match
        let bestMatch: Supplier | undefined;
        let bestScore = 0;
        for (const s of suppliers) {
            const sWords = normalize(s.name).split(" ").filter((w) => w.length > 2);
            const overlap = detectedWords.filter((w) => sWords.includes(w)).length;
            const score = overlap / Math.max(sWords.length, 1);
            if (overlap >= 2 && score > bestScore) {
                bestScore = score;
                bestMatch = s;
            }
        }
        if (bestMatch) return bestMatch;

        return undefined;
    };

    const handleParseResponse = (response: ParseInvoiceResponse) => {
        setProcessingProgress(100);
        setRawText(response.raw_text || "");

        if (response.warning) {
            setError(response.warning);
            setStep("upload");
            return;
        }

        const editableItems: EditableItem[] = response.items.map(
            (item, idx) => {
                let productId = "";
                if (item.matched_product_name) {
                    const match = products.find(
                        (p) =>
                            p.name.toLowerCase() ===
                            item.matched_product_name!.toLowerCase()
                    );
                    if (match) {
                        productId = match.id.toString();
                    }
                }
                return {
                    id: `item-${idx}-${Date.now()}`,
                    raw_text: item.raw_text,
                    quantity: item.quantity,
                    unit_cost: item.unit_cost,
                    product_id: productId,
                    confidence: item.confidence,
                };
            }
        );

        setItems(editableItems);
        setInvoiceInfo(response.invoice_info);

        if (response.invoice_info.supplier_name) {
            const supplierMatch = findSupplierMatch(response.invoice_info.supplier_name);
            if (supplierMatch) {
                setSelectedSupplier(supplierMatch.id.toString());
            }
        }

        setStep("preview");
    };

    const updateItem = (id: string, field: keyof EditableItem, value: any) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const removeItem = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const addEmptyItem = () => {
        setItems((prev) => [
            ...prev,
            {
                id: `item-new-${Date.now()}`,
                raw_text: "",
                quantity: 1,
                unit_cost: 0,
                product_id: "",
                confidence: -1,
            },
        ]);
    };

    const openProductDialog = (itemId: string) => {
        const item = items.find((i) => i.id === itemId);
        const rawName = item?.raw_text || "";
        // Clean product name: remove quantities, prices, and common noise
        const cleanName = rawName
            .replace(/^\d+[\s,.]*/g, "")
            .replace(/[\$\d.,]+$/g, "")
            .replace(/\s{2,}/g, " ")
            .trim();

        setProductDialogItemId(itemId);
        setProductForm({
            name: cleanName,
            sku: `SKU-${Date.now().toString(36).toUpperCase()}`,
            category_id: "",
            purchase_price: item ? item.unit_cost.toString() : "",
            sale_price: item ? item.unit_cost.toString() : "",
            unit_of_measure: "unidad",
        });
        setProductFormError("");
        setProductDialogOpen(true);
    };

    const handleCreateProduct = async () => {
        if (!productForm.name || !productForm.sku || !productForm.category_id || !productForm.purchase_price || !productForm.sale_price) {
            setProductFormError("Todos los campos marcados con * son obligatorios");
            return;
        }

        setProductFormLoading(true);
        setProductFormError("");

        try {
            const newProduct = await productsApi.create({
                name: productForm.name,
                sku: productForm.sku,
                category_id: parseInt(productForm.category_id),
                purchase_price: parseFloat(productForm.purchase_price),
                sale_price: parseFloat(productForm.sale_price),
                unit_of_measure: productForm.unit_of_measure,
                supplier_id: selectedSupplier ? parseInt(selectedSupplier) : undefined,
                company_id: user.company_id,
                is_active: true,
                is_trackable: true,
                current_stock: 0,
                min_stock: 0,
            } as any);

            // Add to products list
            setProducts((prev) => [...prev, newProduct]);

            // Auto-select in the item
            if (productDialogItemId) {
                updateItem(productDialogItemId, "product_id", newProduct.id.toString());
                updateItem(productDialogItemId, "confidence", 1);
            }

            setProductDialogOpen(false);
        } catch (err: any) {
            console.error("Error creating product:", err);
            setProductFormError(err.message || "Error al crear el producto");
        } finally {
            setProductFormLoading(false);
        }
    };

    const getTotal = () => {
        return items.reduce(
            (sum, item) => sum + item.quantity * item.unit_cost,
            0
        );
    };


    // Format number for Colombian display (85000 → "85.000")
    const formatCONumber = (value: number) => {
        if (!value) return "";
        return new Intl.NumberFormat("es-CO").format(value);
    };

    // Parse Colombian formatted input ("85.000,50" → 85000.5)
    const parseCONumber = (text: string) => {
        const cleaned = text.replace(/\./g, "").replace(",", ".");
        return parseFloat(cleaned) || 0;
    };

    const getConfidenceBadge = (confidence: number) => {
        if (confidence < 0)
            return (
                <Badge
                    variant="outline"
                    className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/20"
                >
                    <Plus className="mr-1 h-3 w-3" />
                    Manual
                </Badge>
            );
        if (confidence >= 0.8)
            return (
                <Badge
                    variant="default"
                    className="text-xs bg-green-500/15 text-green-700 border-green-500/20"
                >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Alto
                </Badge>
            );
        if (confidence >= 0.4)
            return (
                <Badge
                    variant="default"
                    className="text-xs bg-yellow-500/15 text-yellow-700 border-yellow-500/20"
                >
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Parcial
                </Badge>
            );
        return (
            <Badge
                variant="default"
                className="text-xs bg-red-500/15 text-red-700 border-red-500/20"
            >
                <XCircle className="mr-1 h-3 w-3" />
                Sin match
            </Badge>
        );
    };

    const canCreate = () => {
        return (
            selectedSupplier &&
            selectedWarehouse &&
            items.length > 0 &&
            items.every(
                (item) =>
                    item.product_id && item.quantity > 0 && item.unit_cost > 0
            )
        );
    };

    const handleCreatePurchase = async () => {
        if (!canCreate()) return;
        setCreating(true);
        setCreateError("");

        try {
            await inventoryPurchasesApi.create({
                supplier_id: parseInt(selectedSupplier),
                warehouse_id: parseInt(selectedWarehouse),
                notes: invoiceInfo.invoice_number
                    ? `Importada de factura ${invoiceInfo.invoice_number}`
                    : "Importada desde factura",
                items: items.map((item) => ({
                    product_id: parseInt(item.product_id),
                    quantity_ordered: item.quantity,
                    unit_cost: item.unit_cost,
                })),
            });

            router.visit("/admin/inventory-purchases");
        } catch (err: any) {
            console.error("Error creating purchase:", err);
            setCreateError(
                err.message || "Error al crear la orden de compra."
            );
        } finally {
            setCreating(false);
        }
    };

    const getFileIcon = () => {
        if (!selectedFile)
            return <Upload className="h-12 w-12 text-muted-foreground" />;
        if (selectedFile.type === "application/pdf")
            return <FileText className="h-12 w-12 text-orange-500" />;
        return <ImageIcon className="h-12 w-12 text-blue-500" />;
    };

    if (loadingData) {
        return (
            <AppLayout title="Importar Factura">
                <Head title="Importar Factura" />
                <div className="flex justify-center py-24">
                    <Spinner className="h-8 w-8" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Importar Factura">
            <Head title="Importar Factura" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={goBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-orange-500" />
                            Importar Factura
                        </h2>
                        <p className="text-muted-foreground">
                            {step === "upload" &&
                                "Sube una imagen o PDF de la factura del proveedor"}
                            {step === "processing" &&
                                "Analizando el documento..."}
                            {step === "preview" &&
                                "Revisa y ajusta los productos detectados antes de crear la orden"}
                        </p>
                    </div>
                </div>

                {/* STEP 1: Upload */}
                {step === "upload" && (
                    <div className="mx-auto max-w-xl">
                        <Card>
                            <CardHeader>
                                <CardTitle>Subir Factura</CardTitle>
                                <CardDescription>
                                    Arrastra o selecciona el archivo de la factura del proveedor
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div
                                    className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
                                        dragOver
                                            ? "border-orange-500 bg-orange-500/10"
                                            : selectedFile
                                              ? "border-green-400 bg-green-500/10"
                                              : "border-muted-foreground/25 hover:border-orange-400 hover:bg-orange-500/10/50"
                                    }`}
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files?.[0])
                                                handleFileSelect(
                                                    e.target.files[0]
                                                );
                                        }}
                                    />
                                    <div className="flex flex-col items-center gap-3">
                                        {getFileIcon()}
                                        {selectedFile ? (
                                            <div>
                                                <p className="font-medium text-green-700">
                                                    {selectedFile.name}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {(
                                                        selectedFile.size /
                                                        1024 /
                                                        1024
                                                    ).toFixed(2)}{" "}
                                                    MB — Click para cambiar
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="font-medium text-lg">
                                                    Arrastra tu factura aquí
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    o haz click para
                                                    seleccionar un archivo
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    PDF, PNG, JPG — Máximo 10MB
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {error && (
                                    <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-700 border border-red-500/20">
                                        {error}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={goBack}>
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={processInvoice}
                                        disabled={!selectedFile}
                                        className="bg-orange-500/100 hover:bg-orange-600 text-white"
                                    >
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Analizar Factura
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* STEP 2: Processing */}
                {step === "processing" && (
                    <div className="mx-auto max-w-xl">
                        <Card>
                            <CardContent className="py-16">
                                <div className="space-y-6">
                                    <div className="flex flex-col items-center gap-4">
                                        <Spinner className="h-12 w-12" />
                                        <p className="text-sm font-medium">
                                            {processingMessage}
                                        </p>
                                    </div>
                                    <div className="mx-auto w-full max-w-xs">
                                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-orange-500/100 transition-all duration-500"
                                                style={{
                                                    width: `${processingProgress}%`,
                                                }}
                                            />
                                        </div>
                                        <p className="text-center text-xs text-muted-foreground mt-2">
                                            {processingProgress}%
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* STEP 3: Preview */}
                {step === "preview" && (
                    <div className="space-y-6">
                        {/* Invoice Info + Selectors */}
                        <div className="grid gap-6 lg:grid-cols-3">
                            {/* Detected invoice info */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                        Información Detectada
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    {invoiceInfo.supplier_name ? (
                                        <div>
                                            <span className="text-muted-foreground">
                                                Proveedor:{" "}
                                            </span>
                                            <span className="font-medium">
                                                {invoiceInfo.supplier_name}
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground italic">
                                            No se detectó proveedor
                                        </p>
                                    )}
                                    {invoiceInfo.invoice_number && (
                                        <div>
                                            <span className="text-muted-foreground">
                                                Factura No.:{" "}
                                            </span>
                                            <span className="font-medium">
                                                {invoiceInfo.invoice_number}
                                            </span>
                                        </div>
                                    )}
                                    {invoiceInfo.date && (
                                        <div>
                                            <span className="text-muted-foreground">
                                                Fecha:{" "}
                                            </span>
                                            <span className="font-medium">
                                                {invoiceInfo.date}
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Supplier selector */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">
                                        Proveedor *
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Combobox
                                        value={selectedSupplier}
                                        onValueChange={setSelectedSupplier}
                                        placeholder="Seleccionar proveedor"
                                        searchPlaceholder="Buscar proveedor..."
                                        emptyText="No se encontraron proveedores"
                                        options={suppliers.map((s) => ({
                                            value: s.id.toString(),
                                            label: s.name,
                                        }))}
                                    />
                                </CardContent>
                            </Card>

                            {/* Warehouse selector */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">
                                        Bodega *
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Combobox
                                        value={selectedWarehouse}
                                        onValueChange={setSelectedWarehouse}
                                        placeholder="Seleccionar bodega"
                                        searchPlaceholder="Buscar bodega..."
                                        emptyText="No se encontraron bodegas"
                                        options={warehouses.map((w) => ({
                                            value: w.id.toString(),
                                            label: w.name,
                                        }))}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Debug: show raw text when no items detected */}
                        {items.length === 0 && rawText && (
                            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 space-y-2">
                                <p className="text-sm font-medium text-yellow-700">
                                    No se detectaron productos automáticamente.
                                    Puede agregar productos manualmente.
                                </p>
                                <details className="text-xs">
                                    <summary className="cursor-pointer text-yellow-700 hover:text-yellow-900">
                                        Ver texto extraído del documento
                                    </summary>
                                    <pre className="mt-2 max-h-[200px] overflow-y-auto whitespace-pre-wrap bg-card rounded p-3 border text-muted-foreground">
                                        {rawText}
                                    </pre>
                                </details>
                            </div>
                        )}

                        {/* Products Table */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle>Productos Detectados</CardTitle>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addEmptyItem}
                                    >
                                        <Plus className="mr-1 h-4 w-4" />
                                        Agregar Producto
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[90px]">
                                                    Match
                                                </TableHead>
                                                <TableHead className="min-w-[280px]">
                                                    Producto
                                                </TableHead>
                                                <TableHead className="w-[100px] text-right">
                                                    Cantidad
                                                </TableHead>
                                                <TableHead className="w-[150px] text-right">
                                                    Costo Unitario
                                                </TableHead>
                                                <TableHead className="w-[140px] text-right">
                                                    Subtotal
                                                </TableHead>
                                                <TableHead className="w-[50px]" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={6}
                                                        className="text-center py-8 text-muted-foreground"
                                                    >
                                                        No hay productos.
                                                        Agrega uno manualmente.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                items.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            {getConfidenceBadge(
                                                                item.confidence
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.raw_text && (
                                                                <p className="text-xs text-muted-foreground mb-1 truncate max-w-[350px]">
                                                                    {
                                                                        item.raw_text
                                                                    }
                                                                </p>
                                                            )}
                                                            <div className="flex gap-2">
                                                                <div className="flex-1">
                                                                    <Combobox
                                                                        value={
                                                                            item.product_id
                                                                        }
                                                                        onValueChange={(
                                                                            val
                                                                        ) =>
                                                                            updateItem(
                                                                                item.id,
                                                                                "product_id",
                                                                                val
                                                                            )
                                                                        }
                                                                        placeholder="Seleccionar producto"
                                                                        searchPlaceholder="Buscar producto..."
                                                                        emptyText="Sin resultados"
                                                                        options={products.map(
                                                                            (p) => ({
                                                                                value: p.id.toString(),
                                                                                label: `${p.name}${p.sku ? ` (${p.sku})` : ""}`,
                                                                            })
                                                                        )}
                                                                    />
                                                                </div>
                                                                {!item.product_id && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="shrink-0 text-xs h-10"
                                                                        onClick={() => openProductDialog(item.id)}
                                                                    >
                                                                        <Plus className="mr-1 h-3 w-3" />
                                                                        Crear
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                value={
                                                                    item.quantity
                                                                }
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        item.id,
                                                                        "quantity",
                                                                        parseInt(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        ) || 0
                                                                    )
                                                                }
                                                                className="w-[80px] text-right ml-auto"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Input
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={
                                                                    focusedField === `${item.id}-cost`
                                                                        ? undefined
                                                                        : formatCONumber(item.unit_cost)
                                                                }
                                                                defaultValue={
                                                                    focusedField === `${item.id}-cost`
                                                                        ? item.unit_cost.toString().replace(".", ",")
                                                                        : undefined
                                                                }
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^\d.,]/g, "");
                                                                    e.target.value = val;
                                                                    updateItem(
                                                                        item.id,
                                                                        "unit_cost",
                                                                        parseCONumber(val)
                                                                    );
                                                                }}
                                                                onFocus={(e) => {
                                                                    setFocusedField(`${item.id}-cost`);
                                                                    const raw = item.unit_cost
                                                                        ? item.unit_cost.toString().replace(".", ",")
                                                                        : "";
                                                                    e.target.value = raw;
                                                                }}
                                                                onBlur={() => setFocusedField(null)}
                                                                placeholder="0"
                                                                className="w-[130px] text-right ml-auto"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {formatCurrency(
                                                                item.quantity *
                                                                    item.unit_cost
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    removeItem(
                                                                        item.id
                                                                    )
                                                                }
                                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Total */}
                                <div className="border-t bg-muted/30 px-6 py-4 flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        {items.length} producto
                                        {items.length !== 1 ? "s" : ""}
                                    </p>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">
                                            Total
                                        </p>
                                        <p className="text-2xl font-bold">
                                            {formatCurrency(getTotal())}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {createError && (
                            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-700 border border-red-500/20">
                                {createError}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-between gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    reset();
                                }}
                            >
                                <FileUp className="mr-2 h-4 w-4" />
                                Nueva Factura
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={goBack}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleCreatePurchase}
                                    disabled={!canCreate() || creating}
                                    className="bg-orange-500/100 hover:bg-orange-600 text-white"
                                >
                                    {creating ? (
                                        <>
                                            <Spinner className="mr-2 h-4 w-4" />
                                            Creando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Crear Orden de Compra
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Product Creation Dialog */}
            <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Crear Producto</DialogTitle>
                        <DialogDescription>
                            Crea un producto nuevo y se asignara automaticamente a la linea
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {productFormError && (
                            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-700 border border-red-500/20">
                                {productFormError}
                            </div>
                        )}
                        <div>
                            <Label>Nombre *</Label>
                            <Input
                                value={productForm.name}
                                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                                placeholder="Nombre del producto"
                                disabled={productFormLoading}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label>SKU *</Label>
                                <Input
                                    value={productForm.sku}
                                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                                    placeholder="SKU"
                                    disabled={productFormLoading}
                                />
                            </div>
                            <div>
                                <Label>Categoria *</Label>
                                <Select
                                    value={productForm.category_id}
                                    onValueChange={(val) => setProductForm({ ...productForm, category_id: val })}
                                    disabled={productFormLoading}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card z-50">
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id.toString()}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label>Precio de Compra *</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={productForm.purchase_price}
                                    onChange={(e) => setProductForm({ ...productForm, purchase_price: e.target.value })}
                                    placeholder="0"
                                    disabled={productFormLoading}
                                />
                            </div>
                            <div>
                                <Label>Precio de Venta *</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={productForm.sale_price}
                                    onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                                    placeholder="0"
                                    disabled={productFormLoading}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Unidad de Medida</Label>
                            <Select
                                value={productForm.unit_of_measure}
                                onValueChange={(val) => setProductForm({ ...productForm, unit_of_measure: val })}
                                disabled={productFormLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card z-50">
                                    <SelectItem value="unidad">Unidad</SelectItem>
                                    <SelectItem value="caja">Caja</SelectItem>
                                    <SelectItem value="paquete">Paquete</SelectItem>
                                    <SelectItem value="kg">Kilogramo</SelectItem>
                                    <SelectItem value="litro">Litro</SelectItem>
                                    <SelectItem value="metro">Metro</SelectItem>
                                    <SelectItem value="par">Par</SelectItem>
                                    <SelectItem value="rollo">Rollo</SelectItem>
                                    <SelectItem value="galón">Galon</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setProductDialogOpen(false)}
                                disabled={productFormLoading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCreateProduct}
                                disabled={productFormLoading}
                            >
                                {productFormLoading ? (
                                    <>
                                        <Spinner className="mr-2 h-4 w-4" />
                                        Creando...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Crear Producto
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
