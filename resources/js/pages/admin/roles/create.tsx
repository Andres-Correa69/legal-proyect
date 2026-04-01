import { useState } from "react";
import { Head, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import { rolesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, Save } from "lucide-react";

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

export default function RoleCreate() {
    const { toast } = useToast();

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [generalError, setGeneralError] = useState("");

    const handleNameChange = (value: string) => {
        setName(value);
        if (!slugManuallyEdited) {
            setSlug(generateSlug(value));
        }
    };

    const handleSlugChange = (value: string) => {
        setSlugManuallyEdited(true);
        setSlug(value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setGeneralError("");
        setLoading(true);

        try {
            const role = await rolesApi.create({
                name,
                slug: slug || generateSlug(name),
                description: description || undefined,
            });

            toast({
                title: "Rol creado",
                description: `El rol "${role.name}" fue creado exitosamente.`,
            });

            router.visit(`/admin/roles/${role.id}`);
        } catch (error: any) {
            console.error("Error creating role:", error);
            if (error.errors) {
                const formattedErrors: Record<string, string> = {};
                Object.keys(error.errors).forEach((key) => {
                    formattedErrors[key] = Array.isArray(error.errors[key])
                        ? error.errors[key][0]
                        : error.errors[key];
                });
                setErrors(formattedErrors);
            } else {
                setGeneralError(error.message || "Error al crear el rol");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Nuevo Rol" />

            <div className="mx-auto max-w-2xl space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.visit("/admin/roles")}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <Shield className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold tracking-tight">
                            Nuevo Rol
                        </h1>
                    </div>
                </div>

                {/* Form Card */}
                <Card>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {generalError && (
                                <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 border border-red-200">
                                    {generalError}
                                </div>
                            )}

                            {/* Nombre */}
                            <div>
                                <Label htmlFor="name" className="mb-3 block">
                                    Nombre del Rol *
                                </Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) =>
                                        handleNameChange(e.target.value)
                                    }
                                    required
                                    disabled={loading}
                                    placeholder="Ej: Gerente de Ventas"
                                />
                                <InputError message={errors.name} />
                            </div>

                            {/* Slug */}
                            <div>
                                <Label htmlFor="slug" className="mb-3 block">
                                    Slug
                                </Label>
                                <Input
                                    id="slug"
                                    value={slug}
                                    onChange={(e) =>
                                        handleSlugChange(e.target.value)
                                    }
                                    disabled={loading}
                                    placeholder="Se genera automaticamente del nombre"
                                />
                                <InputError message={errors.slug} />
                            </div>

                            {/* Descripcion */}
                            <div>
                                <Label
                                    htmlFor="description"
                                    className="mb-3 block"
                                >
                                    Descripcion
                                </Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    disabled={loading}
                                    placeholder="Descripcion del rol (opcional)"
                                    rows={3}
                                />
                                <InputError message={errors.description} />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        router.visit("/admin/roles")
                                    }
                                    disabled={loading}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? (
                                        <Spinner className="mr-2 h-4 w-4" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    Crear Rol
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
