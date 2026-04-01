import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import { productsApi, productCategoriesApi, productAreasApi, companiesApi, locationsApi, warehousesApi, suppliersApi, servicesApi } from "@/lib/api";
import type { Company, SharedData } from "@/types";
import type { Product, ProductCategory, ProductArea, Location, Warehouse, Supplier, Service, ServiceCategories, ServiceUnits } from "@/lib/api";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { loadPdfLogo, addLogoToPdf } from "@/lib/pdf-logo";
import { useToast } from "@/hooks/use-toast";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import { Switch } from "@/components/ui/switch";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Package, Plus, Edit, Trash2, MapPin, BarChart3, TrendingDown, TrendingUp, RefreshCw, Truck, QrCode, Printer, DollarSign, Download, FileText, FileSpreadsheet, ArrowRight, Eye, AlertTriangle, Search, MoreVertical, ChevronLeft, ChevronRight, AlertCircle, Tag, Clock, Loader2, Upload } from "lucide-react";
import type { BulkPriceAdjustRequest, ProductFilterOptions } from "@/lib/api";
import * as XLSX from "xlsx";

// Unidades de medida predefinidas (como Zyscore)
const UNIT_MEASURES = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'litro', label: 'Litro' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'gramo', label: 'Gramo' },
  { value: 'metro', label: 'Metro' },
  { value: 'metro_cuadrado', label: 'Metro Cuadrado' },
  { value: 'metro_cubico', label: 'Metro Cubico' },
  { value: 'par', label: 'Par' },
  { value: 'docena', label: 'Docena' },
  { value: 'caja', label: 'Caja' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'botella', label: 'Botella' },
  { value: 'resma', label: 'Resma' },
  { value: 'juego', label: 'Juego' },
];

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20];

type CatalogTabValue = 'todos' | 'productos' | 'servicios';

type CatalogItem = {
  id: number;
  tipo: 'producto' | 'servicio';
  codigo: string;
  nombre: string;
  estado: 'activo' | 'inactivo' | 'agotado';
  categoria: string;
  area: string;
  marca: string;
  stock: number;
  minStock: number;
  precioVenta: number;
  costoUnitario: number;
  duracion: string;
  is_active: boolean;
  originalProduct?: Product;
  originalService?: Service;
};

