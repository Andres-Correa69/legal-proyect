import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, getAuthHeaders, getBaseUrl } from '../helpers/auth.js';

const BASE_URL = getBaseUrl();

/**
 * Scenario: Flujo completo de facturación electrónica
 * Login → estado → enviar factura (MOCK) → verificar respuesta
 */
export default function () {
  let token;

  group('Login', () => {
    token = login();
  });

  const headers = getAuthHeaders(token);

  group('Verificar estado', () => {
    const res = http.get(`${BASE_URL}/electronic-invoicing/status`, { headers });
    check(res, {
      'status 200': (r) => r.status === 200,
    });
    sleep(0.5);
  });

  group('Obtener catálogos', () => {
    const res = http.get(`${BASE_URL}/electronic-invoicing/catalogs`, { headers });
    check(res, {
      'catálogos status 200': (r) => r.status === 200,
    });
    sleep(0.3);
  });

  group('Enviar factura', () => {
    const num = Math.floor(Math.random() * 900000) + 100000;
    const payload = {
      number: num,
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

    const res = http.post(
      `${BASE_URL}/electronic-invoicing/invoice`,
      JSON.stringify(payload),
      { headers }
    );

    check(res, {
      'factura status 200': (r) => r.status === 200,
      'factura success': (r) => {
        try { return r.json().success === true; } catch (e) { return false; }
      },
      'factura DIAN válida': (r) => {
        try { return r.json().data.is_valid === true; } catch (e) { return false; }
      },
    });
    sleep(0.5);
  });

  sleep(1);
}
