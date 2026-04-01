import { generateHtmlReport } from '../helpers/report.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import invoicing from '../scenarios/invoicing.js';
import payroll from '../scenarios/payroll.js';

/**
 * SPIKE TEST
 * ──────────
 * Simula un pico súbito de tráfico para evaluar la capacidad de recuperación.
 * Rampas: 10 VUs → 300 VUs (instantáneo) → mantener 1m → bajar a 10
 *
 * Uso:
 *   k6 run k6/scripts/spike-test.js
 *
 * Exportar resultados:
 *   k6 run --out json=results/spike-test.json k6/scripts/spike-test.js
 */
export const options = {
  scenarios: {
    // Facturación: foco principal del spike
    invoicing: {
      executor: 'ramping-vus',
      exec: 'scenarioInvoicing',
      stages: [
        { duration: '30s', target: 5 },    // carga base
        { duration: '10s', target: 200 },   // spike súbito
        { duration: '1m', target: 200 },    // mantener pico
        { duration: '30s', target: 5 },     // recuperación
        { duration: '1m', target: 5 },      // estabilización
      ],
    },
    // Nómina: spike secundario
    payroll: {
      executor: 'ramping-vus',
      exec: 'scenarioPayroll',
      stages: [
        { duration: '30s', target: 3 },
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 3 },
        { duration: '1m', target: 3 },
      ],
    },
  },
  thresholds: {
    // Umbrales muy permisivos — el objetivo es medir, no aprobar/fallar
    'http_req_duration': [
      'p(95)<5000',   // 5s en p95
      'p(99)<10000',  // 10s en p99
    ],
    'http_req_failed': [
      'rate<0.10',    // hasta 10% de errores aceptable en spike
    ],
  },
};

export function scenarioInvoicing() { invoicing(); }
export function scenarioPayroll() { payroll(); }

export function handleSummary(data) {
  return {
    'k6/results/spike-test.html': generateHtmlReport(data, 'Spike Test'),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
