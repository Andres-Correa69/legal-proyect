import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Head, usePage, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import InputError from "@/components/input-error";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn, formatCurrency } from "@/lib/utils";
import { clientsApi, productsApi, usersApi, salesApi, servicesApi, cashRegistersApi, paymentMethodsApi, electronicInvoicingApi, priceListsApi, productCategoriesApi, type Product as InventoryProduct, type Service, type CreateSaleData, type CreateDraftData, type Sale, type CashRegister, type PaymentMethod, type PriceList, type PriceListItemForSale, type ProductCategory } from "@/lib/api";
import type { User as ApiUser } from "@/types";
import {
  Save,
  CalendarIcon,
  FileText,
  User,
  Building2,
  ShoppingCart,
  DollarSign,
  CreditCard,
  Plus,
  Trash2,
  Calculator,
  Search,
  Check,
  FileOutput,
  Wallet,
  CircleDollarSign,
  ChevronDown,
  AlertCircle,
  ChevronRight,
  Eye,
  X,
  Percent,
  Receipt,
  Users,
  MapPin,
  Wrench,
  Package,
  LogOut,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { GetCountries, GetState, GetCity } from "react-country-state-city";
import { toast } from "@/hooks/use-toast";
import type { SharedData } from "@/types";

// Interfaces
type ItemType = 'product' | 'service';

interface InvoiceItem {
  id: string;
  itemType: ItemType; // Tipo de item: producto o servicio
  productId?: number; // ID real del producto en la base de datos
  serviceId?: number; // ID real del servicio en la base de datos
  description: string;
  quantity: number;
  unitPrice: number;
  originalPrice?: number;
  taxRate: number | null; // null = Excluido (sin IVA)
  discount: number;
  discountNote?: string | null; // ej: "Lista: Mayorista"
  isFromInventory?: boolean;
  customTaxRate?: boolean; // true when using "Otro" option
  maxStock?: number; // Stock disponible para productos con inventario
  isTrackable?: boolean; // Si el producto tiene control de inventario
  unit?: string; // Unidad de medida (para servicios)
  parentServiceItemId?: string; // ID del item servicio padre (para productos auto-agregados)
  baseQuantity?: number; // Cantidad base por unidad de servicio (para escalar con la cantidad del servicio)
}

interface Payment {
  id: string;
  date: Date;
  cash_register_id: number;
  cash_register_name: string;
  payment_method_id: number;
  payment_method_name: string;
  amount: number;
}

interface Retention {
  id: string;
  type: string;
  name: string;
  percentage: number;
  value: number;
}

// Type alias para clientes (usan el mismo tipo User de @/types)
type Client = ApiUser;

// Tipos de documento disponibles
const DOCUMENT_TYPES: ComboboxOption[] = [
  { value: "CC", label: "Cedula de Ciudadania" },
  { value: "CE", label: "Cedula de Extranjeria" },
  { value: "TI", label: "Tarjeta de Identidad" },
  { value: "NIT", label: "NIT" },
  { value: "PAS", label: "Pasaporte" },
  { value: "RC", label: "Registro Civil" },
  { value: "DNI", label: "Documento Nacional de Identidad" },
  { value: "RUT", label: "RUT" },
  { value: "CURP", label: "CURP" },
  { value: "RUC", label: "RUC" },
  { value: "RFC", label: "RFC" },
  { value: "OTHER", label: "Otro" },
];

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

interface Props {
  invoiceNumber: string;
  draftId?: number | null;
}

// Tipos de retenciones
const RETENTION_TYPES = [
  { type: "retefuente", name: "Retención en la fuente", percentage: 4 },
  { type: "reteiva", name: "Reteiva", percentage: 15 },
  { type: "reteica", name: "Reteica", percentage: 0.414 },
];

// Datos de la empresa se obtienen de props.auth.user.company

// Función de fuzzy search para buscar similitudes incluso con errores de escritura
const fuzzyMatch = (text: string, search: string): boolean => {
  if (!search) return true;

  const searchLower = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const textLower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Match exacto primero
  if (textLower.includes(searchLower)) return true;

  // Fuzzy matching: permitir hasta 2 errores de escritura
  const words = searchLower.split(/\s+/).filter(w => w.length > 0);

  return words.every(word => {
    // Si la palabra es corta (< 3 chars), requerir match más estricto
    if (word.length < 3) {
      return textLower.includes(word);
    }

    // Para palabras más largas, usar distancia de Levenshtein simplificada
    const textWords = textLower.split(/\s+/);
    return textWords.some(textWord => {
      // Match exacto de substring
      if (textWord.includes(word) || word.includes(textWord)) return true;

      // Match por similitud (permitir hasta 2 errores)
      const distance = levenshteinDistance(word, textWord);
      const maxDistance = Math.min(2, Math.floor(word.length / 3));
      return distance <= maxDistance;
    });
  });
};

// Distancia de Levenshtein para comparar similitud entre strings
const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
};

// Colores por sección
const sectionColors = {
  "datos-comprador": {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: "text-emerald-600",
    active: "bg-emerald-500/100 text-white shadow-emerald-500/20",
    hasValue: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  },
  items: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    icon: "text-orange-600",
    active: "bg-orange-500/100 text-white shadow-orange-500/20",
    hasValue: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  },
  totales: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: "text-blue-600",
    active: "bg-blue-500/100 text-white shadow-blue-500/20",
    hasValue: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  },
  pagos: {
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    icon: "text-teal-600",
    active: "bg-teal-500/100 text-white shadow-teal-500/20",
    hasValue: "bg-teal-500/15 text-teal-700 border-teal-500/30",
  },
  "otras-opciones": {
    bg: "bg-muted/50",
    border: "border-border",
    icon: "text-muted-foreground",
    active: "bg-muted text-foreground shadow-sm",
    hasValue: "bg-muted text-foreground border-border",
  },
};

