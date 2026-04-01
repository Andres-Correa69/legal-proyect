import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, getAuthHeaders, getBaseUrl } from '../helpers/auth.js';
import { payrollNumberingRangePayload } from '../helpers/data.js';

const BASE_URL = getBaseUrl();

/**
 * Scenario: CRUD completo de rangos de numeración de nómina
 * 1. Login
 * 2. Listar rangos
 * 3. Crear rango
 * 4. Actualizar rango
 * 5. Eliminar rango
 */
export default function () {
  let token;
  let rangeId;

  group('Login', () => {
    token = login();
  });

  const headers = getAuthHeaders(token);

  group('Listar rangos de numeración', () => {
    const res = http.get(
      `${BASE_URL}/electronic-invoicing/payroll-numbering-ranges/`,
      { headers }
    );
    check(res, {
      'listar rangos status 200': (r) => r.status === 200,
      'listar rangos tiene data': (r) => {
        try {
          return Array.isArray(r.json().data);
        } catch (e) {
          return false;
        }
      },
    });
    sleep(0.3);
  });

  group('Crear rango de numeración', () => {
    // Prefijo único para evitar colisiones entre VUs
    const uniquePrefix = `K6${__VU}${__ITER}`.substring(0, 10);
    const payload = payrollNumberingRangePayload(uniquePrefix);

    const res = http.post(
      `${BASE_URL}/electronic-invoicing/payroll-numbering-ranges/`,
      JSON.stringify(payload),
      { headers }
    );

    check(res, {
      'crear rango status 200|201': (r) => r.status === 200 || r.status === 201,
      'crear rango success': (r) => {
        try {
          return r.json().success === true;
        } catch (e) {
          return false;
        }
      },
    });

    try {
      const body = res.json();
      rangeId = body.data && body.data.id;
    } catch (e) {}
    sleep(0.3);
  });

  if (!rangeId) {
    sleep(1);
    return;
  }

  group('Actualizar rango de numeración', () => {
    const res = http.put(
      `${BASE_URL}/electronic-invoicing/payroll-numbering-ranges/${rangeId}`,
      JSON.stringify({
        name: 'Rango actualizado k6',
        prefix: `U${__VU}${__ITER}`.substring(0, 10),
        consecutive_start: 1,
        consecutive_end: 10000,
        is_active: true,
      }),
      { headers }
    );

    check(res, {
      'actualizar rango status 200': (r) => r.status === 200,
    });
    sleep(0.3);
  });

  group('Eliminar rango de numeración', () => {
    const res = http.del(
      `${BASE_URL}/electronic-invoicing/payroll-numbering-ranges/${rangeId}`,
      null,
      { headers }
    );

    check(res, {
      'eliminar rango status 200': (r) => r.status === 200,
    });
    sleep(0.3);
  });

  sleep(1);
}
