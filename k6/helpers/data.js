/**
 * Payloads de ejemplo reutilizables para los endpoints de facturación electrónica.
 * Los IDs y referencias deben ajustarse según el entorno de pruebas.
 */

// --- Facturación Electrónica ---

export function invoicePayload(number = 1) {
  return {
    number: number,
    sync: true,
    type_document_id: 1,
    resolution_id: 1,
    customer: {
      identification_number: '900000000',
      name: 'Cliente de Prueba k6',
      phone: '3001234567',
      address: 'Calle 123 #45-67',
      email: 'cliente.prueba@test.com',
      merchant_registration: '0000000-00',
      type_document_identification_id: 6,
      type_organization_id: 1,
      type_liability_id: 7,
      municipality_id: 149,
      type_regime_id: 1,
    },
    date: new Date().toISOString().split('T')[0],
    invoice_lines: [
      {
        unit_measure_id: 70,
        invoiced_quantity: 1,
        line_extension_amount: 100000,
        free_of_charge_indicator: false,
        description: 'Producto de prueba k6',
        code: 'PROD-K6-001',
        type_item_identification_id: 4,
        price_amount: 100000,
        base_quantity: 1,
        tax_totals: [
          {
            tax_id: 1,
            tax_amount: 19000,
            taxable_amount: 100000,
            percent: 19,
          },
        ],
      },
    ],
    legal_monetary_totals: {
      line_extension_amount: 100000,
      tax_exclusive_amount: 100000,
      tax_inclusive_amount: 119000,
      payable_amount: 119000,
    },
  };
}

// --- Registro de Empresa ---

export function registerPayload() {
  return {
    tax_id: '900000000',
    type_document_identification_id: 6,
    type_organization_id: 1,
    type_regime_id: 1,
    type_liability_id: 7,
    business_name: 'Empresa de Prueba k6',
    merchant_registration: '0000000-00',
    municipality_id: 149,
    address: 'Calle 123 #45-67',
    phone: '3001234567',
    email: 'empresa.prueba@test.com',
  };
}

// --- Configuración de Facturación ---

export function configPayload() {
  return {
    resolution_id: null,
    prefix: 'FE',
    consecutive_start: 1,
    consecutive_end: 5000,
    cn_prefix: 'NC',
    cn_consecutive_start: 1,
    cn_consecutive_end: 5000,
    dn_prefix: 'ND',
    dn_consecutive_start: 1,
    dn_consecutive_end: 5000,
  };
}

// --- Habilitación DIAN ---

export function setEnvironmentPayload() {
  return {
    type_environment_id: 2,
    software_id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    pin: '12345',
    certificate: 'base64_certificate_placeholder',
    certificate_password: 'certificate_password',
  };
}

// --- Nómina Electrónica ---

export function payrollStorePayload(numberingRangeId = 1) {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    settlement_start_date: startOfMonth.toISOString().split('T')[0],
    settlement_end_date: endOfMonth.toISOString().split('T')[0],
    issue_date: today.toISOString().split('T')[0],
    numbering_range_id: numberingRangeId,
    payroll_period_id: 5, // Mensual
    notes: 'Lote de prueba k6',
  };
}

export function laborDataPayload() {
  return {
    type_worker_id: 1,
    subtype_worker_id: 1,
    type_contract_id: 1,
    integral_salary: false,
    high_risk_pension: false,
    type_document_identification_id: 13,
    identification_number: '1234567890',
    surname: 'Prueba',
    second_surname: 'K6',
    first_name: 'Empleado',
    other_names: 'Test',
    municipality_id: 149,
    address: 'Calle 123 #45-67',
    admission_date: '2024-01-01',
    salary: 2500000,
    payment_form_id: 1,
    payment_method_id: 10,
    bank: 'Banco de prueba',
    account_type: 'Ahorros',
    account_number: '1234567890',
  };
}

export function earningPayload() {
  return {
    concept: 'Salario',
    data: {
      worked_days: 30,
    },
    payment: 2500000,
  };
}

export function deductionPayload() {
  return {
    concept: 'Salud',
    data: {
      percentage: 4,
    },
    payment: 100000,
  };
}

// --- Rangos de Numeración de Nómina ---

export function payrollNumberingRangePayload(prefix = 'K6') {
  return {
    name: `Rango de prueba k6 - ${prefix}`,
    type: 'payroll',
    prefix: prefix,
    consecutive_start: 1,
    consecutive_end: 5000,
  };
}

// --- Eventos de Compra ---

export function receiptAcknowledgmentPayload() {
  return {
    uuid: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  };
}
