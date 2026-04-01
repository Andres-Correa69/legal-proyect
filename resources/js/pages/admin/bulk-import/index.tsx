import { Head, usePage } from "@inertiajs/react";
import { useState, useCallback, useEffect } from "react";
import type { SharedData } from "@/types";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { bulkImportApi, productCategoriesApi, suppliersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/lib/permissions";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Users,
  Package,
  Truck,
  Wrench,
  RefreshCw,
  Plus,
  FolderPlus,
} from "lucide-react";

type ImportType = "clients" | "suppliers" | "products" | "services";
type Step = "select" | "preview" | "result";

interface PreviewError {
  row: number;
  field: string;
  message: string;
  type?: string;
  value?: string;
}

interface PreviewRow {
  row: number;
  data: Record<string, unknown>;
  errors: PreviewError[];
  is_duplicate: boolean;
  valid: boolean;
}

interface PreviewSummary {
  total: number;
  valid: number;
  errors: number;
  duplicates: number;
}

interface MissingReferences {
  categories: string[];
  suppliers: string[];
}

interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: PreviewError[];
}

// Map internal field keys to readable Spanish labels for display
const fieldDisplayNames: Record<string, string> = {
  name: "Nombre",
  email: "Correo",
  category_id: "Categoría",
  purchase_price: "Precio compra",
  sale_price: "Precio venta",
  sku: "SKU",
  barcode: "Código barras",
  brand: "Marca",
  description: "Descripción",
  current_stock: "Stock actual",
  min_stock: "Stock mínimo",
  max_stock: "Stock máximo",
  tax_rate: "Impuesto",
  unit_of_measure: "Unidad medida",
  document_type: "Tipo documento",
  document_id: "Nro. documento",
  phone: "Teléfono",
  address: "Dirección",
  birth_date: "Fecha nacimiento",
  gender: "Género",
  tax_id: "NIT",
  contact_name: "Contacto",
  payment_terms: "Términos pago",
  price: "Precio",
  category: "Categoría",
  estimated_duration: "Duración",
  unit: "Unidad",
  base_price: "Precio base",
  supplier_id: "Proveedor",
};

const importTypes: Array<{
  value: ImportType;
  label: string;
  description: string;
  icon: typeof Users;
  permission: string;
}> = [
  {
    value: "clients",
    label: "Clientes",
    description: "Importar clientes con datos de contacto, documentos y preferencias",
    icon: Users,
    permission: "clients.import",
  },
  {
    value: "suppliers",
    label: "Proveedores",
    description: "Importar proveedores con NIT, contacto y términos de pago",
    icon: Truck,
    permission: "suppliers.import",
  },
  {
    value: "products",
    label: "Productos",
    description: "Importar productos con precios, stock, categorías y proveedores",
    icon: Package,
    permission: "products.import",
  },
  {
    value: "services",
    label: "Servicios",
    description: "Importar servicios con precios, categorías y duración",
    icon: Wrench,
    permission: "services.import",
  },
];

