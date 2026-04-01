import { Head, usePage, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { companySettingsApi } from "@/lib/api";
import { useState, useRef } from "react";
import { Cake, ChevronLeft, ImagePlus, Loader2, Megaphone, MessageSquare, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types";

export default function MessagesSettings() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;
  const company = user?.company;
  const { toast } = useToast();

  // Birthday message
  const defaultBirthdayMessage = "¡Feliz cumpleaños {nombre}! 🎂🎉 Hoy cumples {edad} años y desde {empresa} te enviamos un cordial saludo. ¡Que tengas un excelente día!";
  const [birthdayMessage, setBirthdayMessage] = useState<string>(
    (company?.settings?.birthday_message as string) || defaultBirthdayMessage
  );
  const [birthdaySaving, setBirthdaySaving] = useState(false);
  const [birthdayImageUrl, setBirthdayImageUrl] = useState<string>(
    (company?.settings?.birthday_image_url as string) || ""
  );
  const [birthdayImageUploading, setBirthdayImageUploading] = useState(false);
  const birthdayImageRef = useRef<HTMLInputElement>(null);

  const handleBirthdayMessageSave = async () => {
    setBirthdaySaving(true);
    try {
      await companySettingsApi.update({ birthday_message: birthdayMessage, birthday_image_url: birthdayImageUrl });
      toast({ title: "Mensaje guardado", description: "El mensaje de cumpleaños se ha actualizado" });
      router.reload({ only: ["auth"] });
    } catch {
      toast({ title: "Error", description: "No se pudo guardar el mensaje", variant: "destructive" });
    } finally {
      setBirthdaySaving(false);
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

  const handleBirthdayImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !validateFile(file)) return;
    setBirthdayImageUploading(true);
    try {
      const response = await companySettingsApi.uploadBirthdayImage(file);
      setBirthdayImageUrl(response.url);
      toast({ title: "Imagen subida" });
    } catch {
      toast({ title: "Error", description: "No se pudo subir la imagen", variant: "destructive" });
    } finally {
      setBirthdayImageUploading(false);
      if (birthdayImageRef.current) birthdayImageRef.current.value = "";
    }
  };

  return (
    <AppLayout title="Mensajes">
      <Head title="Mensajes - Marketing" />

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
                <div className="bg-pink-500/100/10 p-2.5 rounded-lg">
                  <Megaphone className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Mensajes</h1>
                  <p className="text-sm text-muted-foreground">Configura los mensajes automáticos para tus clientes</p>
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

        {/* Birthday Message Card */}
        <Card className="shadow-xl border border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-pink-500/15">
                <Cake className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <CardTitle>Mensaje de Cumpleaños</CardTitle>
                <CardDescription>Se envía por WhatsApp cuando felicitas a un cliente</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Mensaje</Label>
              <Textarea
                value={birthdayMessage}
                onChange={(e) => setBirthdayMessage(e.target.value)}
                rows={4}
                placeholder="Escribe tu mensaje de cumpleaños..."
                className="resize-none"
              />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Variables disponibles — haz click para insertar:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: "{nombre}", label: "Nombre", example: "Andrea" },
                    { tag: "{nombre_completo}", label: "Nombre completo", example: "Andrea Milena Torres" },
                    { tag: "{edad}", label: "Edad que cumple", example: "37" },
                    { tag: "{fecha_nacimiento}", label: "Fecha nacimiento", example: "17/03/1990" },
                    { tag: "{empresa}", label: "Nombre empresa", example: company?.name || "Mi Empresa" },
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-pink-500/10 border border-pink-500/20 text-xs text-pink-700 hover:bg-pink-500/15 transition-colors"
                      onClick={() => setBirthdayMessage((prev) => prev + v.tag)}
                    >
                      <code className="font-mono">{v.tag}</code>
                      <span className="text-pink-400">·</span>
                      <span className="text-muted-foreground">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <Label className="text-sm font-medium">Imagen adjunta (opcional)</Label>
              <p className="text-xs text-muted-foreground">Sube una imagen que se mostrará junto al mensaje de cumpleaños.</p>
              {birthdayImageUrl && (
                <div className="relative w-full h-32 rounded-lg border overflow-hidden bg-muted/30">
                  <img src={birthdayImageUrl} alt="Imagen de cumpleaños" className="h-full w-full object-contain p-2" />
                  <button
                    onClick={() => {
                      companySettingsApi.deleteBirthdayImage().then(() => {
                        setBirthdayImageUrl("");
                        toast({ title: "Imagen eliminada" });
                        router.reload({ only: ["auth"] });
                      });
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <input ref={birthdayImageRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleBirthdayImageUpload} />
              {!birthdayImageUrl && (
                <Button variant="outline" size="sm" onClick={() => birthdayImageRef.current?.click()} disabled={birthdayImageUploading}>
                  {birthdayImageUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</> : <><ImagePlus className="h-4 w-4" /> Subir imagen</>}
                </Button>
              )}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <Label className="text-sm font-medium">Vista previa</Label>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {birthdayMessage
                    .replace(/\{nombre\}/g, "Andrea")
                    .replace(/\{nombre_completo\}/g, "Andrea Milena Torres")
                    .replace(/\{edad\}/g, "37")
                    .replace(/\{fecha_nacimiento\}/g, "17/03/1990")
                    .replace(/\{empresa\}/g, company?.name || "Mi Empresa")
                  }
                </p>
                {birthdayImageUrl && (
                  <img src={birthdayImageUrl} alt="Preview" className="mt-2 h-20 rounded object-contain" />
                )}
              </div>
            </div>

            <Button onClick={handleBirthdayMessageSave} disabled={birthdaySaving} className="w-full sm:w-auto">
              {birthdaySaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Guardando...</> : "Guardar mensaje"}
            </Button>
          </CardContent>
        </Card>

        {/* Placeholder for future message types */}
        <Card className="shadow-xl border border-border border-dashed opacity-60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-muted">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-muted-foreground">Más mensajes próximamente</CardTitle>
                <CardDescription>Bienvenida, agradecimiento por compra, recordatorios y más</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        </div>
      </div>
    </AppLayout>
  );
}
