import { Head, router } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import { Textarea } from "@/components/ui/textarea";
import { companiesApi, type RutParsedData } from "@/lib/api";
import type { Company } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  MoreVertical,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  Mail,
  Phone,
  Users,
  Power,
  FileUp,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react";

type SortOption = "name_asc" | "name_desc" | "date_desc" | "date_asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name_asc", label: "Nombre A-Z" },
  { value: "name_desc", label: "Nombre Z-A" },
  { value: "date_desc", label: "Más reciente" },
  { value: "date_asc", label: "Más antiguo" },
];

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20];

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function CompaniesIndex() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    tax_id: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  // RUT Import state
  const [rutDialogOpen, setRutDialogOpen] = useState(false);
  const [rutStep, setRutStep] = useState<"upload" | "review">("upload");
  const [rutParsing, setRutParsing] = useState(false);
  const [rutCreating, setRutCreating] = useState(false);
  const [rutData, setRutData] = useState<RutParsedData | null>(null);
  const [rutFile, setRutFile] = useState<File | null>(null);
  const [rutError, setRutError] = useState("");
  const [rutForm, setRutForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    tax_id: "",
    city: "",
    department: "",
    taxpayer_type: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const data = await companiesApi.getAll();
      setCompanies(data);
    } catch (error: any) {
      console.error("Error loading companies:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtering
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        company.name.toLowerCase().includes(term) ||
        company.email?.toLowerCase().includes(term) ||
        company.tax_id?.toLowerCase().includes(term) ||
        company.phone?.toLowerCase().includes(term);

      const matchesStatus =
        filterStatus === "" ||
        filterStatus === "todos" ||
        (filterStatus === "activa" ? company.is_active : !company.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [companies, searchTerm, filterStatus]);

  // Sorting
  const sortedCompanies = useMemo(() => {
    return [...filteredCompanies].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "date_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });
  }, [filteredCompanies, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedCompanies.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCompanies = sortedCompanies.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortBy, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta empresa? Esta acción no se puede deshacer.")) return;
    try {
      await companiesApi.delete(id);
      setCompanies((prev) => prev.filter((c) => c.id !== id));
    } catch (error: any) {
      console.error("Error deleting company:", error);
      await loadCompanies();
    }
  };

  const handleToggleActive = async (company: Company) => {
    try {
      const updated = await companiesApi.toggleActive(company.id);
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? updated : c)));
    } catch (error: any) {
      console.error("Error toggling company:", error);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", address: "", tax_id: "" });
    setEditingCompany(null);
    setErrors({});
    setGeneralError("");
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      email: company.email || "",
      phone: company.phone || "",
      address: company.address || "",
      tax_id: company.tax_id || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError("");
    setFormLoading(true);

    try {
      const data = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        tax_id: formData.tax_id || undefined,
        is_active: true,
      };

      if (editingCompany) {
        await companiesApi.update(editingCompany.id, data);
      } else {
        await companiesApi.create(data);
      }

      setDialogOpen(false);
      resetForm();
      await loadCompanies();
    } catch (error: any) {
      if (error.errors) {
        const formattedErrors: Record<string, string> = {};
        Object.keys(error.errors).forEach((key) => {
          formattedErrors[key] = Array.isArray(error.errors[key])
            ? error.errors[key][0]
            : error.errors[key];
        });
        setErrors(formattedErrors);
      } else {
        setGeneralError(error.message || "Error al guardar empresa");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleRutUpload = async (file: File) => {
    setRutError("");
    setRutParsing(true);
    setRutFile(file);
    try {
      const data = await companiesApi.parseRut(file);
      setRutData(data);
      setRutForm({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        tax_id: data.tax_id || "",
        city: data.city || "",
        department: data.department || "",
        taxpayer_type: data.taxpayer_type || "",
      });
      setRutStep("review");
    } catch (error: any) {
      setRutError(error.message || "Error al procesar el RUT");
    } finally {
      setRutParsing(false);
    }
  };

  const handleRutFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setRutError("Solo se permiten archivos PDF");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setRutError("El archivo no debe superar 5MB");
        return;
      }
      handleRutUpload(file);
    }
  };

  const handleRutDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setRutError("Solo se permiten archivos PDF");
        return;
      }
      handleRutUpload(file);
    }
  };

  const handleRutCreate = async () => {
    if (!rutForm.name.trim()) {
      setRutError("El nombre de la empresa es obligatorio");
      return;
    }
    if (!rutFile) {
      setRutError("No se encontró el archivo PDF");
      return;
    }
    setRutCreating(true);
    setRutError("");
    try {
      await companiesApi.createFromRut(rutFile, {
        name: rutForm.name,
        email: rutForm.email,
        phone: rutForm.phone,
        address: rutForm.address,
        tax_id: rutForm.tax_id,
        city: rutForm.city,
        department: rutForm.department,
      });

      toast({
        title: "Empresa creada desde RUT",
        description: `${rutForm.name} fue creada exitosamente con su sede principal y RUT guardado`,
      });
      setRutDialogOpen(false);
      setRutStep("upload");
      setRutData(null);
      setRutFile(null);
      setRutError("");
      await loadCompanies();
    } catch (error: any) {
      setRutError(error.message || "Error al crear la empresa");
    } finally {
      setRutCreating(false);
    }
  };

  const openRutDialog = () => {
    setRutStep("upload");
    setRutData(null);
    setRutFile(null);
    setRutError("");
    setRutForm({ name: "", email: "", phone: "", address: "", tax_id: "", city: "", department: "", taxpayer_type: "" });
    setRutDialogOpen(true);
  };

  return (
    <AppLayout title="Empresas">
      <Head title="Empresas" />
      <div className="space-y-6">
        {/* Header + Stats */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Empresas</h1>
                <p className="text-sm text-muted-foreground">Gestiona las empresas del sistema</p>
              </div>
            </div>
            {!loading && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-2xl font-bold">{companies.length}</p>
                  </div>
                </Card>
                <Card className="shadow-sm">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-500/100" />
                      <span className="text-xs text-muted-foreground">Activas</span>
                    </div>
                    <p className="text-2xl font-bold">{companies.filter((c) => c.is_active).length}</p>
                  </div>
                </Card>
                <Card className="shadow-sm">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-gray-400" />
                      <span className="text-xs text-muted-foreground">Inactivas</span>
                    </div>
                    <p className="text-2xl font-bold">{companies.filter((c) => !c.is_active).length}</p>
                  </div>
                </Card>
                <Card className="shadow-sm">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground">Total Sucursales</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {companies.reduce((acc, c) => acc + (c.branches?.length || 0), 0)}
                    </p>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

        <Card className="shadow-xl p-4 sm:p-6">
          {/* Search and Filters */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
              <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email, NIT o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="activa">Activas</SelectItem>
                  <SelectItem value="inactiva">Inactivas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button size="sm" variant="outline" className="gap-2 w-full sm:w-auto" onClick={openRutDialog}>
                <FileUp className="h-4 w-4" />
                Importar RUT
              </Button>
              <Button size="sm" className="gap-2 w-full sm:w-auto" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                Nueva Empresa
              </Button>
            </div>
          </div>

          {/* Company Cards */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner className="mr-2" />
              <p>Cargando...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedCompanies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || filterStatus
                    ? "No se encontraron empresas con los filtros seleccionados"
                    : "No hay empresas registradas"}
                </div>
              ) : (
                paginatedCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                            {getInitials(company.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => router.visit(`/admin/companies/${company.id}`)}
                              className="text-primary hover:text-primary/80 hover:underline font-semibold text-sm truncate text-left flex-1 min-w-0"
                            >
                              {company.name}
                            </button>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.visit(`/admin/companies/${company.id}`)}
                                className="h-7 px-2 text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Ver
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 bg-card z-50">
                                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => openEditDialog(company)}>
                                    <Edit className="h-4 w-4 text-primary" />
                                    <span className="text-primary">Editar empresa</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleToggleActive(company)}>
                                    <Power className="h-4 w-4 text-amber-500" />
                                    <span className="text-amber-600">{company.is_active ? "Desactivar" : "Activar"}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 cursor-pointer text-destructive" onClick={() => handleDelete(company.id)}>
                                    <Trash2 className="h-4 w-4" />
                                    <span>Eliminar empresa</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          {company.email && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{company.email}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant={company.is_active ? "default" : "secondary"} className={company.is_active ? "bg-green-500/100" : ""}>
                              {company.is_active ? "Activa" : "Inactiva"}
                            </Badge>
                            {company.parent_id && (
                              <Badge variant="outline" className="text-[10px]">Franquicia</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 w-full pt-3 mt-3 border-t">
                        {company.tax_id && (
                          <div>
                            <p className="text-xs text-muted-foreground">NIT</p>
                            <p className="text-sm font-medium">{company.tax_id}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Sucursales
                          </p>
                          <p className="text-sm font-medium">{company.branches?.length || 0}</p>
                        </div>
                        {company.phone && (
                          <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> Teléfono
                            </p>
                            <p className="text-sm font-medium">{company.phone}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Creada
                          </p>
                          <p className="text-sm font-medium">{formatDate(company.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:block">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar className="h-12 w-12 flex-shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {getInitials(company.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <button
                              onClick={() => router.visit(`/admin/companies/${company.id}`)}
                              className="text-primary hover:text-primary/80 hover:underline font-semibold truncate block text-left"
                            >
                              {company.name}
                            </button>
                            {company.email && (
                              <p className="text-xs text-muted-foreground truncate">{company.email}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={company.is_active ? "default" : "secondary"} className={company.is_active ? "bg-green-500/100" : ""}>
                                {company.is_active ? "Activa" : "Inactiva"}
                              </Badge>
                              {company.parent_id && (
                                <Badge variant="outline" className="text-[10px]">Franquicia</Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* NIT */}
                        <div className="hidden lg:block flex-shrink-0 w-36">
                          <p className="text-xs text-muted-foreground">NIT</p>
                          <p className="text-sm font-medium">{company.tax_id || "—"}</p>
                        </div>

                        {/* Contacto */}
                        <div className="hidden lg:block flex-shrink-0 w-40">
                          <p className="text-xs text-muted-foreground">Contacto</p>
                          {company.phone && (
                            <p className="text-sm font-medium flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {company.phone}
                            </p>
                          )}
                          {!company.phone && <p className="text-sm text-muted-foreground">—</p>}
                        </div>

                        {/* Sucursales */}
                        <div className="flex-shrink-0 w-28">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Sucursales
                          </p>
                          <p className="text-sm font-bold">{company.branches?.length || 0}</p>
                        </div>

                        {/* Fecha */}
                        <div className="hidden xl:block flex-shrink-0 w-28">
                          <p className="text-xs text-muted-foreground">Creada</p>
                          <p className="text-sm font-medium">{formatDate(company.created_at)}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.visit(`/admin/companies/${company.id}`)}
                            className="h-9 px-3 gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden lg:inline">Ver</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-card z-50">
                              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => openEditDialog(company)}>
                                <Edit className="h-4 w-4 text-primary" />
                                <span className="text-primary">Editar empresa</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleToggleActive(company)}>
                                <Power className="h-4 w-4 text-amber-500" />
                                <span className="text-amber-600">{company.is_active ? "Desactivar" : "Activar"}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 cursor-pointer text-destructive" onClick={() => handleDelete(company.id)}>
                                <Trash2 className="h-4 w-4" />
                                <span>Eliminar empresa</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pagination */}
          {!loading && sortedCompanies.length > 0 && (
            <div className="flex flex-col gap-4 mt-6 pt-4 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Mostrando{" "}
                  <span className="font-semibold">
                    {sortedCompanies.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, sortedCompanies.length)}
                  </span>{" "}
                  de <span className="font-semibold">{sortedCompanies.length}</span> empresas.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Mostrar:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                    <SelectTrigger className="w-[80px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">por página</span>
                </div>
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    Página <span className="font-medium">{safePage}</span> de{" "}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(safePage - 1)} disabled={safePage === 1} className="gap-1">
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline">Anterior</span>
                        </Button>
                      </PaginationItem>
                      {getPageNumbers().map((page, index) => (
                        <PaginationItem key={index} className="hidden sm:block">
                          {page === "ellipsis" ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink onClick={() => handlePageChange(page)} isActive={safePage === page} className="cursor-pointer">
                              {page}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(safePage + 1)} disabled={safePage === totalPages} className="gap-1">
                          <span className="hidden sm:inline">Siguiente</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCompany ? "Editar Empresa" : "Nueva Empresa"}</DialogTitle>
              <DialogDescription>
                {editingCompany ? "Modifica los datos de la empresa" : "Ingresa los datos de la nueva empresa"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {generalError && (
                <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">{generalError}</div>
              )}
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={formLoading} />
                <InputError message={errors.name} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={formLoading} />
                  <InputError message={errors.email} />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} disabled={formLoading} />
                  <InputError message={errors.phone} />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} disabled={formLoading} />
                <InputError message={errors.address} />
              </div>
              <div>
                <Label htmlFor="tax_id">NIT / Tax ID</Label>
                <Input id="tax_id" value={formData.tax_id} onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })} disabled={formLoading} />
                <InputError message={errors.tax_id} />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} disabled={formLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading && <Spinner className="mr-2" size="sm" />}
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* RUT Import Dialog */}
        <Dialog open={rutDialogOpen} onOpenChange={(open) => { setRutDialogOpen(open); if (!open) { setRutStep("upload"); setRutError(""); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {rutStep === "upload" ? "Importar RUT" : "Confirmar datos del RUT"}
              </DialogTitle>
              <DialogDescription>
                {rutStep === "upload"
                  ? "Sube el PDF del RUT de la DIAN para crear la empresa automáticamente"
                  : "Verifica y edita los datos extraídos antes de crear la empresa"
                }
              </DialogDescription>
            </DialogHeader>

            {rutStep === "upload" && (
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  onDrop={handleRutDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => document.getElementById("rut-file-input")?.click()}
                >
                  {rutParsing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                      <p className="text-sm font-medium">Procesando RUT...</p>
                      <p className="text-xs text-muted-foreground">Extrayendo datos del documento</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Arrastra el PDF del RUT aquí</p>
                        <p className="text-xs text-muted-foreground mt-1">o haz click para seleccionar — solo PDF, máx 5MB</p>
                      </div>
                    </div>
                  )}
                  <input
                    id="rut-file-input"
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleRutFileChange}
                    disabled={rutParsing}
                  />
                </div>

                {rutError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{rutError}</p>
                  </div>
                )}

                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">¿Dónde consigo el RUT?</p>
                  <p className="text-xs text-muted-foreground">
                    Descárgalo desde el portal de la DIAN: Consulta de RUT &gt; Descargar PDF
                  </p>
                </div>
              </div>
            )}

            {rutStep === "review" && rutData && (
              <div className="space-y-4">
                {/* Success banner */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/100/10 border border-emerald-500/20">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-sm text-emerald-700">Datos extraídos correctamente del RUT #{rutData.form_number}</p>
                </div>

                {/* RUT metadata */}
                {(rutData.taxpayer_type || rutData.document_type || rutData.economic_activities.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {rutData.taxpayer_type && (
                      <Badge variant="outline" className="text-xs">{rutData.taxpayer_type}</Badge>
                    )}
                    {rutData.document_type && (
                      <Badge variant="outline" className="text-xs">{rutData.document_type}: {rutData.document_number}</Badge>
                    )}
                    {rutData.economic_activities.map((code) => (
                      <Badge key={code} variant="secondary" className="text-xs">CIIU {code}</Badge>
                    ))}
                  </div>
                )}

                {/* Editable form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-medium">Nombre / Razón Social *</Label>
                    <Input
                      value={rutForm.name}
                      onChange={(e) => setRutForm((p) => ({ ...p, name: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">NIT</Label>
                    <Input
                      value={rutForm.tax_id}
                      onChange={(e) => setRutForm((p) => ({ ...p, tax_id: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Email</Label>
                    <Input
                      value={rutForm.email}
                      onChange={(e) => setRutForm((p) => ({ ...p, email: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Teléfono</Label>
                    <Input
                      value={rutForm.phone}
                      onChange={(e) => setRutForm((p) => ({ ...p, phone: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Tipo contribuyente</Label>
                    <Input
                      value={rutForm.taxpayer_type}
                      onChange={(e) => setRutForm((p) => ({ ...p, taxpayer_type: e.target.value }))}
                      className="mt-1"
                      disabled
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Sede Principal (se crea automáticamente)
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-medium">Dirección</Label>
                    <Input
                      value={rutForm.address}
                      onChange={(e) => setRutForm((p) => ({ ...p, address: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Ciudad</Label>
                    <Input
                      value={rutForm.city}
                      onChange={(e) => setRutForm((p) => ({ ...p, city: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Departamento</Label>
                    <Input
                      value={rutForm.department}
                      onChange={(e) => setRutForm((p) => ({ ...p, department: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                {rutError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{rutError}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setRutStep("upload"); setRutError(""); }}
                    disabled={rutCreating}
                  >
                    Subir otro RUT
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleRutCreate}
                    disabled={rutCreating || !rutForm.name.trim()}
                  >
                    {rutCreating ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Creando...</>
                    ) : (
                      <><Building2 className="h-4 w-4" /> Crear Empresa</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
