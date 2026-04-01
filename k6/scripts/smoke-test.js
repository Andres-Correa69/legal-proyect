import { smokeThresholds } from '../config/thresholds.js';
import { generateHtmlReport } from '../helpers/report.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import invoicing from '../scenarios/invoicing.js';
import creditDebitNotes from '../scenarios/credit-debit-notes.js';
import payroll from '../scenarios/payroll.js';
import payrollRanges from '../scenarios/payroll-ranges.js';
import purchaseEvents from '../scenarios/purchase-events.js';
import configRegistration from '../scenarios/config-registration.js';

/**
 * SMOKE TEST
 * ──────────
 * Validación rápida de que todos los endpoints responden correctamente.
 * 1 usuario virtual, 1 iteración por scenario.
 *
 * Uso:
 *   k6 run k6/scripts/smoke-test.js
 *
 * Variables de entorno requeridas:
 *   K6_BASE_URL         - URL base de la API (default: http://localhost:8000/api)
 *   K6_USER_EMAIL        - Email del usuario de prueba
 *   K6_USER_PASSWORD     - Password del usuario de prueba
 */
export const options = {
  scenarios: {
    invoicing: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioInvoicing',
      maxDuration: '60s',
    },
    credit_debit: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioCreditDebit',
      startTime: '10s',
      maxDuration: '60s',
    },
    payroll: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioPayroll',
      startTime: '20s',
      maxDuration: '90s',
    },
    payroll_ranges: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioPayrollRanges',
      startTime: '30s',
      maxDuration: '60s',
    },
    purchase_events: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioPurchaseEvents',
      startTime: '40s',
      maxDuration: '60s',
    },
    config_registration: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioConfigRegistration',
      startTime: '50s',
      maxDuration: '60s',
    },
  },
  thresholds: smokeThresholds,
};

export function scenarioInvoicing() { invoicing(); }
export function scenarioCreditDebit() { creditDebitNotes(); }
export function scenarioPayroll() { payroll(); }
export function scenarioPayrollRanges() { payrollRanges(); }
export function scenarioPurchaseEvents() { purchaseEvents(); }
export function scenarioConfigRegistration() { configRegistration(); }

export function handleSummary(data) {
  const html = generateHtmlReport(data, 'Smoke Test');
  return {
    'k6/results/smoke-test.html': html,
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
