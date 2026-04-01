import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DatePickerBirthday } from '@/components/ui/date-picker-birthday';
import {
    UserIcon,
    PhoneIcon,
    MapPinIcon,
    BriefcaseIcon,
    ShieldIcon,
    LandmarkIcon,
    BuildingIcon,
    Pencil,
    Save,
    X,
    CalendarIcon,
    CameraIcon,
    PenToolIcon,
    Trash2Icon,
    UploadIcon,
    EraserIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usersApi } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import type { User } from '@/types';

interface UserInfoViewProps {
    user: User;
    onUpdate: () => void;
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
    indefinido: 'Indefinido',
    fijo: 'Fijo',
    obra_labor: 'Obra/Labor',
    prestacion_servicios: 'Prestación de servicios',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    ahorros: 'Ahorros',
    corriente: 'Corriente',
};

const CONTRACT_TYPES = ['indefinido', 'fijo', 'obra_labor', 'prestacion_servicios'];
const ACCOUNT_TYPES = ['ahorros', 'corriente'];
const RISK_LEVELS = ['1', '2', '3', '4', '5'];
const GENDERS = ['male', 'female', 'other'];
const GENDER_LABELS: Record<string, string> = {
    male: 'Masculino',
    female: 'Femenino',
    other: 'Otro',
};
const DOC_TYPES = ['CC', 'CE', 'NIT', 'TI', 'PP', 'DIE'];
const DOC_TYPE_LABELS: Record<string, string> = {
    CC: 'C.C.', CE: 'C.E.', NIT: 'NIT', TI: 'T.I.', PP: 'Pasaporte', DIE: 'DIE',
};

function parseDate(dateStr?: string): Date | undefined {
    if (!dateStr) return undefined;
    const dateOnly = String(dateStr).split('T')[0];
    const d = new Date(dateOnly + 'T00:00:00');
    return isNaN(d.getTime()) ? undefined : d;
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return 'Sin definir';
    const d = parseDate(dateStr);
    if (!d) return dateStr;
    try {
        return new Intl.DateTimeFormat('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(d);
    } catch {
        return dateStr;
    }
}

// --- Reusable sub-components ---

function SectionTitle({
    icon: Icon,
    title,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    saving,
}: {
    icon: React.ElementType;
    title: string;
    isEditing: boolean;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    saving?: boolean;
}) {
    return (
        <div className="flex items-center gap-2 py-3 px-4 bg-muted/30 border-b border-border/50 rounded-t-lg">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold flex-1">{title}</h3>
            {isEditing ? (
                <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={onCancel} disabled={saving}>
                        <X className="h-3.5 w-3.5" /> Cancelar
                    </Button>
                    <Button size="sm" className="h-7 gap-1 text-xs" onClick={onSave} disabled={saving}>
                        <Save className="h-3.5 w-3.5" /> {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            ) : (
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground" onClick={onEdit}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
            )}
        </div>
    );
}

function EditableField({
    label,
    value,
    fieldKey,
    isEditing,
    editData,
    onChange,
    type = 'text',
    selectOptions,
    selectLabels,
    formatDisplay,
    placeholder,
}: {
    label: string;
    value: string;
    fieldKey: string;
    isEditing: boolean;
    editData: Record<string, string>;
    onChange: (key: string, val: string) => void;
    type?: 'text' | 'select' | 'date' | 'number';
    selectOptions?: string[];
    selectLabels?: Record<string, string>;
    formatDisplay?: (val: string) => string;
    placeholder?: string;
}) {
    if (!isEditing) {
        const displayVal = value
            ? (formatDisplay ? formatDisplay(value) : value)
            : '(no definido)';
        return (
            <div className="py-1.5">
                <p className="text-[11px] text-muted-foreground leading-none mb-0.5">{label}</p>
                <p className="text-sm font-medium break-all">{displayVal}</p>
            </div>
        );
    }

    const currentVal = editData[fieldKey] ?? value ?? '';

    if (type === 'select' && selectOptions) {
        return (
            <div className="py-1">
                <p className="text-[11px] text-muted-foreground leading-none mb-2">{label}</p>
                <Select value={currentVal} onValueChange={(v) => onChange(fieldKey, v)}>
                    <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                        {selectOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                                {selectLabels ? selectLabels[opt] || opt : opt}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
    }

    return (
        <div className="py-1">
            <p className="text-[11px] text-muted-foreground leading-none mb-2">{label}</p>
            <Input
                type={type === 'number' ? 'number' : type}
                value={currentVal}
                onChange={(e) => onChange(fieldKey, e.target.value)}
                className="h-8 text-sm"
                placeholder={placeholder}
                step={type === 'number' ? '0.01' : undefined}
                min={type === 'number' ? '0' : undefined}
            />
        </div>
    );
}

// --- Signature Pad ---

function SignaturePad({ onSave, onCancel, saving }: { onSave: (dataUrl: string) => void; onCancel: () => void; saving: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // Set white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if ('touches' in e) {
            const touch = e.touches[0];
            return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
        }
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    }, []);

    const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
    }, [getPos]);

    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawing) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        setHasDrawn(true);
    }, [isDrawing, getPos]);

    const stopDrawing = useCallback(() => {
        setIsDrawing(false);
    }, []);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setHasDrawn(false);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawn) return;
        onSave(canvas.toDataURL('image/png'));
    };

    return (
        <div className="space-y-3">
            <div className="border rounded-lg overflow-hidden bg-card">
                <canvas
                    ref={canvasRef}
                    width={500}
                    height={200}
                    className="w-full cursor-crosshair touch-none"
                    style={{ height: '160px' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>
            <p className="text-xs text-muted-foreground text-center">Dibuja tu firma con el mouse o el dedo</p>
            <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={clearCanvas} disabled={saving}>
                    <EraserIcon className="h-3.5 w-3.5 mr-1" /> Limpiar
                </Button>
                <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!hasDrawn || saving}>
                    <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Guardando...' : 'Guardar firma'}
                </Button>
            </div>
        </div>
    );
}

