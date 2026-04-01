import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerBirthday } from "@/components/ui/date-picker-birthday";
import { Spinner } from "@/components/ui/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { clientsApi, usersApi, companiesApi, branchesApi, rolesApi } from "@/lib/api";
import type { User, Company, Branch, Role, SharedData } from "@/types";
import {
  ArrowLeft,
  Save,
  UserPlus,
  UserPen,
  User as UserIcon,
  Eye,
  Phone,
  MapPin,
  FileText,
  MoreHorizontal,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Plus,
  CalendarIcon,
  Trash2,
  Tag,
  X,
  Building2,
  PenTool,
  Upload,
  Eraser,
} from "lucide-react";
import { GetCountries, GetState, GetCity } from "react-country-state-city";

// Predefined tags
const PREDEFINED_TAGS = [
  { label: "VIP", color: "bg-amber-500/100" },
  { label: "Frecuente", color: "bg-blue-500/100" },
  { label: "Nuevo", color: "bg-green-500/100" },
  { label: "Moroso", color: "bg-red-500/100" },
  { label: "Referido", color: "bg-purple-500/100" },
  { label: "Empresa", color: "bg-cyan-500/100" },
  { label: "Convenio", color: "bg-indigo-500/100" },
  { label: "Emergencia", color: "bg-orange-500/100" },
  { label: "Criador", color: "bg-teal-500/100" },
  { label: "Fundación", color: "bg-pink-500/100" },
  { label: "Rescatista", color: "bg-emerald-500/100" },
];

// Social network options
const socialNetworkOptions = [
  { id: "facebook", name: "Facebook", icon: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ), placeholder: "usuario.facebook" },
  { id: "instagram", name: "Instagram", icon: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ), placeholder: "@usuario" },
  { id: "tiktok", name: "TikTok", icon: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
  ), placeholder: "@usuario" },
  { id: "twitter", name: "X (Twitter)", icon: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ), placeholder: "@usuario" },
  { id: "linkedin", name: "LinkedIn", icon: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ), placeholder: "usuario" },
  { id: "youtube", name: "YouTube", icon: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ), placeholder: "@canal" },
];

// Country codes for WhatsApp
const countryCodes = [
  { code: "+57", country: "Colombia", flag: "\u{1F1E8}\u{1F1F4}", maxLength: 10 },
  { code: "+593", country: "Ecuador", flag: "\u{1F1EA}\u{1F1E8}", maxLength: 9 },
  { code: "+51", country: "Per\u00FA", flag: "\u{1F1F5}\u{1F1EA}", maxLength: 9 },
  { code: "+58", country: "Venezuela", flag: "\u{1F1FB}\u{1F1EA}", maxLength: 10 },
  { code: "+507", country: "Panam\u00E1", flag: "\u{1F1F5}\u{1F1E6}", maxLength: 8 },
  { code: "+1", country: "Estados Unidos", flag: "\u{1F1FA}\u{1F1F8}", maxLength: 10 },
  { code: "+52", country: "M\u00E9xico", flag: "\u{1F1F2}\u{1F1FD}", maxLength: 10 },
  { code: "+34", country: "Espa\u00F1a", flag: "\u{1F1EA}\u{1F1F8}", maxLength: 9 },
];

// Document types
const DOCUMENT_TYPES: ComboboxOption[] = [
  { value: "CC", label: "CC - C\u00E9dula de ciudadan\u00EDa" },
  { value: "CE", label: "CE - C\u00E9dula de extranjer\u00EDa" },
  { value: "NIT", label: "NIT - N\u00FAmero de identificaci\u00F3n tributaria" },
  { value: "TI", label: "TI - Tarjeta de identidad" },
  { value: "PP", label: "PP - Pasaporte" },
];

// Email validation regex
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface SocialNetwork {
  id: string;
  type: string;
  value: string;
}

interface CountryData {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
  phone_code: string;
}

interface StateData {
  id: number;
  name: string;
  state_code: string;
}

interface CityData {
  id: number;
  name: string;
}

interface RoleWithPermissions extends Role {
  permissions?: any[];
}

/* ── Signature Pad Canvas ── */
function SignaturePadCanvas({ onSave, onCancel, saving }: { onSave: (dataUrl: string) => void; onCancel: () => void; saving: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
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

  const stopDrawing = useCallback(() => setIsDrawing(false), []);

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
          <Eraser className="h-3.5 w-3.5 mr-1" /> Limpiar
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5 mr-1" /> Cancelar
        </Button>
        <Button size="sm" onClick={() => { const c = canvasRef.current; if (c && hasDrawn) onSave(c.toDataURL('image/png')); }} disabled={!hasDrawn || saving}>
          <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Guardando...' : 'Guardar firma'}
        </Button>
      </div>
    </div>
  );
}

interface CreateClientPageProps {
  mode: 'client' | 'user';
  pageMode?: 'create' | 'edit' | 'view';
  entityId?: number;
}

