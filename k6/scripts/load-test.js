import { defaultThresholds } from '../config/thresholds.js';
import { generateHtmlReport } from '../helpers/report.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import invoicing from '../scenarios/invoicing.js';
import payroll from '../scenarios/payroll.js';
import payrollRanges from '../scenarios/payroll-ranges.js';
import configRegistration from '../scenarios/config-registration.js';

/**
 * LOAD TEST
 * ─────────
 * Simula carga normal sostenida con múltiples usuarios concurrentes.
 * Rampa: 0→20 VUs (1m) → 50 VUs sostenidos (5m) → 0 (1m)
 *
 * Uso:
 *   k6 run k6/scripts/load-test.js
 *
 * Exportar resultados a JSON:
 *   k6 run --out json=results/load-test.json k6/scripts/load-test.js
 */
export const options = {
  scenarios: {
    // Facturación: mayor peso (60% del tráfico)
    invoicing: {
      executor: 'ramping-vus',
      exec: 'scenarioInvoicing',
      stages: [
        { duration: '1m', target: 12 },  // ramp-up
        { duration: '5m', target: 30 },  // carga sostenida
        { duration: '1m', target: 0 },   // ramp-down
      ],
    },
    // Nómina: peso medio (25% del tráfico)
    payroll: {
      executor: 'ramping-vus',
      exec: 'scenarioPayroll',
      stages: [
        { duration: '1m', target: 5 },
        { duration: '5m', target: 12 },
        { duration: '1m', target: 0 },
      ],
    },
    // Rangos: peso bajo (10% del tráfico)
    payroll_ranges: {
      executor: 'ramping-vus',
      exec: 'scenarioPayrollRanges',
      stages: [
        { duration: '1m', target: 2 },
        { duration: '5m', target: 5 },
        { duration: '1m', target: 0 },
      ],
    },
    // Configuración: peso bajo (5% del tráfico)
    config: {
      executor: 'ramping-vus',
      exec: 'scenarioConfig',
      stages: [
        { duration: '1m', target: 1 },
        { duration: '5m', target: 3 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: defaultThresholds,
};

export function scenarioInvoicing() { invoicing(); }
export function scenarioPayroll() { payroll(); }
export function scenarioPayrollRanges() { payrollRanges(); }
export function scenarioConfig() { configRegistration(); }

export function handleSummary(data) {
  return {
    'k6/results/load-test.html': generateHtmlReport(data, 'Load Test'),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
