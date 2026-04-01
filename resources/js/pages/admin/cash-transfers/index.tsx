import { Head, router, usePage } from "@inertiajs/react";
import { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Combobox } from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import {
  cashTransfersApi,
  cashRegistersApi,
  type CashRegister,
  type CreateTransferData,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import { ArrowRight, Wallet, AlertCircle, CheckCircle } from "lucide-react";

export default function NewCashTransfer() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const canCreate = hasPermission('cash-transfers.create', user);

  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const [formData, setFormData] = useState<{
    source_cash_register_id: string;
    destination_cash_register_id: string;
    amount: string;
    notes: string;
  }>({
    source_cash_register_id: '',
    destination_cash_register_id: '',
    amount: '',
    notes: '',
  });

  const companyFilter = useSuperAdminCompanyFilter();

  useEffect(() => {
    if (!canCreate) {
      router.visit('/admin/dashboard');
      return;
    }
    if (companyFilter.shouldLoadData) {
      loadCashRegisters();
    }
  }, [canCreate, companyFilter.isFiltered, companyFilter.selectedCompanyId]);

  if (!canCreate) {
    return null;
  }

  const loadCashRegisters = async () => {
    try {
      setLoading(true);
      const data = await cashRegistersApi.getAll({ company_id: companyFilter.companyIdParam });
      // Solo mostrar cajas activas
      setCashRegisters(data.filter(cr => cr.is_active));
    } catch (error: any) {
      console.error('Error loading cash registers:', error);
      setGeneralError(error.message || 'Error al cargar las cajas');
    } finally {
      setLoading(false);
    }
  };

  const sourceCashRegister = cashRegisters.find(
    cr => cr.id.toString() === formData.source_cash_register_id
  );
  const destinationCashRegister = cashRegisters.find(
    cr => cr.id.toString() === formData.destination_cash_register_id
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.source_cash_register_id) {
      newErrors.source_cash_register_id = 'Debes seleccionar una caja origen';
    }

    if (!formData.destination_cash_register_id) {
      newErrors.destination_cash_register_id = 'Debes seleccionar una caja destino';
    }

    if (formData.source_cash_register_id === formData.destination_cash_register_id) {
      newErrors.destination_cash_register_id = 'La caja destino debe ser diferente a la caja origen';
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a cero';
    }

    if (sourceCashRegister && amount > sourceCashRegister.current_balance) {
      newErrors.amount = 'Saldo insuficiente en la caja origen';
    }

    if (formData.notes && formData.notes.length > 1000) {
      newErrors.notes = 'Las notas no pueden exceder 1000 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setFormLoading(true);

    try {
      const data: CreateTransferData = {
        source_cash_register_id: parseInt(formData.source_cash_register_id),
        destination_cash_register_id: parseInt(formData.destination_cash_register_id),
        amount: parseFloat(formData.amount),
        notes: formData.notes || undefined,
      };

      await cashTransfersApi.create(data);

      router.visit('/admin/cash-transfers-history');
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      if (error.errors) {
        const formattedErrors: Record<string, string> = {};
        Object.keys(error.errors).forEach(key => {
          formattedErrors[key] = Array.isArray(error.errors[key])
            ? error.errors[key][0]
            : error.errors[key];
        });
        setErrors(formattedErrors);
      } else {
        setGeneralError(error.message || 'Error al crear la transferencia');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    const raw = value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, amount: raw });
    // Validar en tiempo real
    const numericValue = parseInt(raw) || 0;
    if (sourceCashRegister && numericValue > sourceCashRegister.current_balance) {
      setErrors({ ...errors, amount: 'Saldo insuficiente en la caja origen' });
    } else if (numericValue <= 0) {
      setErrors({ ...errors, amount: 'El monto debe ser mayor a cero' });
    } else {
      const { amount, ...restErrors } = errors;
      setErrors(restErrors);
    }
  };

  const isFormValid =
    formData.source_cash_register_id &&
    formData.destination_cash_register_id &&
    formData.source_cash_register_id !== formData.destination_cash_register_id &&
    formData.amount &&
    parseFloat(formData.amount) > 0 &&
    (!sourceCashRegister || parseFloat(formData.amount) <= sourceCashRegister.current_balance) &&
    Object.keys(errors).length === 0;

  return (
    <AppLayout title="Nueva Transferencia">
      <Head title="Nueva Transferencia" />
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nueva Transferencia de Caja</h2>
          <p className="text-muted-foreground">Transfiere dinero entre cajas registradoras</p>
        </div>

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

        {companyFilter.isSuperAdmin && !companyFilter.isFiltered && <SuperAdminEmptyState />}

        {companyFilter.shouldLoadData && generalError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        {companyFilter.shouldLoadData && successMessage && (
          <Alert className="border-green-500 bg-green-500/10 text-green-900">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Éxito</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {companyFilter.shouldLoadData && (<Card>
          <CardHeader>
            <CardTitle>Información de la Transferencia</CardTitle>
            <CardDescription>
              Selecciona la caja origen, la caja destino y el monto a transferir
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-2" />
                <p>Cargando cajas...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Caja Origen */}
                  <div className="space-y-2">
                    <Label htmlFor="source_cash_register_id">Caja Origen *</Label>
                    <Combobox
                      value={formData.source_cash_register_id}
                      onValueChange={(value) => {
                        setFormData({ ...formData, source_cash_register_id: value });
                        const { source_cash_register_id, ...restErrors } = errors;
                        setErrors(restErrors);
                      }}
                      disabled={formLoading}
                      placeholder="Selecciona una caja"
                      searchPlaceholder="Buscar caja..."
                      emptyText="No se encontraron cajas"
                      options={cashRegisters.map((cr) => ({
                        value: cr.id.toString(),
                        label: cr.name,
                        disabled: cr.id.toString() === formData.destination_cash_register_id,
                      }))}
                    />
                    <InputError message={errors.source_cash_register_id} />

                    {sourceCashRegister && (
                      <Card className="mt-2 border-primary/20 bg-primary/5">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">Saldo Actual</span>
                            </div>
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(sourceCashRegister.current_balance)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Caja Destino */}
                  <div className="space-y-2">
                    <Label htmlFor="destination_cash_register_id">Caja Destino *</Label>
                    <Combobox
                      value={formData.destination_cash_register_id}
                      onValueChange={(value) => {
                        setFormData({ ...formData, destination_cash_register_id: value });
                        const { destination_cash_register_id, ...restErrors } = errors;
                        setErrors(restErrors);
                      }}
                      disabled={formLoading}
                      placeholder="Selecciona una caja"
                      searchPlaceholder="Buscar caja..."
                      emptyText="No se encontraron cajas"
                      options={cashRegisters.map((cr) => ({
                        value: cr.id.toString(),
                        label: cr.name,
                        disabled: cr.id.toString() === formData.source_cash_register_id,
                      }))}
                    />
                    <InputError message={errors.destination_cash_register_id} />

                    {destinationCashRegister && (
                      <Card className="mt-2 border-green-500/20 bg-green-500/10">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">Saldo Actual</span>
                            </div>
                            <span className="text-lg font-bold text-green-600">
                              {formatCurrency(destinationCashRegister.current_balance)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Flecha visual entre cajas */}
                {sourceCashRegister && destinationCashRegister && (
                  <div className="flex items-center justify-center py-2">
                    <div className="flex items-center gap-4 text-primary">
                      <div className="text-center">
                        <p className="text-sm font-medium">{sourceCashRegister.name}</p>
                        <p className="text-xs text-muted-foreground">Origen</p>
                      </div>
                      <ArrowRight className="h-8 w-8 animate-pulse" />
                      <div className="text-center">
                        <p className="text-sm font-medium">{destinationCashRegister.name}</p>
                        <p className="text-xs text-muted-foreground">Destino</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Monto */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto a Transferir *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      id="amount"
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formData.amount ? parseInt(formData.amount).toLocaleString('es-CO') : ''}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      disabled={formLoading}
                      className={`pl-7 ${errors.amount ? 'border-red-500' : ''}`}
                    />
                  </div>
                  <InputError message={errors.amount} />

                  {formData.amount && parseFloat(formData.amount) > 0 && !errors.amount && (
                    <p className="text-sm text-muted-foreground">
                      Monto a transferir: <span className="font-semibold">{formatCurrency(parseFloat(formData.amount))}</span>
                    </p>
                  )}
                </div>

                {/* Notas */}
                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Notas <span className="text-muted-foreground">(Opcional, máx. 1000 caracteres)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Escribe notas adicionales sobre la transferencia..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    disabled={formLoading}
                    maxLength={1000}
                    rows={4}
                  />
                  <div className="flex justify-between items-center">
                    <InputError message={errors.notes} />
                    <span className="text-xs text-muted-foreground">
                      {formData.notes.length}/1000
                    </span>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.visit('/admin/cash-transfers-history')}
                    disabled={formLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={formLoading || !isFormValid}
                  >
                    {formLoading && <Spinner className="mr-2" size="sm" />}
                    Realizar Transferencia
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>)}
      </div>
    </AppLayout>
  );
}
