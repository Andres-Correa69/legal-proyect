import { Head, usePage, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { companySettingsApi } from "@/lib/api";
import { isAdmin } from "@/lib/permissions";
import { useState, useRef } from "react";
import { Building2, ChevronLeft, ImagePlus, Loader2, QrCode, Receipt, Settings, Square, Trash2, ToggleLeft, ToggleRight, Palette, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { removeBackground, blobToFile, createPreviewUrl } from "@/lib/background-removal";
import type { User } from "@/types";

const THEME_COLORS = [
  { id: 'blue', name: 'Azul', primary: 'hsl(207, 72%, 31%)', accent: 'hsl(202, 56%, 52%)' },
  { id: 'green', name: 'Verde', primary: 'hsl(152, 69%, 31%)', accent: 'hsl(142, 64%, 42%)' },
  { id: 'orange', name: 'Naranja', primary: 'hsl(24, 80%, 44%)', accent: 'hsl(32, 75%, 55%)' },
  { id: 'red', name: 'Rojo', primary: 'hsl(0, 65%, 40%)', accent: 'hsl(4, 58%, 52%)' },
  { id: 'gray', name: 'Gris', primary: 'hsl(215, 20%, 35%)', accent: 'hsl(215, 16%, 47%)' },
  { id: 'brown', name: 'Café', primary: 'hsl(25, 40%, 32%)', accent: 'hsl(25, 35%, 45%)' },
  { id: 'yellow', name: 'Amarillo', primary: 'hsl(40, 75%, 38%)', accent: 'hsl(45, 70%, 50%)' },
  { id: 'pink', name: 'Rosa', primary: 'hsl(330, 65%, 40%)', accent: 'hsl(338, 58%, 55%)' },
];

export default function GeneralSettings() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;
  const company = user?.company;
  const { toast } = useToast();

  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const currentTheme = (company?.settings?.theme_color as string) || 'blue';

  // Logo horizontal
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeBgLogo, setRemoveBgLogo] = useState(true);
  const [processingLogo, setProcessingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Logo icono (cuadrado)
  const [iconUploading, setIconUploading] = useState(false);
  const [iconDeleting, setIconDeleting] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [removeBgIcon, setRemoveBgIcon] = useState(true);
  const [processingIcon, setProcessingIcon] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const barcodeTicketEnabled = company?.settings?.barcode_ticket_enabled === true;
  const thermalReceiptEnabled = company?.settings?.thermal_receipt_enabled === true;

  const handleToggle = async (key: string, checked: boolean) => {
    setSettingsLoading(true);
    try {
      await companySettingsApi.update({ [key]: checked });
      router.reload({ only: ["auth"] });
    } catch (error) {
      console.error("Error actualizando configuración:", error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleThemeChange = async (colorId: string) => {
    if (colorId === currentTheme) return;
    setSavingTheme(true);
    try {
      await companySettingsApi.update({ theme_color: colorId });
      toast({ title: "Color actualizado", description: "El color del sistema ha sido cambiado" });
      router.reload({ only: ["auth"] });
    } catch {
      toast({ title: "Error", description: "No se pudo cambiar el color", variant: "destructive" });
    } finally {
      setSavingTheme(false);
    }
  };

  const validateFile = (file: File): boolean => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "La imagen no debe superar 5MB", variant: "destructive" });
      return false;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Error", description: "Solo se permiten imágenes JPG, PNG o WebP", variant: "destructive" });
      return false;
    }
    return true;
  };

  // Logo horizontal handlers
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !validateFile(file)) return;

    if (removeBgLogo) {
      setProcessingLogo(true);
      try {
        const processedBlob = await removeBackground(file);
        const processedFile = blobToFile(processedBlob, file.name.replace(/\.\w+$/, '.png'));
        setLogoPreview(createPreviewUrl(processedBlob));
        handleLogoUpload(processedFile);
      } catch {
        setLogoPreview(URL.createObjectURL(file));
        handleLogoUpload(file);
      } finally {
        setProcessingLogo(false);
      }
    } else {
      setLogoPreview(URL.createObjectURL(file));
      handleLogoUpload(file);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      await companySettingsApi.uploadLogo(file);
      toast({ title: "Logo actualizado", description: "El logo horizontal se ha actualizado correctamente" });
      router.reload({ only: ["auth"] });
    } catch {
      toast({ title: "Error", description: "No se pudo subir el logo", variant: "destructive" });
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleLogoDelete = async () => {
    setLogoDeleting(true);
    try {
      await companySettingsApi.deleteLogo();
      setLogoPreview(null);
      toast({ title: "Logo eliminado" });
      router.reload({ only: ["auth"] });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el logo", variant: "destructive" });
    } finally {
      setLogoDeleting(false);
    }
  };

  // Logo icono handlers
  const handleIconSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !validateFile(file)) return;

    if (removeBgIcon) {
      setProcessingIcon(true);
      try {
        const processedBlob = await removeBackground(file);
        const processedFile = blobToFile(processedBlob, file.name.replace(/\.\w+$/, '.png'));
        setIconPreview(createPreviewUrl(processedBlob));
        handleIconUpload(processedFile);
      } catch {
        setIconPreview(URL.createObjectURL(file));
        handleIconUpload(file);
      } finally {
        setProcessingIcon(false);
      }
    } else {
      setIconPreview(URL.createObjectURL(file));
      handleIconUpload(file);
    }
  };

  const handleIconUpload = async (file: File) => {
    setIconUploading(true);
    try {
      await companySettingsApi.uploadLogoIcon(file);
      toast({ title: "Icono actualizado", description: "El icono se ha actualizado correctamente" });
      router.reload({ only: ["auth"] });
    } catch {
      toast({ title: "Error", description: "No se pudo subir el icono", variant: "destructive" });
      setIconPreview(null);
    } finally {
      setIconUploading(false);
      if (iconInputRef.current) iconInputRef.current.value = "";
    }
  };

  const handleIconDelete = async () => {
    setIconDeleting(true);
    try {
      await companySettingsApi.deleteLogoIcon();
      setIconPreview(null);
      toast({ title: "Icono eliminado" });
      router.reload({ only: ["auth"] });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el icono", variant: "destructive" });
    } finally {
      setIconDeleting(false);
    }
  };

  const displayLogo = logoPreview || company?.logo_url;
  const displayIcon = iconPreview || company?.logo_icon_url;

  return (
    <AppLayout title="Configuración General">
      <Head title="Configuración General" />

      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => router.visit("/admin/profile")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                  <Settings className="h-5 w-5 text-[#2463eb]" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Configuración General</h1>
                  <p className="text-sm text-muted-foreground">Datos y opciones generales de la empresa</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {company?.name || "Empresa"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Logos */}
        {isAdmin(user) && (
          <Card className="shadow-xl border border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/15">
                  <ImagePlus className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle>Logos de la Empresa</CardTitle>
                  <CardDescription>Se mostrarán en el menú lateral y documentos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo horizontal */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Logo Horizontal</Label>
                  <p className="text-xs text-muted-foreground">Se muestra en el sidebar cuando está expandido. Recomendado: formato apaisado (ej: 300x80px).</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoveBgLogo(!removeBgLogo)}
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {removeBgLogo ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                  Remover fondo automáticamente
                </button>
                <div
                  className="w-full h-24 rounded-lg border border-border flex items-center justify-center overflow-hidden"
                  style={displayLogo ? { backgroundImage: 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, hsl(var(--background)) 0% 50%)', backgroundSize: '16px 16px' } : undefined}
                >
                  {processingLogo ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-xs">Procesando imagen...</span>
                    </div>
                  ) : displayLogo ? (
                    <img src={displayLogo} alt="Logo horizontal" className="max-h-full max-w-full object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-xs">Sin logo</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoSelect} />
                  <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={logoUploading || processingLogo}>
                    {logoUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</> : processingLogo ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</> : <><ImagePlus className="h-4 w-4" /> Subir logo</>}
                  </Button>
                  {company?.logo_url && (
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleLogoDelete} disabled={logoDeleting}>
                      {logoDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Eliminando...</> : <><Trash2 className="h-4 w-4" /> Eliminar</>}
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Logo icono */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Icono / Logo Cuadrado</Label>
                  <p className="text-xs text-muted-foreground">Se muestra en el sidebar cuando está colapsado. Recomendado: formato cuadrado (ej: 100x100px).</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoveBgIcon(!removeBgIcon)}
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {removeBgIcon ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                  Remover fondo automáticamente
                </button>
                <div className="flex items-center gap-4">
                  <div
                    className="h-16 w-16 rounded-lg border border-border flex items-center justify-center overflow-hidden shrink-0"
                    style={displayIcon ? { backgroundImage: 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, hsl(var(--background)) 0% 50%)', backgroundSize: '12px 12px' } : undefined}
                  >
                    {processingIcon ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : displayIcon ? (
                      <img src={displayIcon} alt="Icono" className="max-h-full max-w-full object-contain p-1" />
                    ) : (
                      <Square className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input ref={iconInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleIconSelect} />
                    <Button variant="outline" size="sm" onClick={() => iconInputRef.current?.click()} disabled={iconUploading || processingIcon}>
                      {iconUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</> : processingIcon ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</> : <><Square className="h-4 w-4" /> Subir icono</>}
                    </Button>
                    {company?.logo_icon_url && (
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleIconDelete} disabled={iconDeleting}>
                        {iconDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Eliminando...</> : <><Trash2 className="h-4 w-4" /> Eliminar</>}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">JPG, PNG o WebP. Máximo 5MB cada uno.</p>
            </CardContent>
          </Card>
        )}

        {/* Theme Colors */}
        {isAdmin(user) && (
          <Card className="shadow-xl border border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Colores del Sistema</CardTitle>
                  <CardDescription>Personaliza los colores del menú lateral y elementos de la interfaz (solo modo normal)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {THEME_COLORS.map((color) => {
                  const isSelected = currentTheme === color.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      disabled={savingTheme}
                      onClick={() => handleThemeChange(color.id)}
                      className={`relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      } ${savingTheme ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="h-8 w-8 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: color.primary }} />
                        <div className="h-5 w-5 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: color.accent }} />
                      </div>
                      <span className="text-sm font-medium">{color.name}</span>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Company Info */}
        <Card className="shadow-xl border border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/15">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Información de la Empresa</CardTitle>
                <CardDescription>Datos generales de tu empresa</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-medium">{company?.name || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">NIT / RUT</p>
                <p className="font-medium">{company?.tax_id || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Correo</p>
                <p className="font-medium">{company?.email || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{company?.phone || "-"}</p>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <p className="text-sm text-muted-foreground">Dirección</p>
                <p className="font-medium">{company?.address || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Toggles */}
        {isAdmin(user) && (
          <Card className="shadow-xl border border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-muted">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Opciones del Sistema</CardTitle>
                  <CardDescription>Habilita o deshabilita funcionalidades</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/15">
                    <QrCode className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Ticket de Barcode</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilita la generación de tickets con código de barras o QR para los productos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={barcodeTicketEnabled ? "default" : "secondary"} className="text-xs">
                    {barcodeTicketEnabled ? "Activo" : "Inactivo"}
                  </Badge>
                  <Switch
                    checked={barcodeTicketEnabled}
                    onCheckedChange={(checked) => handleToggle("barcode_ticket_enabled", checked)}
                    disabled={settingsLoading}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/15">
                    <Receipt className="h-4 w-4 text-teal-600" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Factura de Tirilla</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilita la impresión de facturas en formato tirilla para impresoras térmicas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={thermalReceiptEnabled ? "default" : "secondary"} className="text-xs">
                    {thermalReceiptEnabled ? "Activo" : "Inactivo"}
                  </Badge>
                  <Switch
                    checked={thermalReceiptEnabled}
                    onCheckedChange={(checked) => handleToggle("thermal_receipt_enabled", checked)}
                    disabled={settingsLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        </div>
      </div>
    </AppLayout>
  );
}
