import { Head, router } from "@inertiajs/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import { useToast } from "@/hooks/use-toast";
import { priceListsApi } from "@/lib/api";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import { ArrowLeft, DollarSign, Save } from "lucide-react";

interface Props {
  pageMode?: "edit";
  entityId?: number;
}

export default function CreatePriceListPage({
  pageMode: propPageMode,
  entityId: propEntityId,
}: Props) {
  const { toast } = useToast();

  // Support URL params as fallback
  const urlParams = new URLSearchParams(window.location.search);
  const pageMode = propPageMode || (urlParams.get("mode") as "edit" | undefined) || undefined;
  const entityId = propEntityId || (urlParams.get("entityId") ? parseInt(urlParams.get("entityId")!) : undefined);

  const isEditMode = pageMode === "edit";

  const [dataLoading, setDataLoading] = useState(!!entityId);
  const [formLoading, setFormLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priority: 0,
    is_active: true,
  });

  const handleInputChange = useCallback((field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Load entity data for edit mode
  useEffect(() => {
    if (!entityId || !isEditMode) return;

    const loadEntityData = async () => {
      setDataLoading(true);
      try {
        const priceList = await priceListsApi.getById(entityId);

        setFormData({
          name: priceList.name || "",
          description: priceList.description || "",
          priority: priceList.priority ?? 0,
          is_active: priceList.is_active ?? true,
        });
      } catch (error: any) {
        console.error("Error loading price list:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar la informacion de la lista de precios",
          variant: "destructive",
        });
        router.visit("/admin/price-lists");
      } finally {
        setDataLoading(false);
      }
    };

    loadEntityData();
  }, [entityId, isEditMode]);

  // Submit handler
  const handleSubmit = async () => {
    setAttemptedSubmit(true);

    if (!formData.name.trim()) {
      toast({
        title: "Nombre requerido",
        description: "El nombre de la lista de precios es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);

    try {
      const data = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        is_active: formData.is_active,
      };

      if (isEditMode && entityId) {
        await priceListsApi.update(entityId, data);
        toast({
          title: "Lista de precios actualizada",
          description: "La lista de precios ha sido actualizada exitosamente",
        });
        router.visit(`/admin/price-lists/${entityId}`);
      } else {
        await priceListsApi.create(data);
        toast({
          title: "Lista de precios creada",
          description: "La lista de precios ha sido registrada exitosamente",
        });
        router.visit("/admin/price-lists");
      }
    } catch (error: any) {
      const msg =
        error?.message ||
        error?.errors_messages?.[0] ||
        "Error al guardar la lista de precios";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const pageTitle = isEditMode ? "Editar Lista de Precios" : "Nueva Lista de Precios";
  const pageSubtitle = isEditMode
    ? "Modifique la informacion de la lista de precios"
    : "Complete la informacion de la lista de precios";

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
                  onClick={() => router.visit("/admin/price-lists")}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center border flex-shrink-0">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
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
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="py-4">
          <div className="space-y-4">
            {/* ============================================ */}
            {/* SECTION 1: Informacion General */}
            {/* ============================================ */}
            <Card className="border shadow-sm">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Informaci&oacute;n General
                </h2>
              </div>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Nombre */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Nombre <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="Nombre de la lista de precios"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        className={`h-9 text-sm ${
                          attemptedSubmit && !formData.name.trim()
                            ? "ring-2 ring-destructive"
                            : ""
                        }`}
                      />
                      {attemptedSubmit && !formData.name.trim() && (
                        <InputError message="El nombre es obligatorio" />
                      )}
                    </div>
                  </div>

                  {/* Descripcion */}
                  <div className="grid grid-cols-1 gap-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Descripci&oacute;n
                      </Label>
                      <Textarea
                        placeholder="Descripcion de la lista de precios (opcional)"
                        value={formData.description}
                        onChange={(e) =>
                          handleInputChange("description", e.target.value)
                        }
                        className="text-sm min-h-[80px]"
                      />
                    </div>
                  </div>

                  {/* Prioridad + Activa */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Prioridad
                      </Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={formData.priority}
                        onChange={(e) =>
                          handleInputChange(
                            "priority",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Activa
                      </Label>
                      <div className="flex items-center gap-2 h-9">
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) =>
                            handleInputChange("is_active", checked)
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {formData.is_active ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