export default function SellIndex({ invoiceNumber, draftId: initialDraftId }: Props) {
  const { props } = usePage<SharedData>();
  const company = props.auth.user.company;

  // Referencias para scroll
  const datosCompradorRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const totalesRef = useRef<HTMLDivElement>(null);
  const pagosRef = useRef<HTMLDivElement>(null);
  const otrasOpcionesRef = useRef<HTMLDivElement>(null);
  const searchProductInputRef = useRef<HTMLInputElement>(null);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  // Estados principales
  const [activeSection, setActiveSection] = useState("datos-comprador");
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [searchProduct, setSearchProduct] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [searchClient, setSearchClient] = useState("");
  const [showClientList, setShowClientList] = useState(false);
  const [showCommissions, setShowCommissions] = useState(false);
  const [showRetentions, setShowRetentions] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Estados de clientes
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [clientFormErrors, setClientFormErrors] = useState<Record<string, string>>({});

  // Estados para historial de ventas del cliente
  const [clientSales, setClientSales] = useState<Sale[]>([]);
  const [loadingClientSales, setLoadingClientSales] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [showClientHistory, setShowClientHistory] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    email: "",
    document_id: "",
    document_type: "",
    phone: "",
    address: "",
    birth_date: "",
    country_code: "",
    country_name: "",
    state_code: "",
    state_name: "",
    city_name: "",
  });

  // Country/State/City states
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [states, setStates] = useState<StateData[]>([]);
  const [cities, setCities] = useState<CityData[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);

  // Estados de productos del inventario
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Estado para confirmación de eliminación de item
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Estados para borradores y navegación
  const [draftId, setDraftId] = useState<number | null>(initialDraftId || null);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(!!initialDraftId);
  const navigationAllowedRef = useRef(false);

  // Estados de servicios
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Estados para creación rápida de producto/servicio
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState<"product" | "service">("product");
  const [quickCreateLoading, setQuickCreateLoading] = useState(false);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [qcName, setQcName] = useState("");
  const [qcCategoryId, setQcCategoryId] = useState("");
  const [qcSalePrice, setQcSalePrice] = useState<number>(0);
  const [qcPurchasePrice, setQcPurchasePrice] = useState<number>(0);
  const [qcTaxRate, setQcTaxRate] = useState<string>("null");
  const [qcServiceCategory, setQcServiceCategory] = useState("general");
  const [qcServicePrice, setQcServicePrice] = useState<number>(0);
  const [qcStock, setQcStock] = useState<number>(0);
  const [qcIsTrackable, setQcIsTrackable] = useState(false);
  const [qcNextSku, setQcNextSku] = useState("");
  const [qcErrors, setQcErrors] = useState<Record<string, string>>({});

  // Estados de empleados/vendedores
  const [employees, setEmployees] = useState<ApiUser[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Convert countries to ComboboxOption format
  const countryOptions: ComboboxOption[] = useMemo(() => {
    return countries.map(country => ({
      value: country.id.toString(),
      label: country.name,
    }));
  }, [countries]);

  // Convert states to ComboboxOption format
  const stateOptions: ComboboxOption[] = useMemo(() => {
    return states.map(state => ({
      value: state.id.toString(),
      label: state.name,
    }));
  }, [states]);

  // Convert cities to ComboboxOption format
  const cityOptions: ComboboxOption[] = useMemo(() => {
    return cities.map(city => ({
      value: city.id.toString(),
      label: city.name,
    }));
  }, [cities]);

  // Convert employees to ComboboxOption format
  const employeeOptions: ComboboxOption[] = useMemo(() => {
    return employees.map(employee => ({
      value: employee.id.toString(),
      label: employee.name,
    }));
  }, [employees]);

  // Fuzzy filter function for Combobox (returns 1 for match, 0 for no match)
  const fuzzyFilter = (value: string, search: string): number => {
    return fuzzyMatch(value, search) ? 1 : 0;
  };

  // Estados de datos
  const [availablePriceLists, setAvailablePriceLists] = useState<PriceList[]>([]);
  const [selectedPriceListId, setSelectedPriceListId] = useState<string>("");
  const [priceListItemsMap, setPriceListItemsMap] = useState<PriceListItemForSale[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [retentions, setRetentions] = useState<Retention[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [formData, setFormData] = useState({
    seller: "",
    commissionPercentage: 0,
    commissionValue: 0,
  });

  // Cargar países
  const loadCountries = async () => {
    setLoadingCountries(true);
    try {
      const result = await GetCountries();
      setCountries(result);
    } catch (error) {
      console.error("Error loading countries:", error);
    } finally {
      setLoadingCountries(false);
    }
  };

  // Cargar cajas registradoras
  const loadCashRegisters = async () => {
    try {
      const registers = await cashRegistersApi.getAll();
      setCashRegisters(registers.filter(r => r.is_active));
    } catch (error) {
      console.error("Error loading cash registers:", error);
    }
  };

  // Cargar métodos de pago
  const loadPaymentMethods = async () => {
    try {
      const methods = await paymentMethodsApi.getAll();
      setPaymentMethods(methods.filter(m => m.is_active));
    } catch (error) {
      console.error("Error loading payment methods:", error);
    }
  };

  // Cargar productos del inventario
  const fetchProducts = async (search?: string) => {
    setLoadingProducts(true);
    try {
      const products = await productsApi.getAll({ search, is_active: true } as any);
      setInventoryProducts(products);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Cargar servicios
  const fetchServices = async (search?: string) => {
    setLoadingServices(true);
    try {
      const servicesList = await servicesApi.getAll({ search, is_active: true });
      setServices(servicesList);
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
      setLoadingServices(false);
    }
  };

  // Cargar empleados/vendedores
  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const users = await usersApi.getAll();
      // Filtrar solo usuarios activos
      setEmployees(users.filter((u) => u.is_active !== false));
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Manejar cambio de país
  const handleCountryChange = async (countryIdStr: string) => {
    const countryId = parseInt(countryIdStr);
    const country = countries.find((c) => c.id === countryId);
    if (!country) return;

    setSelectedCountryId(countryId);
    setSelectedStateId(null);
    setStates([]);
    setCities([]);

    setNewClientForm((prev) => ({
      ...prev,
      country_code: country.iso2,
      country_name: country.name,
      state_code: "",
      state_name: "",
      city_name: "",
    }));

    setLoadingStates(true);
    try {
      const result = await GetState(countryId);
      setStates(result);
    } catch (error) {
      console.error("Error loading states:", error);
    } finally {
      setLoadingStates(false);
    }
  };

  // Manejar cambio de estado/departamento
  const handleStateChange = async (stateIdStr: string) => {
    const stateId = parseInt(stateIdStr);
    const state = states.find((s) => s.id === stateId);
    if (!state || !selectedCountryId) return;

    setSelectedStateId(stateId);
    setCities([]);

    setNewClientForm((prev) => ({
      ...prev,
      state_code: state.state_code,
      state_name: state.name,
      city_name: "",
    }));

    setLoadingCities(true);
    try {
      const result = await GetCity(selectedCountryId, stateId);
      setCities(result);
    } catch (error) {
      console.error("Error loading cities:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  // Manejar cambio de ciudad
  const handleCityChange = (cityIdStr: string) => {
    const cityId = parseInt(cityIdStr);
    const city = cities.find((c) => c.id === cityId);
    if (!city) return;

    setNewClientForm((prev) => ({
      ...prev,
      city_name: city.name,
    }));
  };

  // Cargar clientes desde la API usando clientsApi
  const fetchClients = async (search?: string) => {
    setLoadingClients(true);
    try {
      const allClients = await clientsApi.getAll();
      if (search) {
        const term = search.toLowerCase();
        const filtered = allClients.filter(
          (client) =>
            client.name.toLowerCase().includes(term) ||
            client.email.toLowerCase().includes(term) ||
            client.document_id?.toLowerCase().includes(term) ||
            client.phone?.toLowerCase().includes(term)
        );
        setClients(filtered.slice(0, 20) as Client[]);
      } else {
        setClients(allClients.slice(0, 20) as Client[]);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoadingClients(false);
    }
  };

  // Crear nuevo cliente usando clientsApi
  const createClient = async () => {
    if (!newClientForm.name || !newClientForm.email) {
      setClientFormErrors({ general: "Nombre y email son requeridos" });
      return;
    }

    setSavingClient(true);
    setClientFormErrors({});
    try {
      const data: any = {
        name: newClientForm.name,
        email: newClientForm.email,
        document_id: newClientForm.document_id || null,
        document_type: newClientForm.document_type || null,
        phone: newClientForm.phone || null,
        address: newClientForm.address || null,
        birth_date: newClientForm.birth_date || null,
        country_code: newClientForm.country_code || null,
        country_name: newClientForm.country_name || null,
        state_code: newClientForm.state_code || null,
        state_name: newClientForm.state_name || null,
        city_name: newClientForm.city_name || null,
      };

      const newClient = await clientsApi.create(data);
      setClients([newClient as Client, ...clients]);
      setSelectedClient(newClient as Client);
      setSearchClient(newClient.name);
      setShowNewClientDialog(false);
      resetClientForm();
    } catch (error: any) {
      console.error("Error creating client:", error);
      if (error.errors) {
        const formattedErrors: Record<string, string> = {};
        Object.keys(error.errors).forEach((key) => {
          formattedErrors[key] = Array.isArray(error.errors[key])
            ? error.errors[key][0]
            : error.errors[key];
        });
        setClientFormErrors(formattedErrors);
      } else {
        setClientFormErrors({ general: error.message || "Error al crear cliente" });
      }
    } finally {
      setSavingClient(false);
    }
  };

  // Resetear formulario de cliente
  const resetClientForm = () => {
    setNewClientForm({
      name: "",
      email: "",
      document_id: "",
      document_type: "",
      phone: "",
      address: "",
      birth_date: "",
      country_code: "",
      country_name: "",
      state_code: "",
      state_name: "",
      city_name: "",
    });
    setClientFormErrors({});
    setSelectedCountryId(null);
    setSelectedStateId(null);
    setStates([]);
    setCities([]);
  };

  // Cargar clientes, países, productos, servicios, empleados, cajas y métodos de pago iniciales
  // Cargar listas de precios
  const loadPriceLists = async () => {
    try {
      const lists = await priceListsApi.getAll({ is_active: true });
      setAvailablePriceLists(lists);
    } catch (error) {
      console.error("Error loading price lists:", error);
    }
  };

  useEffect(() => {
    fetchClients();
    loadCountries();
    fetchProducts();
    fetchServices();
    fetchEmployees();
    loadCashRegisters();
    loadPaymentMethods();
    loadPriceLists();
  }, []);

  // Buscar clientes cuando cambia el texto de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchClient.length >= 2) {
        fetchClients(searchClient);
      } else if (searchClient.length === 0) {
        fetchClients();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchClient]);

  // Cerrar dropdown de clientes al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setShowClientList(false);
      }
    };

    if (showClientList) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showClientList]);

  // Buscar productos y servicios cuando cambia el texto de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchProduct.length >= 2) {
        fetchProducts(searchProduct);
        fetchServices(searchProduct);
      } else if (searchProduct.length === 0) {
        fetchProducts();
        fetchServices();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchProduct]);

  // Filtrar productos del inventario con fuzzy search
  const filteredProducts = useMemo(() => {
    return inventoryProducts.filter(p => {
      if (!p.is_active) return false;
      if (!searchProduct) return true;
      // Buscar en nombre, SKU, barcode y descripción
      const searchText = `${p.name} ${p.sku || ''} ${p.barcode || ''} ${p.description || ''}`;
      return fuzzyMatch(searchText, searchProduct);
    });
  }, [inventoryProducts, searchProduct]);

  // Manejar cambio de lista de precios
  const handlePriceListChange = async (value: string) => {
    setSelectedPriceListId(value);

    if (!value) {
      // Sin lista seleccionada: limpiar descuentos de lista
      setPriceListItemsMap([]);
      setItems(prev => prev.map(item => ({
        ...item,
        discount: item.discountNote ? 0 : item.discount,
        discountNote: null,
      })));
      return;
    }

    const listId = Number(value);
    try {
      // Obtener items para los productos/servicios de la factura actual
      const productIds = items.filter(i => i.productId).map(i => i.productId!);
      const serviceIds = items.filter(i => i.serviceId).map(i => i.serviceId!);

      const discountItems = await priceListsApi.getItemsForSale(
        listId,
        productIds.length > 0 ? productIds : undefined,
        serviceIds.length > 0 ? serviceIds : undefined
      );
      setPriceListItemsMap(discountItems);

      // Auto-aplicar descuentos a items existentes
      const selectedList = availablePriceLists.find(pl => pl.id === listId);
      const listName = selectedList?.name || "Lista";

      setItems(prev => prev.map(item => {
        const match = discountItems.find(d =>
          (item.itemType === 'product' && item.productId && d.product_id === item.productId) ||
          (item.itemType === 'service' && item.serviceId && d.service_id === item.serviceId)
        );
        if (match && Number(match.discount_percentage) > 0) {
          return {
            ...item,
            discount: Number(match.discount_percentage),
            discountNote: `Lista: ${listName}`,
          };
        }
        if (match && match.custom_price != null && Number(match.custom_price) > 0) {
          return {
            ...item,
            unitPrice: Math.round(Number(match.custom_price)),
            discountNote: `Lista: ${listName}`,
          };
        }
        // Si no tiene match en esta lista, limpiar descuento de lista anterior
        if (item.discountNote) {
          return { ...item, discount: 0, discountNote: null };
        }
        return item;
      }));
    } catch (error) {
      console.error("Error loading price list items:", error);
    }
  };

  // Filtrar servicios activos con fuzzy search
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      if (!s.is_active) return false;
      if (!searchProduct) return true;
      // Buscar en nombre, descripción y categoría
      const searchText = `${s.name} ${s.description || ''} ${s.category || ''}`;
      return fuzzyMatch(searchText, searchProduct);
    });
  }, [services, searchProduct]);

  // Filtrar clientes con fuzzy search
  const filteredClients = useMemo(() => {
    if (!searchClient) return clients;
    return clients.filter(client => {
      // Buscar en nombre, documento, email y teléfono
      const searchText = `${client.name} ${client.document_id || ''} ${client.email || ''} ${client.phone || ''}`;
      return fuzzyMatch(searchText, searchClient);
    });
  }, [clients, searchClient]);

  // Tipo para items combinados (productos + servicios)
  type CombinedItem =
    | { type: 'product'; data: InventoryProduct }
    | { type: 'service'; data: Service };

  // Lista combinada de productos y servicios para la búsqueda
  const combinedItems = useMemo((): CombinedItem[] => {
    const productItems: CombinedItem[] = filteredProducts.map(p => ({ type: 'product', data: p }));
    const serviceItems: CombinedItem[] = filteredServices.map(s => ({ type: 'service', data: s }));
    return [...productItems, ...serviceItems];
  }, [filteredProducts, filteredServices]);

  // Estado de carga combinado
  const loadingItems = loadingProducts || loadingServices;

  // Cálculos de deuda del cliente
  const clientDebtInfo = useMemo(() => {
    const pendingSales = clientSales.filter(
      sale => sale.status !== 'cancelled' && (sale.payment_status === 'pending' || sale.payment_status === 'partial')
    );
    // Convertir a número porque el API puede devolver strings
    const totalDebt = pendingSales.reduce((sum, sale) => sum + Number(sale.balance || 0), 0);
    const totalPurchases = clientSales
      .filter(sale => sale.status !== 'cancelled')
      .reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    const totalSalesCount = clientSales.filter(sale => sale.status !== 'cancelled').length;

    return {
      pendingSales,
      totalDebt,
      totalPurchases,
      totalSalesCount,
      hasPendingDebt: totalDebt > 0,
    };
  }, [clientSales]);

  // Cálculos
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    items.forEach((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const discountAmount = itemSubtotal * (item.discount / 100);
      const afterDiscount = itemSubtotal - discountAmount;
      const taxRateValue = item.taxRate ?? 0; // null = Excluido, treat as 0
      const itemTax = afterDiscount * (taxRateValue / 100);

      subtotal += itemSubtotal;
      totalDiscount += discountAmount;
      totalTax += itemTax;
    });

    const total = subtotal - totalDiscount + totalTax;
    const totalRetentions = retentions.reduce((sum, r) => sum + r.value, 0);
    const netTotal = total - totalRetentions;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = netTotal - totalPaid;

    return {
      subtotal,
      totalDiscount,
      totalTax,
      total,
      totalRetentions,
      netTotal,
      totalPaid,
      balance,
    };
  }, [items, payments, retentions]);

  // Validar si se puede finalizar (requiere cliente, productos y pagos)
  const canFinalize = useMemo(() => {
    return selectedClient !== null && items.length > 0 && payments.length > 0;
  }, [selectedClient, items, payments]);

  // Detectar si hay cambios sin guardar
  const hasUnsavedChanges = useMemo(() => {
    return selectedClient !== null || items.length > 0 || payments.length > 0;
  }, [selectedClient, items, payments]);

  // Secciones de navegación
  const sections = [
    { id: "datos-comprador", label: "Cliente", icon: User, ref: datosCompradorRef },
    { id: "items", label: "Productos", icon: ShoppingCart, ref: itemsRef },
    { id: "totales", label: "Totales", icon: DollarSign, ref: totalesRef },
    { id: "pagos", label: "Pagos", icon: CreditCard, ref: pagosRef },
    { id: "otras-opciones", label: "Otras opciones", icon: FileText, ref: otrasOpcionesRef },
  ];

  // Funciones de navegación dinámica
  const getNavLabel = (sectionId: string) => {
    switch (sectionId) {
      case "datos-comprador":
        return selectedClient ? selectedClient.name : "Cliente";
      case "items":
        const itemCount = items.length;
        return itemCount > 0 ? `${itemCount} ${itemCount === 1 ? "Producto" : "Productos"}` : "Productos";
      case "totales":
        return calculations.total > 0
          ? formatCurrency(calculations.total)
          : "Totales";
      case "pagos":
        return calculations.totalPaid > 0
          ? formatCurrency(calculations.totalPaid)
          : "Pagos";
      default:
        return sections.find((s) => s.id === sectionId)?.label || "";
    }
  };

  // Handlers
  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>, section: string) => {
    setActiveSection(section);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (ref.current) {
      ref.current.classList.add('section-highlight');
      setTimeout(() => ref.current?.classList.remove('section-highlight'), 600);
    }
  };

  // Recopilar datos para guardar como borrador
  const collectDraftData = useCallback((): CreateDraftData => {
    return {
      client_id: selectedClient?.id || null,
      seller_id: formData.seller ? parseInt(formData.seller) : undefined,
      type: "pos",
      invoice_date: format(invoiceDate, "yyyy-MM-dd"),
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
      commission_percentage: formData.commissionPercentage || undefined,
      price_list_id: selectedPriceListId ? Number(selectedPriceListId) : undefined,
      retentions: retentions.length > 0 ? retentions.map(r => ({
        id: r.id,
        type: r.type,
        name: r.name,
        percentage: r.percentage,
        value: r.value,
      })) : undefined,
      items: items.length > 0 ? items.map(item => ({
        product_id: item.itemType === 'product' && item.productId ? item.productId : null,
        service_id: item.itemType === 'service' && item.serviceId ? item.serviceId : null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_percentage: item.discount || 0,
        discount_note: item.discountNote || null,
        tax_rate: item.taxRate ?? null,
      })) : undefined,
    };
  }, [selectedClient, formData, invoiceDate, dueDate, retentions, items, selectedPriceListId]);

  // Guardar borrador
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const data = collectDraftData();
      let savedDraft: Sale;
      if (draftId) {
        savedDraft = await salesApi.updateDraft(draftId, data);
      } else {
        savedDraft = await salesApi.saveDraft(data);
      }
      setDraftId(savedDraft.id);
      toast({ title: "Borrador guardado", description: "La factura se guardó como borrador" });

      // Si hay navegación pendiente, proceder
      if (pendingNavigation) {
        navigationAllowedRef.current = true;
        router.visit(pendingNavigation);
      }
    } catch (error: any) {
      console.error("Error saving draft:", error);
      toast({ variant: "destructive", title: "Error al guardar borrador", description: error.message || "Por favor intente nuevamente" });
    } finally {
      setSavingDraft(false);
    }
  };

  // Cargar borrador existente
  const loadDraft = async (id: number) => {
    setLoadingDraft(true);
    try {
      const sale = await salesApi.getById(id);
      if (sale.status !== 'draft') {
        toast({ variant: "destructive", title: "Error", description: "Esta venta no es un borrador" });
        router.visit(`/admin/sales/${sale.id}`);
        return;
      }

      // Popular cliente
      if (sale.client) {
        setSelectedClient(sale.client as Client);
      }

      // Popular vendedor
      if (sale.seller_id) {
        setFormData(prev => ({ ...prev, seller: sale.seller_id!.toString() }));
      }

      // Popular comisión
      if (sale.commission_percentage && Number(sale.commission_percentage) > 0) {
        setFormData(prev => ({
          ...prev,
          commissionPercentage: Number(sale.commission_percentage),
          commissionValue: Number(sale.commission_amount) || 0,
        }));
      }

      // Popular fechas
      if (sale.invoice_date) {
        setInvoiceDate(new Date(sale.invoice_date));
      }
      if (sale.due_date) {
        setDueDate(new Date(sale.due_date));
      }

      // Popular retenciones
      if (sale.retentions && sale.retentions.length > 0) {
        setRetentions(sale.retentions.map(r => ({
          id: r.id || String(Math.random()),
          type: r.type,
          name: r.name,
          percentage: r.percentage,
          value: r.value,
        })));
      }

      // Popular items
      if (sale.items && sale.items.length > 0) {
        setItems(sale.items.map(item => ({
          id: String(Math.random()),
          itemType: item.service_id ? 'service' : 'product',
          productId: item.product_id || undefined,
          serviceId: item.service_id || undefined,
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          originalPrice: Number(item.unit_price),
          taxRate: item.tax_rate !== undefined && item.tax_rate !== null ? Number(item.tax_rate) : null,
          discount: item.discount_percentage ? Number(item.discount_percentage) : 0,
          isFromInventory: !!item.product_id,
        })));
      }
    } catch (error: any) {
      console.error("Error loading draft:", error);
      toast({ variant: "destructive", title: "Error al cargar borrador", description: error.message || "No se pudo cargar el borrador" });
    } finally {
      setLoadingDraft(false);
    }
  };

  // Cargar historial de ventas del cliente
  const fetchClientSales = async (clientId: number) => {
    setLoadingClientSales(true);
    try {
      const sales = await salesApi.getAll({ client_id: clientId, per_page: 50 });
      setClientSales(sales);
    } catch (error) {
      console.error("Error loading client sales:", error);
      setClientSales([]);
    } finally {
      setLoadingClientSales(false);
    }
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setSearchClient(client.name);
    setShowClientList(false);
    setShowClientDetails(false);
    setShowClientHistory(false);
    // Cargar historial de ventas del cliente
    fetchClientSales(client.id);
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setSearchClient("");
    setClientSales([]);
    setShowClientDetails(false);
    setShowClientHistory(false);
  };

  const addProductFromList = async (product: InventoryProduct) => {
    let discount = 0;
    let discountNote: string | null = null;
    let unitPrice = Math.round(product.sale_price);

    // Auto-aplicar descuento de lista de precios si hay una seleccionada
    if (selectedPriceListId) {
      const listId = Number(selectedPriceListId);
      // Check if we already have the item in our map
      let match = priceListItemsMap.find(d => d.product_id === product.id);
      if (!match) {
        // Fetch from API
        try {
          const items = await priceListsApi.getItemsForSale(listId, [product.id]);
          match = items.find(d => d.product_id === product.id);
          if (match) {
            setPriceListItemsMap(prev => [...prev, match!]);
          }
        } catch { /* silently fail */ }
      }
      if (match) {
        const selectedList = availablePriceLists.find(pl => pl.id === listId);
        if (Number(match.discount_percentage) > 0) {
          discount = Number(match.discount_percentage);
          discountNote = `Lista: ${selectedList?.name || "Lista"}`;
        } else if (match.custom_price != null && Number(match.custom_price) > 0) {
          unitPrice = Math.round(Number(match.custom_price));
          discountNote = `Lista: ${selectedList?.name || "Lista"}`;
        }
      }
    }

    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      itemType: 'product',
      productId: product.id,
      description: product.name,
      quantity: 1,
      unitPrice,
      originalPrice: Math.round(product.sale_price),
      taxRate: product.tax_rate != null ? Number(product.tax_rate) : null,
      discount,
      discountNote,
      isFromInventory: true,
      customTaxRate: false,
      maxStock: product.is_trackable ? product.current_stock : undefined,
      isTrackable: product.is_trackable,
    };

    setItems([...items, newItem]);
    setSearchProduct("");
    setShowProductList(false);
  };

  const addServiceFromList = async (service: Service) => {
    let discount = 0;
    let discountNote: string | null = null;
    let unitPrice = Math.round(service.price);

    // Auto-aplicar descuento de lista de precios si hay una seleccionada
    if (selectedPriceListId) {
      const listId = Number(selectedPriceListId);
      let match = priceListItemsMap.find(d => d.service_id === service.id);
      if (!match) {
        try {
          const items = await priceListsApi.getItemsForSale(listId, undefined, [service.id]);
          match = items.find(d => d.service_id === service.id);
          if (match) {
            setPriceListItemsMap(prev => [...prev, match!]);
          }
        } catch { /* silently fail */ }
      }
      if (match) {
        const selectedList = availablePriceLists.find(pl => pl.id === listId);
        if (Number(match.discount_percentage) > 0) {
          discount = Number(match.discount_percentage);
          discountNote = `Lista: ${selectedList?.name || "Lista"}`;
        } else if (match.custom_price != null && Number(match.custom_price) > 0) {
          unitPrice = Math.round(Number(match.custom_price));
          discountNote = `Lista: ${selectedList?.name || "Lista"}`;
        }
      }
    }

    const newItems: InvoiceItem[] = [];
    const serviceItemId = Date.now().toString();

    const serviceItem: InvoiceItem = {
      id: serviceItemId,
      itemType: 'service',
      serviceId: service.id,
      description: service.name,
      quantity: 1,
      unitPrice,
      originalPrice: Math.round(service.price),
      taxRate: service.tax_rate != null ? Number(service.tax_rate) : null,
      discount,
      discountNote,
      isFromInventory: false,
      customTaxRate: false,
      isTrackable: false,
      unit: service.unit,
    };
    newItems.push(serviceItem);

    // Auto-agregar productos "cobro aparte" del servicio
    try {
      const fullService = await servicesApi.getById(service.id);
      if (fullService.service_products && fullService.service_products.length > 0) {
        for (const sp of fullService.service_products) {
          if (!sp.is_included && sp.product) {
            const product = sp.product;
            newItems.push({
              id: `${serviceItemId}-sp-${sp.product_id}`,
              itemType: 'product',
              productId: product.id,
              description: `${product.name} (de ${service.name})`,
              quantity: sp.quantity * 1, // 1 = cantidad inicial del servicio
              unitPrice: Math.round(Number(product.sale_price) || 0),
              originalPrice: Math.round(Number(product.sale_price) || 0),
              taxRate: product.tax_rate != null ? Number(product.tax_rate) : null,
              discount: 0,
              discountNote: null,
              isFromInventory: true,
              customTaxRate: false,
              isTrackable: product.is_trackable ?? false,
              maxStock: product.current_stock,
              parentServiceItemId: serviceItemId,
              baseQuantity: sp.quantity,
            });
          }
        }
      }
    } catch { /* silently fail - service will still be added */ }

    setItems([...items, ...newItems]);
    setSearchProduct("");
    setShowProductList(false);
  };

  // Abrir modal de creación rápida
  const openQuickCreate = async () => {
    setQcName(searchProduct);
    setQcCategoryId("");
    setQcSalePrice(0);
    setQcPurchasePrice(0);
    setQcTaxRate("null");
    setQcServiceCategory("general");
    setQcServicePrice(0);
    setQcStock(0);
    setQcIsTrackable(false);
    setQcNextSku("");
    setQcErrors({});
    setQuickCreateType("product");
    setShowProductList(false);
    setQuickCreateOpen(true);

    // Cargar categorías y próximo SKU en paralelo
    const promises: Promise<void>[] = [];

    if (productCategories.length === 0) {
      promises.push(
        productCategoriesApi.getAll()
          .then(categories => setProductCategories(categories.filter(c => c.is_active)))
          .catch(error => console.error("Error loading product categories:", error))
      );
    }

    promises.push(
      productsApi.getNextSku()
        .then(sku => setQcNextSku(sku))
        .catch(error => console.error("Error loading next SKU:", error))
    );

    await Promise.all(promises);
  };

  // Crear producto o servicio rápidamente
  const handleQuickCreate = async () => {
    setQcErrors({});

    if (quickCreateType === "product") {
      // Validar campos de producto
      const errors: Record<string, string> = {};
      if (!qcName.trim()) errors.name = "El nombre es requerido";
      if (!qcCategoryId) errors.category_id = "La categoría es requerida";
      if (!qcSalePrice || qcSalePrice <= 0) errors.sale_price = "El precio de venta es requerido";
      if (qcPurchasePrice < 0) errors.purchase_price = "El precio de compra no puede ser negativo";
      if (Object.keys(errors).length > 0) {
        setQcErrors(errors);
        return;
      }

      setQuickCreateLoading(true);
      try {
        const newProduct = await productsApi.create({
          name: qcName.trim(),
          category_id: Number(qcCategoryId),
          sale_price: qcSalePrice,
          purchase_price: qcPurchasePrice,
          tax_rate: qcTaxRate === "null" ? null : Number(qcTaxRate),
          is_active: true,
          is_trackable: qcIsTrackable,
          current_stock: qcIsTrackable ? qcStock : 0,
          min_stock: 0,
        } as any);

        // Agregar al listado local
        setInventoryProducts(prev => [...prev, newProduct]);
        // Agregar directamente al invoice
        await addProductFromList(newProduct);
        setQuickCreateOpen(false);
        toast({ title: "Producto creado", description: `"${newProduct.name}" fue creado y agregado a la factura.` });
      } catch (error: any) {
        if (error.errors) {
          const formatted: Record<string, string> = {};
          for (const [key, val] of Object.entries(error.errors)) {
            formatted[key] = Array.isArray(val) ? val[0] : String(val);
          }
          setQcErrors(formatted);
        } else {
          setQcErrors({ general: error.message || "Error al crear el producto" });
        }
      } finally {
        setQuickCreateLoading(false);
      }
    } else {
      // Validar campos de servicio
      const errors: Record<string, string> = {};
      if (!qcName.trim()) errors.name = "El nombre es requerido";
      if (!qcServicePrice || qcServicePrice <= 0) errors.price = "El precio es requerido";
      if (Object.keys(errors).length > 0) {
        setQcErrors(errors);
        return;
      }

      setQuickCreateLoading(true);
      try {
        const newService = await servicesApi.create({
          name: qcName.trim(),
          category: qcServiceCategory,
          price: qcServicePrice,
          unit: "servicio",
          is_active: true,
        } as any);

        // Agregar al listado local
        setServices(prev => [...prev, newService]);
        // Agregar directamente al invoice
        await addServiceFromList(newService);
        setQuickCreateOpen(false);
        toast({ title: "Servicio creado", description: `"${newService.name}" fue creado y agregado a la factura.` });
      } catch (error: any) {
        if (error.errors) {
          const formatted: Record<string, string> = {};
          for (const [key, val] of Object.entries(error.errors)) {
            formatted[key] = Array.isArray(val) ? val[0] : String(val);
          }
          setQcErrors(formatted);
        } else {
          setQcErrors({ general: error.message || "Error al crear el servicio" });
        }
      } finally {
        setQuickCreateLoading(false);
      }
    }
  };

  const removeItem = (id: string) => {
    // Al eliminar un servicio, también eliminar sus productos vinculados
    setItems(items.filter((item) => item.id !== id && item.parentServiceItemId !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: number | string | boolean | null) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        // Si se cambió la cantidad de un servicio, escalar productos vinculados
        if (field === "quantity" && item.parentServiceItemId === id && item.baseQuantity) {
          return { ...item, quantity: (value as number) * item.baseQuantity };
        }
        return item;
      })
    );
  };

  const updateItemFields = (id: string, fields: Partial<InvoiceItem>) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;
        return { ...item, ...fields };
      })
    );
  };

  const findCashRegisterForPaymentMethod = (paymentMethodId: number): CashRegister | null => {
    return cashRegisters.find(cr => cr.payment_method_id === paymentMethodId && cr.is_active) || null;
  };

  const getPaymentMethodIcon = (code: string) => {
    switch (code) {
      case 'CASH': return <Wallet className="h-3 w-3" />;
      case 'CREDIT_CARD':
      case 'DEBIT_CARD': return <CreditCard className="h-3 w-3" />;
      case 'BANK_TRANSFER': return <Building2 className="h-3 w-3" />;
      default: return <CircleDollarSign className="h-3 w-3" />;
    }
  };

  const addQuickPayment = (paymentMethod: PaymentMethod) => {
    const cashRegister = findCashRegisterForPaymentMethod(paymentMethod.id);

    if (!cashRegister) {
      toast({ variant: "destructive", title: "Caja no asignada", description: `El método de pago "${paymentMethod.name}" no tiene una caja registradora asignada.` });
      return;
    }

    if (cashRegister.type === 'minor' && !cashRegister.current_session) {
      toast({ variant: "destructive", title: "Sesión no abierta", description: `La caja menor "${cashRegister.name}" no tiene una sesión abierta.` });
      return;
    }

    const currentTotalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = calculations.netTotal - currentTotalPaid;

    const newPayment: Payment = {
      id: Date.now().toString(),
      date: new Date(),
      cash_register_id: cashRegister.id,
      cash_register_name: cashRegister.name,
      payment_method_id: paymentMethod.id,
      payment_method_name: paymentMethod.name,
      amount: remainingBalance > 0 ? Math.round(remainingBalance) : 0,
    };
    setPayments([...payments, newPayment]);
  };

  const fillPaymentWithBalance = (paymentId: string) => {
    // Calculate total paid excluding the current payment
    const otherPaymentsTotal = payments
      .filter((p) => p.id !== paymentId)
      .reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = calculations.netTotal - otherPaymentsTotal;

    if (remainingBalance > 0) {
      updatePayment(paymentId, "amount", remainingBalance);
    }
  };

  const removePayment = (id: string) => {
    setPayments(payments.filter((p) => p.id !== id));
  };

  const updatePayment = (id: string, field: keyof Payment, value: string | number | Date) => {
    setPayments(
      payments.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const toggleRetention = (retType: (typeof RETENTION_TYPES)[0]) => {
    const isAdded = retentions.some((r) => r.type === retType.type);
    if (isAdded) {
      setRetentions(retentions.filter((r) => r.type !== retType.type));
    } else {
      const value = calculations.total * (retType.percentage / 100);
      const newRetention: Retention = {
        id: Date.now().toString(),
        type: retType.type,
        name: retType.name,
        percentage: retType.percentage,
        value: Math.round(value),
      };
      setRetentions([...retentions, newRetention]);
    }
  };

  const handleSubmit = async (action: string) => {
    if (!selectedClient) {
      toast({ variant: "destructive", title: "Cliente requerido", description: "Por favor seleccione un cliente" });
      datosCompradorRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (items.length === 0) {
      toast({ variant: "destructive", title: "Productos requeridos", description: "Agregue al menos un producto o servicio" });
      itemsRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (payments.length === 0) {
      toast({ variant: "destructive", title: "Pago requerido", description: "Agregue al menos un método de pago" });
      pagosRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // Validar fecha de vencimiento cuando el pago es parcial
    if (calculations.balance > 0 && !dueDate) {
      toast({ variant: "destructive", title: "Fecha de vencimiento requerida", description: "Debe seleccionar una fecha de vencimiento cuando el pago no es completo" });
      return;
    }

    // Validar configuracion FE antes de crear venta electronica
    if (action === "electronic") {
      try {
        const feConfig = await electronicInvoicingApi.getConfig();
        const d = feConfig.data;
        if (!d.has_token) {
          toast({ variant: "destructive", title: "Configuración FE", description: "No tiene token de facturación electrónica. Registre la empresa primero en Facturación DIAN > Creación de Empresa." });
          return;
        }
        if (!d.resolution_id || !d.prefix || !d.consecutive_start || !d.consecutive_end) {
          toast({ variant: "destructive", title: "Configuración FE incompleta", description: "Vaya a Facturación DIAN > Configuración FE y complete: ID Resolución, Prefijo, Consecutivo Desde y Hasta." });
          return;
        }
        if (d.current_consecutive >= d.consecutive_end) {
          toast({ variant: "destructive", title: "Límite de consecutivos", description: "Se alcanzó el límite de consecutivos. Solicite nueva resolución DIAN." });
          return;
        }
        if (!selectedClient.document_id) {
          toast({ variant: "destructive", title: "Documento requerido", description: "El cliente seleccionado no tiene número de documento. Es requerido para facturación electrónica." });
          return;
        }
      } catch (err: any) {
        toast({ variant: "destructive", title: "Error de configuración FE", description: err.message || "Error desconocido" });
        return;
      }
    }

    setSubmittingSale(true);

    try {
      // Map invoice type
      const typeMap: Record<string, "pos" | "electronic" | "account" | "credit"> = {
        pos: "pos",
        electronic: "electronic",
        account: "account",
        credit: "credit",
      };

      // Prepare sale data (backend calculates totals and generates invoice_number)
      const saleData: CreateSaleData = {
        client_id: selectedClient.id,
        type: typeMap[action] || "pos",
        invoice_date: format(invoiceDate, "yyyy-MM-dd"),
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
        seller_id: formData.seller ? parseInt(formData.seller) : undefined,
        commission_percentage: formData.commissionPercentage || undefined,
        price_list_id: selectedPriceListId ? Number(selectedPriceListId) : undefined,
        retentions: retentions.length > 0 ? retentions.map(r => ({
          id: r.id,
          type: r.type,
          name: r.name,
          percentage: r.percentage,
          value: r.value,
        })) : undefined,
        items: items.map(item => ({
          product_id: item.itemType === 'product' && item.productId ? item.productId : null,
          service_id: item.itemType === 'service' && item.serviceId ? item.serviceId : null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_percentage: item.discount || 0,
          discount_note: item.discountNote || null,
          tax_rate: item.taxRate ?? null,
        })),
        payments: payments.map(payment => ({
          cash_register_id: payment.cash_register_id,
          payment_method_id: payment.payment_method_id,
          amount: payment.amount,
          date: format(payment.date, "yyyy-MM-dd"),
        })),
      };

      // Create the sale (or finalize draft)
      let newSale: Sale;
      if (draftId) {
        newSale = await salesApi.finalizeDraft(draftId, saleData);
      } else {
        newSale = await salesApi.create(saleData);
      }

      // If electronic invoice, auto-generate FE (environment 2 = pruebas)
      if (action === "electronic") {
        try {
          const feResult = await electronicInvoicingApi.generateFromSale(newSale.id);
          if (feResult.success) {
            toast({ title: "Factura electrónica enviada", description: "Venta creada y factura electrónica enviada exitosamente" });
          } else {
            const details = [
              feResult.message || "Error desconocido",
              ...(feResult.errors_messages || []),
            ].join(". ");
            toast({ variant: "destructive", title: "Error en factura electrónica", description: details });
            console.error("FE Error response:", feResult);
          }
        } catch (feError: any) {
          console.error("Error generando FE:", feError);
          const details = [
            feError.message || "Error desconocido",
            ...(feError.errors_messages || []),
          ].join(". ");
          toast({ variant: "destructive", title: "Error al enviar FE", description: details });
        }
      }

      // Redirect to sale detail view (allow navigation since sale is saved)
      navigationAllowedRef.current = true;
      router.visit(`/admin/sales/${newSale.id}`);
    } catch (error: any) {
      console.error("Error creating sale:", error);
      toast({ variant: "destructive", title: "Error al crear la venta", description: error.message || "Por favor intente nuevamente." });
      setSubmittingSale(false);
    }
  };

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        searchProductInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Scroll spy - detectar sección visible mientras se hace scroll
  useEffect(() => {
    const sectionRefs = [
      { id: "datos-comprador", ref: datosCompradorRef },
      { id: "items", ref: itemsRef },
      { id: "totales", ref: totalesRef },
      { id: "pagos", ref: pagosRef },
      { id: "otras-opciones", ref: otrasOpcionesRef },
    ];

    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -60% 0px", // Activar cuando la sección está en el 20-40% superior del viewport
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute("data-section");
          if (sectionId) {
            setActiveSection(sectionId);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sectionRefs.forEach(({ ref }) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    // Detectar cuando llegamos al final de la página para activar "Otras opciones"
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Si estamos cerca del final (100px del fondo), activar "otras-opciones"
      if (scrollTop + windowHeight >= documentHeight - 100) {
        setActiveSection("otras-opciones");
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Cargar borrador al montar si viene con draftId
  useEffect(() => {
    if (initialDraftId) {
      loadDraft(initialDraftId);
    }
  }, [initialDraftId]);

  // Interceptar navegación Inertia para proteger cambios sin guardar
  useEffect(() => {
    const removeListener = router.on('before', (event) => {
      if (navigationAllowedRef.current) {
        navigationAllowedRef.current = false;
        return true;
      }

      if (hasUnsavedChanges) {
        event.preventDefault();
        const url = (event.detail?.visit as any)?.url;
        setPendingNavigation(url?.href || url?.toString() || '/admin/dashboard');
        setShowLeaveConfirmation(true);
        return false;
      }

      return true;
    });

    return () => removeListener();
  }, [hasUnsavedChanges]);

  // Interceptar cierre de pestaña del navegador
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <AppLayout title={draftId ? "Editar Borrador" : "Vender"}>
      <Head title={draftId ? "Editar Borrador" : "Vender"} />
      {/* Extend background to full width by countering main padding */}
      <div className="min-h-screen bg-muted/50 pb-24 -mx-4 sm:-mx-6 lg:-mx-8 -mt-6">
        {/* Draft Banner */}
        {draftId && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5">
            <div className="max-w-4xl mx-auto flex items-center gap-2 text-sm text-amber-700">
              <FileText className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="font-medium">Editando borrador</span>
              <span className="text-amber-600">— Complete los datos y finalice la venta</span>
            </div>
          </div>
        )}

        {/* Loading Draft Overlay */}
        {loadingDraft && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">Cargando borrador...</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loadingDraft && (
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Paper Document Effect - shadow with subtle border */}
            <div className="bg-card rounded-lg shadow-2xl border border-border relative overflow-hidden">
              {/* Invoice Header */}
              <div className="border-b bg-gradient-to-b from-primary/5 to-transparent p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden bg-primary/10">
                      {company?.logo_icon_url || company?.logo_url ? (
                        <img
                          src={company.logo_icon_url || company.logo_url}
                          alt={company.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <img
                          src="/images/legal-sistema-icon.png"
                          alt="Legal Sistema"
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{company?.name || 'Empresa'}</p>
                      <p>NIT: {company?.tax_id || ''} • {company?.address || ''}</p>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <p className="font-medium text-foreground">{invoiceNumber}</p>
                    <div className="flex items-center justify-end gap-1 text-muted-foreground">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
                            <CalendarIcon className="h-3 w-3" />
                            {format(invoiceDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card" align="end">
                          <Calendar
                            mode="single"
                            selected={invoiceDate}
                            onSelect={(date) => date && setInvoiceDate(date)}
                            locale={es}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <p className="text-muted-foreground text-[10px]">Res: 18760000001</p>
                    <div className="flex items-center justify-end gap-1 text-muted-foreground text-[10px]">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
                            <CalendarIcon className="h-2.5 w-2.5" />
                            {dueDate
                              ? `Vence: ${format(dueDate, "dd/MM/yyyy", { locale: es })}`
                              : "Agregar fecha de vencimiento"
                            }
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card" align="end">
                          <Calendar
                            mode="single"
                            selected={dueDate ?? undefined}
                            onSelect={(date) => setDueDate(date ?? null)}
                            locale={es}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Body */}
              <div className="p-4 sm:p-6 space-y-8">
                {/* Section: CLIENTE */}
                <section
                  ref={datosCompradorRef}
                  data-section="datos-comprador"
                  className={cn(
                    "scroll-mt-24 p-4 -mx-4 rounded-xl transition-all duration-300 shadow-md border-2 bg-card/50",
                    activeSection === "datos-comprador" ? "border-emerald-500/60 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/20" : "border-border/40"
                  )}
                >
                  <div className={cn("flex items-center justify-between mb-4 px-3 py-2 rounded-lg", sectionColors["datos-comprador"].bg)}>
                    <div className="flex items-center gap-2">
                      <User className={cn("h-4 w-4", sectionColors["datos-comprador"].icon)} />
                      <h2 className="font-semibold text-sm text-foreground">Cliente</h2>
                    </div>
                    <Select value={selectedPriceListId || "none"} onValueChange={(v) => handlePriceListChange(v === "none" ? "" : v)}>
                      <SelectTrigger className="w-auto h-7 text-xs border-none bg-muted/50 gap-1">
                        <SelectValue placeholder="Sin lista" />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="none">Sin lista</SelectItem>
                        {availablePriceLists.map((pl) => (
                          <SelectItem key={pl.id} value={String(pl.id)}>{pl.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Search Client */}
                  {!selectedClient && (
                    <div className="relative" ref={clientSearchRef}>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        placeholder="Buscar por nombre o cédula..."
                        value={searchClient}
                        onChange={(e) => {
                          setSearchClient(e.target.value);
                          setShowClientList(true);
                        }}
                        onFocus={() => setShowClientList(true)}
                        className="pl-10 h-10 bg-muted/30 border-border/50 focus:border-primary/50 transition-colors"
                      />

                      {showClientList && (
                        <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                          {loadingClients ? (
                            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                              Buscando clientes...
                            </div>
                          ) : filteredClients.length > 0 ? (
                            <>
                              {filteredClients.map((client) => (
                                <button
                                  key={client.id}
                                  onClick={() => handleSelectClient(client)}
                                  className={cn(
                                    "w-full px-3 py-2.5 text-left hover:bg-accent transition-colors border-b last:border-b-0 flex items-center justify-between gap-3",
                                    (selectedClient as Client | null)?.id === client.id && "bg-primary/5"
                                  )}
                                >
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{client.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {client.document_id ? `CC: ${client.document_id}` : client.email} {client.phone && `• ${client.phone}`}
                                    </p>
                                  </div>
                                  {(selectedClient as Client | null)?.id === client.id && (
                                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                  )}
                                </button>
                              ))}
                              <button
                                onClick={() => {
                                  setNewClientForm({ ...newClientForm, name: searchClient });
                                  setShowNewClientDialog(true);
                                  setShowClientList(false);
                                }}
                                className="w-full px-3 py-2.5 text-left hover:bg-accent transition-colors bg-primary/5 border-t flex items-center gap-2"
                              >
                                <Plus className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium text-primary">
                                  Crear nuevo cliente
                                </span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setNewClientForm({ ...newClientForm, name: searchClient });
                                setShowNewClientDialog(true);
                                setShowClientList(false);
                              }}
                              className="w-full px-3 py-3 text-left hover:bg-accent"
                            >
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4 text-primary" />
                                <span className="text-sm">
                                  Crear cliente "<span className="font-medium">{searchClient}</span>"
                                </span>
                              </div>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected Client Card */}
                  {selectedClient && (
                    <div className={cn(
                      "border rounded-lg overflow-hidden transition-all duration-200",
                      clientDebtInfo.hasPendingDebt ? "border-orange-500/30 bg-orange-500/10/50" : "bg-muted/10"
                    )}>
                      {/* Header */}
                      <div className="flex items-center justify-between p-3 bg-muted/30">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                            clientDebtInfo.hasPendingDebt ? "bg-orange-500/15" : "bg-primary/10"
                          )}>
                            <User className={cn(
                              "h-5 w-5",
                              clientDebtInfo.hasPendingDebt ? "text-orange-600" : "text-primary"
                            )} />
                          </div>
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <p className="font-semibold">{selectedClient.name}</p>
                            <span className="text-xs text-muted-foreground">
                              {selectedClient.document_id ? `CC: ${selectedClient.document_id}` : selectedClient.email}
                            </span>
                            {clientDebtInfo.hasPendingDebt && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-orange-500/15 text-orange-700 border-orange-500/30">
                                Deuda
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setShowClientDetails(!showClientDetails)}
                            title="Ver detalles del cliente"
                          >
                            <ChevronDown className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform duration-200",
                              showClientDetails && "rotate-180"
                            )} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 group"
                            onClick={handleClearClient}
                            title="Cambiar cliente"
                          >
                            <X className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-90" />
                          </Button>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      {showClientDetails && (
                        <div className="px-3 pb-3 space-y-3">
                          {/* Warning for pending debt */}
                          {clientDebtInfo.hasPendingDebt && (
                            <div className="px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                              <span className="text-sm text-orange-700">
                                Cliente con facturas pendientes por pago
                              </span>
                            </div>
                          )}

                          {/* Contact Info */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Teléfono</p>
                              <p className="font-medium">{selectedClient.phone || 'No registrado'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Identificación</p>
                              <p className="font-medium">
                                {selectedClient.document_id
                                  ? `${selectedClient.document_type || 'CC'}: ${selectedClient.document_id}`
                                  : 'No registrada'}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-muted-foreground">Dirección</p>
                              <p className="font-medium">
                                {[selectedClient.address, selectedClient.city_name].filter(Boolean).join(', ') || 'No registrada'}
                              </p>
                            </div>
                          </div>

                          {/* Debt Summary */}
                          {clientDebtInfo.hasPendingDebt && (
                            <div className="border-t pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-muted-foreground font-medium uppercase">Deuda Pendiente</span>
                                <span className="text-lg font-bold text-orange-600">
                                  {formatCurrency(clientDebtInfo.totalDebt)}
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {clientDebtInfo.pendingSales.map(sale => (
                                  <div key={sale.id} className="flex items-center justify-between text-sm bg-orange-500/10/50 rounded px-2 py-1.5">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-3.5 w-3.5 text-orange-500" />
                                      <span className="font-medium">{sale.invoice_number}</span>
                                      <span className="text-muted-foreground text-xs">{format(new Date(sale.invoice_date), "dd/MM/yyyy")}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-orange-600">{formatCurrency(Number(sale.balance || 0))}</span>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] px-1.5 py-0 h-4",
                                          sale.payment_status === 'partial'
                                            ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                                            : "bg-orange-500/10 text-orange-700 border-orange-500/30"
                                        )}
                                      >
                                        {sale.payment_status === 'partial' ? 'Parcial' : 'Pendiente'}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Client Stats */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-background/50 rounded-lg p-2 text-center">
                              <p className="text-xs text-muted-foreground">Total Compras</p>
                              <p className="text-sm font-bold text-primary">
                                {formatCurrency(clientDebtInfo.totalPurchases)}
                              </p>
                            </div>
                            <div className="bg-background/50 rounded-lg p-2 text-center">
                              <p className="text-xs text-muted-foreground">Facturas</p>
                              <p className="text-sm font-bold">{clientDebtInfo.totalSalesCount}</p>
                            </div>
                            <div className="bg-background/50 rounded-lg p-2 text-center">
                              <p className="text-xs text-muted-foreground">Saldo Deudor</p>
                              <p className={cn(
                                "text-sm font-bold",
                                clientDebtInfo.totalDebt > 0 ? "text-orange-600" : "text-muted-foreground"
                              )}>
                                {formatCurrency(clientDebtInfo.totalDebt)}
                              </p>
                            </div>
                          </div>

                          {/* History Section */}
                          <Collapsible open={showClientHistory} onOpenChange={setShowClientHistory}>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2 text-xs">
                                <div className="flex items-center gap-1">
                                  <Receipt className="h-3 w-3" />
                                  <span>Historial ({clientDebtInfo.totalSalesCount} {clientDebtInfo.totalSalesCount === 1 ? 'factura' : 'facturas'})</span>
                                </div>
                                <ChevronRight className={cn(
                                  "h-3 w-3 transition-transform duration-200",
                                  showClientHistory && "rotate-90"
                                )} />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                                {loadingClientSales ? (
                                  <div className="px-3 py-4 text-center">
                                    <Spinner className="h-5 w-5 mx-auto text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground mt-1">Cargando historial...</p>
                                  </div>
                                ) : clientSales.filter(s => s.status !== 'cancelled').length > 0 ? (
                                  <>
                                    {clientSales
                                      .filter(s => s.status !== 'cancelled')
                                      .slice(0, 10)
                                      .map(sale => (
                                        <div key={sale.id} className="flex items-center justify-between py-1.5 px-2 bg-background/50 rounded text-xs">
                                          <div>
                                            <p className="font-medium">{sale.invoice_number}</p>
                                            <p className="text-muted-foreground">{format(new Date(sale.invoice_date), "dd/MM/yyyy")}</p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                              {formatCurrency(Number(sale.total_amount || 0))}
                                            </span>
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "text-[10px] px-1.5 py-0 h-4",
                                                sale.payment_status === 'paid'
                                                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                                                  : sale.payment_status === 'partial'
                                                  ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                                                  : "bg-orange-500/10 text-orange-700 border-orange-500/30"
                                              )}
                                            >
                                              {sale.payment_status === 'paid' ? 'Pagada' : sale.payment_status === 'partial' ? 'Parcial' : 'Pendiente'}
                                            </Badge>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-muted-foreground hover:text-primary"
                                              onClick={() => window.open(`/api/sales/${sale.id}/pdf`, '_blank')}
                                              title="Ver factura"
                                            >
                                              <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                  </>
                                ) : (
                                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                    Este cliente no tiene historial de compras
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Divider */}
                <div className="border-t border-dashed border-border" />

                {/* Section: PRODUCTOS Y SERVICIOS */}
                <section
                  ref={itemsRef}
                  data-section="items"
                  className={cn(
                    "scroll-mt-24 p-4 -mx-4 rounded-xl transition-all duration-300 shadow-md border-2 bg-card/50",
                    activeSection === "items" ? "border-orange-500/60 ring-2 ring-orange-400/40 shadow-lg shadow-orange-500/20" : "border-border/40"
                  )}
                >
                  <div className={cn("flex items-center justify-between mb-3 px-3 py-2 rounded-lg", sectionColors["items"].bg)}>
                    <div className="flex items-center gap-2">
                      <ShoppingCart className={cn("h-4 w-4", sectionColors["items"].icon)} />
                      <h2 className="font-medium text-sm">Productos y Servicios</h2>
                      {items.length > 0 && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                          {items.length} {items.length === 1 ? "item" : "items"}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      <kbd className="text-[10px]">Ctrl+P</kbd>
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {/* Product Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        ref={searchProductInputRef}
                        id="search-product-input"
                        placeholder="Buscar producto o servicio..."
                        value={searchProduct}
                        onChange={(e) => {
                          setSearchProduct(e.target.value);
                          setShowProductList(true);
                        }}
                        onFocus={() => setShowProductList(true)}
                        className="pl-10 h-10 bg-muted/50 border-border"
                      />

                      {showProductList && searchProduct && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                          {loadingItems ? (
                            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                              Buscando productos y servicios...
                            </div>
                          ) : combinedItems.length > 0 ? (
                            combinedItems.map((item) => (
                              <button
                                key={`${item.type}-${item.data.id}`}
                                onClick={() => {
                                  if (item.type === 'product') {
                                    addProductFromList(item.data as InventoryProduct);
                                  } else {
                                    addServiceFromList(item.data as Service);
                                  }
                                }}
                                className="w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors flex justify-between items-center gap-3 border-b last:border-b-0"
                              >
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {item.type === 'product' ? (
                                    <Package className="h-4 w-4 text-blue-500" />
                                  ) : (
                                    <Wrench className="h-4 w-4 text-emerald-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-medium text-sm truncate">{item.data.name}</p>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px] px-1.5 py-0 h-4",
                                        item.type === 'product'
                                          ? "bg-blue-500/10 text-blue-700 border-blue-500/20"
                                          : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                      )}
                                    >
                                      {item.type === 'product' ? 'Producto' : 'Servicio'}
                                    </Badge>
                                    {item.type === 'product' && (item.data as InventoryProduct).category && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-purple-500/10 text-purple-700 border-purple-500/20">
                                        {(item.data as InventoryProduct).category?.name}
                                      </Badge>
                                    )}
                                    {item.type === 'service' && (item.data as Service).category_name && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-purple-500/10 text-purple-700 border-purple-500/20">
                                        {(item.data as Service).category_name}
                                      </Badge>
                                    )}
                                    {item.type === 'product' && (item.data as InventoryProduct).is_trackable && (
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] px-1.5 py-0 h-4",
                                          (item.data as InventoryProduct).current_stock <= (item.data as InventoryProduct).min_stock
                                            ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                                            : "bg-sky-50 text-sky-700 border-sky-200"
                                        )}
                                      >
                                        Stock: {(item.data as InventoryProduct).current_stock}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {item.type === 'product'
                                      ? formatCurrency((item.data as InventoryProduct).sale_price)
                                      : formatCurrency((item.data as Service).price)
                                    }
                                    {item.type === 'product' && (item.data as InventoryProduct).sku && ` • SKU: ${(item.data as InventoryProduct).sku}`}
                                    {item.type === 'product' && ` • IVA: ${(item.data as InventoryProduct).tax_rate != null ? `${(item.data as InventoryProduct).tax_rate}%` : 'Excluido'}`}
                                    {item.type === 'service' && (item.data as Service).unit_name && ` • ${(item.data as Service).unit_name}`}
                                  </p>
                                </div>
                                <Plus className="h-4 w-4 text-primary shrink-0" />
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-center">
                              <p className="text-sm text-muted-foreground mb-2">No se encontraron productos ni servicios</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-dashed border-primary text-primary hover:bg-primary/5"
                                onClick={openQuickCreate}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Crear producto o servicio
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Products Table */}
                    <div className="overflow-x-auto border border-border rounded-lg bg-muted/50">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="max-w-[240px] font-medium text-xs text-muted-foreground">Descripción</TableHead>
                            <TableHead className="w-[90px] text-center font-medium text-xs text-muted-foreground">Cant.</TableHead>
                            <TableHead className="w-[120px] font-medium text-xs text-muted-foreground">Precio</TableHead>
                            <TableHead className="w-[70px] text-center font-medium text-xs text-muted-foreground">Dcto %</TableHead>
                            <TableHead className="w-[110px] text-right font-medium text-xs text-muted-foreground">Subtotal</TableHead>
                            <TableHead className="w-[36px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                <Button
                                  variant="outline"
                                  size="lg"
                                  className="h-12 px-6 gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5"
                                  onClick={() => searchProductInputRef.current?.focus()}
                                >
                                  <Plus className="h-5 w-5" />
                                  <span>Agregar producto o servicio</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ) : (
                            items.map((item) => {
                              const itemSubtotal = item.quantity * item.unitPrice;
                              const discountAmount = itemSubtotal * (item.discount / 100);
                              const afterDiscount = itemSubtotal - discountAmount;
                              const taxRateValue = item.taxRate ?? 0; // null = Excluido, treat as 0
                              const subtotal = afterDiscount + afterDiscount * (taxRateValue / 100);

                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="max-w-[240px]">
                                    <Input
                                      placeholder="Descripción"
                                      value={item.description}
                                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                      disabled={item.isFromInventory}
                                      className={cn(
                                        "text-sm border-0 bg-transparent px-0 focus-visible:ring-0 truncate",
                                        item.isFromInventory && "cursor-not-allowed"
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col items-center">
                                      <div className="flex items-center gap-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => updateItem(item.id, "quantity", Math.max(1, item.quantity - 1))}
                                        >
                                          <span className="font-bold">−</span>
                                        </Button>
                                        <Input
                                          type="text"
                                          inputMode="numeric"
                                          value={item.quantity === 0 ? "" : item.quantity}
                                          onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9]/g, "");
                                            if (value === "") {
                                              updateItem(item.id, "quantity", 0);
                                              return;
                                            }
                                            let newQuantity = parseInt(value);
                                            if (item.isTrackable && item.maxStock !== undefined) {
                                              newQuantity = Math.min(newQuantity, item.maxStock);
                                            }
                                            updateItem(item.id, "quantity", newQuantity);
                                          }}
                                          onBlur={() => {
                                            if (item.quantity < 1) updateItem(item.id, "quantity", 1);
                                          }}
                                          className={cn(
                                            "w-10 text-center px-0 border-0 bg-transparent focus-visible:ring-0",
                                            item.isTrackable && item.maxStock !== undefined && item.quantity >= item.maxStock && "text-amber-600 font-semibold"
                                          )}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          disabled={item.isTrackable && item.maxStock !== undefined && item.quantity >= item.maxStock}
                                          onClick={() => {
                                            // Validar contra stock máximo si el producto tiene control de inventario
                                            if (item.isTrackable && item.maxStock !== undefined && item.quantity >= item.maxStock) {
                                              return;
                                            }
                                            updateItem(item.id, "quantity", item.quantity + 1);
                                          }}
                                        >
                                          <span className="font-bold">+</span>
                                        </Button>
                                      </div>
                                      {item.isTrackable && item.maxStock !== undefined && (
                                        <span className={cn(
                                          "text-[10px]",
                                          item.quantity >= item.maxStock ? "text-amber-600 font-medium" : "text-muted-foreground"
                                        )}>
                                          Stock: {item.maxStock}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                        <Input
                                          type="text"
                                          inputMode="numeric"
                                          value={item.unitPrice ? item.unitPrice.toLocaleString("es-CO", { maximumFractionDigits: 0 }) : ""}
                                          onChange={(e) => {
                                            const input = e.target;
                                            const cursorPos = input.selectionStart ?? 0;
                                            const oldVal = input.value;
                                            const digitsBeforeCursor = oldVal.slice(0, cursorPos).replace(/[^0-9]/g, "").length;
                                            const raw = oldVal.replace(/[^0-9]/g, "");
                                            const num = parseInt(raw) || 0;
                                            updateItem(item.id, "unitPrice", num);
                                            const formatted = num ? num.toLocaleString("es-CO", { maximumFractionDigits: 0 }) : "";
                                            requestAnimationFrame(() => {
                                              let digits = 0;
                                              let newPos = 0;
                                              for (let i = 0; i < formatted.length; i++) {
                                                if (/[0-9]/.test(formatted[i])) digits++;
                                                if (digits === digitsBeforeCursor) { newPos = i + 1; break; }
                                              }
                                              if (digitsBeforeCursor === 0) newPos = 0;
                                              input.setSelectionRange(newPos, newPos);
                                            });
                                          }}
                                          className="pl-5 border-0 bg-transparent focus-visible:ring-0"
                                        />
                                      </div>
                                      <span className="text-[10px] text-muted-foreground pl-2">
                                        IVA: {item.taxRate != null ? `${item.taxRate}%` : 'Excluido'}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="relative">
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={item.discount || ""}
                                          onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9.]/g, "");
                                            const num = parseFloat(value);
                                            updateItem(item.id, "discount", isNaN(num) ? 0 : Math.min(100, num));
                                          }}
                                          placeholder="0"
                                          className="w-14 text-center border border-dashed border-border bg-transparent focus-visible:ring-1 rounded-md"
                                        />
                                        <Percent className="h-3 w-3 absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                      </div>
                                      {item.discountNote && (
                                        <span className="text-[10px] text-primary font-medium truncate block max-w-20">{item.discountNote}</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex flex-col items-end">
                                      <span className="font-semibold">{formatCurrency(subtotal)}</span>
                                      {(item.taxRate ?? 0) > 0 && (
                                        <span className="text-[10px] text-muted-foreground">
                                          IVA: {formatCurrency(afterDiscount * ((item.taxRate ?? 0) / 100))}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      onClick={() => setItemToDelete(item.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </section>

                {/* Divider */}
                <div className="border-t border-dashed border-border" />

                {/* Section: TOTALES */}
                <section
                  ref={totalesRef}
                  data-section="totales"
                  className={cn(
                    "scroll-mt-24 p-4 -mx-4 rounded-xl transition-all duration-300 shadow-md border-2 bg-card/50",
                    activeSection === "totales" ? "border-blue-500/60 ring-2 ring-blue-400/40 shadow-lg shadow-blue-500/20" : "border-border/40"
                  )}
                >
                  <div className={cn("flex items-center gap-2 mb-3 px-3 py-2 rounded-lg", sectionColors["totales"].bg)}>
                    <Calculator className={cn("h-4 w-4", sectionColors["totales"].icon)} />
                    <h2 className="font-medium text-sm">Resumen</h2>
                  </div>

                  <div className="border border-border rounded-lg bg-muted/50 overflow-hidden">
                    {/* Desglose */}
                    <div className="p-3 space-y-1.5 border-b">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{formatCurrency(calculations.subtotal)}</span>
                      </div>
                      {calculations.totalDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Descuentos</span>
                          <span className="font-medium text-red-600">-{formatCurrency(calculations.totalDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IVA</span>
                        <span className="font-medium">{formatCurrency(calculations.totalTax)}</span>
                      </div>
                    </div>

                    {/* Total Bruto */}
                    <div className="p-3 bg-primary/5 flex justify-between items-center border-b">
                      <span className="text-sm font-medium">Total Bruto</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(calculations.total)}</span>
                    </div>

                    {/* Retenciones */}
                    {retentions.length > 0 && (
                      <div className="p-3 space-y-1.5 border-b">
                        {retentions.map((retention) => (
                          <div key={retention.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {retention.name} ({retention.percentage}%)
                            </span>
                            <span className="font-medium text-red-600">-{formatCurrency(retention.value)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Total Neto */}
                    <div className="p-3 bg-emerald-500/10 flex justify-between items-center">
                      <span className="text-sm font-medium">Total Neto a Pagar</span>
                      <span className="text-xl font-bold text-emerald-600">{formatCurrency(calculations.netTotal)}</span>
                    </div>

                    {/* Pagos y Saldo */}
                    {payments.length > 0 && (
                      <div className="p-3 border-t grid grid-cols-2 gap-3">
                        <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pagado</p>
                          <p className="text-base font-bold text-emerald-600">{formatCurrency(calculations.totalPaid)}</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded-lg">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saldo</p>
                          <p className={cn("text-base font-bold", calculations.balance > 0 ? "text-red-600" : "text-emerald-600")}>
                            {formatCurrency(calculations.balance)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Divider */}
                <div className="border-t border-dashed border-border" />

                {/* Section: PAGOS */}
                <section
                  ref={pagosRef}
                  data-section="pagos"
                  className={cn(
                    "scroll-mt-24 p-4 -mx-4 rounded-xl transition-all duration-300 shadow-md border-2 bg-card/50",
                    activeSection === "pagos" ? "border-teal-500/60 ring-2 ring-teal-400/40 shadow-lg shadow-teal-500/20" : "border-border/40"
                  )}
                >
                  <div className={cn("flex items-center justify-between mb-3 px-3 py-2 rounded-lg", sectionColors["pagos"].bg)}>
                    <div className="flex items-center gap-2">
                      <CreditCard className={cn("h-4 w-4", sectionColors["pagos"].icon)} />
                      <h2 className="font-medium text-sm">Pagos</h2>
                      {calculations.totalPaid > 0 && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-emerald-500/15 text-emerald-700">
                          {formatCurrency(calculations.totalPaid)}
                        </Badge>
                      )}
                    </div>
                    {calculations.balance > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Pendiente: <span className="font-medium text-red-600">{formatCurrency(calculations.balance)}</span>
                      </span>
                    )}
                  </div>

                  <div className="border border-border rounded-lg bg-muted/50 overflow-hidden">
                    {/* Quick Payment Buttons - Payment Methods */}
                    <div className="p-3 border-b border-border bg-muted/50">
                      <Label className="text-xs text-muted-foreground mb-2 block">Seleccionar método de pago</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {paymentMethods.filter(m => findCashRegisterForPaymentMethod(m.id)).length === 0 ? (
                          <span className="text-xs text-muted-foreground col-span-full">No hay métodos de pago con caja asignada</span>
                        ) : (
                          paymentMethods.filter(m => findCashRegisterForPaymentMethod(m.id)).map((method) => (
                              <Button
                                key={method.id}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => addQuickPayment(method)}
                                title={`Registrar en: ${findCashRegisterForPaymentMethod(method.id)!.name}`}
                              >
                                {getPaymentMethodIcon(method.code)}
                                {method.name}
                              </Button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Payments List */}
                    {payments.length > 0 && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableHead className="font-medium text-xs text-muted-foreground w-[130px]">Método</TableHead>
                              <TableHead className="font-medium text-xs text-muted-foreground w-[150px]">Fecha</TableHead>
                              <TableHead className="font-medium text-xs text-muted-foreground">Monto</TableHead>
                              <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell className="py-1.5">
                                  <Select
                                    value={payment.payment_method_id.toString()}
                                    onValueChange={(value) => {
                                      const selectedMethod = paymentMethods.find(m => m.id === parseInt(value));
                                      if (selectedMethod) {
                                        const newRegister = findCashRegisterForPaymentMethod(selectedMethod.id);
                                        if (!newRegister) {
                                          toast({ variant: "destructive", title: "Caja no asignada", description: `"${selectedMethod.name}" no tiene caja asignada.` });
                                          return;
                                        }
                                        setPayments(payments.map(p =>
                                          p.id === payment.id
                                            ? {
                                                ...p,
                                                payment_method_id: selectedMethod.id,
                                                payment_method_name: selectedMethod.name,
                                                cash_register_id: newRegister.id,
                                                cash_register_name: newRegister.name,
                                              }
                                            : p
                                        ));
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-[120px] h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card z-50">
                                      {paymentMethods.filter(m => findCashRegisterForPaymentMethod(m.id)).map((method) => (
                                        <SelectItem key={method.id} value={method.id.toString()}>
                                          {method.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="py-1.5">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className={cn("h-7 w-full max-w-[140px] justify-start text-left font-normal text-xs truncate", !payment.date && "text-muted-foreground")}>
                                        <CalendarIcon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                                        <span className="truncate">
                                          {payment.date ? new Date(format(payment.date, "yyyy-MM-dd") + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Fecha"}
                                        </span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-card z-50" align="start">
                                      <DatePickerReport
                                        selected={payment.date ? new Date(format(payment.date, "yyyy-MM-dd") + 'T12:00:00') : undefined}
                                        onSelect={(date) => {
                                          if (date) {
                                            updatePayment(payment.id, "date", date);
                                          }
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </TableCell>
                                <TableCell className="py-1.5">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      value={payment.amount ? payment.amount.toLocaleString("es-CO", { maximumFractionDigits: 0 }) : ""}
                                      onChange={(e) => {
                                        const input = e.target;
                                        const cursorPos = input.selectionStart ?? 0;
                                        const oldVal = input.value;
                                        const digitsBeforeCursor = oldVal.slice(0, cursorPos).replace(/[^0-9]/g, "").length;
                                        const raw = oldVal.replace(/[^0-9]/g, "");
                                        const num = parseInt(raw) || 0;
                                        updatePayment(payment.id, "amount", num);
                                        const formatted = num ? num.toLocaleString("es-CO", { maximumFractionDigits: 0 }) : "";
                                        requestAnimationFrame(() => {
                                          let digits = 0;
                                          let newPos = 0;
                                          for (let i = 0; i < formatted.length; i++) {
                                            if (/[0-9]/.test(formatted[i])) digits++;
                                            if (digits === digitsBeforeCursor) { newPos = i + 1; break; }
                                          }
                                          if (digitsBeforeCursor === 0) newPos = 0;
                                          input.setSelectionRange(newPos, newPos);
                                        });
                                      }}
                                      className="pl-5 h-7 border-0 bg-transparent focus-visible:ring-0"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="py-1.5">
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                      onClick={() => fillPaymentWithBalance(payment.id)}
                                    >
                                      Total
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-red-500 hover:text-red-600"
                                      onClick={() => removePayment(payment.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {payments.length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Selecciona un método de pago para agregar pagos
                      </div>
                    )}
                  </div>
                </section>

                {/* Divider */}
                <div className="border-t border-dashed border-border" />

                {/* Section: OTRAS OPCIONES */}
                <section
                  ref={otrasOpcionesRef}
                  data-section="otras-opciones"
                  className={cn(
                    "scroll-mt-24 p-4 -mx-4 rounded-xl transition-all duration-300 shadow-md border-2 bg-card/50",
                    activeSection === "otras-opciones" ? "border-muted-foreground/40 ring-2 ring-muted-foreground/20 shadow-lg" : "border-border/40"
                  )}
                >
                  <div className={cn("flex items-center gap-2 mb-3 px-3 py-2 rounded-lg", sectionColors["otras-opciones"].bg)}>
                    <FileText className={cn("h-4 w-4", sectionColors["otras-opciones"].icon)} />
                    <h2 className="font-medium text-sm">Otras Opciones</h2>
                  </div>

                  <div className="space-y-3">
                    {/* Comisiones */}
                    <Collapsible open={showCommissions} onOpenChange={setShowCommissions}>
                      <div className="border border-border rounded-lg bg-muted/50 overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between px-3 py-2.5 bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
                            <div className="flex items-center gap-2">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium">Comisiones</span>
                            </div>
                            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showCommissions && "rotate-90")} />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-3 space-y-3 border-t border-border">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block">Vendedor</Label>
                              <Combobox
                                options={employeeOptions}
                                value={formData.seller}
                                onValueChange={(value) => setFormData({ ...formData, seller: value })}
                                placeholder="Seleccione vendedor..."
                                searchPlaceholder="Buscar vendedor..."
                                emptyText="No se encontró el vendedor"
                                disabled={loadingEmployees}
                                loading={loadingEmployees}
                                filter={fuzzyFilter}
                                className="h-9"
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Porcentaje</Label>
                                <div className="flex gap-1">
                                  {[5, 10, 15, 20].map((percent) => (
                                    <Button
                                      key={percent}
                                      type="button"
                                      variant={formData.commissionPercentage === percent ? "default" : "outline"}
                                      size="sm"
                                      className="flex-1 h-8 text-xs"
                                      onClick={() => {
                                        const commissionValue = calculations.total * (percent / 100);
                                        setFormData({
                                          ...formData,
                                          commissionPercentage: percent,
                                          commissionValue,
                                        });
                                      }}
                                    >
                                      {percent}%
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Valor comisión</Label>
                                <div className="h-8 px-3 bg-primary/10 rounded-md flex items-center justify-end">
                                  <span className="text-sm font-bold text-primary">
                                    {formatCurrency(formData.commissionValue)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>

                    {/* Retenciones */}
                    <Collapsible open={showRetentions} onOpenChange={setShowRetentions}>
                      <div className="border border-border rounded-lg bg-muted/50 overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between px-3 py-2.5 bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium">Retenciones</span>
                              {retentions.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  {retentions.length} - {formatCurrency(calculations.totalRetentions)}
                                </Badge>
                              )}
                            </div>
                            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showRetentions && "rotate-90")} />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-3 space-y-3 border-t border-border">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block">Agregar retención</Label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {RETENTION_TYPES.map((retType) => {
                                  const isAdded = retentions.some((r) => r.type === retType.type);
                                  return (
                                    <Button
                                      key={retType.type}
                                      type="button"
                                      variant={isAdded ? "default" : "outline"}
                                      size="sm"
                                      className="h-9 text-xs justify-start gap-2"
                                      onClick={() => toggleRetention(retType)}
                                    >
                                      {isAdded ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                      <span className="truncate">{retType.name}</span>
                                      <Badge variant={isAdded ? "secondary" : "outline"} className="ml-auto text-[10px] px-1.5 py-0 h-4">
                                        {retType.percentage}%
                                      </Badge>
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>

                            {retentions.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Retenciones aplicadas</Label>
                                <div className="space-y-1.5">
                                  {retentions.map((retention) => (
                                    <div key={retention.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="text-xs font-medium">{retention.name}</span>
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                          {retention.percentage}%
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-red-600">-{formatCurrency(retention.value)}</span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                                          onClick={() => setRetentions(retentions.filter((r) => r.id !== retention.id))}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  </div>
                </section>
              </div>

              {/* Invoice Footer */}
              <div className="border-t bg-muted/50 p-4 text-center text-xs text-muted-foreground">
                <p>
                  {company?.name || 'Empresa'} • {company?.address || ''} • {company?.email || ''}
                </p>
                <p>
                  {company?.phone ? `Tel: ${company.phone}` : ''}{company?.phone && company?.email ? ' • ' : ''}{company?.tax_id ? `NIT: ${company.tax_id}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Sticky Bottom Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t shadow-2xl">
          <div className="px-4 py-2 sm:py-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {/* Section Navigation Pills */}
              <div className="flex-1 min-w-0 overflow-x-auto hide-scrollbar">
                <div className="flex gap-1.5">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    const dynamicLabel = getNavLabel(section.id);
                    const hasValue = dynamicLabel !== section.label;
                    const colors = sectionColors[section.id as keyof typeof sectionColors];

                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.ref, section.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap border",
                          isActive
                            ? colors.active
                            : hasValue
                            ? colors.hasValue
                            : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{dynamicLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreviewDialog(true)}
                  className="gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Vista previa</span>
                </Button>

                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className={cn(
                      "gap-2 shrink-0",
                      canFinalize && !submittingSale
                        ? "bg-primary hover:bg-primary/90"
                        : "bg-gray-300 hover:bg-gray-300 cursor-not-allowed"
                    )}
                    disabled={!canFinalize || submittingSale}
                  >
                    {submittingSale ? (
                      <Spinner size="sm" className="h-4 w-4" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{submittingSale ? "Procesando..." : "Finalizar"}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-56">
                  {!canFinalize && (
                    <>
                      <div className="px-2 py-2 text-xs text-muted-foreground border-b">
                        <p className="font-medium text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Completa los siguientes campos:
                        </p>
                        <ul className="mt-1 space-y-0.5 pl-4">
                          {!selectedClient && <li>• Seleccionar cliente</li>}
                          {items.length === 0 && <li>• Agregar productos o servicios</li>}
                          {payments.length === 0 && <li>• Agregar metodo de pago</li>}
                        </ul>
                      </div>
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleSubmit("pos")}
                    className="gap-2 cursor-pointer"
                    disabled={!canFinalize || submittingSale}
                  >
                    <FileOutput className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">Factura POS</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSubmit("electronic")}
                    className="gap-2 cursor-pointer"
                    disabled={!canFinalize || submittingSale}
                  >
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-600 font-medium">Factura Electronica</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSubmit("account")}
                    className="gap-2 cursor-pointer"
                    disabled={!canFinalize || submittingSale}
                  >
                    <CircleDollarSign className="h-4 w-4 text-purple-600" />
                    <span className="text-purple-600 font-medium">Cuenta de Cobro</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSubmit("credit")}
                    className="gap-2 cursor-pointer"
                    disabled={!canFinalize || submittingSale}
                  >
                    <Wallet className="h-4 w-4 text-orange-600" />
                    <span className="text-orange-600 font-medium">Credito</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Item Confirmation Dialog */}
      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="max-w-sm sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar producto
            </DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea eliminar este producto de la factura? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setItemToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (itemToDelete) {
                  removeItem(itemToDelete);
                }
                setItemToDelete(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Client Dialog */}
      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Nuevo Cliente
            </DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo cliente para registrarlo en el sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {clientFormErrors.general && (
              <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
                {clientFormErrors.general}
              </div>
            )}

            {/* Informacion Personal */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground border-b pb-2">
                <User className="h-4 w-4" />
                Informacion Personal
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Nombre completo *</Label>
                  <Input
                    id="client-name"
                    placeholder="Nombre del cliente"
                    value={newClientForm.name}
                    onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                    required
                    disabled={savingClient}
                  />
                  <InputError message={clientFormErrors.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">Email *</Label>
                  <Input
                    id="client-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    required
                    disabled={savingClient}
                  />
                  <InputError message={clientFormErrors.email} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-phone">Telefono</Label>
                  <Input
                    id="client-phone"
                    type="tel"
                    placeholder="+57 300 123 4567"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    disabled={savingClient}
                  />
                  <InputError message={clientFormErrors.phone} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-birth-date">Fecha de nacimiento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !newClientForm.birth_date && "text-muted-foreground")} disabled={savingClient}>
                        <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                        {newClientForm.birth_date ? new Date(newClientForm.birth_date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DatePickerReport
                        selected={newClientForm.birth_date ? new Date(newClientForm.birth_date + 'T12:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            setNewClientForm({ ...newClientForm, birth_date: `${y}-${m}-${d}` });
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <InputError message={clientFormErrors.birth_date} />
                </div>
              </div>
            </div>

            {/* Identificacion */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground border-b pb-2">
                <FileText className="h-4 w-4" />
                Identificacion
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de documento</Label>
                  <Combobox
                    options={DOCUMENT_TYPES}
                    value={newClientForm.document_type}
                    onValueChange={(value) => setNewClientForm({ ...newClientForm, document_type: value })}
                    placeholder="Seleccionar tipo..."
                    searchPlaceholder="Buscar tipo de documento..."
                    emptyText="No se encontro el tipo de documento"
                    disabled={savingClient}
                  />
                  <InputError message={clientFormErrors.document_type} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-document">Numero de documento</Label>
                  <Input
                    id="client-document"
                    placeholder="Ej: 1234567890"
                    value={newClientForm.document_id}
                    onChange={(e) => setNewClientForm({ ...newClientForm, document_id: e.target.value })}
                    disabled={savingClient}
                  />
                  <InputError message={clientFormErrors.document_id} />
                </div>
              </div>
            </div>

            {/* Ubicacion */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground border-b pb-2">
                <MapPin className="h-4 w-4" />
                Ubicacion
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Pais</Label>
                  <Combobox
                    options={countryOptions}
                    value={selectedCountryId?.toString() || ""}
                    onValueChange={handleCountryChange}
                    placeholder="Seleccionar pais..."
                    searchPlaceholder="Buscar pais..."
                    emptyText="No se encontro el pais"
                    disabled={savingClient}
                    loading={loadingCountries}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Combobox
                    options={stateOptions}
                    value={selectedStateId?.toString() || ""}
                    onValueChange={handleStateChange}
                    placeholder="Seleccionar..."
                    searchPlaceholder="Buscar estado..."
                    emptyText="No se encontro el estado"
                    disabled={savingClient || !selectedCountryId}
                    loading={loadingStates}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Combobox
                    options={cityOptions}
                    value={cities.find((c) => c.name === newClientForm.city_name)?.id.toString() || ""}
                    onValueChange={handleCityChange}
                    placeholder="Seleccionar..."
                    searchPlaceholder="Buscar ciudad..."
                    emptyText="No se encontro la ciudad"
                    disabled={savingClient || !selectedStateId}
                    loading={loadingCities}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-address">Direccion</Label>
                <Input
                  id="client-address"
                  placeholder="Calle, numero, barrio..."
                  value={newClientForm.address}
                  onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
                  disabled={savingClient}
                />
                <InputError message={clientFormErrors.address} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewClientDialog(false);
                resetClientForm();
              }}
              disabled={savingClient}
            >
              Cancelar
            </Button>
            <Button onClick={createClient} disabled={savingClient}>
              {savingClient && <Spinner className="mr-2" size="sm" />}
              Crear cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Vista Previa de Factura</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="border border-border rounded-lg p-4 bg-muted/50">
              <div className="text-center mb-4">
                <h3 className="font-bold">{company?.name || 'Empresa'}</h3>
                <p className="text-xs text-muted-foreground">NIT: {company?.tax_id || ''}</p>
                <p className="text-xs text-muted-foreground">{company?.address || ''}</p>
              </div>
              <div className="border-t pt-4 space-y-2 text-sm">
                <p>
                  <strong>Factura:</strong> {invoiceNumber}
                </p>
                <p>
                  <strong>Fecha:</strong> {format(invoiceDate, "dd/MM/yyyy")}
                </p>
                <p>
                  <strong>Cliente:</strong> {selectedClient?.name || "Sin seleccionar"}
                </p>
              </div>
              <div className="border-t mt-4 pt-4">
                <p className="text-xs text-muted-foreground mb-2">Productos ({items.length})</p>
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.description}
                    </span>
                    <span>{formatCurrency(item.quantity * item.unitPrice)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-4 pt-4 text-right">
                <p className="text-lg font-bold">Total: {formatCurrency(calculations.netTotal)}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Confirmation Dialog */}
      <Dialog open={showLeaveConfirmation} onOpenChange={setShowLeaveConfirmation}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Cambios sin guardar
            </DialogTitle>
            <DialogDescription>
              Tienes una factura en progreso. Si sales sin guardar, perderás los cambios realizados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={() => {
                setShowLeaveConfirmation(false);
                navigationAllowedRef.current = true;
                if (pendingNavigation) {
                  router.visit(pendingNavigation);
                }
              }}
            >
              <LogOut className="h-4 w-4" />
              Salir y descartar cambios
            </Button>
            <Button
              className="w-full gap-2"
              onClick={handleSaveDraft}
              disabled={savingDraft}
            >
              {savingDraft ? (
                <Spinner size="sm" className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {savingDraft ? "Guardando..." : "Guardar como borrador y salir"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowLeaveConfirmation(false);
                setPendingNavigation(null);
              }}
            >
              Seguir editando
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal de creación rápida de producto/servicio */}
      <Dialog open={quickCreateOpen} onOpenChange={setQuickCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear producto o servicio</DialogTitle>
          </DialogHeader>

          {qcErrors.general && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {qcErrors.general}
            </div>
          )}

          <Tabs
            value={quickCreateType}
            onValueChange={(v) => {
              setQuickCreateType(v as "product" | "service");
              setQcErrors({});
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="product" className="gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Producto
              </TabsTrigger>
              <TabsTrigger value="service" className="gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                Servicio
              </TabsTrigger>
            </TabsList>

            {/* Tab Producto */}
            <TabsContent value="product" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="qc-product-name">Nombre *</Label>
                <Input
                  id="qc-product-name"
                  value={qcName}
                  onChange={(e) => setQcName(e.target.value)}
                  placeholder="Nombre del producto"
                />
                {qcErrors.name && <p className="text-xs text-destructive">{qcErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="qc-product-category">Categoría *</Label>
                <Select value={qcCategoryId} onValueChange={setQcCategoryId}>
                  <SelectTrigger id="qc-product-category">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    {productCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {qcErrors.category_id && <p className="text-xs text-destructive">{qcErrors.category_id}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="qc-sale-price">Precio de venta *</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      id="qc-sale-price"
                      type="text"
                      inputMode="numeric"
                      value={qcSalePrice || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setQcSalePrice(parseInt(val) || 0);
                      }}
                      placeholder="0"
                      className="pl-6"
                    />
                  </div>
                  {qcErrors.sale_price && <p className="text-xs text-destructive">{qcErrors.sale_price}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qc-purchase-price">Precio de compra</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      id="qc-purchase-price"
                      type="text"
                      inputMode="numeric"
                      value={qcPurchasePrice || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setQcPurchasePrice(parseInt(val) || 0);
                      }}
                      placeholder="0"
                      className="pl-6"
                    />
                  </div>
                  {qcErrors.purchase_price && <p className="text-xs text-destructive">{qcErrors.purchase_price}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="qc-tax-rate">IVA</Label>
                  <Select value={qcTaxRate} onValueChange={setQcTaxRate}>
                    <SelectTrigger id="qc-tax-rate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="null">Excluido</SelectItem>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="19">19%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    value={qcNextSku || "Generando..."}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="qc-trackable">Control de inventario</Label>
                  <Button
                    type="button"
                    variant={qcIsTrackable ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setQcIsTrackable(!qcIsTrackable)}
                  >
                    {qcIsTrackable ? "Activado" : "Desactivado"}
                  </Button>
                </div>
                {qcIsTrackable && (
                  <div className="space-y-2">
                    <Label htmlFor="qc-stock">Stock inicial</Label>
                    <Input
                      id="qc-stock"
                      type="text"
                      inputMode="numeric"
                      value={qcStock || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setQcStock(parseInt(val) || 0);
                      }}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab Servicio */}
            <TabsContent value="service" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="qc-service-name">Nombre *</Label>
                <Input
                  id="qc-service-name"
                  value={qcName}
                  onChange={(e) => setQcName(e.target.value)}
                  placeholder="Nombre del servicio"
                />
                {qcErrors.name && <p className="text-xs text-destructive">{qcErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="qc-service-category">Categoría *</Label>
                <Select value={qcServiceCategory} onValueChange={setQcServiceCategory}>
                  <SelectTrigger id="qc-service-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="consultoria">Consultoría</SelectItem>
                    <SelectItem value="capacitacion">Capacitación</SelectItem>
                    <SelectItem value="instalacion">Instalación</SelectItem>
                    <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="soporte">Soporte</SelectItem>
                    <SelectItem value="reparacion">Reparación</SelectItem>
                    <SelectItem value="diseno">Diseño</SelectItem>
                    <SelectItem value="transporte">Transporte</SelectItem>
                    <SelectItem value="limpieza">Limpieza</SelectItem>
                    <SelectItem value="profesional">Profesional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qc-service-price">Precio *</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    id="qc-service-price"
                    type="text"
                    inputMode="numeric"
                    value={qcServicePrice || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setQcServicePrice(parseInt(val) || 0);
                    }}
                    placeholder="0"
                    className="pl-6"
                  />
                </div>
                {qcErrors.price && <p className="text-xs text-destructive">{qcErrors.price}</p>}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickCreateOpen(false)} disabled={quickCreateLoading}>
              Cancelar
            </Button>
            <Button onClick={handleQuickCreate} disabled={quickCreateLoading}>
              {quickCreateLoading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Crear y agregar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
