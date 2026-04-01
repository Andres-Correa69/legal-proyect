import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { balanceInquiryApi, type SupplierBalanceDetail } from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { cn, formatCurrency } from "@/lib/utils";
import { loadPdfLogo, addLogoToPdf } from "@/lib/pdf-logo";

interface ShowProps {
  supplierId: number;
}

export default function SupplierBalanceShow() {
  const { auth, supplierId } = usePage<SharedData & ShowProps>().props;
  const user = auth.user;
  const canView = hasPermission('payments.view', user);

  const [supplierDetail, setSupplierDetail] = useState<SupplierBalanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchasesSearch, setPurchasesSearch] = useState('');
  const [paymentsSearch, setPaymentsSearch] = useState('');

  const filteredPurchases = useMemo(() => {
    if (!supplierDetail) return [];
    if (!purchasesSearch.trim()) return supplierDetail.purchases;
    const q = purchasesSearch.toLowerCase();
    return supplierDetail.purchases.filter(
      (p) =>
        p.purchase_number.toLowerCase().includes(q) ||
        p.payment_status.toLowerCase().includes(q)
    );
  }, [supplierDetail, purchasesSearch]);

  const filteredPayments = useMemo(() => {
    if (!supplierDetail) return [];
    if (!paymentsSearch.trim()) return supplierDetail.recent_payments;
    const q = paymentsSearch.toLowerCase();
    return supplierDetail.recent_payments.filter(
      (p) =>
        p.payment_number.toLowerCase().includes(q) ||
        p.concept.toLowerCase().includes(q) ||
        (p.payment_method?.name && p.payment_method.name.toLowerCase().includes(q))
    );
  }, [supplierDetail, paymentsSearch]);

  useEffect(() => {
    if (!canView) {
      window.location.href = '/admin/dashboard';
      return;
    }
    loadSupplierDetail();
  }, [canView, supplierId]);

  if (!canView) return null;

  const loadSupplierDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const detail = await balanceInquiryApi.supplier(supplierId);
      setSupplierDetail(detail);
    } catch (err: any) {
      console.error('Error loading supplier detail:', err);
      setError(err.message || 'Error al cargar detalle del proveedor');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const url = `/api/balances/suppliers/${supplierId}/export`;
    window.open(url, '_blank');
  };

  const handleExportPdf = async () => {
    if (!supplierDetail) return;
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      const generatedDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
      const companyName = user.company?.name || 'Empresa';
      const companyTaxId = user.company?.tax_id || '';
      const companyAddress = user.company?.address || '';

      const addFooters = () => {
        const pages = pdf.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
          pdf.setPage(i);
          const fy = pageHeight - 12;
          pdf.setDrawColor(229, 231, 235);
          pdf.line(margin, fy, pageWidth - margin, fy);
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(156, 163, 175);
          pdf.text(`${companyName} — Sistema de Gesti\u00f3n`, pageWidth / 2, fy + 4, { align: 'center' });
          pdf.setTextColor(176, 181, 191);
          pdf.text('Generado por Legal Sistema', pageWidth / 2, fy + 7, { align: 'center' });
          pdf.setTextColor(209, 213, 219);
          pdf.text(`Generado el ${generatedDate} | P\u00e1gina ${i} de ${pages}`, pageWidth / 2, fy + 10, { align: 'center' });
        }
      };

      const logoDataUrl = await loadPdfLogo(user.company?.logo_url);
      let currentY = margin;

      // ── Logo + Company Header ──
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

      // Badge + Title (right)
      const rightX = pageWidth - margin;
      pdf.setFillColor(238, 242, 255);
      pdf.setTextColor(79, 70, 229);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      const badgeText = 'ESTADO DE CUENTA';
      const badgeW = pdf.getTextWidth(badgeText) + 6;
      pdf.roundedRect(rightX - badgeW, currentY - 1, badgeW, 5, 1, 1, 'F');
      pdf.text(badgeText, rightX - badgeW + 3, currentY + 2.5);

      pdf.setFontSize(14);
      pdf.setTextColor(79, 70, 229);
      pdf.text(supplierDetail.supplier.name, rightX, currentY + 9, { align: 'right' });
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      const docText = supplierDetail.supplier.tax_id ? `NIT: ${supplierDetail.supplier.tax_id}` : '';
      if (docText) pdf.text(docText, rightX, currentY + 13, { align: 'right' });
      pdf.text(`Generado el ${generatedDate}`, rightX, currentY + (docText ? 16.5 : 13), { align: 'right' });

      currentY = Math.max(currentY + 5, infoY) + 10;
      pdf.setDrawColor(79, 70, 229);
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;

      // ── Summary Cards ──
      const cardData = [
        { label: 'COMPRAS', value: String(supplierDetail.purchases.length), bg: [219, 234, 254], border: [147, 197, 253], color: [37, 99, 235] },
        { label: 'FACTURADO', value: formatCurrency(supplierDetail.total_purchases), bg: [219, 234, 254], border: [147, 197, 253], color: [37, 99, 235] },
        { label: 'PAGADO', value: formatCurrency(supplierDetail.total_paid), bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
        { label: 'PENDIENTE', value: formatCurrency(supplierDetail.total_pending), bg: [254, 226, 226], border: [252, 165, 165], color: [220, 38, 38] },
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
        pdf.setTextColor(card.color[0], card.color[1], card.color[2]);
        pdf.text(card.value, x + cardW / 2, currentY + 11, { align: 'center' });
      });
      currentY += 22;

      // ── Purchases Table ──
      if (supplierDetail.purchases.length > 0) {
        pdf.setFillColor(79, 70, 229);
        pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text(`Compras (${supplierDetail.purchases.length})`, margin + 4, currentY + 4.8);
        currentY += 9;

        autoTable(pdf, {
          startY: currentY,
          head: [['Compra', 'Fecha', 'Total', 'Pagado', 'Pendiente', 'Estado']],
          body: supplierDetail.purchases.map((p: any) => [
            p.purchase_number,
            new Date(p.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bogota' }),
            formatCurrency(p.total_amount),
            formatCurrency(p.paid_amount),
            formatCurrency(p.pending_amount),
            p.payment_status === 'paid' ? 'Pagado' : p.payment_status === 'partial' ? 'Parcial' : 'Pendiente',
          ]),
          margin: { left: margin, right: margin },
          styles: { fontSize: 7, cellPadding: 1.8, textColor: [51, 51, 51] },
          headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        });
        currentY = (pdf as any).lastAutoTable.finalY + 10;
      }

      // ── Payments Table ──
      if (supplierDetail.recent_payments.length > 0) {
        if (currentY + 20 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
        pdf.setFillColor(79, 70, 229);
        pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text(`Pagos (${supplierDetail.recent_payments.length})`, margin + 4, currentY + 4.8);
        currentY += 9;

        autoTable(pdf, {
          startY: currentY,
          head: [['N\u00ba Pago', 'Fecha', 'Concepto', 'M\u00e9todo', 'Monto']],
          body: supplierDetail.recent_payments.map((p: any) => [
            p.payment_number,
            new Date(p.paid_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bogota' }),
            p.concept || '\u2014',
            p.payment_method?.name || '\u2014',
            formatCurrency(p.amount),
          ]),
          margin: { left: margin, right: margin },
          styles: { fontSize: 7, cellPadding: 1.8, textColor: [51, 51, 51] },
          headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          columnStyles: { 4: { halign: 'right' } },
        });
      }

      addFooters();
      pdf.save(`Estado_Cuenta_Proveedor_${supplierDetail.supplier.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />Pagado</Badge>;
      case 'partial':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800"><AlertCircle className="mr-1 h-3 w-3" />Parcial</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-red-100 text-red-800"><AlertCircle className="mr-1 h-3 w-3" />Pendiente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AppLayout title="Estado de Cuenta - Proveedor">
      <Head title="Estado de Cuenta - Proveedor" />
      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
        {/* Header */}
        <div className="bg-card border-b border-[#e1e7ef]">
          <div className="max-w-[1400px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.visit('/admin/balances/suppliers')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                  <Building2 className="h-5 w-5 text-[#2463eb]" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Estado de Cuenta - Proveedor</h1>
                  {supplierDetail && (
                    <p className="text-sm text-muted-foreground">
                      {supplierDetail.supplier.name}
                      {supplierDetail.supplier.tax_id && (
                        <span className="ml-1">— NIT: {supplierDetail.supplier.tax_id}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              {supplierDetail && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportPdf}>
                    <FileText className="h-4 w-4 mr-2" /> PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                  </Button>
                </div>
              )}
            </div>

            {/* Stats Cards */}
            {supplierDetail && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-card/50 backdrop-blur-sm border-2 border-[#e1e7ef] hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-[#2463eb]/10 p-2 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-[#2463eb]" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Compras</h3>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{supplierDetail.purchases.length}</p>
                  </div>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-2 border-[#e1e7ef] hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-[#2463eb]/10 p-2 rounded-lg">
                        <TrendingDown className="h-5 w-5 text-[#2463eb]" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Total Facturado</h3>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(supplierDetail.total_purchases)}</p>
                  </div>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-2 border-[#e1e7ef] hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-emerald-100 p-2 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Total Pagado</h3>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(supplierDetail.total_paid)}</p>
                  </div>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-2 border-[#e1e7ef] hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-red-100 p-2 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Pendiente</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(supplierDetail.total_pending)}</p>
                  </div>
                </Card>
              </div>
            )}

            {/* Supplier Info Row */}
            {supplierDetail && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                {supplierDetail.supplier.email && <span>Email: <strong className="text-foreground">{supplierDetail.supplier.email}</strong></span>}
                {supplierDetail.supplier.phone && <span>Tel: <strong className="text-foreground">{supplierDetail.supplier.phone}</strong></span>}
                {supplierDetail.supplier.address && <span>Dir: <strong className="text-foreground">{supplierDetail.supplier.address}</strong></span>}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">

        {loading && (
          <div className="flex items-center justify-center py-16 gap-2">
            <Spinner size="md" />
            <span className="text-muted-foreground">Cargando estado de cuenta...</span>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 border border-red-200">
            {error}
          </div>
        )}

        {supplierDetail && (
          <>

            {/* Charts */}
            {supplierDetail.total_purchases > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pie Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avance de Pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[180px] sm:h-[200px] md:h-[220px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <PieChart style={{ cursor: 'default' }}>
                          <Pie
                            data={[
                              { name: 'Pagado', value: supplierDetail.total_paid },
                              { name: 'Pendiente', value: supplierDetail.total_pending },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius="35%"
                            outerRadius="55%"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            isAnimationActive={false}
                            cursor="default"
                            style={{ outline: 'none' }}
                          >
                            <Cell fill="#2463eb" style={{ outline: 'none' }} />
                            <Cell fill="#e5e7eb" style={{ outline: 'none' }} />
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Bar Chart - Per Purchase */}
                {supplierDetail.purchases.length > 0 && supplierDetail.purchases.length <= 20 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avance por Compra</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[180px] sm:h-[200px] md:h-[220px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <BarChart
                            data={supplierDetail.purchases.map(p => ({
                              name: p.purchase_number,
                              pagado: p.paid_amount,
                              pendiente: p.pending_amount,
                            }))}
                            layout="vertical"
                            margin={{ left: 10, right: 10 }}
                            style={{ cursor: 'default' }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Bar dataKey="pagado" stackId="a" fill="#2463eb" name="Pagado" isAnimationActive={false} cursor="default" style={{ outline: 'none' }} />
                            <Bar dataKey="pendiente" stackId="a" fill="#e5e7eb" name="Pendiente" isAnimationActive={false} cursor="default" style={{ outline: 'none' }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Payment History */}
                {supplierDetail.recent_payments.length > 1 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Historial de Pagos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[180px] sm:h-[200px] md:h-[220px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <BarChart
                            data={(() => {
                              const grouped: Record<string, number> = {};
                              supplierDetail.recent_payments.forEach(p => {
                                const month = p.paid_at.substring(0, 7);
                                grouped[month] = (grouped[month] || 0) + p.amount;
                              });
                              return Object.entries(grouped)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([month, total]) => ({
                                  mes: new Date(month + '-01').toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }),
                                  total,
                                }));
                            })()}
                            margin={{ left: 10, right: 10 }}
                            style={{ cursor: 'default' }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Bar dataKey="total" fill="#2463eb" name="Pagos" radius={[4, 4, 0, 0]} isAnimationActive={false} cursor="default" style={{ outline: 'none' }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Tabs: Compras | Pagos */}
            <Tabs defaultValue="purchases">
              <TabsList>
                <TabsTrigger value="purchases">Compras ({supplierDetail.purchases.length})</TabsTrigger>
                <TabsTrigger value="payments">Pagos ({supplierDetail.recent_payments.length})</TabsTrigger>
              </TabsList>

              {/* Purchases Tab */}
              <TabsContent value="purchases" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar compra, estado..."
                        value={purchasesSearch}
                        onChange={(e) => setPurchasesSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {filteredPurchases.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        {purchasesSearch.trim() ? `No se encontraron resultados para "${purchasesSearch}"` : 'No hay compras registradas'}
                      </p>
                    ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Compra</TableHead>
                            <TableHead className="whitespace-nowrap">Fecha</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Pagado</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Pendiente</TableHead>
                            <TableHead className="text-center whitespace-nowrap">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPurchases.map((purchase) => (
                            <TableRow key={purchase.id}>
                              <TableCell className="font-mono text-sm whitespace-nowrap">{purchase.purchase_number}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{formatDate(purchase.created_at)}</TableCell>
                              <TableCell className="text-right text-sm whitespace-nowrap">{formatCurrency(purchase.total_amount)}</TableCell>
                              <TableCell className="text-right text-sm text-green-600 whitespace-nowrap">{formatCurrency(purchase.paid_amount)}</TableCell>
                              <TableCell className="text-right text-sm text-red-600 font-semibold whitespace-nowrap">{formatCurrency(purchase.pending_amount)}</TableCell>
                              <TableCell className="text-center">
                                {getPaymentStatusBadge(purchase.payment_status)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar pago, concepto, m\u00e9todo..."
                        value={paymentsSearch}
                        onChange={(e) => setPaymentsSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {filteredPayments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        {paymentsSearch.trim() ? `No se encontraron resultados para "${paymentsSearch}"` : 'No hay pagos registrados'}
                      </p>
                    ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">N.° Pago</TableHead>
                            <TableHead className="whitespace-nowrap">Fecha</TableHead>
                            <TableHead className="whitespace-nowrap">Concepto</TableHead>
                            <TableHead className="whitespace-nowrap">M\u00e9todo</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPayments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-mono text-sm whitespace-nowrap">{payment.payment_number}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{formatDate(payment.paid_at)}</TableCell>
                              <TableCell className="text-sm">{payment.concept || '\u2014'}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{payment.payment_method?.name || '\u2014'}</TableCell>
                              <TableCell className="text-right text-sm text-green-600 font-semibold whitespace-nowrap">
                                {formatCurrency(payment.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
        </div>
      </div>
    </AppLayout>
  );
}
