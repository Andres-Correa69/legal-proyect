import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User as UserIcon, Phone, Mail, MapPin,
  MoreHorizontal, Tag, Globe,
  Plus, Pencil, Trash2, Check, X, StickyNote, Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clientsApi } from "@/lib/api";
import type { User } from "@/types";

interface ClientInfoViewProps {
  client: User;
  onClientUpdated: (client: User) => void;
}

interface Note {
  id: string;
  text: string;
  date: string;
  author: string;
}

const EditableField = ({
  label,
  value,
  fieldKey,
  isEditing,
  editData,
  onChange,
  type = "text",
  selectOptions,
}: {
  label: string;
  value: string;
  fieldKey: string;
  isEditing: boolean;
  editData: Record<string, string>;
  onChange: (key: string, val: string) => void;
  type?: "text" | "select" | "date";
  selectOptions?: string[];
}) => {
  if (!isEditing) {
    return (
      <div className="py-1.5">
        <p className="text-[11px] text-muted-foreground leading-none mb-0.5">{label}</p>
        <p className="text-sm font-medium break-all">{value || "(no definido)"}</p>
      </div>
    );
  }

  const currentVal = editData[fieldKey] ?? value ?? "";

  if (type === "select" && selectOptions) {
    return (
      <div className="py-1">
        <p className="text-[11px] text-muted-foreground leading-none mb-1">{label}</p>
        <Select value={currentVal} onValueChange={(v) => onChange(fieldKey, v)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            {selectOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="py-1">
      <p className="text-[11px] text-muted-foreground leading-none mb-1">{label}</p>
      <Input
        type={type}
        value={currentVal}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className="h-8 text-sm"
        maxLength={type === "text" ? 200 : undefined}
      />
    </div>
  );
};

const SectionTitle = ({
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
}) => (
  <div className="flex items-center gap-2 py-3 px-4 bg-muted/30 border-b border-border/50 rounded-t-lg">
    <Icon className="h-4 w-4 text-muted-foreground" />
    <h3 className="text-sm font-semibold flex-1">{title}</h3>
    {isEditing ? (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5" /> Cancelar
        </Button>
        <Button size="sm" className="h-7 gap-1 text-xs" onClick={onSave} disabled={saving}>
          <Save className="h-3.5 w-3.5" /> {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    ) : (
      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" /> Editar
      </Button>
    )}
  </div>
);

const QUICK_TAGS = [
  { label: "VIP", color: "bg-amber-500/100" },
  { label: "Frecuente", color: "bg-blue-500/100" },
  { label: "Nuevo", color: "bg-emerald-500/100" },
  { label: "Moroso", color: "bg-red-500/100" },
  { label: "Referido", color: "bg-purple-500/100" },
  { label: "Empresa", color: "bg-cyan-500/100" },
  { label: "Convenio", color: "bg-teal-500/100" },
];

const DOC_TYPES = ["CC", "CE", "NIT", "TI", "PP", "DIE"];
const GENDERS = ["Masculino", "Femenino", "Otro", "Prefiero no decir"];
const HOW_FOUND = ["Referido", "Redes sociales", "Google", "Publicidad", "Otro"];
const CONTACT_PREFS = ["Teléfono", "WhatsApp", "Email", "SMS"];
const CONTACT_TIMES = ["Mañana (6am - 12pm)", "Tarde (12pm - 6pm)", "Noche (6pm - 10pm)"];

export const ClientInfoView = ({ client, onClientUpdated }: ClientInfoViewProps) => {
  const { toast } = useToast();

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [clientTags, setClientTags] = useState<string[]>(client.tags || []);

  const startSectionEdit = (section: string) => {
    setEditingSection(section);
    setEditData({});
  };

  const cancelSectionEdit = () => {
    setEditingSection(null);
    setEditData({});
  };

  const handleFieldChange = (key: string, val: string) => {
    setEditData((prev) => ({ ...prev, [key]: val }));
  };

  const saveSectionEdit = async () => {
    if (Object.keys(editData).length === 0) {
      cancelSectionEdit();
      return;
    }
    setSaving(true);
    try {
      const updated = await clientsApi.update(client.id, editData);
      onClientUpdated(updated);
      setEditingSection(null);
      setEditData({});
      toast({ title: "Datos actualizados", description: "Los cambios se guardaron correctamente." });
    } catch {
      toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getVal = (key: string) => {
    if (editingSection && key in editData) return editData[key];
    return (client as Record<string, any>)[key] as string || "";
  };

  // Notes
  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes([
      { id: Date.now().toString(), text: newNote.trim(), date: new Date().toISOString().split("T")[0], author: "Usuario" },
      ...notes,
    ]);
    setNewNote("");
  };
  const deleteNote = (id: string) => setNotes(notes.filter((n) => n.id !== id));
  const startNoteEdit = (note: Note) => { setEditingNote(note.id); setEditText(note.text); };
  const saveNoteEdit = (id: string) => { setNotes(notes.map((n) => (n.id === id ? { ...n, text: editText } : n))); setEditingNote(null); };
  const toggleTag = (tag: string) => setClientTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
  };

  const isEditing = (section: string) => editingSection === section;

  return (
    <div className="space-y-4">
      {/* Row 1: Principal + Contacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <SectionTitle icon={UserIcon} title="Información Principal" isEditing={isEditing("principal")} onEdit={() => startSectionEdit("principal")} onSave={saveSectionEdit} onCancel={cancelSectionEdit} saving={saving} />
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <EditableField label="Tipo de documento" value={getVal("document_type")} fieldKey="document_type" isEditing={isEditing("principal")} editData={editData} onChange={handleFieldChange} type="select" selectOptions={DOC_TYPES} />
              <EditableField label="Número de identificación" value={getVal("document_id")} fieldKey="document_id" isEditing={isEditing("principal")} editData={editData} onChange={handleFieldChange} />
              <EditableField label="Nombres" value={getVal("first_name")} fieldKey="first_name" isEditing={isEditing("principal")} editData={editData} onChange={handleFieldChange} />
              <EditableField label="Apellidos" value={getVal("last_name")} fieldKey="last_name" isEditing={isEditing("principal")} editData={editData} onChange={handleFieldChange} />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <SectionTitle icon={Phone} title="Información de Contacto" isEditing={isEditing("contacto")} onEdit={() => startSectionEdit("contacto")} onSave={saveSectionEdit} onCancel={cancelSectionEdit} saving={saving} />
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1">
              <EditableField label="Correo electrónico" value={getVal("email")} fieldKey="email" isEditing={isEditing("contacto")} editData={editData} onChange={handleFieldChange} />
              <EditableField label="Teléfono móvil" value={getVal("phone")} fieldKey="phone" isEditing={isEditing("contacto")} editData={editData} onChange={handleFieldChange} />
              <EditableField label="WhatsApp" value={getVal("whatsapp_number")} fieldKey="whatsapp_number" isEditing={isEditing("contacto")} editData={editData} onChange={handleFieldChange} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Ubicación */}
      <Card className="overflow-hidden">
        <SectionTitle icon={MapPin} title="Información de Ubicación" isEditing={isEditing("ubicacion")} onEdit={() => startSectionEdit("ubicacion")} onSave={saveSectionEdit} onCancel={cancelSectionEdit} saving={saving} />
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-6 gap-y-1">
            <EditableField label="País" value={getVal("country_name")} fieldKey="country_name" isEditing={isEditing("ubicacion")} editData={editData} onChange={handleFieldChange} />
            <EditableField label="Departamento" value={getVal("state_name")} fieldKey="state_name" isEditing={isEditing("ubicacion")} editData={editData} onChange={handleFieldChange} />
            <EditableField label="Ciudad" value={getVal("city_name")} fieldKey="city_name" isEditing={isEditing("ubicacion")} editData={editData} onChange={handleFieldChange} />
            <EditableField label="Barrio" value={getVal("neighborhood")} fieldKey="neighborhood" isEditing={isEditing("ubicacion")} editData={editData} onChange={handleFieldChange} />
            <EditableField label="Comuna" value={getVal("commune")} fieldKey="commune" isEditing={isEditing("ubicacion")} editData={editData} onChange={handleFieldChange} />
          </div>
          <div className="mt-1">
            <EditableField label="Dirección" value={getVal("address")} fieldKey="address" isEditing={isEditing("ubicacion")} editData={editData} onChange={handleFieldChange} />
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Otros + Etiquetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <SectionTitle icon={MoreHorizontal} title="Otros" isEditing={isEditing("otros")} onEdit={() => startSectionEdit("otros")} onSave={saveSectionEdit} onCancel={cancelSectionEdit} saving={saving} />
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <EditableField label="Fecha de nacimiento" value={getVal("birth_date")} fieldKey="birth_date" isEditing={isEditing("otros")} editData={editData} onChange={handleFieldChange} type={isEditing("otros") ? "date" : "text"} />
              <EditableField label="Género" value={getVal("gender")} fieldKey="gender" isEditing={isEditing("otros")} editData={editData} onChange={handleFieldChange} type="select" selectOptions={GENDERS} />
              <EditableField label="Ocupación / Profesión" value={getVal("occupation")} fieldKey="occupation" isEditing={isEditing("otros")} editData={editData} onChange={handleFieldChange} />
              <EditableField label="¿Cómo nos conoció?" value={getVal("referral_source")} fieldKey="referral_source" isEditing={isEditing("otros")} editData={editData} onChange={handleFieldChange} type="select" selectOptions={HOW_FOUND} />
              <EditableField label="Preferencia de contacto" value={getVal("contact_preference")} fieldKey="contact_preference" isEditing={isEditing("otros")} editData={editData} onChange={handleFieldChange} type="select" selectOptions={CONTACT_PREFS} />
              <EditableField label="Horario preferido" value={getVal("preferred_schedule")} fieldKey="preferred_schedule" isEditing={isEditing("otros")} editData={editData} onChange={handleFieldChange} type="select" selectOptions={CONTACT_TIMES} />
            </div>
            <div className="mt-2">
              <p className="text-[11px] text-muted-foreground mb-1">Redes sociales</p>
              {client.social_networks && client.social_networks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {client.social_networks.map((sn, i) => (
                    <Badge key={i} variant="outline" className="text-xs gap-1">
                      <Globe className="h-3 w-3" /> {sn.platform}: {sn.url}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No hay redes sociales agregadas</p>
              )}
            </div>
            <div className="mt-2">
              <EditableField label="Observaciones" value={getVal("observations")} fieldKey="observations" isEditing={false} editData={{}} onChange={() => {}} />
            </div>
          </CardContent>
        </Card>

        {/* Etiquetas */}
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 py-3 px-4 bg-muted/30 border-b border-border/50 rounded-t-lg">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Etiquetas del Cliente</h3>
          </div>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {clientTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button onClick={() => toggleTag(tag)} className="ml-1 hover:bg-muted rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {clientTags.length === 0 && <p className="text-sm text-muted-foreground italic">Sin etiquetas</p>}
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">Etiquetas rápidas:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_TAGS.map((qt) => (
                <button
                  key={qt.label}
                  onClick={() => toggleTag(qt.label)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    clientTags.includes(qt.label)
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${qt.color}`} />
                  {qt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Notas */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 py-3 px-4 bg-muted/30 border-b border-border/50 rounded-t-lg">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Notas</h3>
        </div>
        <CardContent className="p-4">
          <div className="flex gap-2 mb-4">
            <Textarea
              placeholder="Agregar una nota sobre el cliente..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[60px] resize-none flex-1"
              maxLength={500}
            />
            <Button size="sm" className="self-end gap-1" onClick={addNote} disabled={!newNote.trim()}>
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          </div>
          <div className="space-y-2">
            {notes.length === 0 && (
              <p className="text-sm text-muted-foreground italic text-center py-4">
                No hay notas aún. Agrega la primera nota sobre este cliente.
              </p>
            )}
            {notes.map((note) => (
              <div key={note.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 group">
                <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {editingNote === note.id ? (
                    <div className="flex gap-2">
                      <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[40px] resize-none flex-1 text-sm" maxLength={500} />
                      <div className="flex flex-col gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveNoteEdit(note.id)}>
                          <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingNote(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">{note.text}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{formatDate(note.date)} · {note.author}</p>
                    </>
                  )}
                </div>
                {editingNote !== note.id && (
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startNoteEdit(note)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteNote(note.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
