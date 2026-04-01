/**
 * Umbrales de rendimiento compartidos para todas las pruebas k6.
 *
 * Se importan desde los scripts de ejecución (smoke, load, stress, spike)
 * para mantener criterios consistentes de aprobación/fallo.
 */

export const defaultThresholds = {
  // Duración de requests
  'http_req_duration': [
    'p(95)<500',   // 95% de requests bajo 500ms
    'p(99)<1500',  // 99% de requests bajo 1.5s
  ],

  // Tasa de errores HTTP
  'http_req_failed': [
    'rate<0.01',   // menos del 1% de errores
  ],

  // Throughput mínimo
  'http_reqs': [
    'rate>10',     // al menos 10 req/s
  ],
};

// Umbrales relajados para smoke tests (1 VU, no se mide throughput)
export const smokeThresholds = {
  'http_req_duration': [
    'p(95)<2000',  // más permisivo: 2s
  ],
  'http_req_failed': [
    'rate<0.05',   // hasta 5% (pueden faltar datos de prueba)
  ],
};

// Umbrales estrictos para producción
export const productionThresholds = {
  'http_req_duration': [
    'p(95)<300',
    'p(99)<800',
  ],
  'http_req_failed': [
    'rate<0.005',  // menos del 0.5%
  ],
  'http_reqs': [
    'rate>50',     // al menos 50 req/s
  ],
};
