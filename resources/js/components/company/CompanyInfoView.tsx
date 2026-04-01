import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { companiesApi } from "@/lib/api";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Pencil,
  Check,
  X,
  Globe,
} from "lucide-react";
import type { Company } from "@/types";

interface Props {
  company: Company;
  onUpdate: () => Promise<void>;
}

interface SectionTitleProps {
  icon: React.ElementType;
  title: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
}

function SectionTitle({ icon: Icon, title, isEditing, onEdit, onSave, onCancel, saving }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-muted/30 border-b border-border/50 rounded-t-lg">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {isEditing ? (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel} disabled={saving}>
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={onSave} disabled={saving}>
            {saving ? <Spinner size="sm" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

interface EditableFieldProps {
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}

function EditableField({ label, value, isEditing, onChange, type = "text", placeholder }: EditableFieldProps) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      {isEditing ? (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm"
          placeholder={placeholder}
        />
      ) : (
        <p className="text-sm font-medium">{value || "—"}</p>
      )}
    </div>
  );
}

export function CompanyInfoView({ company, onUpdate }: Props) {
  const { toast } = useToast();

  // General info editing
  const [editingGeneral, setEditingGeneral] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalForm, setGeneralForm] = useState({
    name: company.name || "",
    email: company.email || "",
    phone: company.phone || "",
    address: company.address || "",
    tax_id: company.tax_id || "",
  });

  // EI info editing
  const [editingEI, setEditingEI] = useState(false);
  const [savingEI, setSavingEI] = useState(false);
  const [eiForm, setEIForm] = useState({
    ei_business_name: (company as any).ei_business_name || "",
    ei_address: (company as any).ei_address || "",
    ei_phone: (company as any).ei_phone || "",
    ei_email: (company as any).ei_email || "",
    ei_merchant_registration: (company as any).ei_merchant_registration || "",
  });

  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    try {
      await companiesApi.update(company.id, {
        name: generalForm.name,
        email: generalForm.email || undefined,
        phone: generalForm.phone || undefined,
        address: generalForm.address || undefined,
        tax_id: generalForm.tax_id || undefined,
      });
      toast({ title: "Guardado", description: "Información general actualizada correctamente." });
      setEditingGeneral(false);
      await onUpdate();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo guardar.", variant: "destructive" });
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleCancelGeneral = () => {
    setGeneralForm({
      name: company.name || "",
      email: company.email || "",
      phone: company.phone || "",
      address: company.address || "",
      tax_id: company.tax_id || "",
    });
    setEditingGeneral(false);
  };

  const handleSaveEI = async () => {
    setSavingEI(true);
    try {
      await companiesApi.update(company.id, eiForm as any);
      toast({ title: "Guardado", description: "Datos de facturación electrónica actualizados." });
      setEditingEI(false);
      await onUpdate();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo guardar.", variant: "destructive" });
    } finally {
      setSavingEI(false);
    }
  };

  const handleCancelEI = () => {
    setEIForm({
      ei_business_name: (company as any).ei_business_name || "",
      ei_address: (company as any).ei_address || "",
      ei_phone: (company as any).ei_phone || "",
      ei_email: (company as any).ei_email || "",
      ei_merchant_registration: (company as any).ei_merchant_registration || "",
    });
    setEditingEI(false);
  };

  return (
    <div className="space-y-4">
      {/* General Info */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <SectionTitle
          icon={Building2}
          title="Información General"
          isEditing={editingGeneral}
          onEdit={() => setEditingGeneral(true)}
          onSave={handleSaveGeneral}
          onCancel={handleCancelGeneral}
          saving={savingGeneral}
        />
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditableField
              label="Nombre de la Empresa"
              value={generalForm.name}
              isEditing={editingGeneral}
              onChange={(v) => setGeneralForm({ ...generalForm, name: v })}
              placeholder="Nombre de la empresa"
            />
            <EditableField
              label="NIT / Tax ID"
              value={generalForm.tax_id}
              isEditing={editingGeneral}
              onChange={(v) => setGeneralForm({ ...generalForm, tax_id: v })}
              placeholder="NIT o identificación tributaria"
            />
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Slug</label>
              <p className="text-sm font-medium font-mono">{company.slug}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 py-3 px-4 bg-muted/30 border-b border-border/50 rounded-t-lg">
          <Mail className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Contacto</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditableField
              label="Email"
              value={generalForm.email}
              isEditing={editingGeneral}
              onChange={(v) => setGeneralForm({ ...generalForm, email: v })}
              type="email"
              placeholder="correo@empresa.com"
            />
            <EditableField
              label="Teléfono"
              value={generalForm.phone}
              isEditing={editingGeneral}
              onChange={(v) => setGeneralForm({ ...generalForm, phone: v })}
              placeholder="+57 300 000 0000"
            />
            <EditableField
              label="Dirección"
              value={generalForm.address}
              isEditing={editingGeneral}
              onChange={(v) => setGeneralForm({ ...generalForm, address: v })}
              placeholder="Dirección de la empresa"
            />
          </div>
        </div>
      </div>

      {/* Electronic Invoicing Info */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <SectionTitle
          icon={Globe}
          title="Facturación Electrónica (DIAN)"
          isEditing={editingEI}
          onEdit={() => setEditingEI(true)}
          onSave={handleSaveEI}
          onCancel={handleCancelEI}
          saving={savingEI}
        />
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditableField
              label="Razón Social"
              value={eiForm.ei_business_name}
              isEditing={editingEI}
              onChange={(v) => setEIForm({ ...eiForm, ei_business_name: v })}
              placeholder="Razón social DIAN"
            />
            <EditableField
              label="Matrícula Mercantil"
              value={eiForm.ei_merchant_registration}
              isEditing={editingEI}
              onChange={(v) => setEIForm({ ...eiForm, ei_merchant_registration: v })}
              placeholder="Número de matrícula"
            />
            <EditableField
              label="Dirección FE"
              value={eiForm.ei_address}
              isEditing={editingEI}
              onChange={(v) => setEIForm({ ...eiForm, ei_address: v })}
              placeholder="Dirección para facturación"
            />
            <EditableField
              label="Teléfono FE"
              value={eiForm.ei_phone}
              isEditing={editingEI}
              onChange={(v) => setEIForm({ ...eiForm, ei_phone: v })}
              placeholder="Teléfono para facturación"
            />
            <EditableField
              label="Email FE"
              value={eiForm.ei_email}
              isEditing={editingEI}
              onChange={(v) => setEIForm({ ...eiForm, ei_email: v })}
              type="email"
              placeholder="Email para facturación"
            />
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Estado FE</label>
              <p className={`text-sm font-medium ${(company as any).electronic_invoicing_registered ? "text-emerald-600" : "text-muted-foreground"}`}>
                {(company as any).electronic_invoicing_registered ? "Habilitada" : "No habilitada"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      {company.settings && Object.keys(company.settings).length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 py-3 px-4 bg-muted/30 border-b border-border/50 rounded-t-lg">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Configuración</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(company.settings).map(([key, value]) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground block mb-1 capitalize">
                    {key.replace(/_/g, " ")}
                  </label>
                  <p className="text-sm font-medium">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
