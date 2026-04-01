import http from 'k6/http';
import { check, sleep } from 'k6';
import { generateHtmlReport } from '../helpers/report.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:8000';
const API_KEY = __ENV.K6_API_KEY || 'k6-test-key-379b16df5b1ee7422b1d53204f1a4c88';
const DIAN_TOKEN = __ENV.K6_DIAN_TOKEN || 'GOuNHfyl3kEHZo8S9iSOMnin4a5uW78wU0Qkym0cuQZZ6Kezh8pd0xCByRJe';

/**
 * TEST DE CARGA - API EXTERNA DE VENTAS
 * ──────────────────────────────────────
 * 50 peticiones simultáneas a POST /api/external/v1/invoice
 * Cada VU simula un proyecto externo distinto enviando facturas.
 *
 * Uso:
 *   k6 run k6/scenarios/external-invoicing.js
 *   k6 run --vus 50 --duration 30s k6/scenarios/external-invoicing.js
 */
export const options = {
  scenarios: {
    concurrent_invoices: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<2000'],
    'http_req_failed': ['rate<0.05'],
    'checks': ['rate>0.95'],
  },
};

export default function () {
  const uniqueNum = Math.floor(Math.random() * 9000000) + 1000000;

  const payload = {
    dian_token: DIAN_TOKEN,
    invoice: {
      number: uniqueNum,
      sync: true,
      type_document_id: 1,
      resolution_id: 1,
      customer: {
        identification_number: `90000${__VU}${__ITER}`.substring(0, 10),
        name: `Cliente Externo VU-${__VU}`,
        phone: '3001234567',
        address: 'Calle 123 #45-67',
        email: `cliente.vu${__VU}@test.com`,
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
          description: `Producto VU-${__VU} Iter-${__ITER}`,
          code: `EXT-${__VU}-${__ITER}`,
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
    },
  };

  const res = http.post(
    `${BASE_URL}/api/external/v1/invoice`,
    JSON.stringify(payload),
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': API_KEY,
      },
    }
  );

  check(res, {
    'status 200': (r) => r.status === 200,
    'success true': (r) => {
      try { return r.json().success === true; } catch (e) { return false; }
    },
    'factura válida DIAN': (r) => {
      try { return r.json().is_valid === true; } catch (e) { return false; }
    },
  });

  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'k6/results/external-invoicing.html': generateHtmlReport(data, 'External Invoicing - 50 VUs'),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
