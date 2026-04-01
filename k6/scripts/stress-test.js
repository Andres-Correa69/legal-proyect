import { defaultThresholds } from '../config/thresholds.js';
import { generateHtmlReport } from '../helpers/report.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import invoicing from '../scenarios/invoicing.js';
import payroll from '../scenarios/payroll.js';
import payrollRanges from '../scenarios/payroll-ranges.js';
import configRegistration from '../scenarios/config-registration.js';

/**
 * STRESS TEST
 * ───────────
 * Incrementa la carga progresivamente para encontrar el punto de quiebre del sistema.
 * Rampas: 0→50 (2m) → 100 (3m) → 200 (3m) → 0 (2m)
 *
 * Uso:
 *   k6 run k6/scripts/stress-test.js
 *
 * Exportar resultados:
 *   k6 run --out json=results/stress-test.json k6/scripts/stress-test.js
 */
export const options = {
  scenarios: {
    // Facturación: 60% del tráfico
    invoicing: {
      executor: 'ramping-vus',
      exec: 'scenarioInvoicing',
      stages: [
        { duration: '2m', target: 30 },
        { duration: '3m', target: 60 },
        { duration: '3m', target: 120 },
        { duration: '2m', target: 0 },
      ],
    },
    // Nómina: 25% del tráfico
    payroll: {
      executor: 'ramping-vus',
      exec: 'scenarioPayroll',
      stages: [
        { duration: '2m', target: 12 },
        { duration: '3m', target: 25 },
        { duration: '3m', target: 50 },
        { duration: '2m', target: 0 },
      ],
    },
    // Rangos: 10% del tráfico
    payroll_ranges: {
      executor: 'ramping-vus',
      exec: 'scenarioPayrollRanges',
      stages: [
        { duration: '2m', target: 5 },
        { duration: '3m', target: 10 },
        { duration: '3m', target: 20 },
        { duration: '2m', target: 0 },
      ],
    },
    // Configuración: 5% del tráfico
    config: {
      executor: 'ramping-vus',
      exec: 'scenarioConfig',
      stages: [
        { duration: '2m', target: 3 },
        { duration: '3m', target: 5 },
        { duration: '3m', target: 10 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    // Umbrales más permisivos para stress test (se espera degradación)
    'http_req_duration': [
      'p(95)<2000',   // 2s en p95
      'p(99)<5000',   // 5s en p99
    ],
    'http_req_failed': [
      'rate<0.05',    // hasta 5% de errores
    ],
  },
};

export function scenarioInvoicing() { invoicing(); }
export function scenarioPayroll() { payroll(); }
export function scenarioPayrollRanges() { payrollRanges(); }
export function scenarioConfig() { configRegistration(); }

export function handleSummary(data) {
  return {
    'k6/results/stress-test.html': generateHtmlReport(data, 'Stress Test'),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
