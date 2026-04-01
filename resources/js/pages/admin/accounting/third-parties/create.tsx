import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
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
import { thirdPartiesApi, clientsApi, suppliersApi } from "@/lib/api";
import type { ThirdParty } from "@/lib/api";
import type { SharedData } from "@/types";
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
  CalendarIcon,
} from "lucide-react";
import { GetCountries, GetState, GetCity } from "react-country-state-city";

// Country codes for WhatsApp
const countryCodes = [
  { code: "+57", country: "Colombia", flag: "\u{1F1E8}\u{1F1F4}", maxLength: 10 },
  { code: "+593", country: "Ecuador", flag: "\u{1F1EA}\u{1F1E8}", maxLength: 9 },
  { code: "+51", country: "Perú", flag: "\u{1F1F5}\u{1F1EA}", maxLength: 9 },
  { code: "+58", country: "Venezuela", flag: "\u{1F1FB}\u{1F1EA}", maxLength: 10 },
  { code: "+507", country: "Panamá", flag: "\u{1F1F5}\u{1F1E6}", maxLength: 8 },
  { code: "+1", country: "Estados Unidos", flag: "\u{1F1FA}\u{1F1F8}", maxLength: 10 },
  { code: "+52", country: "México", flag: "\u{1F1F2}\u{1F1FD}", maxLength: 10 },
  { code: "+34", country: "España", flag: "\u{1F1EA}\u{1F1F8}", maxLength: 9 },
];

// Document types
const DOCUMENT_TYPES: ComboboxOption[] = [
  { value: "CC", label: "CC - Cédula de ciudadanía" },
  { value: "CE", label: "CE - Cédula de extranjería" },
  { value: "NIT", label: "NIT - Número de identificación tributaria" },
  { value: "TI", label: "TI - Tarjeta de identidad" },
  { value: "PP", label: "PP - Pasaporte" },
];

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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

// Entity type for viewing clients/suppliers/third-parties
type EntitySource = 'tercero' | 'cliente' | 'proveedor';