export default function ProductsIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const { toast } = useToast();
  const userIsSuperAdmin = isSuperAdmin(user);
  const canView = hasPermission('products.view', user);
  const canManage = hasPermission('products.manage', user);
  const barcodeTicketEnabled = user?.company?.settings?.barcode_ticket_enabled === true;
  const canManageTickets = hasPermission('settings.barcode-ticket', user);
  const canBulkPriceAdjust = hasPermission('products.bulk-price-adjust', user);

  const initialCompanyId = !userIsSuperAdmin && user?.company_id
    ? user.company_id.toString()
    : '';

  // ALL useState hooks must be declared before any conditional returns
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [areas, setAreas] = useState<ProductArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<CatalogTabValue>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategories>({});
  const [serviceUnits, setServiceUnits] = useState<ServiceUnits>({});

  // Stock adjustment modal state
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockOperation, setStockOperation] = useState<'add' | 'subtract' | 'set'>('add');
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockNotes, setStockNotes] = useState('');
  const [stockLoading, setStockLoading] = useState(false);

  // Barcode/QR Ticket modal state
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketProduct, setTicketProduct] = useState<Product | null>(null);
  const [ticketMode, setTicketMode] = useState<'barcode' | 'qr'>('barcode');
  const [showPrice, setShowPrice] = useState(true);
  const [includePriceInQr, setIncludePriceInQr] = useState(true);

  // Bulk Price Adjustment modal state
  const [bulkPriceDialogOpen, setBulkPriceDialogOpen] = useState(false);
  const [bulkPriceLoading, setBulkPriceLoading] = useState(false);
  const [bulkPriceFilterOptions, setBulkPriceFilterOptions] = useState<ProductFilterOptions>({ brands: [], units: [] });
  const [bulkPriceForm, setBulkPriceForm] = useState({
    target_field: 'sale_price' as 'purchase_price' | 'sale_price',
    operation: 'increase' as 'increase' | 'decrease',
    adjustment_type: 'percentage' as 'fixed' | 'percentage',
    value: '',
    filter_type: 'all' as BulkPriceAdjustRequest['filter_type'],
    filter_value: '',
  });
  const [bulkPriceResult, setBulkPriceResult] = useState<string | null>(null);
  const [bulkPricePreviewData, setBulkPricePreviewData] = useState<{
    id: number; name: string; sku: string; brand: string; currentPrice: number; newPrice: number;
  }[]>([]);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: 'danger' | 'warning';
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', variant: 'danger', onConfirm: () => {} });

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    brand: '',
    description: '',
    sale_price: '',
    purchase_price: '',
    tax_rate: 'excluded' as string,
    current_stock: '0',
    min_stock: '',
    max_stock: '',
    unit_of_measure: 'unidad',
    category_id: '',
    area_id: '',
    location_id: '',
    supplier_id: '',
    company_id: initialCompanyId,
    is_active: true,
    is_trackable: true,
    auto_purchase_enabled: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [exportMode, setExportMode] = useState<'info' | 'count'>('info');

  const companyFilter = useSuperAdminCompanyFilter();

  useEffect(() => {
    if (!canView) {
      window.location.href = '/admin/dashboard';
      return;
    }
    if (companyFilter.shouldLoadData) {
      loadData();
    }
  }, [canView, companyFilter.isFiltered, companyFilter.selectedCompanyId]);

  // Return null after hooks if no permission
  if (!canView) {
    return null;
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData, areasData, locationsData, warehousesData, suppliersData, servicesData, serviceCatsData, serviceUnitsData] = await Promise.all([
        productsApi.getAll({ company_id: companyFilter.companyIdParam }),
        productCategoriesApi.getAll({ company_id: companyFilter.companyIdParam }),
        productAreasApi.getAll(),
        locationsApi.getAll({ company_id: companyFilter.companyIdParam }),
        warehousesApi.getAll({ company_id: companyFilter.companyIdParam }),
        suppliersApi.getAll({ company_id: companyFilter.companyIdParam }),
        servicesApi.getAll().catch(() => [] as Service[]),
        servicesApi.getCategories().catch(() => ({} as ServiceCategories)),
        servicesApi.getUnits().catch(() => ({} as ServiceUnits)),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setAreas(areasData);
      setLocations(locationsData);
      setWarehouses(warehousesData);
      setSuppliers(suppliersData);
      setServices(servicesData);
      setServiceCategories(serviceCatsData);
      setServiceUnits(serviceUnitsData);

      if (userIsSuperAdmin) {
        const companiesData = await companiesApi.getAll();
        setCompanies(companiesData);
      } else if (user?.company_id) {
        setCompanies([{ id: user.company_id, name: user.company?.name || 'Mi Empresa' } as Company]);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      setGeneralError(error.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async (mode: 'info' | 'count' = 'info') => {
    if (filteredItems.length === 0) return;
    try {
      setExporting(true);
      toast({ title: "Generando PDF...", description: mode === 'count' ? "Creando planilla de conteo." : "Construyendo reporte de productos." });
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;

      const companyName = user.company?.name || 'LEGAL SISTEMA';
      const companyTaxId = user.company?.tax_id || '';
      const companyAddress = user.company?.address || '';
      const generatedDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });

      const isCount = mode === 'count';

      // Footer on every page
      const addFooters = () => {
        const pages = pdf.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
          pdf.setPage(i);
          const footerY = pageHeight - 12;
          pdf.setDrawColor(229, 231, 235);
          pdf.line(margin, footerY, pageWidth - margin, footerY);
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(156, 163, 175);
          pdf.text(`${companyName} — Sistema de Gestión`, pageWidth / 2, footerY + 4, { align: 'center' });
          pdf.setTextColor(176, 181, 191);
          pdf.text('Desarrollado por Legal Sistema · www.legalsistema.co', pageWidth / 2, footerY + 7, { align: 'center' });
          pdf.setTextColor(209, 213, 219);
          pdf.text(`Generado el ${generatedDate} | Página ${i} de ${pages}`, pageWidth / 2, footerY + 10, { align: 'center' });
        }
      };

      const logoDataUrl = await loadPdfLogo(user.company?.logo_url);

      // Header
      let currentY = margin;
      const logoH = addLogoToPdf(pdf, logoDataUrl, margin, currentY, 12, 40);
      currentY += logoH;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text(companyName, margin, currentY + 5);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      let infoY = currentY + 9;
      if (companyTaxId) { pdf.text(`NIT: ${companyTaxId}`, margin, infoY); infoY += 3; }
      if (companyAddress) { pdf.text(companyAddress, margin, infoY); infoY += 3; }

      const rightX = pageWidth - margin;
      pdf.setFillColor(238, 242, 255);
      pdf.setTextColor(79, 70, 229);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      const badgeText = isCount ? 'CONTEO' : 'REPORTE';
      const badgeW = pdf.getTextWidth(badgeText) + 6;
      pdf.roundedRect(rightX - badgeW, currentY - 1, badgeW, 5, 1, 1, 'F');
      pdf.text(badgeText, rightX - badgeW + 3, currentY + 2.5);

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(79, 70, 229);
      pdf.text(isCount ? 'Planilla de Conteo de Inventario' : 'Catálogo de Productos y Servicios', rightX, currentY + 9, { align: 'right' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Generado el ${generatedDate}`, rightX, currentY + 13, { align: 'right' });

      currentY += 18;
      pdf.setDrawColor(79, 70, 229);
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 6;

      // Summary Cards
      const totalProducts = filteredItems.filter(i => i.tipo === 'producto').length;
      const totalServices = filteredItems.filter(i => i.tipo === 'servicio').length;
      const totalValue = filteredItems.reduce((sum, i) => sum + i.precioVenta * (i.tipo === 'producto' ? i.stock : 1), 0);
      const lowStock = filteredItems.filter(i => i.tipo === 'producto' && i.stock > 0 && i.stock <= i.minStock).length;

      if (isCount) {
        const cardData = [
          { label: 'TOTAL ITEMS', value: String(filteredItems.filter(i => i.tipo === 'producto').length), bg: [238, 242, 255], border: [199, 210, 254], color: [37, 99, 235] },
          { label: 'UNIDADES EN SISTEMA', value: filteredItems.filter(i => i.tipo === 'producto').reduce((s, i) => s + i.stock, 0).toLocaleString('es-CO'), bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
          { label: 'CATEGORÍAS', value: String(new Set(filteredItems.map(i => i.categoria).filter(Boolean)).size), bg: [250, 245, 255], border: [233, 213, 255], color: [147, 51, 234] },
        ];
        const cardW = (contentWidth - 4) / 3;
        cardData.forEach((card, idx) => {
          const x = margin + idx * (cardW + 2);
          pdf.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
          pdf.setDrawColor(card.border[0], card.border[1], card.border[2]);
          pdf.roundedRect(x, currentY, cardW, 14, 1.5, 1.5, 'FD');
          pdf.setFontSize(6.5);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(107, 114, 128);
          pdf.text(card.label, x + cardW / 2, currentY + 5, { align: 'center' });
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(card.color[0], card.color[1], card.color[2]);
          pdf.text(card.value, x + cardW / 2, currentY + 11, { align: 'center' });
        });
      } else {
        const cardData = [
          { label: 'PRODUCTOS', value: String(totalProducts), bg: [238, 242, 255], border: [199, 210, 254], color: [37, 99, 235] },
          { label: 'SERVICIOS', value: String(totalServices), bg: [250, 245, 255], border: [233, 213, 255], color: [147, 51, 234] },
          { label: 'VALOR INVENTARIO', value: formatCurrency(totalValue), bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
          { label: 'STOCK BAJO', value: String(lowStock), bg: [254, 242, 242], border: [252, 165, 165], color: [220, 38, 38] },
        ];
        const cardW = (contentWidth - 6) / 4;
        cardData.forEach((card, idx) => {
          const x = margin + idx * (cardW + 2);
          pdf.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
          pdf.setDrawColor(card.border[0], card.border[1], card.border[2]);
          pdf.roundedRect(x, currentY, cardW, 14, 1.5, 1.5, 'FD');
          pdf.setFontSize(6.5);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(107, 114, 128);
          pdf.text(card.label, x + cardW / 2, currentY + 5, { align: 'center' });
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(card.color[0], card.color[1], card.color[2]);
          pdf.text(card.value, x + cardW / 2, currentY + 11, { align: 'center' });
        });
      }
      currentY += 20;

      // Table section header
      if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
      pdf.setFillColor(79, 70, 229);
      pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(isCount ? 'Planilla de Conteo' : 'Detalle del Catálogo', margin + 4, currentY + 4.8);
      currentY += 9;

      let tableHead: string[][];
      let tableBody: (string | number)[][];

      if (isCount) {
        // Only products for count mode
        const countItems = filteredItems.filter(i => i.tipo === 'producto');
        tableHead = [['#', 'Producto', 'SKU', 'Categoría', 'Stock Sistema', 'Verificado', 'Cantidad Real', 'Diferencia', 'Observaciones']];
        tableBody = countItems.map((item, idx) => [
          String(idx + 1),
          item.nombre,
          item.codigo || '-',
          item.categoria || 'Sin categoría',
          item.stock.toLocaleString('es-CO'),
          '[ ]',
          '',
          '',
          '',
        ]);
      } else {
        tableHead = [['Código', 'Nombre', 'Tipo', 'Categoría', 'Marca', 'Stock', 'P. Venta', 'Costo', 'Estado']];
        tableBody = filteredItems.map(item => [
          item.codigo || '-',
          item.nombre,
          item.tipo === 'producto' ? 'Producto' : 'Servicio',
          item.categoria || '-',
          item.marca || '-',
          item.tipo === 'producto' ? item.stock.toLocaleString('es-CO') : 'N/A',
          formatCurrency(item.precioVenta),
          formatCurrency(item.costoUnitario),
          item.estado === 'activo' ? 'Activo' : item.estado === 'inactivo' ? 'Inactivo' : 'Agotado',
        ]);
      }

      autoTable(pdf, {
        startY: currentY,
        head: tableHead,
        body: tableBody,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [51, 51, 51] },
        headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: isCount ? {
          0: { halign: 'center', cellWidth: 8 },
          4: { halign: 'right' },
          5: { halign: 'center', cellWidth: 16 },
          6: { halign: 'right', cellWidth: 24 },
          7: { halign: 'right', cellWidth: 22 },
          8: { cellWidth: 30 },
        } : {
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'center' },
        },
        didParseCell: (data: any) => {
          // Hide [ ] text for checkbox column - we draw it in didDrawCell
          if (isCount && data.section === 'body' && data.column.index === 5) {
            data.cell.text = [''];
          }
        },
        didDrawCell: (data: any) => {
          // Draw checkbox square in "Verificado" column
          if (isCount && data.section === 'body' && data.column.index === 5) {
            const size = 3.5;
            const x = data.cell.x + (data.cell.width - size) / 2;
            const y = data.cell.y + (data.cell.height - size) / 2;
            pdf.setDrawColor(150, 150, 150);
            pdf.setLineWidth(0.3);
            pdf.rect(x, y, size, size);
          }
        },
        didDrawPage: () => { currentY = margin; },
      });

      // Signature section for count mode
      if (isCount) {
        const sigY = (pdf as any).lastAutoTable.finalY + 15;
        if (sigY + 30 < pageHeight - 25) {
          pdf.setFontSize(8);
          pdf.setTextColor(107, 114, 128);
          const halfW = (pageWidth - margin * 2) / 2;
          pdf.text('Responsable del Conteo:', margin, sigY);
          pdf.line(margin + 40, sigY, margin + halfW - 10, sigY);
          pdf.text('Fecha del Conteo:', margin + halfW, sigY);
          pdf.line(margin + halfW + 30, sigY, pageWidth - margin, sigY);
          pdf.text('Firma:', margin, sigY + 15);
          pdf.line(margin + 15, sigY + 15, margin + halfW - 10, sigY + 15);
          pdf.text('Observaciones Generales:', margin + halfW, sigY + 15);
          pdf.line(margin + halfW + 40, sigY + 15, pageWidth - margin, sigY + 15);
        }
      }

      addFooters();
      pdf.save(isCount ? `Conteo_Inventario_${Date.now()}.pdf` : `Catalogo_Productos_${Date.now()}.pdf`);
      toast({ title: "PDF generado", description: "El archivo se descargó correctamente." });
    } catch (err: any) {
      console.error("Error exporting PDF:", err);
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async (mode: 'info' | 'count' = 'info') => {
    if (filteredItems.length === 0) return;
    try {
      setExporting(true);
      const XLSXStyled = await import('xlsx-js-style');

      const companyName = user.company?.name || 'LEGAL SISTEMA';
      const isCount = mode === 'count';
      const rows: any[][] = [];
      const sectionHeaderRows: number[] = [];
      const columnHeaderRows: number[] = [];
      let row = 0;
      const totalCols = 9;

      // Title
      rows.push([`${isCount ? 'PLANILLA DE CONTEO DE INVENTARIO' : 'CATÁLOGO DE PRODUCTOS Y SERVICIOS'} — ${companyName}`, '', '', '', '', '', '', '', '']);
      sectionHeaderRows.push(row);
      row++;
      rows.push([isCount ? 'Formato para verificación física del inventario' : 'Listado completo del catálogo', '', '', '', '', '', '', '', '']);
      row++;

      // Summary
      rows.push(['', '', '', '', '', '', '', '', '']);
      row++;

      if (isCount) {
        const countItems = filteredItems.filter(i => i.tipo === 'producto');
        rows.push([
          'RESUMEN',
          `Productos: ${countItems.length}`,
          '',
          `Unidades: ${countItems.reduce((s, i) => s + i.stock, 0).toLocaleString('es-CO')}`,
          '',
          `Categorías: ${new Set(countItems.map(i => i.categoria).filter(Boolean)).size}`,
          '', '', '',
        ]);
      } else {
        const totalProducts = filteredItems.filter(i => i.tipo === 'producto').length;
        const totalServices = filteredItems.filter(i => i.tipo === 'servicio').length;
        rows.push([
          'RESUMEN',
          `Productos: ${totalProducts}`,
          '',
          `Servicios: ${totalServices}`,
          '',
          `Total items: ${filteredItems.length}`,
          '', '', '',
        ]);
      }
      sectionHeaderRows.push(row);
      row++;
      rows.push(['', '', '', '', '', '', '', '', '']);
      row++;

      // Section header
      rows.push([isCount ? 'PLANILLA DE CONTEO' : 'DETALLE DEL CATÁLOGO', '', '', '', '', '', '', '', '']);
      sectionHeaderRows.push(row);
      row++;

      // Column headers
      if (isCount) {
        rows.push(['#', 'Producto', 'SKU', 'Categoría', 'Stock Sistema', 'Verificado', 'Cantidad Real', 'Diferencia', 'Observaciones']);
      } else {
        rows.push(['Código', 'Nombre', 'Tipo', 'Categoría', 'Marca', 'Stock', 'P. Venta', 'Costo', 'Estado']);
      }
      columnHeaderRows.push(row);
      row++;

      // Data
      if (isCount) {
        const countItems = filteredItems.filter(i => i.tipo === 'producto');
        countItems.forEach((item, idx) => {
          rows.push([
            idx + 1,
            item.nombre,
            item.codigo || '-',
            item.categoria || 'Sin categoría',
            item.stock,
            '',
            '',
            '',
            '',
          ]);
          row++;
        });
      } else {
        filteredItems.forEach(item => {
          rows.push([
            item.codigo || '-',
            item.nombre,
            item.tipo === 'producto' ? 'Producto' : 'Servicio',
            item.categoria || '-',
            item.marca || '-',
            item.tipo === 'producto' ? item.stock : 'N/A',
            item.precioVenta,
            item.costoUnitario,
            item.estado === 'activo' ? 'Activo' : item.estado === 'inactivo' ? 'Inactivo' : 'Agotado',
          ]);
          row++;
        });
      }

      // Signature for count mode
      if (isCount) {
        rows.push(['', '', '', '', '', '', '', '', '']);
        row++;
        rows.push(['Responsable del Conteo:', '', '', '', 'Fecha del Conteo:', '', '', '', '']);
        row++;
        rows.push(['', '', '', '', '', '', '', '', '']);
        row++;
        rows.push(['Firma:', '', '', '', 'Observaciones Generales:', '', '', '', '']);
        row++;
      }

      const ws = XLSXStyled.utils.aoa_to_sheet(rows);

      ws['!cols'] = isCount
        ? [{ wch: 5 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 24 }]
        : [{ wch: 14 }, { wch: 28 }, { wch: 10 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 10 }];

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      ];

      const borderStyle = { style: 'thin', color: { rgb: 'E5E7EB' } };
      const thinBorder = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

      for (let R = 0; R < rows.length; R++) {
        for (let C = 0; C < totalCols; C++) {
          const addr = XLSXStyled.utils.encode_cell({ r: R, c: C });
          if (!ws[addr]) ws[addr] = { v: '', t: 's' };
          ws[addr].s = { border: thinBorder };

          if (sectionHeaderRows.includes(R)) {
            ws[addr].s = {
              font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '4F46E5' } },
              alignment: { horizontal: 'left', vertical: 'center' },
              border: thinBorder,
            };
          }

          if (columnHeaderRows.includes(R)) {
            ws[addr].s = {
              font: { bold: true, sz: 10, color: { rgb: '374151' } },
              fill: { fgColor: { rgb: 'E5E7EB' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: thinBorder,
            };
          }

          if (R === 1) {
            ws[addr].s = {
              font: { sz: 10, color: { rgb: '6B7280' } },
              alignment: { horizontal: 'left' },
              border: thinBorder,
            };
          }
        }
      }

      const wb = XLSXStyled.utils.book_new();
      XLSXStyled.utils.book_append_sheet(wb, ws, isCount ? 'Conteo' : 'Catálogo');
      XLSXStyled.writeFile(wb, isCount ? `Conteo_Inventario_${Date.now()}.xlsx` : `Catalogo_Productos_${Date.now()}.xlsx`);
      toast({ title: "Excel generado", description: "El archivo se descargó correctamente." });
    } catch (err: any) {
      console.error("Error exporting Excel:", err);
      toast({ title: "Error", description: "No se pudo generar el Excel", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_id) {
      setGeneralError('Debes seleccionar una empresa');
      return;
    }
    setErrors({});
    setGeneralError('');
    setFormLoading(true);

    try {
      const data = {
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode || undefined,
        brand: formData.brand || undefined,
        description: formData.description || undefined,
        sale_price: parseFloat(formData.sale_price),
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : undefined,
        tax_rate: formData.tax_rate !== 'excluded' ? parseFloat(formData.tax_rate) : null,
        current_stock: parseInt(formData.current_stock) || 0,
        min_stock: formData.min_stock ? parseInt(formData.min_stock) : undefined,
        max_stock: formData.max_stock ? parseInt(formData.max_stock) : undefined,
        unit_of_measure: formData.unit_of_measure,
        category_id: formData.category_id ? parseInt(formData.category_id) : undefined,
        area_id: formData.area_id ? parseInt(formData.area_id) : undefined,
        location_id: formData.location_id ? parseInt(formData.location_id) : undefined,
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : undefined,
        company_id: parseInt(formData.company_id),
        is_active: formData.is_active,
        is_trackable: formData.is_trackable,
        auto_purchase_enabled: formData.auto_purchase_enabled,
      };

      if (editingProduct) {
        const updatedProduct = await productsApi.update(editingProduct.id, data);
        setProducts(prevProducts =>
          prevProducts.map(product =>
            product.id === editingProduct.id ? updatedProduct : product
          )
        );
      } else {
        const newProduct = await productsApi.create(data);
        setProducts(prevProducts => [...prevProducts, newProduct]);
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving product:', error);
      if (error.errors) {
        const formattedErrors: Record<string, string> = {};
        Object.keys(error.errors).forEach(key => {
          formattedErrors[key] = Array.isArray(error.errors[key])
            ? error.errors[key][0]
            : error.errors[key];
        });
        setErrors(formattedErrors);
      } else {
        setGeneralError(error.message || 'Error al guardar producto');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    const product = products.find(p => p.id === id);
    setConfirmDialog({
      open: true,
      title: 'Eliminar Producto',
      description: `¿Estas seguro de eliminar "${product?.name || 'este producto'}"? Esta accion no se puede deshacer.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await productsApi.delete(id);
          setProducts(prevProducts => prevProducts.filter(p => p.id !== id));
        } catch (error: any) {
          console.error('Error deleting product:', error);
          setGeneralError(error.message || 'Error al eliminar producto');
          await loadData();
        }
      },
    });
  };

  const resetForm = () => {
    const defaultCompanyId = !userIsSuperAdmin && user?.company_id
      ? user.company_id.toString()
      : '';

    setFormData({
      name: '',
      sku: '',
      barcode: '',
      brand: '',
      description: '',
      sale_price: '',
      purchase_price: '',
      tax_rate: 'excluded',
      current_stock: '0',
      min_stock: '',
      max_stock: '',
      unit_of_measure: 'unidad',
      category_id: '',
      area_id: '',
      location_id: '',
      supplier_id: '',
      company_id: defaultCompanyId,
      is_active: true,
      is_trackable: true,
      auto_purchase_enabled: false,
    });
    setEditingProduct(null);
    setErrors({});
    setGeneralError('');
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      brand: product.brand || '',
      description: product.description || '',
      sale_price: product.sale_price.toString(),
      purchase_price: product.purchase_price?.toString() || '',
      tax_rate: product.tax_rate != null ? product.tax_rate.toString() : 'excluded',
      current_stock: product.current_stock.toString(),
      min_stock: product.min_stock?.toString() || '',
      max_stock: product.max_stock?.toString() || '',
      unit_of_measure: product.unit_of_measure || 'unidad',
      category_id: product.category_id?.toString() || '',
      area_id: product.area_id?.toString() || '',
      location_id: product.location_id?.toString() || '',
      supplier_id: product.supplier_id?.toString() || '',
      company_id: product.company_id.toString(),
      is_active: product.is_active,
      is_trackable: product.is_trackable,
      auto_purchase_enabled: product.auto_purchase_enabled || false,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const getUnitLabel = (value: string) => {
    return UNIT_MEASURES.find(u => u.value === value)?.label || value;
  };

  const getStockStatus = (product: Product) => {
    if (product.current_stock === 0) return 'out_of_stock';
    if (product.min_stock && product.current_stock <= product.min_stock) return 'low_stock';
    if (product.max_stock && product.current_stock > product.max_stock) return 'over_stock';
    return 'in_stock';
  };

  const getStockBadge = (product: Product) => {
    const status = getStockStatus(product);
    switch (status) {
      case 'out_of_stock':
        return <Badge variant="destructive">Sin stock</Badge>;
      case 'low_stock':
        return <Badge variant="destructive" className="bg-orange-500/100">Bajo stock</Badge>;
      case 'over_stock':
        return <Badge variant="secondary" className="bg-yellow-500/100 text-yellow-900">Exceso</Badge>;
      default:
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">En stock</Badge>;
    }
  };

  // Filtrar areas por empresa seleccionada
  const filteredAreas = formData.company_id
    ? areas.filter(a => a.company_id === parseInt(formData.company_id))
    : areas;

  // Filtrar categorias por empresa y opcionalmente por area seleccionada
  const filteredCategories = (() => {
    let filtered = formData.company_id
      ? categories.filter(c => c.company_id === parseInt(formData.company_id))
      : categories;
    if (formData.area_id) {
      filtered = filtered.filter(c => c.area_id === parseInt(formData.area_id));
    }
    return filtered;
  })();

  const filteredLocations = useMemo(() => {
    if (!formData.company_id) return [];
    // Filtrar ubicaciones que pertenezcan a bodegas de la empresa seleccionada
    const companyWarehouseIds = warehouses
      .filter(w => w.company_id === parseInt(formData.company_id))
      .map(w => w.id);
    return locations.filter(l => companyWarehouseIds.includes(l.warehouse_id));
  }, [formData.company_id, locations, warehouses]);

  // Stats
  const stats = useMemo(() => ({
    totalProductos: products.length,
    totalServicios: services.length,
    agotados: products.filter(p => p.current_stock === 0 && p.is_active).length,
    stockBajo: products.filter(p => p.min_stock && p.current_stock > 0 && p.current_stock <= p.min_stock).length,
  }), [products, services]);

  // Unified catalog items
  const catalogItems = useMemo((): CatalogItem[] => {
    const productItems: CatalogItem[] = products.map(p => {
      let estado: CatalogItem['estado'] = 'activo';
      if (!p.is_active) estado = 'inactivo';
      else if (p.current_stock === 0) estado = 'agotado';

      return {
        id: p.id,
        tipo: 'producto',
        codigo: p.sku,
        nombre: p.name,
        estado,
        categoria: p.category?.name || '',
        area: p.area?.name || '',
        marca: p.brand || '',
        stock: p.current_stock,
        minStock: p.min_stock || 0,
        precioVenta: p.sale_price,
        costoUnitario: p.purchase_price || 0,
        duracion: '',
        is_active: p.is_active,
        originalProduct: p,
      };
    });

    const serviceItems: CatalogItem[] = services.map(s => ({
      id: s.id,
      tipo: 'servicio',
      codigo: s.slug,
      nombre: s.name,
      estado: s.is_active ? 'activo' : 'inactivo',
      categoria: s.category_name || s.category || '',
      area: s.category_name || s.category || '',
      marca: '',
      stock: 0,
      minStock: 0,
      precioVenta: s.price,
      costoUnitario: s.base_price || 0,
      duracion: s.formatted_duration || '',
      is_active: s.is_active,
      originalService: s,
    }));

    return [...productItems, ...serviceItems];
  }, [products, services]);

  // Filtered catalog items
  const filteredItems = useMemo(() => {
    return catalogItems.filter(item => {
      // Tab filter
      if (activeTab === 'productos' && item.tipo !== 'producto') return false;
      if (activeTab === 'servicios' && item.tipo !== 'servicio') return false;

      // Search filter
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        item.nombre.toLowerCase().includes(term) ||
        item.codigo.toLowerCase().includes(term) ||
        item.marca.toLowerCase().includes(term);

      // Category filter
      const matchesCategory = filterCategory === 'all' ||
        (item.originalProduct?.category_id?.toString() === filterCategory);

      // Area filter
      const matchesArea = filterArea === 'all' ||
        (item.originalProduct?.area_id?.toString() === filterArea);

      // Estado filter
      let matchesEstado = true;
      if (filterEstado === 'activo') matchesEstado = item.estado === 'activo';
      else if (filterEstado === 'inactivo') matchesEstado = item.estado === 'inactivo';
      else if (filterEstado === 'agotado') matchesEstado = item.estado === 'agotado';

      return matchesSearch && matchesCategory && matchesArea && matchesEstado;
    });
  }, [catalogItems, activeTab, searchTerm, filterCategory, filterArea, filterEstado]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterArea, filterEstado, activeTab, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  // Handle tab change with filter reset
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as CatalogTabValue);
    setFilterEstado('all');
    setFilterArea('all');
    setFilterCategory('all');
    setSearchTerm('');
  };

  // Handle item click (view detail)
  const handleItemClick = (item: CatalogItem) => {
    if (item.originalProduct) {
      router.visit(`/admin/products/${item.originalProduct.id}?tipo=producto`);
    } else if (item.originalService) {
      router.visit(`/admin/products/${item.originalService.id}?tipo=servicio`);
    }
  };

  // Handle service delete
  const handleServiceDelete = (service: Service) => {
    setConfirmDialog({
      open: true,
      title: 'Eliminar Servicio',
      description: `¿Estas seguro de eliminar "${service.name}"? Esta accion no se puede deshacer.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await servicesApi.delete(service.id);
          setServices(prev => prev.filter(s => s.id !== service.id));
        } catch (error: any) {
          console.error('Error deleting service:', error);
          setGeneralError(error.message || 'Error al eliminar servicio');
        }
      },
    });
  };

  // Agrupar ubicaciones por bodega para el selector
  const locationsByWarehouse = useMemo(() => {
    const grouped: Record<string, { warehouse: Warehouse; locations: Location[] }> = {};
    filteredLocations.forEach(loc => {
      const warehouse = warehouses.find(w => w.id === loc.warehouse_id);
      if (warehouse) {
        if (!grouped[warehouse.id]) {
          grouped[warehouse.id] = { warehouse, locations: [] };
        }
        grouped[warehouse.id].locations.push(loc);
      }
    });
    return Object.values(grouped);
  }, [filteredLocations, warehouses]);

  // Filtrar proveedores por empresa
  const filteredSuppliers = useMemo(() => {
    if (!formData.company_id) return [];
    return suppliers.filter(s => s.company_id === parseInt(formData.company_id));
  }, [formData.company_id, suppliers]);

  // Stock adjustment functions
  const openStockDialog = (product: Product) => {
    setStockProduct(product);
    setStockOperation('add');
    setStockQuantity('');
    setStockNotes('');
    setStockDialogOpen(true);
  };

  const handleStockUpdate = async () => {
    if (!stockProduct || !stockQuantity) return;

    setStockLoading(true);
    try {
      const response = await productsApi.updateStock(stockProduct.id, {
        quantity: parseInt(stockQuantity),
        operation: stockOperation,
        notes: stockNotes || undefined,
      });

      // Actualizar el producto en la lista
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === stockProduct.id ? response.product : p
        )
      );

      setStockDialogOpen(false);
      setStockProduct(null);
    } catch (error: any) {
      console.error('Error updating stock:', error);
      setGeneralError(error.message || 'Error al actualizar stock');
    } finally {
      setStockLoading(false);
    }
  };

  const openTicketDialog = (product: Product) => {
    setTicketProduct(product);
    setTicketMode('barcode');
    setShowPrice(true);
    setTicketDialogOpen(true);
  };

  const handlePrintTicket = () => {
    const printContent = document.getElementById('ticket-preview');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
      <head>
        <title>Ticket - ${ticketProduct?.name || ''}</title>
        <style>
          body {
            margin: 0; padding: 20px;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; font-family: Arial, sans-serif;
          }
          .ticket-content { text-align: center; }
          .ticket-content p { margin: 4px 0; }
          .price { font-size: 18px; font-weight: bold; }
          .barcode-number { font-family: monospace; font-size: 14px; }
          @media print { body { margin: 0; padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="ticket-content">${printContent.innerHTML}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const openBulkPriceDialog = async () => {
    setBulkPriceForm({
      target_field: 'sale_price',
      operation: 'increase',
      adjustment_type: 'percentage',
      value: '',
      filter_type: 'all',
      filter_value: '',
    });
    setBulkPriceResult(null);
    setBulkPricePreviewData([]);
    setBulkPriceDialogOpen(true);
    try {
      const options = await productsApi.getFilterOptions();
      setBulkPriceFilterOptions(options);
    } catch (error: any) {
      console.error('Error loading filter options:', error);
    }
  };

  const updateBulkPriceForm = (updates: Partial<typeof bulkPriceForm>) => {
    setBulkPriceForm(prev => ({ ...prev, ...updates }));
    // Solo resetear si hay datos previos, para no causar re-renders innecesarios
    setBulkPricePreviewData(prev => prev.length > 0 ? [] : prev);
    setBulkPriceResult(prev => prev !== null ? null : prev);
  };

  const handleBulkPricePreview = () => {
    if (!bulkPriceForm.value || parseFloat(bulkPriceForm.value) <= 0) return;
    if (bulkPriceForm.filter_type !== 'all' && !bulkPriceForm.filter_value) return;

    let filtered = [...products];
    const ft = bulkPriceForm.filter_type;
    const fv = bulkPriceForm.filter_value;

    if (ft !== 'all' && fv) {
      switch (ft) {
        case 'brand': filtered = filtered.filter(p => p.brand === fv); break;
        case 'category_id': filtered = filtered.filter(p => p.category_id === parseInt(fv)); break;
        case 'unit_of_measure': filtered = filtered.filter(p => p.unit_of_measure === fv); break;
        case 'location_id': filtered = filtered.filter(p => p.location_id === parseInt(fv)); break;
        case 'supplier_id': filtered = filtered.filter(p => p.supplier_id === parseInt(fv)); break;
        case 'area_id': filtered = filtered.filter(p => p.area_id === parseInt(fv)); break;
      }
    }

    const field = bulkPriceForm.target_field;
    const val = parseFloat(bulkPriceForm.value);

    const preview = filtered.map(p => {
      const current = Number(p[field as keyof typeof p]) || 0;
      const amount = bulkPriceForm.adjustment_type === 'percentage'
        ? current * (val / 100)
        : val;
      const newPrice = bulkPriceForm.operation === 'increase'
        ? current + amount
        : current - amount;
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        brand: p.brand || '-',
        currentPrice: current,
        newPrice: Math.max(0, Math.round(newPrice * 100) / 100),
      };
    });

    setBulkPricePreviewData(preview);
  };

  const handleBulkPriceAdjust = () => {
    if (!bulkPriceForm.value || parseFloat(bulkPriceForm.value) <= 0) return;

    const fieldLabel = bulkPriceForm.target_field === 'sale_price' ? 'precio de venta' : 'costo';
    const opLabel = bulkPriceForm.operation === 'increase' ? 'aumentar' : 'disminuir';
    const valueLabel = bulkPriceForm.adjustment_type === 'percentage'
      ? `${bulkPriceForm.value}%`
      : formatCurrency(Number(bulkPriceForm.value));

    setConfirmDialog({
      open: true,
      title: 'Confirmar Ajuste Masivo',
      description: `¿Estas seguro de ${opLabel} el ${fieldLabel} en ${valueLabel} para ${bulkPricePreviewData.length} productos? Esta accion modificara los precios de forma permanente.`,
      variant: 'warning',
      onConfirm: async () => {
        setBulkPriceLoading(true);
        setBulkPriceResult(null);
        try {
          const response = await productsApi.bulkPriceAdjust({
            target_field: bulkPriceForm.target_field,
            operation: bulkPriceForm.operation,
            adjustment_type: bulkPriceForm.adjustment_type,
            value: parseFloat(bulkPriceForm.value),
            filter_type: bulkPriceForm.filter_type,
            filter_value: bulkPriceForm.filter_type !== 'all' ? bulkPriceForm.filter_value : undefined,
          });
          setBulkPriceResult(response.message);
          setBulkPricePreviewData([]);
          await loadData();
        } catch (error: any) {
          console.error('Error in bulk price adjust:', error);
          setGeneralError(error.message || 'Error al ajustar precios masivamente');
        } finally {
          setBulkPriceLoading(false);
        }
      },
    });
  };

  const exportBulkPriceXLSX = () => {
    if (bulkPricePreviewData.length === 0) return;
    const fieldLabel = bulkPriceForm.target_field === 'sale_price' ? 'Precio de Venta' : 'Costo';
    const data = bulkPricePreviewData.map(p => ({
      'Producto': p.name,
      'SKU': p.sku,
      'Marca': p.brand,
      [`${fieldLabel} Actual`]: p.currentPrice,
      [`${fieldLabel} Nuevo`]: p.newPrice,
      'Diferencia': Math.round((p.newPrice - p.currentPrice) * 100) / 100,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ajuste de Precios');
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 14 }];
    XLSX.writeFile(wb, `ajuste_precios_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportBulkPricePDF = () => {
    if (bulkPricePreviewData.length === 0) return;
    const fieldLabel = bulkPriceForm.target_field === 'sale_price' ? 'Precio de Venta' : 'Costo';
    const opLabel = bulkPriceForm.operation === 'increase' ? 'Aumento' : 'Disminucion';
    const typeLabel = bulkPriceForm.adjustment_type === 'percentage'
      ? `${bulkPriceForm.value}%`
      : formatCurrency(parseFloat(bulkPriceForm.value));

    const rows = bulkPricePreviewData.map(p => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${p.name}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${p.sku}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${formatCurrency(p.currentPrice)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:${p.newPrice >= p.currentPrice ? '#16a34a' : '#dc2626'}">${formatCurrency(p.newPrice)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${formatCurrency(Math.round((p.newPrice - p.currentPrice) * 100) / 100)}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Previsualizacion - Ajuste de Precios</title>
      <style>
        body{font-family:Arial,sans-serif;margin:30px;color:#1f2937}
        h1{font-size:20px;margin-bottom:4px}
        .subtitle{color:#6b7280;font-size:13px;margin-bottom:20px}
        .info{display:flex;gap:24px;margin-bottom:20px;font-size:13px}
        .info-item{background:#f3f4f6;padding:8px 14px;border-radius:6px}
        .info-label{color:#6b7280;font-size:11px;text-transform:uppercase}
        .info-value{font-weight:600;margin-top:2px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{text-align:left;padding:8px 10px;background:#f9fafb;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;color:#6b7280}
        .total{margin-top:16px;font-size:13px;color:#6b7280}
        @media print{body{margin:15px}}
      </style></head><body>
      <h1>Previsualizacion de Ajuste de Precios</h1>
      <p class="subtitle">${fieldLabel} - ${opLabel} de ${typeLabel} | ${bulkPricePreviewData.length} productos</p>
      <div class="info">
        <div class="info-item"><div class="info-label">Operacion</div><div class="info-value">${opLabel}</div></div>
        <div class="info-item"><div class="info-label">Tipo</div><div class="info-value">${bulkPriceForm.adjustment_type === 'percentage' ? 'Porcentaje' : 'Valor Fijo'}</div></div>
        <div class="info-item"><div class="info-label">Valor</div><div class="info-value">${typeLabel}</div></div>
        <div class="info-item"><div class="info-label">Productos</div><div class="info-value">${bulkPricePreviewData.length}</div></div>
      </div>
      <table>
        <thead><tr>
          <th>Producto</th><th>SKU</th><th style="text-align:right">${fieldLabel} Actual</th><th style="text-align:right">${fieldLabel} Nuevo</th><th style="text-align:right">Diferencia</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="total">Generado el ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <AppLayout title="Productos">
      <Head title="Productos" />

      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
        {/* Header */}
        <div className="bg-card border-b">
          <div className="max-w-[1400px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Productos y Servicios</h1>
                  <p className="text-sm text-muted-foreground">Gestiona tu catalogo completo</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setExportFormat('pdf'); setExportDialogOpen(true); }} disabled={exporting || loading}>
                  {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setExportFormat('excel'); setExportDialogOpen(true); }} disabled={exporting || loading}>
                  {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                  Excel
                </Button>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <Card
                className="bg-card/50 backdrop-blur-sm border-2 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleTabChange('productos')}
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-blue-500/15 p-1.5 rounded-lg"><Package className="h-4 w-4 text-blue-600" /></div>
                    <span className="text-xs text-muted-foreground">Productos</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalProductos}</p>
                </div>
              </Card>
              <Card
                className="bg-card/50 backdrop-blur-sm border-2 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleTabChange('servicios')}
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-purple-500/15 p-1.5 rounded-lg"><Tag className="h-4 w-4 text-purple-600" /></div>
                    <span className="text-xs text-muted-foreground">Servicios</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalServicios}</p>
                </div>
              </Card>
              <Card
                className="bg-card/50 backdrop-blur-sm border-2 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => { handleTabChange('productos'); setTimeout(() => setFilterEstado('agotado'), 0); }}
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-red-500/15 p-1.5 rounded-lg"><AlertCircle className="h-4 w-4 text-red-600" /></div>
                    <span className="text-xs text-muted-foreground">Agotados</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{stats.agotados}</p>
                </div>
              </Card>
              <Card
                className="bg-card/50 backdrop-blur-sm border-2 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleTabChange('productos')}
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-amber-500/15 p-1.5 rounded-lg"><AlertTriangle className="h-4 w-4 text-amber-600" /></div>
                    <span className="text-xs text-muted-foreground">Stock Bajo</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{stats.stockBajo}</p>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Company Filter */}
        <div className="max-w-[1400px] mx-auto px-4 pt-6">
          {companyFilter.isSuperAdmin && (
            <SuperAdminCompanyFilter
              companies={companyFilter.companies}
              loadingCompanies={companyFilter.loadingCompanies}
              selectedCompanyId={companyFilter.selectedCompanyId}
              setSelectedCompanyId={companyFilter.setSelectedCompanyId}
              isFiltered={companyFilter.isFiltered}
              handleFilter={companyFilter.handleFilter}
              handleClear={companyFilter.handleClear}
            />
          )}
        </div>

        {companyFilter.isSuperAdmin && !companyFilter.isFiltered && (
          <div className="max-w-[1400px] mx-auto px-4 py-6">
            <SuperAdminEmptyState />
          </div>
        )}

        {/* Content */}
        {companyFilter.shouldLoadData && (
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          <Card className="shadow-xl p-4 sm:p-6">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
              <TabsList className="grid w-full max-w-[500px] grid-cols-3 h-auto">
                <TabsTrigger value="todos" className="text-xs sm:text-sm">Todos</TabsTrigger>
                <TabsTrigger value="productos" className="text-xs sm:text-sm">
                  <Package className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Productos</span>
                </TabsTrigger>
                <TabsTrigger value="servicios" className="text-xs sm:text-sm">
                  <Tag className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Servicios</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search and Filters */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, codigo o marca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-[170px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todas las categorias</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Area" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todas las areas</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id.toString()}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                    <SelectItem value="agotado">Agotado</SelectItem>
                  </SelectContent>
                </Select>
                {canBulkPriceAdjust && (
                  <Button variant="outline" size="sm" onClick={openBulkPriceDialog} className="gap-2 whitespace-nowrap">
                    <DollarSign className="h-4 w-4" />
                    <span className="hidden sm:inline">Ajuste de Precios</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => router.visit('/admin/bulk-import?type=products')} className="gap-2 whitespace-nowrap">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Importar</span>
                </Button>

                {canManage && activeTab === 'todos' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="gap-2 whitespace-nowrap">
                        <Plus className="h-4 w-4" />
                        Crear nuevo
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card z-50">
                      <DropdownMenuItem onClick={() => router.visit('/admin/products/create?tipo=producto')}>
                        <Package className="h-4 w-4 mr-2" />
                        Nuevo Producto
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.visit('/admin/products/create?tipo=servicio')}>
                        <Tag className="h-4 w-4 mr-2" />
                        Nuevo Servicio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : canManage && activeTab === 'productos' ? (
                  <Button size="sm" onClick={() => router.visit('/admin/products/create?tipo=producto')} className="gap-2 whitespace-nowrap">
                    <Plus className="h-4 w-4" />
                    Nuevo Producto
                  </Button>
                ) : canManage && activeTab === 'servicios' ? (
                  <Button size="sm" onClick={() => router.visit('/admin/products/create?tipo=servicio')} className="gap-2 whitespace-nowrap">
                    <Plus className="h-4 w-4" />
                    Nuevo Servicio
                  </Button>
                ) : null}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2">
                <Spinner size="md" />
                <span className="text-muted-foreground">Cargando catalogo...</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Mostrando <span className="font-semibold">{filteredItems.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredItems.length)}</span> de{" "}
                  <span className="font-semibold">{filteredItems.length}</span>
                </p>

                {/* Catalog List */}
                <div className="space-y-3">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                        <Search className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-base font-medium text-foreground">No se encontraron resultados</h3>
                      <p className="text-sm text-muted-foreground mt-1">Intenta con otros filtros</p>
                    </div>
                  ) : (
                    paginatedItems.map((item) => (
                      <div
                        key={`${item.tipo}-${item.id}`}
                        className="border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md"
                      >
                        {/* Mobile layout */}
                        <div className="sm:hidden">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                {item.tipo === 'producto' ? (
                                  <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/20 border text-[10px]">Producto</Badge>
                                ) : (
                                  <Badge className="bg-purple-500/15 text-purple-700 border-purple-500/20 border text-[10px]">Servicio</Badge>
                                )}
                                {item.estado === 'activo' && (
                                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 border text-[10px]">Activo</Badge>
                                )}
                                {item.estado === 'inactivo' && (
                                  <Badge className="bg-muted text-muted-foreground border-border border text-[10px]">Inactivo</Badge>
                                )}
                                {item.estado === 'agotado' && (
                                  <Badge className="bg-red-500/15 text-red-700 border-red-500/20 border text-[10px]">Agotado</Badge>
                                )}
                              </div>
                              <p
                                className="font-semibold text-sm text-primary truncate cursor-pointer hover:underline"
                                onClick={() => handleItemClick(item)}
                              >
                                {item.nombre}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span className="font-mono">{item.codigo}</span>
                                {item.categoria && <span>• {item.categoria}</span>}
                                {item.marca && <span>• {item.marca}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleItemClick(item)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-card z-50">
                                  <DropdownMenuItem onClick={() => handleItemClick(item)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver detalle
                                  </DropdownMenuItem>
                                  {item.originalProduct && canManage && (
                                    <>
                                      <DropdownMenuItem onClick={() => router.visit(`/admin/products/${item.id}/edit`)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openStockDialog(item.originalProduct!)}>
                                        <Package className="h-4 w-4 mr-2" />
                                        Ajustar stock
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {item.originalService && canManage && (
                                    <DropdownMenuItem onClick={() => router.visit(`/admin/services/${item.id}/edit`)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                            <div>
                              {item.tipo === 'producto' ? (
                                <p className={`text-sm font-medium ${
                                  item.stock === 0 ? 'text-destructive' :
                                  item.stock > 0 && item.minStock > 0 && item.stock <= item.minStock ? 'text-amber-600' :
                                  'text-muted-foreground'
                                }`}>
                                  Stock: <span className="font-bold">{item.stock}</span>
                                  <span className="font-normal text-xs"> / min {item.minStock}</span>
                                </p>
                              ) : item.duracion ? (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {item.duracion}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground">{item.area || ''}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm text-primary">{formatCurrency(item.precioVenta)}</p>
                              {item.tipo === 'producto' && item.costoUnitario > 0 && (
                                <p className="text-[10px] text-muted-foreground">Costo {formatCurrency(item.costoUnitario)}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Desktop layout */}
                        <div className="hidden sm:flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0 grid grid-cols-[140px_150px_1fr_120px_120px] gap-4 items-center">
                            {/* Código */}
                            <div>
                              <p className="text-[11px] text-muted-foreground">Codigo</p>
                              <p className="font-bold text-sm text-foreground font-mono">{item.codigo}</p>
                            </div>

                            {/* Tipo / Estado */}
                            <div className="flex flex-col gap-1">
                              <p className="text-[11px] text-muted-foreground">Tipo / Estado</p>
                              <div className="flex items-center gap-1 flex-wrap">
                                {item.tipo === 'producto' ? (
                                  <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/20 border text-[10px]">Producto</Badge>
                                ) : (
                                  <Badge className="bg-purple-500/15 text-purple-700 border-purple-500/20 border text-[10px]">Servicio</Badge>
                                )}
                                {item.estado === 'activo' && (
                                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 border text-[10px]">Activo</Badge>
                                )}
                                {item.estado === 'inactivo' && (
                                  <Badge className="bg-muted text-muted-foreground border-border border text-[10px]">Inactivo</Badge>
                                )}
                                {item.estado === 'agotado' && (
                                  <Badge className="bg-red-500/15 text-red-700 border-red-500/20 border text-[10px]">Agotado</Badge>
                                )}
                              </div>
                            </div>

                            {/* Nombre */}
                            <div className="min-w-0">
                              <p className="text-[11px] text-muted-foreground">Nombre</p>
                              <p
                                className="font-semibold text-sm text-primary truncate cursor-pointer hover:underline"
                                onClick={() => handleItemClick(item)}
                              >
                                {item.nombre}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {item.categoria && <span>{item.categoria}</span>}
                                {item.marca && <span>• {item.marca}</span>}
                                {item.duracion && (
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="h-3 w-3" />
                                    {item.duracion}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Stock / Área */}
                            <div>
                              {item.tipo === 'producto' ? (
                                <>
                                  <p className="text-[11px] text-muted-foreground">Stock</p>
                                  <p className={`font-bold text-sm ${
                                    item.stock === 0 ? 'text-destructive' :
                                    item.stock > 0 && item.minStock > 0 && item.stock <= item.minStock ? 'text-amber-600' :
                                    'text-foreground'
                                  }`}>
                                    {item.stock} <span className="font-normal text-xs text-muted-foreground">/ min {item.minStock}</span>
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-[11px] text-muted-foreground">Area</p>
                                  <p className="text-sm text-foreground">{item.area}</p>
                                </>
                              )}
                            </div>

                            {/* Precio */}
                            <div className="text-right">
                              <p className="text-[11px] text-muted-foreground">Precio</p>
                              <p className="font-bold text-sm text-primary">{formatCurrency(item.precioVenta)}</p>
                              {item.tipo === 'producto' && item.costoUnitario > 0 && (
                                <p className="text-[10px] text-muted-foreground">Costo {formatCurrency(item.costoUnitario)}</p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleItemClick(item)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-card z-50">
                                <DropdownMenuItem onClick={() => handleItemClick(item)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalle
                                </DropdownMenuItem>
                                {item.originalProduct && canManage && (
                                  <>
                                    <DropdownMenuItem onClick={() => router.visit(`/admin/products/${item.originalProduct!.id}/edit?tipo=producto`)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    {item.originalProduct.is_trackable && (
                                      <DropdownMenuItem onClick={() => openStockDialog(item.originalProduct!)}>
                                        <BarChart3 className="h-4 w-4 mr-2" />
                                        Ajustar Stock
                                      </DropdownMenuItem>
                                    )}
                                    {barcodeTicketEnabled && canManageTickets && item.originalProduct.barcode && (
                                      <DropdownMenuItem onClick={() => openTicketDialog(item.originalProduct!)}>
                                        <QrCode className="h-4 w-4 mr-2" />
                                        Ver Ticket
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(item.originalProduct!.id)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {item.originalService && (
                                  <>
                                    <DropdownMenuItem onClick={() => router.visit(`/admin/products/${item.originalService!.id}/edit?tipo=servicio`)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleServiceDelete(item.originalService!)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination Footer */}
                {filteredItems.length > 0 && (
                  <div className="flex flex-col gap-4 mt-6 pt-4 border-t">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Mostrando {filteredItems.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredItems.length)} de {filteredItems.length}</span>
                      <div className="flex items-center gap-2">
                        <span>Mostrar:</span>
                        <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                          <SelectTrigger className="w-[70px] h-8">
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
                        <span>por pagina</span>
                      </div>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handlePageChange(safePage - 1)}
                          disabled={safePage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Pagination>
                          <PaginationContent>
                            {getPageNumbers().map((page, index) => (
                              <PaginationItem key={index}>
                                {page === 'ellipsis' ? (
                                  <PaginationEllipsis />
                                ) : (
                                  <PaginationLink
                                    onClick={() => handlePageChange(page)}
                                    isActive={safePage === page}
                                    className="cursor-pointer"
                                  >
                                    {page}
                                  </PaginationLink>
                                )}
                              </PaginationItem>
                            ))}
                          </PaginationContent>
                        </Pagination>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handlePageChange(safePage + 1)}
                          disabled={safePage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}
      </div>

      {/* ===== DIALOGS (outside main layout wrapper) ===== */}

      {/* Create/Edit Product Dialog */}
      {canManage && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProduct
                      ? 'Modifica los datos del producto'
                      : 'Ingresa los datos del nuevo producto'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {generalError && (
                    <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
                      {generalError}
                    </div>
                  )}

                  {/* Informacion Basica */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground">Informacion Basica</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nombre *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          disabled={formLoading}
                        />
                        <InputError message={errors.name} />
                      </div>
                      <div>
                        <Label htmlFor="sku">SKU *</Label>
                        <Input
                          id="sku"
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                          required
                          placeholder="Ej: PROD-001"
                          disabled={formLoading}
                        />
                        <InputError message={errors.sku} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="barcode">Codigo de Barras</Label>
                        <Input
                          id="barcode"
                          value={formData.barcode}
                          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                          placeholder="Ej: 7701234567890"
                          disabled={formLoading}
                        />
                        <InputError message={errors.barcode} />
                      </div>
                      <div>
                        <Label htmlFor="brand">Marca</Label>
                        <Input
                          id="brand"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          placeholder="Ej: Samsung"
                          disabled={formLoading}
                        />
                        <InputError message={errors.brand} />
                      </div>
                    </div>
                  </div>

                  {/* Empresa y Categoria */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground">Clasificacion</h3>
                    {userIsSuperAdmin ? (
                      <div>
                        <Label htmlFor="company_id">Empresa *</Label>
                        <Select
                          value={formData.company_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, company_id: value, category_id: '', area_id: '', location_id: '' })
                          }
                          disabled={formLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una empresa" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id.toString()}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <InputError message={errors.company_id} />
                      </div>
                    ) : (
                      <div>
                        <Label>Empresa</Label>
                        <div className="px-3 py-2 bg-muted rounded-md border">
                          <p className="text-sm font-medium">
                            {companies[0]?.name || user?.company?.name || 'Mi Empresa'}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="area_id">Area</Label>
                        <Select
                          value={formData.area_id || 'none'}
                          onValueChange={(value) => {
                            const newAreaId = value === 'none' ? '' : value;
                            // Si se cambia de area, limpiar categoria si no pertenece a la nueva area
                            let newCategoryId = formData.category_id;
                            if (newAreaId && formData.category_id) {
                              const cat = categories.find(c => c.id === parseInt(formData.category_id));
                              if (cat && cat.area_id !== parseInt(newAreaId)) {
                                newCategoryId = '';
                              }
                            }
                            setFormData({ ...formData, area_id: newAreaId, category_id: newCategoryId });
                          }}
                          disabled={formLoading || !formData.company_id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un area" />
                          </SelectTrigger>
                          <SelectContent className="bg-card z-50">
                            <SelectItem value="none">Todas las areas</SelectItem>
                            {filteredAreas.map((area) => (
                              <SelectItem key={area.id} value={area.id.toString()}>
                                {area.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <InputError message={errors.area_id} />
                      </div>
                      <div>
                        <Label htmlFor="category_id">Categoria</Label>
                        <Select
                          value={formData.category_id || 'none'}
                          onValueChange={(value) =>
                            setFormData({ ...formData, category_id: value === 'none' ? '' : value })
                          }
                          disabled={formLoading || !formData.company_id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categoria" />
                          </SelectTrigger>
                          <SelectContent className="bg-card z-50">
                            <SelectItem value="none">Sin categoria</SelectItem>
                            {filteredCategories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <InputError message={errors.category_id} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="unit_of_measure">Unidad de Medida *</Label>
                      <Select
                        value={formData.unit_of_measure}
                        onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value })}
                        disabled={formLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona unidad" />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-50">
                          {UNIT_MEASURES.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <InputError message={errors.unit_of_measure} />
                    </div>
                  </div>

                  {/* Ubicacion y Proveedor */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground">Ubicacion y Proveedor</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="location_id">Ubicacion</Label>
                        <Select
                          value={formData.location_id || 'none'}
                          onValueChange={(value) =>
                            setFormData({ ...formData, location_id: value === 'none' ? '' : value })
                          }
                          disabled={formLoading || !formData.company_id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona ubicacion" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            <SelectItem value="none">Sin ubicacion</SelectItem>
                            {locationsByWarehouse.map(({ warehouse, locations: locs }) => (
                              <div key={warehouse.id}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                                  {warehouse.name}
                                </div>
                                {locs.map((loc) => (
                                  <SelectItem key={loc.id} value={loc.id.toString()}>
                                    {loc.code ? `${loc.code} - ` : ''}{loc.name}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                        <InputError message={errors.location_id} />
                      </div>
                      <div>
                        <Label htmlFor="supplier_id">Proveedor por Defecto</Label>
                        <Select
                          value={formData.supplier_id || 'none'}
                          onValueChange={(value) =>
                            setFormData({ ...formData, supplier_id: value === 'none' ? '' : value })
                          }
                          disabled={formLoading || !formData.company_id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona proveedor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin proveedor</SelectItem>
                            {filteredSuppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <InputError message={errors.supplier_id} />
                      </div>
                    </div>
                  </div>

                  {/* Descripcion */}
                  <div>
                    <Label htmlFor="description">Descripcion</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      disabled={formLoading}
                      rows={2}
                    />
                    <InputError message={errors.description} />
                  </div>

                  {/* Precios e IVA */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground">Precios e IVA</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="sale_price">Precio de Venta *</Label>
                        <Input
                          id="sale_price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.sale_price}
                          onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                          required
                          disabled={formLoading}
                        />
                        <InputError message={errors.sale_price} />
                      </div>
                      <div>
                        <Label htmlFor="purchase_price">Precio de Compra</Label>
                        <Input
                          id="purchase_price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.purchase_price}
                          onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                          disabled={formLoading}
                        />
                        <InputError message={errors.purchase_price} />
                      </div>
                      <div>
                        <Label htmlFor="tax_rate">IVA</Label>
                        <Select
                          value={formData.tax_rate}
                          onValueChange={(value) => setFormData({ ...formData, tax_rate: value })}
                          disabled={formLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar IVA" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excluded">Excluido</SelectItem>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="5">5%</SelectItem>
                            <SelectItem value="19">19%</SelectItem>
                          </SelectContent>
                        </Select>
                        <InputError message={errors.tax_rate} />
                      </div>
                    </div>
                  </div>

                  {/* Stock */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground">Inventario</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="current_stock">Stock Actual</Label>
                        <Input
                          id="current_stock"
                          type="number"
                          min="0"
                          value={formData.current_stock}
                          onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                          disabled={formLoading}
                        />
                        <InputError message={errors.current_stock} />
                      </div>
                      <div>
                        <Label htmlFor="min_stock">Stock Minimo</Label>
                        <Input
                          id="min_stock"
                          type="number"
                          min="0"
                          value={formData.min_stock}
                          onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                          disabled={formLoading}
                          placeholder="Alerta bajo stock"
                        />
                        <InputError message={errors.min_stock} />
                      </div>
                      <div>
                        <Label htmlFor="max_stock">Stock Maximo</Label>
                        <Input
                          id="max_stock"
                          type="number"
                          min="0"
                          value={formData.max_stock}
                          onChange={(e) => setFormData({ ...formData, max_stock: e.target.value })}
                          disabled={formLoading}
                          placeholder="Capacidad maxima"
                        />
                        <InputError message={errors.max_stock} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_trackable"
                          checked={formData.is_trackable}
                          onChange={(e) => setFormData({ ...formData, is_trackable: e.target.checked })}
                          disabled={formLoading}
                          className="h-4 w-4 rounded border-border"
                        />
                        <Label htmlFor="is_trackable" className="font-normal">
                          Rastrear inventario
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="auto_purchase_enabled"
                          checked={formData.auto_purchase_enabled}
                          onChange={(e) => setFormData({ ...formData, auto_purchase_enabled: e.target.checked })}
                          disabled={formLoading || !formData.supplier_id}
                          className="h-4 w-4 rounded border-border"
                        />
                        <Label htmlFor="auto_purchase_enabled" className="font-normal">
                          Compra automatica
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          disabled={formLoading}
                          className="h-4 w-4 rounded border-border"
                        />
                        <Label htmlFor="is_active" className="font-normal">
                          Activo
                        </Label>
                      </div>
                    </div>
                    {formData.auto_purchase_enabled && !formData.supplier_id && (
                      <p className="text-xs text-orange-600">
                        Debes seleccionar un proveedor para habilitar compras automaticas
                      </p>
                    )}
                    {formData.auto_purchase_enabled && formData.supplier_id && (
                      <p className="text-xs text-green-600">
                        Se generara una compra automatica cuando el stock llegue al minimo
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}
                      disabled={formLoading}
                    >
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
          )}

          {/* Stock Adjustment Dialog */}
          <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Ajustar Stock</DialogTitle>
                <DialogDescription>
                  {stockProduct?.name} - Stock actual: {stockProduct?.current_stock} {stockProduct?.unit_of_measure}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Operacion</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={stockOperation === 'add' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStockOperation('add')}
                      className="flex-1"
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Agregar
                    </Button>
                    <Button
                      type="button"
                      variant={stockOperation === 'subtract' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStockOperation('subtract')}
                      className="flex-1"
                    >
                      <TrendingDown className="h-4 w-4 mr-1" />
                      Restar
                    </Button>
                    <Button
                      type="button"
                      variant={stockOperation === 'set' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStockOperation('set')}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Establecer
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="stock_quantity">
                    {stockOperation === 'set' ? 'Nuevo Stock' : 'Cantidad'}
                  </Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    placeholder={stockOperation === 'set' ? 'Nuevo valor de stock' : 'Cantidad a ' + (stockOperation === 'add' ? 'agregar' : 'restar')}
                    disabled={stockLoading}
                  />
                  {stockQuantity && stockProduct && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Stock resultante:{' '}
                      <span className="font-semibold">
                        {stockOperation === 'add'
                          ? stockProduct.current_stock + parseInt(stockQuantity || '0')
                          : stockOperation === 'subtract'
                          ? Math.max(0, stockProduct.current_stock - parseInt(stockQuantity || '0'))
                          : parseInt(stockQuantity || '0')}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="stock_notes">Notas (opcional)</Label>
                  <Input
                    id="stock_notes"
                    value={stockNotes}
                    onChange={(e) => setStockNotes(e.target.value)}
                    placeholder="Razon del ajuste..."
                    disabled={stockLoading}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStockDialogOpen(false)}
                  disabled={stockLoading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleStockUpdate}
                  disabled={stockLoading || !stockQuantity}
                >
                  {stockLoading && <Spinner className="mr-2" size="sm" />}
                  Actualizar Stock
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Barcode/QR Ticket Dialog */}
          <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Ticket de Producto</DialogTitle>
                <DialogDescription>
                  {ticketProduct?.name} - {ticketProduct?.barcode}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Format selection */}
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={ticketMode === 'barcode' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTicketMode('barcode')}
                      className="flex-1"
                    >
                      Codigo de Barras
                    </Button>
                    <Button
                      type="button"
                      variant={ticketMode === 'qr' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTicketMode('qr')}
                      className="flex-1"
                    >
                      Codigo QR
                    </Button>
                  </div>
                </div>

                {/* Show price toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-price">Mostrar Precio</Label>
                  <Switch
                    id="show-price"
                    checked={showPrice}
                    onCheckedChange={setShowPrice}
                  />
                </div>

                {/* Include price in QR data toggle (only for QR mode) */}
                {ticketMode === 'qr' && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="include-price-qr">Incluir precio en QR</Label>
                      <p className="text-xs text-muted-foreground">
                        El precio se codifica dentro del codigo QR
                      </p>
                    </div>
                    <Switch
                      id="include-price-qr"
                      checked={includePriceInQr}
                      onCheckedChange={setIncludePriceInQr}
                    />
                  </div>
                )}

                {/* Preview area */}
                <div
                  className="border rounded-lg p-6 flex flex-col items-center justify-center bg-card min-h-[200px]"
                  id="ticket-preview"
                >
                  {ticketProduct && ticketMode === 'barcode' ? (
                    <div className="text-center space-y-1">
                      <Barcode
                        value={ticketProduct.barcode || ''}
                        width={2}
                        height={60}
                        displayValue={false}
                        margin={0}
                      />
                      <p className="text-sm font-mono">{ticketProduct.barcode}</p>
                      {showPrice && (
                        <p className="text-lg font-bold">
                          {formatCurrency(ticketProduct.sale_price)}
                        </p>
                      )}
                    </div>
                  ) : ticketProduct && ticketMode === 'qr' ? (
                    <div className="text-center space-y-2">
                      <QRCodeSVG
                        value={[
                          `Producto: ${ticketProduct.name}`,
                          `Codigo: ${ticketProduct.barcode}`,
                          ...(includePriceInQr ? [`Precio: ${formatCurrency(ticketProduct.sale_price)}`] : []),
                        ].join('\n')}
                        size={180}
                        level="M"
                      />
                      <p className="text-sm font-mono">{ticketProduct.barcode}</p>
                      {showPrice && (
                        <p className="text-lg font-bold">
                          {formatCurrency(ticketProduct.sale_price)}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setTicketDialogOpen(false)}>
                  Cerrar
                </Button>
                <Button onClick={handlePrintTicket}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bulk Price Adjustment Dialog */}
          <Dialog open={bulkPriceDialogOpen} onOpenChange={setBulkPriceDialogOpen}>
            <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col p-0">
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b">
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-2 bg-emerald-500/15">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg">Ajuste Masivo de Precios</DialogTitle>
                      <DialogDescription>
                        Aumenta o disminuye precios para un grupo de productos
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Row 1: Campo + Operacion */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">Campo a Ajustar</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={bulkPriceForm.target_field === 'sale_price' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateBulkPriceForm({ target_field: 'sale_price' })}
                        className="flex-1"
                      >
                        Precio de Venta
                      </Button>
                      <Button
                        type="button"
                        variant={bulkPriceForm.target_field === 'purchase_price' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateBulkPriceForm({ target_field: 'purchase_price' })}
                        className="flex-1"
                      >
                        Costo
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">Operacion</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={bulkPriceForm.operation === 'increase' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateBulkPriceForm({ operation: 'increase' })}
                        className={`flex-1 ${bulkPriceForm.operation === 'increase' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                      >
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Aumentar
                      </Button>
                      <Button
                        type="button"
                        variant={bulkPriceForm.operation === 'decrease' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateBulkPriceForm({ operation: 'decrease' })}
                        className={`flex-1 ${bulkPriceForm.operation === 'decrease' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                      >
                        <TrendingDown className="h-4 w-4 mr-1" />
                        Disminuir
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Row 2: Tipo de ajuste + Valor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">Tipo de Ajuste</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={bulkPriceForm.adjustment_type === 'percentage' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateBulkPriceForm({ adjustment_type: 'percentage' })}
                        className="flex-1"
                      >
                        Porcentaje (%)
                      </Button>
                      <Button
                        type="button"
                        variant={bulkPriceForm.adjustment_type === 'fixed' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateBulkPriceForm({ adjustment_type: 'fixed' })}
                        className="flex-1"
                      >
                        Valor Fijo ($)
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="bulk_price_value" className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">
                      {bulkPriceForm.adjustment_type === 'percentage' ? 'Porcentaje (%)' : 'Valor ($)'}
                    </Label>
                    <Input
                      id="bulk_price_value"
                      type="number"
                      step={bulkPriceForm.adjustment_type === 'percentage' ? '0.1' : '0.01'}
                      min="0.01"
                      value={bulkPriceForm.value}
                      onChange={(e) => updateBulkPriceForm({ value: e.target.value })}
                      placeholder={bulkPriceForm.adjustment_type === 'percentage' ? 'Ej: 10' : 'Ej: 5000'}
                      disabled={bulkPriceLoading}
                    />
                  </div>
                </div>

                {/* Row 3: Filtro + valor del filtro */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">Aplicar a</Label>
                    <Select
                      value={bulkPriceForm.filter_type}
                      onValueChange={(value) => updateBulkPriceForm({
                        filter_type: value as BulkPriceAdjustRequest['filter_type'],
                        filter_value: '',
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los productos</SelectItem>
                        <SelectItem value="brand">Por Marca</SelectItem>
                        <SelectItem value="category_id">Por Categoria</SelectItem>
                        <SelectItem value="unit_of_measure">Por Unidad de Medida</SelectItem>
                        <SelectItem value="location_id">Por Ubicacion</SelectItem>
                        <SelectItem value="supplier_id">Por Proveedor</SelectItem>
                        <SelectItem value="area_id">Por Area</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    {bulkPriceForm.filter_type !== 'all' && (
                      <>
                        <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">
                          {bulkPriceForm.filter_type === 'brand' ? 'Marca' :
                           bulkPriceForm.filter_type === 'category_id' ? 'Categoria' :
                           bulkPriceForm.filter_type === 'unit_of_measure' ? 'Unidad de Medida' :
                           bulkPriceForm.filter_type === 'location_id' ? 'Ubicacion' :
                           bulkPriceForm.filter_type === 'supplier_id' ? 'Proveedor' :
                           bulkPriceForm.filter_type === 'area_id' ? 'Area' :
                           'Filtro'}
                        </Label>
                        <Select
                          value={bulkPriceForm.filter_value}
                          onValueChange={(value) => updateBulkPriceForm({ filter_value: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona..." />
                          </SelectTrigger>
                          <SelectContent>
                            {bulkPriceForm.filter_type === 'brand' && bulkPriceFilterOptions.brands.map((b) => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                            {bulkPriceForm.filter_type === 'category_id' && categories.map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                            {bulkPriceForm.filter_type === 'unit_of_measure' && UNIT_MEASURES.map((u) => (
                              <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                            ))}
                            {bulkPriceForm.filter_type === 'location_id' && locations.map((l) => (
                              <SelectItem key={l.id} value={l.id.toString()}>
                                {l.code ? `${l.code} - ` : ''}{l.name}
                              </SelectItem>
                            ))}
                            {bulkPriceForm.filter_type === 'supplier_id' && suppliers.map((s) => (
                              <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                            ))}
                            {bulkPriceForm.filter_type === 'area_id' && areas.map((a) => (
                              <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </div>

                {/* Preview section */}
                {bulkPricePreviewData.length > 0 && !bulkPriceResult && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-semibold text-sm">Previsualizacion</h4>
                        <Badge variant="secondary" className="text-xs">
                          {bulkPricePreviewData.length} productos
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={exportBulkPricePDF}
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={exportBulkPriceXLSX}
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          XLSX
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Producto</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Actual</th>
                            <th className="text-center px-2 py-2 w-8"></th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Nuevo</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Diferencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkPricePreviewData.slice(0, 5).map((p) => {
                            const diff = Math.round((p.newPrice - p.currentPrice) * 100) / 100;
                            return (
                              <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/20">
                                <td className="px-4 py-2">
                                  <div className="font-medium text-sm truncate max-w-[200px]">{p.name}</div>
                                  <div className="text-xs text-muted-foreground">{p.sku}</div>
                                </td>
                                <td className="text-right px-4 py-2 font-mono text-sm">{formatCurrency(p.currentPrice)}</td>
                                <td className="text-center px-2 py-2">
                                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                                </td>
                                <td className="text-right px-4 py-2 font-mono text-sm font-semibold">{formatCurrency(p.newPrice)}</td>
                                <td className={`text-right px-4 py-2 font-mono text-sm font-medium ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {bulkPricePreviewData.length > 5 && (
                      <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground text-center border-t">
                        y {bulkPricePreviewData.length - 5} productos mas... Descarga el PDF o XLSX para ver todos.
                      </div>
                    )}
                  </div>
                )}

                {/* Resultado */}
                {bulkPriceResult && (
                  <div className="rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-700 border border-emerald-500/20 flex items-center gap-3">
                    <div className="rounded-full p-1.5 bg-emerald-500/15">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="font-medium">{bulkPriceResult}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
                <div className="text-sm text-muted-foreground">
                  {bulkPricePreviewData.length > 0 && !bulkPriceResult && (
                    <span><span className="font-medium text-foreground">{bulkPricePreviewData.length}</span> productos afectados</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setBulkPriceDialogOpen(false)} disabled={bulkPriceLoading}>
                    {bulkPriceResult ? 'Cerrar' : 'Cancelar'}
                  </Button>
                  {!bulkPriceResult && bulkPricePreviewData.length === 0 && (
                    <Button
                      onClick={handleBulkPricePreview}
                      disabled={!bulkPriceForm.value || (bulkPriceForm.filter_type !== 'all' && !bulkPriceForm.filter_value)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Previsualizar
                    </Button>
                  )}
                  {!bulkPriceResult && bulkPricePreviewData.length > 0 && (
                    <Button
                      onClick={handleBulkPriceAdjust}
                      disabled={bulkPriceLoading}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {bulkPriceLoading && <Spinner className="mr-2" size="sm" />}
                      Aplicar Ajuste
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, open: false }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${confirmDialog.variant === 'danger' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                  <AlertTriangle className={`h-5 w-5 ${confirmDialog.variant === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />
                </div>
                <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pl-12">
                {confirmDialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, open: false }));
                }}
                className={confirmDialog.variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
                  : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-600'
                }
              >
                {confirmDialog.variant === 'danger' ? 'Eliminar' : 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Export Mode Dialog */}
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {exportFormat === 'pdf' ? <FileText className="h-5 w-5 text-red-500" /> : <FileSpreadsheet className="h-5 w-5 text-green-600" />}
                Exportar {exportFormat === 'pdf' ? 'PDF' : 'Excel'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">Selecciona el tipo de exportación:</p>
              <div
                onClick={() => setExportMode('info')}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${exportMode === 'info' ? 'border-blue-500 bg-blue-500/10/50' : 'border-border hover:border-blue-500/30'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/15 p-2 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Exportar para Información</p>
                    <p className="text-xs text-muted-foreground">Reporte completo con estadísticas y datos del catálogo</p>
                  </div>
                </div>
              </div>
              <div
                onClick={() => setExportMode('count')}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${exportMode === 'count' ? 'border-blue-500 bg-blue-500/10/50' : 'border-border hover:border-blue-500/30'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/15 p-2 rounded-lg">
                    <Package className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Exportar para Conteo de Inventario</p>
                    <p className="text-xs text-muted-foreground">Planilla con casillas de verificación, cantidad real y diferencias para conteo físico</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={exporting}
                onClick={() => {
                  setExportDialogOpen(false);
                  if (exportFormat === 'pdf') {
                    handleExportPdf(exportMode);
                  } else {
                    handleExportExcel(exportMode);
                  }
                }}
              >
                {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Exportar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </AppLayout>
  );
}
