import { Head, router } from "@inertiajs/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import {
  suppliersApi,
  municipalitiesApi,
  typeDocumentIdentificationsApi,
} from "@/lib/api";
import type { Municipality, TypeDocumentIdentification, Supplier } from "@/lib/api";
import {
  ArrowLeft,
  Save,
  Truck,
  Eye,
  Edit,
  Phone,
  MapPin,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Email validation regex
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface CreateSupplierPageProps {
  pageMode?: "create" | "edit" | "view";
  entityId?: number;
}

export default function CreateSupplierPage({
  pageMode: propPageMode,
  entityId: propEntityId,
}: CreateSupplierPageProps) {
  const { toast } = useToast();

  // Support URL params as fallback
  const urlParams = new URLSearchParams(window.location.search);
  const pageMode = propPageMode || (urlParams.get("mode") as "create" | "edit" | "view") || "create";
  const entityId = propEntityId || (urlParams.get("entityId") ? parseInt(urlParams.get("entityId")!) : undefined);

  const isViewMode = pageMode === "view";
  const isEditMode = pageMode === "edit";
  const isCreateMode = pageMode === "create";

  const [dataLoading, setDataLoading] = useState(!!entityId);
  const [formLoading, setFormLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [taxIdTouched, setTaxIdTouched] = useState(false);

  // Catalog data
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [typeDocumentIdentifications, setTypeDocumentIdentifications] = useState<TypeDocumentIdentification[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    document_type: "",
    tax_id: "",
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    municipality_id: "",
    address: "",
    is_active: true,
  });

  // Combobox options
  const municipalityOptions: ComboboxOption[] = useMemo(() => {
    return municipalities.map((m) => ({
      value: m.id.toString(),
      label: m.name,
    }));
  }, [municipalities]);

  // Validation functions
  const validateName = useCallback(
    (name: string): { valid: boolean; message?: string } => {
      if (!name.trim()) return { valid: false, message: "Requerido" };
      if (name.trim().length < 2)
        return { valid: false, message: "Minimo 2 caracteres" };
      return { valid: true };
    },
    []
  );

  const validateEmail = useCallback(
    (email: string): { valid: boolean; message?: string } => {
      if (!email) return { valid: true };
      if (!emailRegex.test(email))
        return { valid: false, message: "Formato de correo invalido" };
      const domain = email.split("@")[1]?.toLowerCase();
      if (!domain) return { valid: false, message: "Dominio no valido" };
      const tldParts = domain.split(".");
      if (tldParts.length < 2 || tldParts[tldParts.length - 1].length < 2)
        return { valid: false, message: "Dominio incompleto" };
      return { valid: true };
    },
    []
  );

  const nameValidation = validateName(formData.name);
  const emailValidation = validateEmail(formData.email);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const isFieldInvalid = useCallback(
    (value: string, required: boolean = true) => {
      return attemptedSubmit && required && !value.trim();
    },
    [attemptedSubmit]
  );

  // Load catalogs
  useEffect(() => {
    const loadCatalogs = async () => {
      setLoadingCatalogs(true);
      try {
        const [municipalitiesData, typeDocsData] = await Promise.all([
          municipalitiesApi.getAll(),
          typeDocumentIdentificationsApi.getAll(),
        ]);
        setMunicipalities(municipalitiesData);
        setTypeDocumentIdentifications(typeDocsData);
      } catch (error) {
        console.error("Error loading catalogs:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los catalogos",
          variant: "destructive",
        });
      } finally {
        setLoadingCatalogs(false);
      }
    };
    loadCatalogs();
  }, []);

  // Load entity data for edit/view mode
  useEffect(() => {
    if (!entityId || isCreateMode) return;

    const loadEntityData = async () => {
      setDataLoading(true);
      try {
        const supplier = await suppliersApi.getById(entityId);

        setFormData({
          document_type: supplier.document_type || "",
          tax_id: supplier.tax_id || "",
          name: supplier.name || "",
          contact_name: supplier.contact_name || "",
          email: supplier.email || "",
          phone: supplier.phone || "",
          municipality_id: supplier.municipality_id?.toString() || "",
          address: supplier.address || "",
          is_active: supplier.is_active ?? true,
        });
      } catch (error: any) {
        console.error("Error loading supplier:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar la informacion del proveedor",
          variant: "destructive",
        });
        router.visit("/admin/suppliers");
      } finally {
        setDataLoading(false);
      }
    };

    loadEntityData();
  }, [entityId, isCreateMode]);

  // Submit handler
  const handleSubmit = async () => {
    setAttemptedSubmit(true);

    if (!nameValidation.valid) {
      toast({
        title: "Nombre invalido",
        description: nameValidation.message,
        variant: "destructive",
      });
      return;
    }

    if (formData.email && !emailValidation.valid) {
      toast({
        title: "Correo electronico invalido",
        description: emailValidation.message,
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);

    try {
      const data: Partial<Supplier> = {
        name: formData.name.trim(),
        contact_name: formData.contact_name || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        tax_id: formData.tax_id || undefined,
        document_type: formData.document_type || undefined,
        municipality_id: formData.municipality_id
          ? parseInt(formData.municipality_id)
          : null,
        is_active: formData.is_active,
      };

      if (isEditMode && entityId) {
        await suppliersApi.update(entityId, data);
        toast({
          title: "Proveedor actualizado",
          description: "El proveedor ha sido actualizado exitosamente",
        });
      } else {
        await suppliersApi.create(data);
        toast({
          title: "Proveedor creado",
          description: "El proveedor ha sido registrado exitosamente",
        });
      }
      router.visit("/admin/suppliers");
    } catch (error: any) {
      const msg =
        error?.message ||
        error?.errors_messages?.[0] ||
        "Error al guardar el proveedor";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const pageTitle = useMemo(() => {
    if (isViewMode) return "Ver Proveedor";
    if (isEditMode) return "Editar Proveedor";
    return "Nuevo Proveedor";
  }, [isViewMode, isEditMode]);

  const pageSubtitle = useMemo(() => {
    if (isViewMode) return "Informacion del proveedor";
    if (isEditMode) return "Modifique la informacion del proveedor";
    return "Complete la informacion del proveedor";
  }, [isViewMode, isEditMode]);

  const HeaderIcon = isViewMode ? Eye : isEditMode ? Edit : Truck;

  if (dataLoading) {
    return (
      <AppLayout>
        <Head title={pageTitle} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">
              Cargando informacion...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Head title={pageTitle} />

      <div className="-mt-4 sm:-mt-6">
        {/* Header - full width, flush with app header */}
        <div className="bg-card border-b sticky top-14 z-10 shadow-sm -mx-2 sm:-mx-4 lg:-mx-6">
          <div className="px-3 sm:px-4 lg:px-6 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.visit("/admin/suppliers")}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center border flex-shrink-0">
                  <HeaderIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm sm:text-lg font-bold truncate">
                    {pageTitle}
                  </h1>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {pageSubtitle}
                  </p>
                </div>
              </div>
              {!isViewMode && (
                <Button
                  onClick={handleSubmit}
                  size="sm"
                  className="gap-1.5 shadow-lg h-8 px-3 text-xs sm:text-sm"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <Spinner className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                  <span>Guardar</span>
                </Button>
              )}
              {isViewMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 px-3 text-xs sm:text-sm"
                  onClick={() => {
                    router.visit(`/admin/suppliers/${entityId}/edit`);
                  }}
                >
                  <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Editar</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="py-4">
          <fieldset
            disabled={isViewMode}
            className="space-y-4 m-0 p-0 border-0 min-w-0"
          >
            {/* ============================================ */}
            {/* SECTION 1: Informacion Principal */}
            {/* ============================================ */}
            <Card className="border shadow-sm">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  Informaci&oacute;n Principal
                </h2>
              </div>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Row 1: Document Type + Tax ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Tipo de documento
                      </Label>
                      <Select
                        disabled={isViewMode}
                        value={formData.document_type}
                        onValueChange={(value) =>
                          handleInputChange("document_type", value)
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-50">
                          {typeDocumentIdentifications.map((doc) => (
                            <SelectItem
                              key={doc.id}
                              value={doc.id.toString()}
                            >
                              {doc.code} - {doc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        N&uacute;mero de documento
                      </Label>
                      <div className="relative">
                        <Input
                          placeholder="Numero de documento"
                          value={formData.tax_id}
                          onChange={(e) =>
                            handleInputChange("tax_id", e.target.value)
                          }
                          onBlur={() => setTaxIdTouched(true)}
                          className={`h-9 text-sm pr-8 ${
                            taxIdTouched && formData.tax_id
                              ? "ring-2 ring-green-500"
                              : ""
                          }`}
                        />
                        {taxIdTouched && formData.tax_id && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                    <div className="space-y-1 lg:col-span-4">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Nombre / Raz&oacute;n Social{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          placeholder="Nombre o razon social del proveedor"
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange("name", e.target.value)
                          }
                          onBlur={() => setNameTouched(true)}
                          className={`h-9 text-sm pr-8 ${
                            (attemptedSubmit || nameTouched) &&
                            formData.name &&
                            !nameValidation.valid
                              ? "ring-2 ring-destructive"
                              : nameTouched &&
                                formData.name &&
                                nameValidation.valid
                              ? "ring-2 ring-green-500"
                              : attemptedSubmit && !formData.name
                              ? "ring-2 ring-destructive"
                              : ""
                          }`}
                        />
                        {nameTouched && formData.name && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            {nameValidation.valid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ============================================ */}
            {/* SECTION 2: Informacion de Contacto */}
            {/* ============================================ */}
            <Card className="border shadow-sm">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Informaci&oacute;n de Contacto
                </h2>
              </div>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                  {/* Contact Name */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Nombre de contacto
                    </Label>
                    <Input
                      placeholder="Nombre de la persona de contacto"
                      value={formData.contact_name}
                      onChange={(e) =>
                        handleInputChange("contact_name", e.target.value)
                      }
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Correo electr&oacute;nico
                    </Label>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        onBlur={() => setEmailTouched(true)}
                        className={`h-9 text-sm pr-8 ${
                          emailTouched &&
                          formData.email &&
                          !emailValidation.valid
                            ? "ring-2 ring-destructive"
                            : emailTouched &&
                              formData.email &&
                              emailValidation.valid
                            ? "ring-2 ring-green-500"
                            : ""
                        }`}
                      />
                      {emailTouched && formData.email && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          {emailValidation.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Tel&eacute;fono
                    </Label>
                    <Input
                      placeholder="Numero de telefono"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ============================================ */}
            {/* SECTION 3: Informacion de Ubicacion */}
            {/* ============================================ */}
            <Card className="border shadow-sm">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Informaci&oacute;n de Ubicaci&oacute;n
                </h2>
              </div>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  {/* Municipality */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Municipio
                    </Label>
                    <Combobox
                      options={municipalityOptions}
                      value={formData.municipality_id}
                      onValueChange={(value) =>
                        handleInputChange("municipality_id", value)
                      }
                      placeholder="Seleccionar municipio..."
                      searchPlaceholder="Buscar municipio..."
                      emptyText="No se encontraron municipios."
                      disabled={isViewMode}
                      loading={loadingCatalogs}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Direcci&oacute;n
                    </Label>
                    <Input
                      placeholder="Direccion del proveedor"
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </fieldset>
        </div>
      </div>
    </AppLayout>
  );
}