export default function CreateThirdPartyPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const pageMode = (urlParams.get('mode') as 'create' | 'edit' | 'view') || 'create';
  const entityId = urlParams.get('entityId') ? parseInt(urlParams.get('entityId')!) : undefined;
  const entitySource = (urlParams.get('source') as EntitySource) || 'tercero';

  const { auth } = usePage<SharedData>().props;
  const { toast } = useToast();

  const isViewMode = pageMode === 'view';
  const isEditMode = pageMode === 'edit';
  const isCreateMode = pageMode === 'create';

  const [dataLoading, setDataLoading] = useState(!!entityId);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [documentTouched, setDocumentTouched] = useState(false);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Country/State/City states
  const [locationCountries, setLocationCountries] = useState<CountryData[]>([]);
  const [locationStates, setLocationStates] = useState<StateData[]>([]);
  const [locationCities, setLocationCities] = useState<CityData[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);

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
    paymentTerms: "",
    birthDate: undefined as Date | undefined,
    gender: "",
    occupation: "",
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

  // Validation functions
  const validateDocumentNumber = (docType: string, docNumber: string): { valid: boolean; message?: string } => {
    if (!docNumber) return { valid: false, message: "Requerido" };
    const cleanNumber = docNumber.replace(/\D/g, '');
    switch (docType) {
      case "CC":
        if (cleanNumber.length < 6 || cleanNumber.length > 10) return { valid: false, message: "CC debe tener entre 6 y 10 dígitos" };
        break;
      case "CE":
        if (cleanNumber.length < 6 || cleanNumber.length > 12) return { valid: false, message: "CE debe tener entre 6 y 12 caracteres" };
        break;
      case "NIT":
        if (cleanNumber.length < 9 || cleanNumber.length > 10) return { valid: false, message: "NIT debe tener 9-10 dígitos" };
        break;
      case "TI":
        if (cleanNumber.length < 10 || cleanNumber.length > 11) return { valid: false, message: "TI debe tener 10-11 dígitos" };
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
    if (cleanPhone.length < 7 || cleanPhone.length > 15) return { valid: false, message: "Teléfono debe tener 7-15 dígitos" };
    return { valid: true };
  };

  const validateName = (name: string): { valid: boolean; message?: string } => {
    if (!name.trim()) return { valid: false, message: "Requerido" };
    if (name.trim().length < 2) return { valid: false, message: "Mínimo 2 caracteres" };
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(name.trim())) {
      return { valid: false, message: "Solo letras permitidas" };
    }
    return { valid: true };
  };

  const validateBusinessName = (name: string): { valid: boolean; message?: string } => {
    if (formData.documentType !== "NIT") return { valid: true };
    if (!name.trim()) return { valid: false, message: "Razón social requerida" };
    if (name.trim().length < 3) return { valid: false, message: "Mínimo 3 caracteres" };
    return { valid: true };
  };

  const validateEmail = (email: string): { valid: boolean; message?: string } => {
    if (!email) return { valid: true };
    if (!emailRegex.test(email)) return { valid: false, message: "Formato de correo inválido" };
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return { valid: false, message: "Dominio no válido" };
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

  // Handle autocomplete (stub)
  const handleAutoComplete = () => {
    if (!formData.documentNumber || !formData.documentType) {
      toast({
        title: "Datos incompletos",
        description: "Ingrese tipo y número de documento para autocompletar",
        variant: "destructive",
      });
      return;
    }

    setIsAutoCompleting(true);
    setTimeout(() => {
      setIsAutoCompleting(false);
      toast({
        title: "Sin resultados",
        description: "La funcionalidad de autocompletar estará disponible próximamente",
      });
    }, 1500);
  };

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

  // Load entity data for edit/view mode
  useEffect(() => {
    if (!entityId || isCreateMode) return;

    const loadEntityData = async () => {
      setDataLoading(true);
      try {
        let entity: any;

        if (entitySource === 'cliente') {
          entity = await clientsApi.getById(entityId);
        } else if (entitySource === 'proveedor') {
          entity = await suppliersApi.getById(entityId);
        } else {
          entity = await thirdPartiesApi.getById(entityId);
        }

        const isNIT = (entity.document_type || entity.tax_id_type) === 'NIT';

        setFormData(prev => ({
          ...prev,
          documentType: entity.document_type || entity.tax_id_type || '',
          documentNumber: entity.document_id || entity.tax_id || '',
          firstName: entity.first_name || (!isNIT && entity.name ? entity.name.split(' ').slice(0, -1).join(' ') : ''),
          lastName: entity.last_name || (!isNIT && entity.name ? entity.name.split(' ').slice(-1)[0] : ''),
          businessName: entity.business_name || (isNIT ? entity.name || '' : ''),
          legalRepresentative: entity.legal_representative || entity.contact_name || '',
          email: entity.email || entity.contact_email || '',
          phone: entity.phone || entity.contact_phone || '',
          whatsappCountry: entity.whatsapp_country || '+57',
          whatsappNumber: entity.whatsapp_number || '',
          address: entity.address || '',
          country_code: entity.country_code || '',
          country_name: entity.country_name || '',
          state_code: entity.state_code || '',
          state_name: entity.state_name || '',
          city_name: entity.city_name || entity.city || '',
          neighborhood: entity.neighborhood || '',
          commune: entity.commune || '',
          observations: entity.observations || entity.notes || '',
          paymentTerms: entity.payment_terms || '',
          birthDate: entity.birth_date ? (() => {
            const dateStr = String(entity.birth_date);
            const dateOnly = dateStr.split('T')[0];
            const d = new Date(dateOnly + 'T00:00:00');
            return isNaN(d.getTime()) ? undefined : d;
          })() : undefined,
          gender: entity.gender || '',
          occupation: entity.occupation || '',
        }));

        // Load location cascading data
        const countryCode = entity.country_code;
        if (countryCode) {
          try {
            const allCountries = await GetCountries();
            const country = allCountries.find((c: CountryData) => c.iso2 === countryCode);
            if (country) {
              setSelectedCountryId(country.id);
              const statesData = await GetState(country.id);
              setLocationStates(statesData);

              const stateCode = entity.state_code;
              if (stateCode) {
                const state = statesData.find((s: StateData) => s.state_code === stateCode);
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
        toast({ title: 'Error', description: 'No se pudo cargar la información del tercero', variant: 'destructive' });
        router.visit('/admin/accounting/third-parties');
      } finally {
        setDataLoading(false);
      }
    };

    loadEntityData();
  }, [entityId, isCreateMode]);

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

    // View-only entities (client/supplier) cannot be submitted
    if (entitySource !== 'tercero') return;

    if (!formData.documentType) {
      toast({ title: "Campo requerido", description: "Por favor seleccione el tipo de documento", variant: "destructive" });
      return;
    }

    if (!documentValidation.valid) {
      toast({ title: "Número de documento inválido", description: documentValidation.message, variant: "destructive" });
      return;
    }

    if (formData.documentType === "NIT") {
      if (!businessNameValidation.valid) {
        toast({ title: "Razón social inválida", description: businessNameValidation.message, variant: "destructive" });
        return;
      }
    } else {
      if (!firstNameValidation.valid) {
        toast({ title: "Nombres inválidos", description: firstNameValidation.message, variant: "destructive" });
        return;
      }
      if (!lastNameValidation.valid) {
        toast({ title: "Apellidos inválidos", description: lastNameValidation.message, variant: "destructive" });
        return;
      }
    }

    if (formData.email && !emailValidation.valid) {
      toast({ title: "Correo electrónico inválido", description: emailValidation.message, variant: "destructive" });
      return;
    }

    if (formData.phone && !phoneValidation.valid) {
      toast({ title: "Teléfono inválido", description: phoneValidation.message, variant: "destructive" });
      return;
    }

    if (formData.whatsappNumber && !validateWhatsApp(formData.whatsappNumber)) {
      const cd = getSelectedCountryData();
      toast({ title: "Número de WhatsApp inválido", description: `El número debe tener ${cd.maxLength} dígitos para ${cd.country}`, variant: "destructive" });
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
        email: formData.email || null,
        document_id: formData.documentNumber,
        document_type: formData.documentType,
        phone: formData.phone || null,
        whatsapp_country: formData.whatsappNumber ? formData.whatsappCountry : null,
        whatsapp_number: formData.whatsappNumber || null,
        address: formData.address || null,
        country_code: formData.country_code || null,
        country_name: formData.country_name || null,
        state_code: formData.state_code || null,
        state_name: formData.state_name || null,
        city_name: formData.city_name || null,
        neighborhood: formData.neighborhood || null,
        commune: formData.commune || null,
        birth_date: formData.birthDate ? format(formData.birthDate, "yyyy-MM-dd") : null,
        gender: formData.gender || null,
        occupation: formData.occupation || null,
        payment_terms: formData.paymentTerms || null,
        observations: formData.observations || null,
      };

      if (isEditMode && entityId) {
        await thirdPartiesApi.update(entityId, data);
        toast({ title: "Tercero actualizado", description: `${name} fue actualizado exitosamente` });
      } else {
        await thirdPartiesApi.create(data);
        toast({ title: "Tercero creado", description: `${name} fue creado exitosamente` });
      }

      router.visit('/admin/accounting/third-parties');
    } catch (error: any) {
      console.error('Error saving third party:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Error al guardar';
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const entityLabel = entitySource === 'cliente' ? 'Cliente' : entitySource === 'proveedor' ? 'Proveedor' : 'Tercero';

  const pageTitle = useMemo(() => {
    if (isViewMode) return `Ver ${entityLabel}`;
    if (isEditMode) return `Editar ${entityLabel}`;
    return `Nuevo Tercero`;
  }, [isViewMode, isEditMode, entityLabel]);

  const pageSubtitle = useMemo(() => {
    const label = entityLabel.toLowerCase();
    if (isViewMode) return `Información del ${label}`;
    if (isEditMode) return `Modifique la información del ${label}`;
    return `Complete la información del tercero`;
  }, [isViewMode, isEditMode, entityLabel]);

  const HeaderIcon = isViewMode ? Eye : isEditMode ? UserPen : UserPlus;

  // For client/supplier in view mode, only allow viewing
  const isReadOnly = isViewMode || (entitySource !== 'tercero' && !isCreateMode);

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
                  onClick={() => router.visit('/admin/accounting/third-parties')}
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
              {!isReadOnly && entitySource === 'tercero' && (
                <Button onClick={handleSubmit} size="sm" className="gap-1.5 shadow-lg h-8 px-3 text-xs sm:text-sm" disabled={formLoading}>
                  {formLoading ? <Spinner className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  <span>Guardar</span>
                </Button>
              )}
              {isViewMode && entitySource === 'tercero' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 px-3 text-xs sm:text-sm"
                  onClick={() => router.visit(`/admin/accounting/third-parties/create?mode=edit&entityId=${entityId}`)}
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
          <fieldset disabled={isReadOnly} className="space-y-4 m-0 p-0 border-0 min-w-0">

            {/* ============================================ */}
            {/* SECTION 1: Información Principal */}
            {/* ============================================ */}
            <Card className="border shadow-sm">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  Información Principal
                </h2>
              </div>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Row 1: Document Type + Document Number + Autocomplete */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Tipo de documento <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        disabled={isReadOnly}
                        value={formData.documentType}
                        onValueChange={(value) => handleInputChange("documentType", value)}
                      >
                        <SelectTrigger className={`h-9 text-sm ${isFieldInvalid(formData.documentType) ? "ring-2 ring-destructive" : ""}`}>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-50">
                          <SelectItem value="CC">CC - Cédula de ciudadanía</SelectItem>
                          <SelectItem value="CE">CE - Cédula de extranjería</SelectItem>
                          <SelectItem value="NIT">NIT - Número de identificación tributaria</SelectItem>
                          <SelectItem value="TI">TI - Tarjeta de identidad</SelectItem>
                          <SelectItem value="PP">PP - Pasaporte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                      <Label className="text-xs text-muted-foreground">
                        Número de identificación <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder="Número de documento"
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
                        {!isReadOnly && (
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
                        <Label className="text-xs text-muted-foreground">
                          Razón social <span className="text-destructive">*</span>
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
                        <Label className="text-xs text-muted-foreground">Representante legal</Label>
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
                        <Label className="text-xs text-muted-foreground">
                          Nombres <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            placeholder="Nombres del tercero"
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
                        <Label className="text-xs text-muted-foreground">
                          Apellidos <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            placeholder="Apellidos del tercero"
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
            {/* SECTION 2: Información de Contacto */}
            {/* ============================================ */}
            <Card className="border shadow-sm">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Información de Contacto
                </h2>
              </div>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Correo electrónico</Label>
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
                    <Label className="text-xs text-muted-foreground">Teléfono móvil</Label>
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
                    <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                    <div className="flex gap-1">
                      <Select
                        disabled={isReadOnly}
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
                        placeholder={`${countryData.maxLength} dígitos`}
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
                      Seleccione país y escriba el número
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ============================================ */}
            {/* SECTION 3: Información de Ubicación */}
            {/* ============================================ */}
            <Card className="border shadow-sm">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Información de Ubicación
                </h2>
              </div>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">País</Label>
                      <Combobox
                        options={countryOptions}
                        value={selectedCountryId?.toString() || ""}
                        onValueChange={handleCountryChange}
                        placeholder="Seleccionar..."
                        searchPlaceholder="Buscar país..."
                        loading={loadingCountries}
                        disabled={isReadOnly}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Departamento</Label>
                      <Combobox
                        options={stateOptions}
                        value={selectedStateId?.toString() || ""}
                        onValueChange={handleStateChange}
                        placeholder="Seleccionar..."
                        searchPlaceholder="Buscar departamento..."
                        loading={loadingStates}
                        disabled={isReadOnly || !selectedCountryId}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Ciudad</Label>
                      <Combobox
                        options={cityOptions}
                        value=""
                        onValueChange={handleCityChange}
                        placeholder={formData.city_name || "Seleccionar..."}
                        searchPlaceholder="Buscar ciudad..."
                        loading={loadingCities}
                        disabled={isReadOnly || !selectedStateId}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Barrio</Label>
                      <Input
                        placeholder="Barrio"
                        value={formData.neighborhood}
                        onChange={(e) => handleInputChange("neighborhood", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Comuna</Label>
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
                      <Label className="text-xs text-muted-foreground">Dirección</Label>
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
                  {/* Date of Birth + Gender + Occupation + Payment Terms */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Fecha de nacimiento</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={isReadOnly}
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
                          <Calendar
                            mode="single"
                            selected={formData.birthDate}
                            onSelect={(date) => setFormData(prev => ({ ...prev, birthDate: date || undefined }))}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            defaultMonth={formData.birthDate || new Date(2000, 0)}
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Género</Label>
                      <Select disabled={isReadOnly} value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
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
                      <Label className="text-xs text-muted-foreground">Ocupación / Profesión</Label>
                      <Input
                        placeholder="Ej: Veterinario, Ingeniero..."
                        value={formData.occupation}
                        onChange={(e) => handleInputChange("occupation", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Condiciones de pago</Label>
                      <Input
                        placeholder="Ej: 30 días, contado..."
                        value={formData.paymentTerms}
                        onChange={(e) => handleInputChange("paymentTerms", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ============================================ */}
            {/* SECTION 5: Observaciones */}
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
                  placeholder="Notas adicionales sobre el tercero..."
                  value={formData.observations}
                  onChange={(e) => handleInputChange("observations", e.target.value)}
                  className="min-h-[80px] text-sm"
                />
              </CardContent>
            </Card>

          </fieldset>
        </div>
      </div>
    </AppLayout>
  );
}