// --- Main component ---

export function UserInfoView({ user, onUpdate }: UserInfoViewProps) {
    const { toast } = useToast();
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [editData, setEditData] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [signatureUploading, setSignatureUploading] = useState(false);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);

    const startEdit = (section: string) => {
        setEditingSection(section);
        setEditData({});
    };

    const cancelEdit = () => {
        setEditingSection(null);
        setEditData({});
    };

    const handleChange = (key: string, val: string) => {
        setEditData((prev) => ({ ...prev, [key]: val }));
    };

    const saveEdit = async () => {
        if (Object.keys(editData).length === 0) {
            cancelEdit();
            return;
        }
        setSaving(true);
        try {
            // Build the update payload
            const payload: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(editData)) {
                if (key === 'salary') {
                    payload[key] = value ? parseFloat(value) : null;
                } else if (key === 'risk_level') {
                    payload[key] = value ? parseInt(value) : null;
                } else {
                    payload[key] = value || null;
                }
            }

            // If first_name or last_name changed, also update 'name'
            const firstName = editData.first_name ?? user.first_name ?? '';
            const lastName = editData.last_name ?? user.last_name ?? '';
            if ('first_name' in editData || 'last_name' in editData) {
                payload.name = `${firstName} ${lastName}`.trim();
            }

            await usersApi.update(user.id, payload);
            onUpdate();
            setEditingSection(null);
            setEditData({});
            toast({ title: 'Datos actualizados', description: 'Los cambios se guardaron correctamente.' });
        } catch {
            toast({ title: 'Error', description: 'No se pudieron guardar los cambios.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const isEditing = (section: string) => editingSection === section;

    const getVal = (key: string): string => {
        if (editingSection && key in editData) return editData[key];
        const val = (user as Record<string, unknown>)[key];
        if (val === null || val === undefined) return '';
        return String(val);
    };

    // --- Avatar handlers ---
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: 'Error', description: 'La imagen no puede superar 5MB.', variant: 'destructive' });
            return;
        }
        setAvatarUploading(true);
        try {
            await usersApi.uploadAvatar(user.id, file);
            onUpdate();
            toast({ title: 'Foto actualizada', description: 'La foto de perfil se actualizó correctamente.' });
        } catch {
            toast({ title: 'Error', description: 'No se pudo subir la foto.', variant: 'destructive' });
        } finally {
            setAvatarUploading(false);
            if (avatarInputRef.current) avatarInputRef.current.value = '';
        }
    };

    const handleAvatarDelete = async () => {
        setAvatarUploading(true);
        try {
            await usersApi.deleteAvatar(user.id);
            onUpdate();
            toast({ title: 'Foto eliminada', description: 'La foto de perfil fue eliminada.' });
        } catch {
            toast({ title: 'Error', description: 'No se pudo eliminar la foto.', variant: 'destructive' });
        } finally {
            setAvatarUploading(false);
        }
    };

    // --- Signature handlers ---
    const handleSignatureFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: 'Error', description: 'La imagen no puede superar 5MB.', variant: 'destructive' });
            return;
        }
        setSignatureUploading(true);
        try {
            await usersApi.uploadSignature(user.id, file);
            onUpdate();
            toast({ title: 'Firma actualizada', description: 'La firma digital se actualizó correctamente.' });
        } catch {
            toast({ title: 'Error', description: 'No se pudo subir la firma.', variant: 'destructive' });
        } finally {
            setSignatureUploading(false);
            if (signatureInputRef.current) signatureInputRef.current.value = '';
        }
    };

    const handleSignatureCanvasSave = async (dataUrl: string) => {
        setSignatureUploading(true);
        try {
            await usersApi.uploadSignature(user.id, dataUrl);
            onUpdate();
            setShowSignaturePad(false);
            toast({ title: 'Firma actualizada', description: 'La firma digital se guardó correctamente.' });
        } catch {
            toast({ title: 'Error', description: 'No se pudo guardar la firma.', variant: 'destructive' });
        } finally {
            setSignatureUploading(false);
        }
    };

    const handleSignatureDelete = async () => {
        setSignatureUploading(true);
        try {
            await usersApi.deleteSignature(user.id);
            onUpdate();
            toast({ title: 'Firma eliminada', description: 'La firma digital fue eliminada.' });
        } catch {
            toast({ title: 'Error', description: 'No se pudo eliminar la firma.', variant: 'destructive' });
        } finally {
            setSignatureUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Row 0: Foto de Perfil + Firma Digital */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Foto de Perfil */}
                <Card className="overflow-hidden">
                    <div className="flex items-center gap-2 py-3 px-4 bg-muted/30 border-b border-border/50 rounded-t-lg">
                        <CameraIcon className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold flex-1">Foto de Perfil</h3>
                    </div>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="relative h-20 w-20 flex-shrink-0 rounded-full bg-muted overflow-hidden border-2 border-border">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                        <UserIcon className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={handleAvatarUpload}
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={avatarUploading}
                                >
                                    <UploadIcon className="h-3.5 w-3.5" />
                                    {avatarUploading ? 'Subiendo...' : user.avatar_url ? 'Cambiar foto' : 'Subir foto'}
                                </Button>
                                {user.avatar_url && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="gap-1.5 text-destructive hover:text-destructive"
                                        onClick={handleAvatarDelete}
                                        disabled={avatarUploading}
                                    >
                                        <Trash2Icon className="h-3.5 w-3.5" /> Eliminar
                                    </Button>
                                )}
                                <p className="text-[11px] text-muted-foreground">JPG, PNG o WebP. Max 5MB.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Firma Digital */}
                <Card className="overflow-hidden">
                    <div className="flex items-center gap-2 py-3 px-4 bg-muted/30 border-b border-border/50 rounded-t-lg">
                        <PenToolIcon className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold flex-1">Firma Digital</h3>
                    </div>
                    <CardContent className="p-4">
                        {showSignaturePad ? (
                            <SignaturePad
                                onSave={handleSignatureCanvasSave}
                                onCancel={() => setShowSignaturePad(false)}
                                saving={signatureUploading}
                            />
                        ) : (
                            <>
                                {user.signature_url ? (
                                    <div className="space-y-3">
                                        <div className="border rounded-lg p-3 bg-card">
                                            <img
                                                src={user.signature_url}
                                                alt="Firma digital"
                                                className="max-h-24 mx-auto"
                                            />
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5"
                                                onClick={() => setShowSignaturePad(true)}
                                                disabled={signatureUploading}
                                            >
                                                <PenToolIcon className="h-3.5 w-3.5" /> Dibujar nueva
                                            </Button>
                                            <input
                                                ref={signatureInputRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="hidden"
                                                onChange={handleSignatureFileUpload}
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5"
                                                onClick={() => signatureInputRef.current?.click()}
                                                disabled={signatureUploading}
                                            >
                                                <UploadIcon className="h-3.5 w-3.5" /> Subir imagen
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="gap-1.5 text-destructive hover:text-destructive"
                                                onClick={handleSignatureDelete}
                                                disabled={signatureUploading}
                                            >
                                                <Trash2Icon className="h-3.5 w-3.5" /> Eliminar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="border rounded-lg p-6 bg-muted/20 flex flex-col items-center gap-2">
                                            <PenToolIcon className="h-8 w-8 text-muted-foreground/50" />
                                            <p className="text-sm text-muted-foreground">Sin firma configurada</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5"
                                                onClick={() => setShowSignaturePad(true)}
                                                disabled={signatureUploading}
                                            >
                                                <PenToolIcon className="h-3.5 w-3.5" /> Dibujar firma
                                            </Button>
                                            <input
                                                ref={signatureInputRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="hidden"
                                                onChange={handleSignatureFileUpload}
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5"
                                                onClick={() => signatureInputRef.current?.click()}
                                                disabled={signatureUploading}
                                            >
                                                <UploadIcon className="h-3.5 w-3.5" /> Subir imagen
                                            </Button>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">Dibuja con el mouse o sube una imagen de firma. JPG, PNG o WebP. Max 5MB.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Row 1: Personal + Contacto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Información Personal */}
                <Card className="overflow-hidden">
                    <SectionTitle
                        icon={UserIcon}
                        title="Información Personal"
                        isEditing={isEditing('personal')}
                        onEdit={() => startEdit('personal')}
                        onSave={saveEdit}
                        onCancel={cancelEdit}
                        saving={saving}
                    />
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <EditableField
                                label="Nombre"
                                value={getVal('first_name') || user.name?.split(' ').slice(0, -1).join(' ') || ''}
                                fieldKey="first_name"
                                isEditing={isEditing('personal')}
                                editData={editData}
                                onChange={handleChange}
                            />
                            <EditableField
                                label="Apellido"
                                value={getVal('last_name') || user.name?.split(' ').slice(-1)[0] || ''}
                                fieldKey="last_name"
                                isEditing={isEditing('personal')}
                                editData={editData}
                                onChange={handleChange}
                            />
                            <EditableField
                                label="Tipo de documento"
                                value={getVal('document_type')}
                                fieldKey="document_type"
                                isEditing={isEditing('personal')}
                                editData={editData}
                                onChange={handleChange}
                                type="select"
                                selectOptions={DOC_TYPES}
                                selectLabels={DOC_TYPE_LABELS}
                                formatDisplay={(v) => DOC_TYPE_LABELS[v] || v}
                            />
                            <EditableField
                                label="No. de Documento"
                                value={getVal('document_id')}
                                fieldKey="document_id"
                                isEditing={isEditing('personal')}
                                editData={editData}
                                onChange={handleChange}
                            />
                            <EditableField
                                label="Correo electrónico"
                                value={getVal('email')}
                                fieldKey="email"
                                isEditing={isEditing('personal')}
                                editData={editData}
                                onChange={handleChange}
                            />
                            <EditableField
                                label="Género"
                                value={getVal('gender')}
                                fieldKey="gender"
                                isEditing={isEditing('personal')}
                                editData={editData}
                                onChange={handleChange}
                                type="select"
                                selectOptions={GENDERS}
                                selectLabels={GENDER_LABELS}
                                formatDisplay={(v) => GENDER_LABELS[v] || v}
                            />
                            {isEditing('personal') ? (
                                <div className="py-1">
                                    <p className="text-[11px] text-muted-foreground leading-none mb-2">Fecha de nacimiento</p>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full h-8 justify-start text-left font-normal text-sm",
                                                    !getVal('birth_date') && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                                {getVal('birth_date') ? formatDate(getVal('birth_date')) : 'Seleccionar fecha'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <DatePickerBirthday
                                                selected={parseDate(getVal('birth_date'))}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        const yyyy = date.getFullYear();
                                                        const mm = String(date.getMonth() + 1).padStart(2, '0');
                                                        const dd = String(date.getDate()).padStart(2, '0');
                                                        handleChange('birth_date', `${yyyy}-${mm}-${dd}`);
                                                    } else {
                                                        handleChange('birth_date', '');
                                                    }
                                                }}
                                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            ) : (
                                <div className="py-1.5">
                                    <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Fecha de nacimiento</p>
                                    <p className="text-sm font-medium break-all">{getVal('birth_date') ? formatDate(getVal('birth_date')) : '(no definido)'}</p>
                                </div>
                            )}
                            <EditableField
                                label="Ocupación"
                                value={getVal('occupation')}
                                fieldKey="occupation"
                                isEditing={isEditing('personal')}
                                editData={editData}
                                onChange={handleChange}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Contacto */}
                <Card className="overflow-hidden">
                    <SectionTitle
                        icon={PhoneIcon}
                        title="Contacto"
                        isEditing={isEditing('contacto')}
                        onEdit={() => startEdit('contacto')}
                        onSave={saveEdit}
                        onCancel={cancelEdit}
                        saving={saving}
                    />
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <EditableField
                                label="Teléfono"
                                value={getVal('phone')}
                                fieldKey="phone"
                                isEditing={isEditing('contacto')}
                                editData={editData}
                                onChange={handleChange}
                            />
                            <EditableField
                                label="WhatsApp"
                                value={getVal('whatsapp_number')}
                                fieldKey="whatsapp_number"
                                isEditing={isEditing('contacto')}
                                editData={editData}
                                onChange={handleChange}
                                placeholder="+57 300 123 4567"
                            />
                            <EditableField
                                label="Dirección"
                                value={getVal('address')}
                                fieldKey="address"
                                isEditing={isEditing('contacto')}
                                editData={editData}
                                onChange={handleChange}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Row 2: Ubicación */}
            <Card className="overflow-hidden">
                <SectionTitle
                    icon={MapPinIcon}
                    title="Ubicación"
                    isEditing={isEditing('ubicacion')}
                    onEdit={() => startEdit('ubicacion')}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    saving={saving}
                />
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-6 gap-y-1">
                        <EditableField
                            label="País"
                            value={getVal('country_name')}
                            fieldKey="country_name"
                            isEditing={isEditing('ubicacion')}
                            editData={editData}
                            onChange={handleChange}
                        />
                        <EditableField
                            label="Departamento"
                            value={getVal('state_name')}
                            fieldKey="state_name"
                            isEditing={isEditing('ubicacion')}
                            editData={editData}
                            onChange={handleChange}
                        />
                        <EditableField
                            label="Ciudad"
                            value={getVal('city_name')}
                            fieldKey="city_name"
                            isEditing={isEditing('ubicacion')}
                            editData={editData}
                            onChange={handleChange}
                        />
                        <EditableField
                            label="Barrio"
                            value={getVal('neighborhood')}
                            fieldKey="neighborhood"
                            isEditing={isEditing('ubicacion')}
                            editData={editData}
                            onChange={handleChange}
                        />
                        <EditableField
                            label="Comuna"
                            value={getVal('commune')}
                            fieldKey="commune"
                            isEditing={isEditing('ubicacion')}
                            editData={editData}
                            onChange={handleChange}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Row 3: Laboral + Seguridad Social */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Información Laboral */}
                <Card className="overflow-hidden">
                    <SectionTitle
                        icon={BriefcaseIcon}
                        title="Información Laboral"
                        isEditing={isEditing('laboral')}
                        onEdit={() => startEdit('laboral')}
                        onSave={saveEdit}
                        onCancel={cancelEdit}
                        saving={saving}
                    />
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            {isEditing('laboral') ? (
                                <div className="py-1">
                                    <p className="text-[11px] text-muted-foreground leading-none mb-2">Salario</p>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">$</span>
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            value={getVal('salary') ? Number(getVal('salary')).toLocaleString('es-CO', { maximumFractionDigits: 0 }) : ''}
                                            onChange={(e) => {
                                                const raw = e.target.value.replace(/[^0-9]/g, '');
                                                handleChange('salary', raw ? String(parseInt(raw)) : '');
                                            }}
                                            className="h-8 text-sm pl-6"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="py-1.5">
                                    <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Salario</p>
                                    <p className="text-sm font-medium break-all">{getVal('salary') ? formatCurrency(Number(getVal('salary'))) : '(no definido)'}</p>
                                </div>
                            )}
                            <EditableField
                                label="Tipo de contrato"
                                value={getVal('contract_type')}
                                fieldKey="contract_type"
                                isEditing={isEditing('laboral')}
                                editData={editData}
                                onChange={handleChange}
                                type="select"
                                selectOptions={CONTRACT_TYPES}
                                selectLabels={CONTRACT_TYPE_LABELS}
                                formatDisplay={(v) => CONTRACT_TYPE_LABELS[v] || v}
                            />
                            {isEditing('laboral') ? (
                                <div className="py-1">
                                    <p className="text-[11px] text-muted-foreground leading-none mb-2">Fecha de ingreso</p>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full h-8 justify-start text-left font-normal text-sm",
                                                    !getVal('admission_date') && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                                {getVal('admission_date') ? formatDate(getVal('admission_date')) : 'Seleccionar fecha'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <DatePickerBirthday
                                                selected={parseDate(getVal('admission_date'))}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        const yyyy = date.getFullYear();
                                                        const mm = String(date.getMonth() + 1).padStart(2, '0');
                                                        const dd = String(date.getDate()).padStart(2, '0');
                                                        handleChange('admission_date', `${yyyy}-${mm}-${dd}`);
                                                    } else {
                                                        handleChange('admission_date', '');
                                                    }
                                                }}
                                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                                minYear={2000}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            ) : (
                                <div className="py-1.5">
                                    <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Fecha de ingreso</p>
                                    <p className="text-sm font-medium break-all">{getVal('admission_date') ? formatDate(getVal('admission_date')) : '(no definido)'}</p>
                                </div>
                            )}
                            <EditableField
                                label="Nivel de riesgo"
                                value={getVal('risk_level')}
                                fieldKey="risk_level"
                                isEditing={isEditing('laboral')}
                                editData={editData}
                                onChange={handleChange}
                                type="select"
                                selectOptions={RISK_LEVELS}
                                selectLabels={{ '1': 'Nivel 1', '2': 'Nivel 2', '3': 'Nivel 3', '4': 'Nivel 4', '5': 'Nivel 5' }}
                                formatDisplay={(v) => `Nivel ${v}`}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Seguridad Social */}
                <Card className="overflow-hidden">
                    <SectionTitle
                        icon={ShieldIcon}
                        title="Seguridad Social"
                        isEditing={isEditing('seguridad')}
                        onEdit={() => startEdit('seguridad')}
                        onSave={saveEdit}
                        onCancel={cancelEdit}
                        saving={saving}
                    />
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <EditableField
                                label="EPS"
                                value={getVal('eps_name')}
                                fieldKey="eps_name"
                                isEditing={isEditing('seguridad')}
                                editData={editData}
                                onChange={handleChange}
                                placeholder="Ej: Sura, Sanitas..."
                            />
                            <EditableField
                                label="Fondo de pensión"
                                value={getVal('pension_fund_name')}
                                fieldKey="pension_fund_name"
                                isEditing={isEditing('seguridad')}
                                editData={editData}
                                onChange={handleChange}
                                placeholder="Ej: Porvenir, Protección..."
                            />
                            <EditableField
                                label="ARL"
                                value={getVal('arl_name')}
                                fieldKey="arl_name"
                                isEditing={isEditing('seguridad')}
                                editData={editData}
                                onChange={handleChange}
                                placeholder="Ej: Sura, Positiva..."
                            />
                            <EditableField
                                label="Caja de compensación"
                                value={getVal('compensation_fund_name')}
                                fieldKey="compensation_fund_name"
                                isEditing={isEditing('seguridad')}
                                editData={editData}
                                onChange={handleChange}
                                placeholder="Ej: Comfama, Cafam..."
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Row 4: Bancarios + Asignación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Datos Bancarios */}
                <Card className="overflow-hidden">
                    <SectionTitle
                        icon={LandmarkIcon}
                        title="Datos Bancarios"
                        isEditing={isEditing('bancario')}
                        onEdit={() => startEdit('bancario')}
                        onSave={saveEdit}
                        onCancel={cancelEdit}
                        saving={saving}
                    />
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <EditableField
                                label="Nombre del banco"
                                value={getVal('bank_name')}
                                fieldKey="bank_name"
                                isEditing={isEditing('bancario')}
                                editData={editData}
                                onChange={handleChange}
                                placeholder="Ej: Bancolombia, Davivienda..."
                            />
                            <EditableField
                                label="Tipo de cuenta"
                                value={getVal('account_type')}
                                fieldKey="account_type"
                                isEditing={isEditing('bancario')}
                                editData={editData}
                                onChange={handleChange}
                                type="select"
                                selectOptions={ACCOUNT_TYPES}
                                selectLabels={ACCOUNT_TYPE_LABELS}
                                formatDisplay={(v) => ACCOUNT_TYPE_LABELS[v] || v}
                            />
                            <EditableField
                                label="Número de cuenta"
                                value={getVal('account_number')}
                                fieldKey="account_number"
                                isEditing={isEditing('bancario')}
                                editData={editData}
                                onChange={handleChange}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Asignación (read-only) */}
                <Card className="overflow-hidden">
                    <div className="flex items-center gap-2 py-3 px-4 bg-muted/30 border-b border-border/50 rounded-t-lg">
                        <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold flex-1">Asignación</h3>
                    </div>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <div className="py-1.5">
                                <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Empresa</p>
                                <p className="text-sm font-medium">{user.company?.name || '(no definido)'}</p>
                            </div>
                            <div className="py-1.5">
                                <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Sucursal</p>
                                <p className="text-sm font-medium">{user.branch?.name || '(no definida)'}</p>
                            </div>
                            <div className="sm:col-span-2 py-1.5">
                                <p className="text-[11px] text-muted-foreground leading-none mb-1.5">Roles</p>
                                <div className="flex flex-wrap gap-2">
                                    {user.roles && user.roles.length > 0 ? (
                                        user.roles.map((role) => (
                                            <Badge key={role.id} variant="secondary">
                                                {role.name}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-sm font-medium">(sin roles)</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