export default function CreateClientPage({ mode, pageMode = 'create', entityId }: CreateClientPageProps) {
  const { auth } = usePage<SharedData>().props;
  const { toast } = useToast();
  const isSuperAdmin = auth.user?.roles?.some(r => r.slug === 'super-admin') || false;

  const isViewMode = pageMode === 'view';
  const isEditMode = pageMode === 'edit';
  const isCreateMode = pageMode === 'create';

  const [dataLoading, setDataLoading] = useState(!!entityId);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [documentTouched, setDocumentTouched] = useState(false);
  const [socialNetworks, setSocialNetworks] = useState<SocialNetwork[]>([]);
  const [showSocialOptions, setShowSocialOptions] = useState(false);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Tag system state
  const [tagInput, setTagInput] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Country/State/City states
  const [locationCountries, setLocationCountries] = useState<CountryData[]>([]);
  const [locationStates, setLocationStates] = useState<StateData[]>([]);
  const [locationCities, setLocationCities] = useState<CityData[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);

  // Signature state (user mode)
  const [signatureData, setSignatureData] = useState<string | File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // User mode: companies, branches, roles
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);

  const initialCompanyId = !isSuperAdmin && auth.user?.company_id
    ? auth.user.company_id.toString()
    : '';

  // Form state
  const [formData, setFormData] = useState({
    documentType: "",
    documentNumber: "",
    firstName: "",
    lastName: "",
    businessName: "",
    legalRepresentative: "",
    email: "",
    phone: "",
    whatsappCountry: "+57",
    whatsappNumber: "",
    address: "",
    country_code: "",
    country_name: "",
    state_code: "",
    state_name: "",
    city_name: "",
    neighborhood: "",
    commune: "",
    observations: "",
    birthDate: undefined as Date | undefined,
    tags: [] as string[],
    gender: "",
    referralSource: "",
    occupation: "",
    contactPreference: "",
    preferredSchedule: "",
    // User mode fields
    company_id: initialCompanyId,
    branch_id: "none",
    role_id: "",
    password: "",
  });

  // Location combobox options
  const countryOptions: ComboboxOption[] = useMemo(() => {
    return locationCountries.map(country => ({
      value: country.id.toString(),
      label: country.name,
    }));
  }, [locationCountries]);

  const stateOptions: ComboboxOption[] = useMemo(() => {
    return locationStates.map(state => ({
      value: state.id.toString(),
      label: state.name,
    }));
  }, [locationStates]);

  const cityOptions: ComboboxOption[] = useMemo(() => {
    return locationCities.map(city => ({
      value: city.id.toString(),
      label: city.name,
    }));
  }, [locationCities]);

  // Filtered branches by company
  const filteredBranches = useMemo(() => {
    if (!formData.company_id) return branches;
    return branches.filter(b => b.company_id === parseInt(formData.company_id));
  }, [branches, formData.company_id]);

  // Filtered roles (exclude client and super-admin)
  const filteredRoles = useMemo(() => {
    return roles.filter(r => r.slug !== 'client' && r.slug !== 'super-admin');
  }, [roles]);

  // Tag functions
  const getTagColor = (tag: string) => {
    const predefined = PREDEFINED_TAGS.find(t => t.label.toLowerCase() === tag.toLowerCase());
    return predefined ? predefined.color : "bg-muted/500";
  };

  const filteredSuggestions = PREDEFINED_TAGS.filter(
    t => t.label.toLowerCase().includes(tagInput.toLowerCase()) && !formData.tags.includes(t.label)
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
    }
    setTagInput("");
    setShowTagSuggestions(false);
    tagInputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tagInput.trim()) {
        const match = filteredSuggestions.find(s => s.label.toLowerCase() === tagInput.toLowerCase());
        addTag(match ? match.label : tagInput.trim());
      }
    }
  };

  // Handle autocomplete (stub)
  const handleAutoComplete = () => {
    if (!formData.documentNumber || !formData.documentType) {
      toast({
        title: "Datos incompletos",
        description: "Ingrese tipo y n\u00FAmero de documento para autocompletar",
        variant: "destructive",
      });
      return;
    }

    setIsAutoCompleting(true);
    setTimeout(() => {
      setIsAutoCompleting(false);
      toast({
        title: "Sin resultados",
        description: "La funcionalidad de autocompletar estar\u00E1 disponible pr\u00F3ximamente",
      });
    }, 1500);
  };

  // Validation functions
  const validateDocumentNumber = (docType: string, docNumber: string): { valid: boolean; message?: string } => {
    if (!docNumber) return { valid: false, message: "Requerido" };
    const cleanNumber = docNumber.replace(/\D/g, '');
    switch (docType) {
      case "CC":
        if (cleanNumber.length < 6 || cleanNumber.length > 10) return { valid: false, message: "CC debe tener entre 6 y 10 d\u00EDgitos" };
        break;
      case "CE":
        if (cleanNumber.length < 6 || cleanNumber.length > 12) return { valid: false, message: "CE debe tener entre 6 y 12 caracteres" };
        break;
      case "NIT":
        if (cleanNumber.length < 9 || cleanNumber.length > 10) return { valid: false, message: "NIT debe tener 9-10 d\u00EDgitos" };
        break;
      case "TI":
        if (cleanNumber.length < 10 || cleanNumber.length > 11) return { valid: false, message: "TI debe tener 10-11 d\u00EDgitos" };
        break;
      case "PP":
        if (docNumber.length < 6 || docNumber.length > 15) return { valid: false, message: "Pasaporte debe tener 6-15 caracteres" };
        break;
      default:
        return { valid: false, message: "Seleccione tipo de documento" };
    }
    return { valid: true };
  };

  const validatePhone = (phone: string): { valid: boolean; message?: string } => {
    if (!phone) return { valid: true };
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 7 || cleanPhone.length > 15) return { valid: false, message: "Tel\u00E9fono debe tener 7-15 d\u00EDgitos" };
    return { valid: true };
  };

  const validateName = (name: string): { valid: boolean; message?: string } => {
    if (!name.trim()) return { valid: false, message: "Requerido" };
    if (name.trim().length < 2) return { valid: false, message: "M\u00EDnimo 2 caracteres" };
    if (!/^[a-zA-Z\u00E1\u00E9\u00ED\u00F3\u00FA\u00C1\u00C9\u00CD\u00D3\u00DA\u00F1\u00D1\u00FC\u00DC\s]+$/.test(name.trim())) {
      return { valid: false, message: "Solo letras permitidas" };
    }
    return { valid: true };
  };

  const validateBusinessName = (name: string): { valid: boolean; message?: string } => {
    if (formData.documentType !== "NIT") return { valid: true };
    if (!name.trim()) return { valid: false, message: "Raz\u00F3n social requerida" };
    if (name.trim().length < 3) return { valid: false, message: "M\u00EDnimo 3 caracteres" };
    return { valid: true };
  };

  const validateEmail = (email: string): { valid: boolean; message?: string } => {
    if (!email) return { valid: true };
    if (!emailRegex.test(email)) return { valid: false, message: "Formato de correo inv\u00E1lido" };
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return { valid: false, message: "Dominio no v\u00E1lido" };
    const tldParts = domain.split('.');
    if (tldParts.length < 2 || tldParts[tldParts.length - 1].length < 2) return { valid: false, message: "Dominio incompleto" };
    return { valid: true };
  };

  const documentValidation = validateDocumentNumber(formData.documentType, formData.documentNumber);
  const phoneValidation = validatePhone(formData.phone);
  const firstNameValidation = formData.documentType === "NIT" ? { valid: true } : validateName(formData.firstName);
  const lastNameValidation = formData.documentType === "NIT" ? { valid: true } : validateName(formData.lastName);
  const businessNameValidation = validateBusinessName(formData.businessName);
  const emailValidation = validateEmail(formData.email);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFieldInvalid = (value: string, required: boolean = true) => {
    return attemptedSubmit && required && !value.trim();
  };

  const getSelectedCountryData = () => {
    return countryCodes.find(c => c.code === formData.whatsappCountry) || countryCodes[0];
  };

  const validateWhatsApp = (number: string) => {
    const countryData = getSelectedCountryData();
    const cleanNumber = number.replace(/\D/g, '');
    return cleanNumber.length === countryData.maxLength;
  };

  const countryData = getSelectedCountryData();

  // Load location countries
  useEffect(() => {
    const loadCountries = async () => {
      setLoadingCountries(true);
      try {
        const result = await GetCountries();
        setLocationCountries(result);
      } catch (error) {
        console.error('Error loading countries:', error);
      } finally {
        setLoadingCountries(false);
      }
    };
    loadCountries();
  }, []);

  // Load companies, branches, roles for user mode
  useEffect(() => {
    if (mode === 'user') {
      const loadUserData = async () => {
        try {
          if (isSuperAdmin) {
            const [companiesData, branchesData, rolesData] = await Promise.all([
              companiesApi.getAll(),
              branchesApi.getAll(),
              rolesApi.getAll(),
            ]);
            setCompanies(companiesData as unknown as Company[]);
            setBranches(branchesData as unknown as Branch[]);
            setRoles(rolesData);
          } else if (auth.user?.company_id) {
            const [branchesData, rolesData] = await Promise.all([
              branchesApi.getAll(auth.user.company_id),
              rolesApi.getAll(),
            ]);
            setCompanies([{ id: auth.user.company_id, name: 'Mi Empresa' } as Company]);
            setBranches(branchesData as unknown as Branch[]);
            setRoles(rolesData);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      };
      loadUserData();
    }
  }, [mode]);

  // Load entity data for edit/view mode
  useEffect(() => {
    if (!entityId || isCreateMode) return;

    const loadEntityData = async () => {
      setDataLoading(true);
      try {
        const entity = mode === 'client'
          ? await clientsApi.getById(entityId)
          : await usersApi.getById(entityId);

        // Populate form data
        const isNIT = entity.document_type === 'NIT';
        setFormData(prev => ({
          ...prev,
          documentType: entity.document_type || '',
          documentNumber: entity.document_id || '',
          firstName: entity.first_name || (!isNIT && entity.name ? entity.name.split(' ').slice(0, -1).join(' ') : ''),
          lastName: entity.last_name || (!isNIT && entity.name ? entity.name.split(' ').slice(-1)[0] : ''),
          businessName: entity.business_name || (isNIT ? entity.name || '' : ''),
          legalRepresentative: entity.legal_representative || '',
          email: entity.email || '',
          phone: entity.phone || '',
          whatsappCountry: entity.whatsapp_country || '+57',
          whatsappNumber: entity.whatsapp_number || '',
          address: entity.address || '',
          country_code: entity.country_code || '',
          country_name: entity.country_name || '',
          state_code: entity.state_code || '',
          state_name: entity.state_name || '',
          city_name: entity.city_name || '',
          neighborhood: entity.neighborhood || '',
          commune: entity.commune || '',
          observations: entity.observations || '',
          birthDate: entity.birth_date ? (() => {
            const dateStr = String(entity.birth_date);
            const dateOnly = dateStr.split('T')[0];
            const d = new Date(dateOnly + 'T00:00:00');
            return isNaN(d.getTime()) ? undefined : d;
          })() : undefined,
          tags: entity.tags || [],
          gender: entity.gender || '',
          referralSource: entity.referral_source || '',
          occupation: entity.occupation || '',
          contactPreference: entity.contact_preference || '',
          preferredSchedule: entity.preferred_schedule || '',
          company_id: entity.company_id?.toString() || '',
          branch_id: entity.branch_id?.toString() || 'none',
          role_id: entity.roles?.[0]?.id?.toString() || '',
        }));

        // Load social networks
        if (entity.social_networks && entity.social_networks.length > 0) {
          setSocialNetworks(entity.social_networks.map((sn, idx) => ({
            id: `sn-${idx}`,
            type: sn.platform,
            value: sn.url,
          })));
        }

        // Load signature for user edit mode
        if (mode === 'user' && entity.signature_url) {
          setSignaturePreview(entity.signature_url);
        }

        // Load location cascading data
        if (entity.country_code) {
          try {
            const allCountries = await GetCountries();
            const country = allCountries.find((c: CountryData) => c.iso2 === entity.country_code);
            if (country) {
              setSelectedCountryId(country.id);
              const statesData = await GetState(country.id);
              setLocationStates(statesData);

              if (entity.state_code) {
                const state = statesData.find((s: StateData) => s.state_code === entity.state_code);
                if (state) {
                  setSelectedStateId(state.id);
                  const citiesData = await GetCity(country.id, state.id);
                  setLocationCities(citiesData);
                }
              }
            }
          } catch (error) {
            console.error('Error loading location data:', error);
          }
        }
      } catch (error: any) {
        console.error('Error loading entity:', error);
        toast({ title: 'Error', description: 'No se pudo cargar la información', variant: 'destructive' });
        router.visit(mode === 'client' ? '/admin/clients' : '/admin/users');
      } finally {
        setDataLoading(false);
      }
    };

    loadEntityData();
  }, [entityId, isCreateMode, mode]);

  // Location handlers
  const handleCountryChange = async (countryIdStr: string) => {
    const countryId = parseInt(countryIdStr);
    const country = locationCountries.find(c => c.id === countryId);
    if (!country) return;

    setSelectedCountryId(countryId);
    setSelectedStateId(null);
    setLocationStates([]);
    setLocationCities([]);

    setFormData(prev => ({
      ...prev,
      country_code: country.iso2,
      country_name: country.name,
      state_code: '',
      state_name: '',
      city_name: '',
    }));

    setLoadingStates(true);
    try {
      const result = await GetState(countryId);
      setLocationStates(result);
    } catch (error) {
      console.error('Error loading states:', error);
    } finally {
      setLoadingStates(false);
    }
  };

  const handleStateChange = async (stateIdStr: string) => {
    const stateId = parseInt(stateIdStr);
    const state = locationStates.find(s => s.id === stateId);
    if (!state || !selectedCountryId) return;

    setSelectedStateId(stateId);
    setLocationCities([]);

    setFormData(prev => ({
      ...prev,
      state_code: state.state_code,
      state_name: state.name,
      city_name: '',
    }));

    setLoadingCities(true);
    try {
      const result = await GetCity(selectedCountryId, stateId);
      setLocationCities(result);
    } catch (error) {
      console.error('Error loading cities:', error);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleCityChange = (cityIdStr: string) => {
    const cityId = parseInt(cityIdStr);
    const city = locationCities.find(c => c.id === cityId);
    if (!city) return;
    setFormData(prev => ({ ...prev, city_name: city.name }));
  };

  // Submit handler
  const handleSubmit = async () => {
    setAttemptedSubmit(true);

    if (!formData.documentType) {
      toast({ title: "Campo requerido", description: "Por favor seleccione el tipo de documento", variant: "destructive" });
      return;
    }

    if (!documentValidation.valid) {
      toast({ title: "N\u00FAmero de documento inv\u00E1lido", description: documentValidation.message, variant: "destructive" });
      return;
    }

    if (formData.documentType === "NIT") {
      if (!businessNameValidation.valid) {
        toast({ title: "Raz\u00F3n social inv\u00E1lida", description: businessNameValidation.message, variant: "destructive" });
        return;
      }
    } else {
      if (!firstNameValidation.valid) {
        toast({ title: "Nombres inv\u00E1lidos", description: firstNameValidation.message, variant: "destructive" });
        return;
      }
      if (!lastNameValidation.valid) {
        toast({ title: "Apellidos inv\u00E1lidos", description: lastNameValidation.message, variant: "destructive" });
        return;
      }
    }

    if (formData.email && !emailValidation.valid) {
      toast({ title: "Correo electr\u00F3nico inv\u00E1lido", description: emailValidation.message, variant: "destructive" });
      return;
    }

    if (formData.phone && !phoneValidation.valid) {
      toast({ title: "Tel\u00E9fono inv\u00E1lido", description: phoneValidation.message, variant: "destructive" });
      return;
    }

    if (formData.whatsappNumber && !validateWhatsApp(formData.whatsappNumber)) {
      const cd = getSelectedCountryData();
      toast({ title: "N\u00FAmero de WhatsApp inv\u00E1lido", description: `El n\u00FAmero debe tener ${cd.maxLength} d\u00EDgitos para ${cd.country}`, variant: "destructive" });
      return;
    }

    if (mode === 'user' && !formData.email) {
      toast({ title: "Campo requerido", description: "El email es requerido para crear un usuario", variant: "destructive" });
      return;
    }

    if (mode === 'user' && isCreateMode && !formData.password) {
      toast({ title: "Campo requerido", description: "La contraseña es requerida para crear un usuario", variant: "destructive" });
      return;
    }

    if (mode === 'user' && formData.password && formData.password.length < 8) {
      toast({ title: "Contraseña inválida", description: "La contraseña debe tener al menos 8 caracteres", variant: "destructive" });
      return;
    }

    // Auto-construct name
    let name: string;
    if (formData.documentType === "NIT") {
      name = formData.businessName;
    } else {
      name = `${formData.firstName} ${formData.lastName}`.trim();
    }

    setFormLoading(true);

    try {
      const data: Record<string, any> = {
        name,
        first_name: formData.firstName || null,
        last_name: formData.lastName || null,
        business_name: formData.documentType === "NIT" ? formData.businessName : null,
        legal_representative: formData.documentType === "NIT" ? formData.legalRepresentative : null,
        email: formData.email,
        document_id: formData.documentNumber,
        document_type: formData.documentType,
        phone: formData.phone || null,
        whatsapp_country: formData.whatsappNumber ? formData.whatsappCountry : null,
        whatsapp_number: formData.whatsappNumber || null,
        address: formData.address || null,
        birth_date: formData.birthDate ? format(formData.birthDate, "yyyy-MM-dd") : null,
        gender: formData.gender || null,
        occupation: formData.occupation || null,
        country_code: formData.country_code || null,
        country_name: formData.country_name || null,
        state_code: formData.state_code || null,
        state_name: formData.state_name || null,
        city_name: formData.city_name || null,
        neighborhood: formData.neighborhood || null,
        commune: formData.commune || null,
        referral_source: formData.referralSource || null,
        contact_preference: formData.contactPreference || null,
        preferred_schedule: formData.preferredSchedule || null,
        observations: formData.observations || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        social_networks: socialNetworks.filter(sn => sn.value).map(sn => ({
          platform: sn.type,
          url: sn.value,
        })),
      };

      if (data.social_networks.length === 0) data.social_networks = null;

      if (mode === 'client') {
        if (formData.company_id) data.company_id = parseInt(formData.company_id);
        if (formData.branch_id && formData.branch_id !== 'none') data.branch_id = parseInt(formData.branch_id);
        if (isEditMode && entityId) {
          await clientsApi.update(entityId, data);
          toast({ title: "Cliente actualizado", description: "El cliente ha sido actualizado exitosamente" });
        } else {
          await clientsApi.create(data);
          toast({ title: "Cliente creado", description: "El cliente ha sido registrado exitosamente" });
        }
        router.visit('/admin/clients');
      } else {
        data.company_id = formData.company_id ? parseInt(formData.company_id) : undefined;
        data.branch_id = formData.branch_id !== 'none' ? parseInt(formData.branch_id) : undefined;
        data.role_ids = formData.role_id ? [parseInt(formData.role_id)] : [];
        if (formData.password) {
          data.password = formData.password;
        }
        if (isEditMode && entityId) {
          await usersApi.update(entityId, data);
          // Upload signature if changed
          if (signatureData) {
            await usersApi.uploadSignature(entityId, signatureData);
          }
          toast({ title: "Usuario actualizado", description: "El usuario ha sido actualizado exitosamente" });
        } else {
          const newUser = await usersApi.create(data);
          // Upload signature after creating user
          if (signatureData && newUser?.id) {
            try {
              await usersApi.uploadSignature(newUser.id, signatureData);
            } catch {
              // User created but signature failed - don't block
              toast({ title: "Aviso", description: "Usuario creado pero no se pudo subir la firma", variant: "destructive" });
            }
          }
          toast({ title: "Usuario creado", description: "El usuario ha sido registrado exitosamente" });
        }
        router.visit('/admin/users');
      }
    } catch (error: any) {
      const msg = error?.message || error?.errors_messages?.[0] || 'Error al guardar';
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const pageTitle = useMemo(() => {
    const entity = mode === 'client' ? 'Cliente' : 'Usuario';
    if (isViewMode) return `Ver ${entity}`;
    if (isEditMode) return `Editar ${entity}`;
    return `Nuevo ${entity}`;
  }, [mode, isViewMode, isEditMode]);

  const pageSubtitle = useMemo(() => {
    const entity = mode === 'client' ? 'cliente' : 'usuario';
    if (isViewMode) return `Información del ${entity}`;
    if (isEditMode) return `Modifique la información del ${entity}`;
    return `Complete la información del ${entity}`;
  }, [mode, isViewMode, isEditMode]);

  const HeaderIcon = isViewMode ? Eye : isEditMode ? UserPen : UserPlus;

  if (dataLoading) {
    return (
      <AppLayout>
        <Head title={pageTitle} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Cargando información...</p>
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
                  onClick={() => router.visit(mode === 'client' ? '/admin/clients' : '/admin/users')}
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
                <Button onClick={handleSubmit} size="sm" className="gap-1.5 shadow-lg h-8 px-3 text-xs sm:text-sm" disabled={formLoading}>
                  {formLoading ? <Spinner className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  <span>Guardar</span>
                </Button>
              )}
              {isViewMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 px-3 text-xs sm:text-sm"
                  onClick={() => {
                    const base = mode === 'client' ? '/admin/clients' : '/admin/users';
                    router.visit(`${base}/${entityId}/edit`);
                  }}
                >
                  <UserPen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Editar</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="py-4">
          <fieldset disabled={isViewMode} className="space-y-4 m-0 p-0 border-0 min-w-0">

            {/* ============================================ */}
            {/* SECTION 1: Informaci\u00F3n Principal */}
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
                  {/* Row 1: Document Type + Document Number + Autocomplete */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Tipo de documento <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        disabled={isViewMode}
                        value={formData.documentType}
                        onValueChange={(value) => handleInputChange("documentType", value)}
                      >
                        <SelectTrigger className={`h-9 text-sm ${isFieldInvalid(formData.documentType) ? "ring-2 ring-destructive" : ""}`}>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-50">
                          <SelectItem value="CC">CC - C&eacute;dula de ciudadan&iacute;a</SelectItem>
                          <SelectItem value="CE">CE - C&eacute;dula de extranjer&iacute;a</SelectItem>
                          <SelectItem value="NIT">NIT - N&uacute;mero de identificaci&oacute;n tributaria</SelectItem>
                          <SelectItem value="TI">TI - Tarjeta de identidad</SelectItem>
                          <SelectItem value="PP">PP - Pasaporte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        N&uacute;mero de identificaci&oacute;n <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder="N&uacute;mero de documento"
                            value={formData.documentNumber}
                            onChange={(e) => handleInputChange("documentNumber", e.target.value)}
                            onBlur={() => setDocumentTouched(true)}
                            className={`h-9 text-sm pr-8 ${
                              (attemptedSubmit || documentTouched) && formData.documentNumber && !documentValidation.valid
                                ? "ring-2 ring-destructive"
                                : documentTouched && formData.documentNumber && documentValidation.valid
                                ? "ring-2 ring-green-500"
                                : attemptedSubmit && !formData.documentNumber
                                ? "ring-2 ring-destructive"
                                : ""
                            }`}
                          />
                          {documentTouched && formData.documentNumber && formData.documentType && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              {documentValidation.valid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          )}
                        </div>
                        {!isViewMode && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAutoComplete}
                            disabled={isAutoCompleting || !formData.documentType || !formData.documentNumber}
                            className="h-9 gap-1.5 whitespace-nowrap px-3"
                          >
                            <Sparkles className={`h-4 w-4 ${isAutoCompleting ? "animate-spin" : ""}`} />
                            <span className="hidden sm:inline">Autocompletar</span>
                          </Button>
                        )}
                      </div>
                      {documentTouched && formData.documentNumber && formData.documentType && !documentValidation.valid && (
                        <p className="text-[10px] text-destructive">{documentValidation.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Conditional on document type */}
                  {formData.documentType === "NIT" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                      <div className="space-y-1 lg:col-span-2">
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          Raz&oacute;n social <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            placeholder="Nombre de la empresa"
                            value={formData.businessName}
                            onChange={(e) => handleInputChange("businessName", e.target.value)}
                            className={`h-9 text-sm pr-8 ${
                              attemptedSubmit && !businessNameValidation.valid
                                ? "ring-2 ring-destructive"
                                : formData.businessName && businessNameValidation.valid
                                ? "ring-2 ring-green-500"
                                : ""
                            }`}
                          />
                          {formData.businessName && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              {businessNameValidation.valid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          )}
                        </div>
                        {formData.businessName && !businessNameValidation.valid && (
                          <p className="text-[10px] text-destructive">{businessNameValidation.message}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground mb-2 block">Representante legal</Label>
                        <Input
                          placeholder="Nombre del representante"
                          value={formData.legalRepresentative}
                          onChange={(e) => handleInputChange("legalRepresentative", e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  ) : formData.documentType ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                      <div className="space-y-1 lg:col-span-2">
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          Nombres <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            placeholder="Nombres del cliente"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange("firstName", e.target.value)}
                            className={`h-9 text-sm pr-8 ${
                              attemptedSubmit && !firstNameValidation.valid
                                ? "ring-2 ring-destructive"
                                : formData.firstName && firstNameValidation.valid
                                ? "ring-2 ring-green-500"
                                : ""
                            }`}
                          />
                          {formData.firstName && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              {firstNameValidation.valid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          )}
                        </div>
                        {formData.firstName && !firstNameValidation.valid && (
                          <p className="text-[10px] text-destructive">{firstNameValidation.message}</p>
                        )}
                      </div>
                      <div className="space-y-1 lg:col-span-2">
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          Apellidos <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            placeholder="Apellidos del cliente"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange("lastName", e.target.value)}
                            className={`h-9 text-sm pr-8 ${
                              attemptedSubmit && !lastNameValidation.valid
                                ? "ring-2 ring-destructive"
                                : formData.lastName && lastNameValidation.valid
                                ? "ring-2 ring-green-500"
                                : ""
                            }`}
                          />
                          {formData.lastName && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              {lastNameValidation.valid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          )}
                        </div>
                        {formData.lastName && !lastNameValidation.valid && (
                          <p className="text-[10px] text-destructive">{lastNameValidation.message}</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* ============================================ */}
            {/* SECTION 2: Informaci\u00F3n de Contacto */}
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
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground mb-2 block">Correo electr&oacute;nico</Label>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="ejemplo@correo.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        onBlur={() => setEmailTouched(true)}
                        className={`h-9 text-sm pr-8 ${
                          emailTouched && formData.email && !emailValidation.valid
                            ? "ring-2 ring-destructive"
                            : emailTouched && formData.email && emailValidation.valid
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
                    {emailTouched && formData.email && !emailValidation.valid && (
                      <p className="text-[10px] text-destructive">{emailValidation.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground mb-2 block">Tel&eacute;fono m&oacute;vil</Label>
                    <div className="relative">
                      <Input
                        type="tel"
                        placeholder="+57 300 123 4567"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        onBlur={() => setPhoneTouched(true)}
                        className={`h-9 text-sm pr-8 ${
                          phoneTouched && formData.phone && !phoneValidation.valid
                            ? "ring-2 ring-destructive"
                            : phoneTouched && formData.phone && phoneValidation.valid
                            ? "ring-2 ring-green-500"
                            : ""
                        }`}
                      />
                      {phoneTouched && formData.phone && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          {phoneValidation.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                    {phoneTouched && formData.phone && !phoneValidation.valid && (
                      <p className="text-[10px] text-destructive">{phoneValidation.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground mb-2 block">WhatsApp</Label>
                    <div className="flex gap-1">
                      <Select
                        disabled={isViewMode}
                        value={formData.whatsappCountry}
                        onValueChange={(value) => handleInputChange("whatsappCountry", value)}
                      >
                        <SelectTrigger className="w-[90px] h-9 px-2 text-xs">
                          <SelectValue>
                            <span className="flex items-center gap-1">
                              {countryData.flag} {countryData.code}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card z-50">
                          {countryCodes.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              <span className="flex items-center gap-2 text-sm">
                                {country.flag} {country.code}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="tel"
                        placeholder={`${countryData.maxLength} d\u00EDgitos`}
                        value={formData.whatsappNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, countryData.maxLength);
                          handleInputChange("whatsappNumber", value);
                        }}
                        className={`flex-1 h-9 text-sm ${
                          formData.whatsappNumber && !validateWhatsApp(formData.whatsappNumber)
                            ? "ring-2 ring-amber-500"
                            : formData.whatsappNumber && validateWhatsApp(formData.whatsappNumber)
                            ? "ring-2 ring-green-500"
                            : ""
                        }`}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MessageCircle className="h-3 w-3 text-green-600" />
                      Seleccione pa&iacute;s y escriba el n&uacute;mero
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ============================================ */}
            {/* SECTION 3: Informaci\u00F3n de Ubicaci\u00F3n */}
            {/* ============================================ */}
            <Card className="border shadow-sm">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Informaci&oacute;n de Ubicaci&oacute;n
                </h2>
              </div>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">Pa&iacute;s</Label>
                      <Combobox
                        options={countryOptions}
                        value={selectedCountryId?.toString() || ""}
                        onValueChange={handleCountryChange}
                        placeholder="Seleccionar..."
                        searchPlaceholder="Buscar pa&iacute;s..."
                        loading={loadingCountries}
                        disabled={isViewMode}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">Departamento</Label>
                      <Combobox
                        options={stateOptions}
                        value={selectedStateId?.toString() || ""}
                        onValueChange={handleStateChange}
                        placeholder="Seleccionar..."
                        searchPlaceholder="Buscar departamento..."
                        loading={loadingStates}
                        disabled={isViewMode || !selectedCountryId}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">Ciudad</Label>
                      <Combobox
                        options={cityOptions}
                        value=""
                        onValueChange={handleCityChange}
                        placeholder={formData.city_name || "Seleccionar..."}
                        searchPlaceholder="Buscar ciudad..."
                        loading={loadingCities}
                        disabled={isViewMode || !selectedStateId}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">Barrio</Label>
                      <Input
                        placeholder="Barrio"
                        value={formData.neighborhood}
                        onChange={(e) => handleInputChange("neighborhood", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">Comuna</Label>
                      <Input
                        placeholder="Comuna"
                        value={formData.commune}
                        onChange={(e) => handleInputChange("commune", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">Direcci&oacute;n</Label>
                      <Input
                        placeholder="Calle 123 # 45-67, Edificio, Apto"
                        value={formData.address}
                        onChange={(e) => handleInputChange("address", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ============================================ */}
            {/* SECTION 4: Otros */}
            {/* ============================================ */}
            <Card className="border shadow-sm">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  Otros
                </h2>
              </div>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Date of Birth + Gender + Occupation + Referral */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">Fecha de nacimiento</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={isViewMode}
                            className={cn(
                              "w-full h-9 justify-start text-left font-normal text-sm",
                              !formData.birthDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.birthDate instanceof Date && !isNaN(formData.birthDate.getTime()) ? format(formData.birthDate, "d 'de' MMMM 'de' yyyy", { locale: es }) : "Seleccionar fecha"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <DatePickerBirthday
                            selected={formData.birthDate}
                            onSelect={(date) => setFormData(prev => ({ ...prev, birthDate: date || undefined }))}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            defaultMonth={formData.birthDate || new Date(2000, 0)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">G&eacute;nero</Label>
                      <Select disabled={isViewMode} value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-50">
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="femenino">Femenino</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                          <SelectItem value="prefiero_no_decir">Prefiero no decir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">Ocupaci&oacute;n / Profesi&oacute;n</Label>
                      <Input
                        placeholder="Ej: Veterinario, Ingeniero..."
                        value={formData.occupation}
                        onChange={(e) => handleInputChange("occupation", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">&iquest;C&oacute;mo nos conoci&oacute;?</Label>
                      <Select disabled={isViewMode} value={formData.referralSource} onValueChange={(value) => handleInputChange("referralSource", value)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-50">
                          <SelectItem value="redes_sociales">Redes sociales</SelectItem>
                          <SelectItem value="recomendacion">Recomendaci&oacute;n</SelectItem>
                          <SelectItem value="google">Google</SelectItem>
                          <SelectItem value="publicidad">Publicidad</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Contact preferences */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">Preferencia de contacto</Label>
                      <Select disabled={isViewMode} value={formData.contactPreference} onValueChange={(value) => handleInputChange("contactPreference", value)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-50">
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="telefono">Tel&eacute;fono</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">Horario preferido de contacto</Label>
                      <Select disabled={isViewMode} value={formData.preferredSchedule} onValueChange={(value) => handleInputChange("preferredSchedule", value)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-50">
                          <SelectItem value="manana">Ma&ntilde;ana (8am - 12pm)</SelectItem>
                          <SelectItem value="tarde">Tarde (12pm - 6pm)</SelectItem>
                          <SelectItem value="noche">Noche (6pm - 9pm)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Social Networks */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground mb-2 block">Redes sociales</Label>
                      {!isViewMode && <Popover open={showSocialOptions} onOpenChange={setShowSocialOptions}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                            <Plus className="h-3 w-3" />
                            Agregar
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1" align="end">
                          <div className="space-y-0.5">
                            {socialNetworkOptions
                              .filter(opt => !socialNetworks.some(sn => sn.type === opt.id))
                              .map((option) => (
                                <button
                                  key={option.id}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors text-left"
                                  onClick={() => {
                                    setSocialNetworks(prev => [...prev, { id: Date.now().toString(), type: option.id, value: "" }]);
                                    setShowSocialOptions(false);
                                  }}
                                >
                                  <span className="text-muted-foreground">{option.icon}</span>
                                  {option.name}
                                </button>
                              ))}
                            {socialNetworkOptions.filter(opt => !socialNetworks.some(sn => sn.type === opt.id)).length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-2">Todas las redes agregadas</p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>}
                    </div>

                    {socialNetworks.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No hay redes sociales agregadas</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {socialNetworks.map((sn) => {
                          const networkOption = socialNetworkOptions.find(opt => opt.id === sn.type);
                          return (
                            <div key={sn.id} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <span className="text-muted-foreground">{networkOption?.icon}</span>
                                  {networkOption?.name}
                                </Label>
                                {!isViewMode && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => setSocialNetworks(prev => prev.filter(s => s.id !== sn.id))}
                                  >
                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                )}
                              </div>
                              <Input
                                placeholder={networkOption?.placeholder}
                                value={sn.value}
                                onChange={(e) => setSocialNetworks(prev =>
                                  prev.map(s => s.id === sn.id ? { ...s, value: e.target.value } : s)
                                )}
                                className="h-9 text-sm"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ============================================ */}
            {/* SECTION 5: Etiquetas del Cliente */}
            {/* ============================================ */}
            <Card className="border shadow-sm">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Etiquetas del {mode === 'client' ? 'Cliente' : 'Usuario'}
                </h2>
              </div>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Selected Tags */}
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <Badge
                          key={tag}
                          className={`${getTagColor(tag)} text-white border-0 gap-1 ${isViewMode ? '' : 'pr-1'} cursor-default`}
                        >
                          {tag}
                          {!isViewMode && (
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-0.5 rounded-full p-0.5 hover:bg-card/20 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Tag Input with autocomplete */}
                  {!isViewMode && (
                    <div className="relative">
                      <Input
                        ref={tagInputRef}
                        placeholder="Escriba para buscar o agregar etiqueta..."
                        value={tagInput}
                        onChange={(e) => {
                          setTagInput(e.target.value);
                          setShowTagSuggestions(e.target.value.length > 0);
                        }}
                        onFocus={() => {
                          if (tagInput.length > 0) setShowTagSuggestions(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowTagSuggestions(false), 200);
                        }}
                        onKeyDown={handleTagKeyDown}
                        className="h-9 text-sm"
                      />
                      {showTagSuggestions && filteredSuggestions.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.label}
                              type="button"
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => addTag(suggestion.label)}
                            >
                              <span className={`h-3 w-3 rounded-full ${suggestion.color} flex-shrink-0`} />
                              {suggestion.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick add predefined tags */}
                  {!isViewMode && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-2">Etiquetas r&aacute;pidas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PREDEFINED_TAGS.filter(t => !formData.tags.includes(t.label)).map((tag) => (
                          <button
                            key={tag.label}
                            type="button"
                            onClick={() => addTag(tag.label)}
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground transition-colors"
                          >
                            <span className={`h-2 w-2 rounded-full ${tag.color} flex-shrink-0`} />
                            {tag.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View mode: show empty state for tags */}
                  {isViewMode && formData.tags.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">Sin etiquetas asignadas</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ============================================ */}
            {/* SECTION 6: Observaciones */}
            {/* ============================================ */}
            <Card className="border shadow-sm">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Observaciones
                </h2>
              </div>
              <CardContent className="p-4">
                <Textarea
                  placeholder="Notas adicionales sobre el cliente..."
                  value={formData.observations}
                  onChange={(e) => handleInputChange("observations", e.target.value)}
                  className="min-h-[80px] text-sm"
                />
              </CardContent>
            </Card>

            {/* ============================================ */}
            {/* SECTION 7: Asignaci\u00F3n (User mode only) */}
            {/* ============================================ */}
            {mode === 'user' && (
              <Card className="border shadow-sm">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <h2 className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Asignaci&oacute;n Empresarial
                  </h2>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Empresa <span className="text-destructive">*</span>
                      </Label>
                      {isSuperAdmin ? (
                        <Combobox
                          disabled={isViewMode}
                          value={formData.company_id}
                          onValueChange={(value) => {
                            setFormData(prev => ({ ...prev, company_id: value, branch_id: 'none' }));
                          }}
                          placeholder="Seleccionar empresa..."
                          searchPlaceholder="Buscar empresa..."
                          emptyText="No se encontraron empresas"
                          className="h-9 text-sm"
                          options={companies.map((company) => ({
                            value: company.id.toString(),
                            label: company.name,
                          }))}
                        />
                      ) : (
                        <Input
                          value={companies[0]?.name || 'Mi Empresa'}
                          disabled
                          className="h-9 text-sm bg-muted"
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">Sucursal</Label>
                      <Combobox
                        disabled={isViewMode}
                        value={formData.branch_id}
                        onValueChange={(value) => handleInputChange("branch_id", value)}
                        placeholder="Seleccionar sucursal..."
                        searchPlaceholder="Buscar sucursal..."
                        emptyText="No se encontraron sucursales"
                        className="h-9 text-sm"
                        options={[
                          { value: 'none', label: 'Sin asignar' },
                          ...filteredBranches.map((branch) => ({
                            value: branch.id.toString(),
                            label: branch.name,
                          })),
                        ]}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Rol <span className="text-destructive">*</span>
                      </Label>
                      <Combobox
                        disabled={isViewMode}
                        value={formData.role_id}
                        onValueChange={(value) => handleInputChange("role_id", value)}
                        placeholder="Seleccionar rol..."
                        searchPlaceholder="Buscar rol..."
                        emptyText="No se encontraron roles"
                        className="h-9 text-sm"
                        options={filteredRoles.map((role) => ({
                          value: role.id.toString(),
                          label: role.name,
                        }))}
                      />
                    </div>
                    {!isViewMode && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          Contraseña {isCreateMode && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                          type="password"
                          placeholder={isEditMode ? "Dejar vacío para no cambiar" : "Mínimo 8 caracteres"}
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          className={`h-9 text-sm ${
                            attemptedSubmit && isCreateMode && !formData.password
                              ? "ring-2 ring-destructive"
                              : formData.password && formData.password.length < 8
                              ? "ring-2 ring-amber-500"
                              : formData.password && formData.password.length >= 8
                              ? "ring-2 ring-green-500"
                              : ""
                          }`}
                        />
                        {formData.password && formData.password.length < 8 && (
                          <p className="text-[10px] text-amber-500">Mínimo 8 caracteres</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ============================================ */}
            {/* SECTION 8: Firma Digital (User mode only) */}
            {/* ============================================ */}
            {mode === 'user' && !isViewMode && (
              <Card className="border shadow-sm">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <h2 className="text-sm font-medium flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-muted-foreground" />
                    Firma Digital
                  </h2>
                </div>
                <CardContent className="p-4">
                  {showSignaturePad ? (
                    <SignaturePadCanvas
                      onSave={(dataUrl) => {
                        setSignatureData(dataUrl);
                        setSignaturePreview(dataUrl);
                        setShowSignaturePad(false);
                      }}
                      onCancel={() => setShowSignaturePad(false)}
                      saving={signatureUploading}
                    />
                  ) : (
                    <>
                      {signaturePreview ? (
                        <div className="space-y-3">
                          <div className="border rounded-lg p-3 bg-card">
                            <img src={signaturePreview} alt="Firma digital" className="max-h-24 mx-auto" />
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowSignaturePad(true)}>
                              <PenTool className="h-3.5 w-3.5" /> Dibujar nueva
                            </Button>
                            <input
                              ref={signatureInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) {
                                  toast({ title: "Error", description: "La imagen no debe superar 5MB", variant: "destructive" });
                                  return;
                                }
                                setSignatureData(file);
                                setSignaturePreview(URL.createObjectURL(file));
                                if (signatureInputRef.current) signatureInputRef.current.value = "";
                              }}
                            />
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => signatureInputRef.current?.click()}>
                              <Upload className="h-3.5 w-3.5" /> Subir imagen
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-destructive hover:text-destructive"
                              onClick={() => { setSignatureData(null); setSignaturePreview(null); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="border rounded-lg p-6 bg-muted/20 flex flex-col items-center gap-2">
                            <PenTool className="h-8 w-8 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">Sin firma configurada</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowSignaturePad(true)}>
                              <PenTool className="h-3.5 w-3.5" /> Dibujar firma
                            </Button>
                            <input
                              ref={signatureInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) {
                                  toast({ title: "Error", description: "La imagen no debe superar 5MB", variant: "destructive" });
                                  return;
                                }
                                setSignatureData(file);
                                setSignaturePreview(URL.createObjectURL(file));
                                if (signatureInputRef.current) signatureInputRef.current.value = "";
                              }}
                            />
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => signatureInputRef.current?.click()}>
                              <Upload className="h-3.5 w-3.5" /> Subir imagen
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground">Dibuja con el mouse o sube una imagen de firma. JPG, PNG o WebP. Max 5MB.</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Footer Actions */}
            {!isViewMode && (
              <div className="flex justify-end gap-3 pb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.visit(mode === 'client' ? '/admin/clients' : '/admin/users')}
                  disabled={formLoading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} size="sm" className="gap-2" disabled={formLoading}>
                  {formLoading ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {mode === 'client' ? 'Guardar Cliente' : 'Guardar Usuario'}
                </Button>
              </div>
            )}
          </fieldset>
        </div>
      </div>
    </AppLayout>
  );
}