export default function BulkImport() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { auth } = usePage<SharedData>().props;
  const companyId = auth?.user?.company_id;
  const [step, setStep] = useState<Step>("select");
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);

  // Pre-select type from URL query param (e.g. ?type=clients)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get("type") as ImportType | null;
    if (typeParam && importTypes.some((t) => t.value === typeParam)) {
      setSelectedType(typeParam);
    }
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update">("skip");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCreatingRefs, setIsCreatingRefs] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [summary, setSummary] = useState<PreviewSummary | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [missingRefs, setMissingRefs] = useState<MissingReferences>({ categories: [], suppliers: [] });

  const availableTypes = importTypes.filter((t) => hasPermission(t.permission));

  const handleDownloadTemplate = useCallback(async () => {
    if (!selectedType) return;
    setIsDownloading(true);
    try {
      await bulkImportApi.downloadTemplate(selectedType);
      toast({ title: "Plantilla descargada", description: "Rellena la plantilla y súbela para importar." });
    } catch {
      toast({ title: "Error", description: "No se pudo descargar la plantilla", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  }, [selectedType, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      if (!validTypes.includes(selected.type) && !selected.name.match(/\.(xlsx|xls|csv)$/i)) {
        toast({ title: "Formato no válido", description: "Solo se aceptan archivos .xlsx, .xls o .csv", variant: "destructive" });
        return;
      }
      setFile(selected);
    }
  };

  const handleValidate = useCallback(async () => {
    if (!selectedType || !file) return;
    setIsLoading(true);
    try {
      const response = await bulkImportApi.validate(selectedType, file);
      setPreview(response.preview);
      setSummary(response.summary);
      setMissingRefs(response.missing_references || { categories: [], suppliers: [] });
      setStep("preview");
    } catch {
      toast({ title: "Error al validar", description: "Verifica que el archivo tenga el formato correcto", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, file, toast]);

  const handleImport = useCallback(async () => {
    if (!selectedType || !file) return;
    setIsLoading(true);
    try {
      const response = await bulkImportApi.import(selectedType, file, duplicateMode);
      setResult(response);
      setStep("result");
      toast({ title: "Importación completada", description: `${response.inserted} registros importados correctamente.` });
    } catch {
      toast({ title: "Error al importar", description: "Ocurrió un error durante la importación", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, file, duplicateMode, toast]);

  const handleCreateMissingRefs = useCallback(async (type: "categories" | "suppliers") => {
    setIsCreatingRefs(true);
    const items = type === "categories" ? missingRefs.categories : missingRefs.suppliers;
    let created = 0;

    try {
      for (const name of items) {
        if (type === "categories") {
          await productCategoriesApi.create({ name, is_active: true });
        } else {
          await suppliersApi.create({ name, is_active: true, company_id: companyId } as any);
        }
        created++;
      }

      toast({
        title: type === "categories" ? "Categorías creadas" : "Proveedores creados",
        description: `Se crearon ${created} ${type === "categories" ? "categoría(s)" : "proveedor(es)"} correctamente. Re-validando archivo...`,
      });

      // Re-validate to clear the errors
      await handleValidate();
    } catch {
      toast({
        title: "Error al crear",
        description: `Se crearon ${created} de ${items.length}. Verifica permisos e intenta de nuevo.`,
        variant: "destructive",
      });
    } finally {
      setIsCreatingRefs(false);
    }
  }, [missingRefs, toast, handleValidate]);

  const handleReset = () => {
    setStep("select");
    setSelectedType(null);
    setFile(null);
    setPreview([]);
    setSummary(null);
    setResult(null);
    setMissingRefs({ categories: [], suppliers: [] });
  };

  const selectedTypeInfo = importTypes.find((t) => t.value === selectedType);

  const hasMissingRefs = missingRefs.categories.length > 0 || missingRefs.suppliers.length > 0;

  // Get a readable field name
  const getFieldLabel = (field: string) => fieldDisplayNames[field] || field;

  // Format data columns for preview (show Spanish labels)
  const formatDataPreview = (data: Record<string, unknown>) => {
    const entries = Object.entries(data).filter(([k]) => !k.startsWith("_"));
    const mainFields = entries.slice(0, 3);
    return mainFields.map(([k, v]) => `${getFieldLabel(k)}: ${v}`).join(" | ");
  };

  return (
    <AppLayout>
      <Head title="Importación Masiva" />

      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Importación Masiva</h1>
            <p className="text-muted-foreground">
              Importa datos de clientes, proveedores, productos o servicios desde un archivo Excel
            </p>
          </div>
          {step !== "select" && (
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Nueva importación
            </Button>
          )}
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2">
          {[
            { key: "select", label: "1. Seleccionar y subir" },
            { key: "preview", label: "2. Vista previa" },
            { key: "result", label: "3. Resultado" },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              <Badge variant={step === s.key ? "default" : "secondary"} className="text-xs">
                {s.label}
              </Badge>
            </div>
          ))}
        </div>

        {/* Step 1: Select type and upload */}
        {step === "select" && (
          <div className="grid gap-6">
            {/* Type selection */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">¿Qué deseas importar?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {availableTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setSelectedType(type.value)}
                        className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all text-center ${
                          selectedType === type.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className={`p-3 rounded-full ${selectedType === type.value ? "bg-primary/10" : "bg-muted"}`}>
                          <Icon className={`h-6 w-6 ${selectedType === type.value ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="font-medium">{type.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedType && (
              <>
                {/* Download template */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-500/100/10">
                          <Download className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">Paso 1: Descarga la plantilla</h3>
                          <p className="text-sm text-muted-foreground">
                            La plantilla incluye los campos, ejemplos e instrucciones. Los catálogos de tu empresa se incluyen automáticamente.
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleDownloadTemplate} disabled={isDownloading} variant="outline">
                        {isDownloading ? <Spinner className="h-4 w-4 mr-2" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                        Descargar plantilla
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Upload file */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-full bg-blue-500/100/10">
                        <Upload className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">Paso 2: Sube el archivo rellenado</h3>
                        <p className="text-sm text-muted-foreground">Formatos aceptados: .xlsx, .xls, .csv (máximo 10MB)</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <label
                        htmlFor="import-file"
                        className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                          file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}
                      >
                        {file ? (
                          <>
                            <FileSpreadsheet className="h-8 w-8 text-primary" />
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB — Clic para cambiar archivo
                            </p>
                          </>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Arrastra tu archivo aquí o haz clic para seleccionar</p>
                          </>
                        )}
                        <input id="import-file" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                      </label>

                      {/* Duplicate mode */}
                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <Label className="font-medium">¿Qué hacer con duplicados?</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {duplicateMode === "skip"
                              ? "Los registros duplicados se omitirán sin modificar los existentes"
                              : "Los registros duplicados actualizarán los datos existentes"}
                          </p>
                        </div>
                        <Select value={duplicateMode} onValueChange={(v) => setDuplicateMode(v as "skip" | "update")}>
                          <SelectTrigger className="w-48 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card z-50">
                            <SelectItem value="skip">Omitir duplicados</SelectItem>
                            <SelectItem value="update">Actualizar existentes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Validate button */}
                      <div className="flex justify-end">
                        <Button onClick={handleValidate} disabled={!file || isLoading} size="lg">
                          {isLoading ? <Spinner className="h-4 w-4 mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                          Validar y ver vista previa
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && summary && (
          <div className="grid gap-6">
            {/* Missing references banner */}
            {hasMissingRefs && (
              <Card className="border-amber-500/30 bg-amber-500/10/50">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-amber-700 mb-2">
                        Se encontraron referencias que no existen en el sistema
                      </h3>
                      <p className="text-sm text-amber-700 mb-4">
                        Algunos productos hacen referencia a categorías o proveedores que no existen. Puedes crearlos ahora y re-validar automáticamente.
                      </p>

                      {missingRefs.categories.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-amber-700">
                              Categorías no encontradas ({missingRefs.categories.length}):
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-400 text-amber-700 hover:bg-amber-500/15 gap-1.5"
                              disabled={isCreatingRefs}
                              onClick={() => handleCreateMissingRefs("categories")}
                            >
                              {isCreatingRefs ? <Spinner className="h-3.5 w-3.5" /> : <FolderPlus className="h-3.5 w-3.5" />}
                              Crear todas las categorías
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {missingRefs.categories.map((cat) => (
                              <Badge key={cat} variant="secondary" className="bg-amber-500/15 text-amber-700 text-xs">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {missingRefs.suppliers.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-amber-700">
                              Proveedores no encontrados ({missingRefs.suppliers.length}):
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-400 text-amber-700 hover:bg-amber-500/15 gap-1.5"
                              disabled={isCreatingRefs}
                              onClick={() => handleCreateMissingRefs("suppliers")}
                            >
                              {isCreatingRefs ? <Spinner className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                              Crear todos los proveedores
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {missingRefs.suppliers.map((sup) => (
                              <Badge key={sup} variant="secondary" className="bg-amber-500/15 text-amber-700 text-xs">
                                {sup}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{summary.total}</p>
                  <p className="text-sm text-muted-foreground">Total filas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{summary.valid}</p>
                  <p className="text-sm text-muted-foreground">Válidos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{summary.errors}</p>
                  <p className="text-sm text-muted-foreground">Con errores</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{summary.duplicates}</p>
                  <p className="text-sm text-muted-foreground">Duplicados</p>
                </CardContent>
              </Card>
            </div>

            {/* Preview table */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Vista previa de datos</h3>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="h-12 px-4 text-left font-medium">Fila</th>
                        <th className="h-12 px-4 text-left font-medium">Estado</th>
                        <th className="h-12 px-4 text-left font-medium">Datos principales</th>
                        <th className="h-12 px-4 text-left font-medium">Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row) => (
                        <tr key={row.row} className={`border-b ${!row.valid ? "bg-red-500/10/50" : row.is_duplicate ? "bg-amber-500/10/50" : ""}`}>
                          <td className="p-4 font-mono text-xs">{row.row}</td>
                          <td className="p-4">
                            {row.valid ? (
                              row.is_duplicate ? (
                                <Badge variant="secondary" className="bg-amber-500/15 text-amber-700">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Duplicado
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-500/15 text-green-700">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Válido
                                </Badge>
                              )
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Error
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-xs max-w-md truncate">
                            {formatDataPreview(row.data)}
                          </td>
                          <td className="p-4 text-xs">
                            {row.errors.length > 0 && (
                              <div className="space-y-1">
                                {row.errors.map((e, i) => (
                                  <div key={i} className="text-red-600">
                                    {e.message}
                                  </div>
                                ))}
                              </div>
                            )}
                            {row.is_duplicate && row.valid && (
                              <span className="text-amber-600">
                                {duplicateMode === "skip" ? "Se omitirá" : "Se actualizará"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep("select")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver
                  </Button>
                  <Button onClick={handleImport} disabled={isLoading || summary.valid === 0} size="lg">
                    {isLoading ? (
                      <Spinner className="h-4 w-4 mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Importar {summary.valid} {selectedTypeInfo?.label.toLowerCase() ?? "registros"} válidos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Result */}
        {step === "result" && result && (
          <div className="grid gap-6">
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Importación completada</h2>
                <p className="text-muted-foreground mb-6">
                  Se procesaron los {selectedTypeInfo?.label.toLowerCase()} correctamente
                </p>

                <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mb-8">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">{result.inserted}</p>
                    <p className="text-sm text-muted-foreground">Insertados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">{result.updated}</p>
                    <p className="text-sm text-muted-foreground">Actualizados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-600">{result.skipped}</p>
                    <p className="text-sm text-muted-foreground">Omitidos</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="text-left bg-red-500/10 rounded-lg p-4 mb-6 max-w-xl mx-auto">
                    <p className="font-medium text-red-700 mb-2">
                      {result.errors.length} errores encontrados:
                    </p>
                    <ul className="text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
                      {result.errors.map((e, i) => (
                        <li key={i}>Fila {e.row}: {e.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={handleReset}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Nueva importación
                  </Button>
                  <Button onClick={() => window.location.href = `/admin/${selectedType === "clients" ? "clients" : selectedType === "suppliers" ? "suppliers" : selectedType === "products" ? "products" : "services"}`}>
                    Ver {selectedTypeInfo?.label.toLowerCase()}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
