import { generateHtmlReport } from '../helpers/report.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import dashboard from '../scenarios/dashboard.js';
import salesCrud from '../scenarios/sales-crud.js';
import productsCrud from '../scenarios/products-crud.js';
import paymentsCrud from '../scenarios/payments-crud.js';
import accountingCrud from '../scenarios/accounting-crud.js';
import accountingReports from '../scenarios/accounting-reports.js';
import businessReports from '../scenarios/business-reports.js';
import cashRegistersCrud from '../scenarios/cash-registers-crud.js';
import inventoryCrud from '../scenarios/inventory-crud.js';

/**
 * CORE STRESS TEST
 * ────────────────
 * Prueba de estres progresiva para todos los modulos core de la aplicacion.
 * Rampas: 0→25 VUs (1m) → 25 sostenidos (3m) → 50 VUs (1m) → 50 sostenidos (3m) → 0 (1m)
 *
 * Distribucion de trafico realista:
 *   Dashboard 20% | Ventas 25% | Productos 15% | Pagos 10% | Contabilidad 10%
 *   Reportes contables 8% | Reportes negocio 7% | Cajas 3% | Inventario 2%
 *
 * Uso:
 *   k6 run k6/scripts/core-stress-test.js
 *
 * Exportar resultados:
 *   k6 run --out json=k6/results/core-stress-test.json k6/scripts/core-stress-test.js
 */
export const options = {
  scenarios: {
    // Dashboard: 20% del trafico
    dashboard: {
      executor: 'ramping-vus',
      exec: 'scenarioDashboard',
      stages: [
        { duration: '1m', target: 5 },
        { duration: '3m', target: 5 },
        { duration: '1m', target: 10 },
        { duration: '3m', target: 10 },
        { duration: '1m', target: 0 },
      ],
    },
    // Ventas: 25% del trafico
    sales: {
      executor: 'ramping-vus',
      exec: 'scenarioSales',
      stages: [
        { duration: '1m', target: 6 },
        { duration: '3m', target: 6 },
        { duration: '1m', target: 12 },
        { duration: '3m', target: 12 },
        { duration: '1m', target: 0 },
      ],
    },
    // Productos: 15% del trafico
    products: {
      executor: 'ramping-vus',
      exec: 'scenarioProducts',
      stages: [
        { duration: '1m', target: 4 },
        { duration: '3m', target: 4 },
        { duration: '1m', target: 8 },
        { duration: '3m', target: 8 },
        { duration: '1m', target: 0 },
      ],
    },
    // Pagos: 10% del trafico
    payments: {
      executor: 'ramping-vus',
      exec: 'scenarioPayments',
      stages: [
        { duration: '1m', target: 3 },
        { duration: '3m', target: 3 },
        { duration: '1m', target: 5 },
        { duration: '3m', target: 5 },
        { duration: '1m', target: 0 },
      ],
    },
    // Contabilidad CRUD: 10% del trafico
    accounting_crud: {
      executor: 'ramping-vus',
      exec: 'scenarioAccountingCrud',
      stages: [
        { duration: '1m', target: 3 },
        { duration: '3m', target: 3 },
        { duration: '1m', target: 5 },
        { duration: '3m', target: 5 },
        { duration: '1m', target: 0 },
      ],
    },
    // Reportes contables: 8% del trafico
    accounting_reports: {
      executor: 'ramping-vus',
      exec: 'scenarioAccountingReports',
      stages: [
        { duration: '1m', target: 2 },
        { duration: '3m', target: 2 },
        { duration: '1m', target: 4 },
        { duration: '3m', target: 4 },
        { duration: '1m', target: 0 },
      ],
    },
    // Reportes de negocio: 7% del trafico
    business_reports: {
      executor: 'ramping-vus',
      exec: 'scenarioBusinessReports',
      stages: [
        { duration: '1m', target: 2 },
        { duration: '3m', target: 2 },
        { duration: '1m', target: 3 },
        { duration: '3m', target: 3 },
        { duration: '1m', target: 0 },
      ],
    },
    // Cajas registradoras: 3% del trafico
    cash_registers: {
      executor: 'ramping-vus',
      exec: 'scenarioCashRegisters',
      stages: [
        { duration: '1m', target: 1 },
        { duration: '3m', target: 1 },
        { duration: '1m', target: 2 },
        { duration: '3m', target: 2 },
        { duration: '1m', target: 0 },
      ],
    },
    // Inventario: 2% del trafico
    inventory: {
      executor: 'ramping-vus',
      exec: 'scenarioInventory',
      stages: [
        { duration: '1m', target: 1 },
        { duration: '3m', target: 1 },
        { duration: '1m', target: 1 },
        { duration: '3m', target: 1 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration': [
      'p(95)<2000',   // 2s en p95
      'p(99)<5000',   // 5s en p99
    ],
    'http_req_failed': [
      'rate<0.05',    // hasta 5% de errores
    ],
  },
};

export function scenarioDashboard() { dashboard(); }
export function scenarioSales() { salesCrud(); }
export function scenarioProducts() { productsCrud(); }
export function scenarioPayments() { paymentsCrud(); }
export function scenarioAccountingCrud() { accountingCrud(); }
export function scenarioAccountingReports() { accountingReports(); }
export function scenarioBusinessReports() { businessReports(); }
export function scenarioCashRegisters() { cashRegistersCrud(); }
export function scenarioInventory() { inventoryCrud(); }

export function handleSummary(data) {
  return {
    'k6/results/core-stress-test.html': generateHtmlReport(data, 'Core Stress Test'),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
