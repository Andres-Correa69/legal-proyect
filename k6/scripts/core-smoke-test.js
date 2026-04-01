import { smokeThresholds } from '../config/thresholds.js';
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
 * CORE SMOKE TEST
 * ───────────────
 * Validacion rapida de que todos los endpoints core responden correctamente.
 * 1 VU, 1 iteracion por scenario, ejecucion secuencial.
 *
 * Uso:
 *   k6 run k6/scripts/core-smoke-test.js
 */
export const options = {
  scenarios: {
    dashboard: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioDashboard',
      maxDuration: '60s',
    },
    sales: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioSales',
      startTime: '5s',
      maxDuration: '90s',
    },
    products: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioProducts',
      startTime: '15s',
      maxDuration: '60s',
    },
    payments: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioPayments',
      startTime: '25s',
      maxDuration: '60s',
    },
    accounting_crud: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioAccountingCrud',
      startTime: '35s',
      maxDuration: '60s',
    },
    accounting_reports: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioAccountingReports',
      startTime: '45s',
      maxDuration: '60s',
    },
    business_reports: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioBusinessReports',
      startTime: '55s',
      maxDuration: '60s',
    },
    cash_registers: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioCashRegisters',
      startTime: '65s',
      maxDuration: '60s',
    },
    inventory: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioInventory',
      startTime: '75s',
      maxDuration: '60s',
    },
  },
  thresholds: smokeThresholds,
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
    'k6/results/core-smoke-test.html': generateHtmlReport(data, 'Core Smoke Test'),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
