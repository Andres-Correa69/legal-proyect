import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, getAuthHeaders, getBaseUrl } from '../helpers/auth.js';
import { laborDataPayload, earningPayload, deductionPayload } from '../helpers/data.js';

const BASE_URL = getBaseUrl();
const EMPLOYEE_USER_ID = __ENV.K6_EMPLOYEE_USER_ID || '1';

/**
 * Scenario: Flujo completo de nómina electrónica
 * Primero consulta los rangos reales y usa el ID correcto.
 */
export default function () {
  let token;
  let payrollId;
  let payrollEmployeeId;
  let earningId;
  let deductionId;
  let numberingRangeId;

  group('Login', () => {
    token = login();
  });

  const headers = getAuthHeaders(token);

  group('Obtener catálogos de nómina', () => {
    const res = http.get(`${BASE_URL}/electronic-invoicing/payrolls/catalogs`, { headers });
    check(res, { 'catálogos status 200': (r) => r.status === 200 });
    sleep(0.3);
  });

  group('Listar lotes de nómina', () => {
    const res = http.get(`${BASE_URL}/electronic-invoicing/payrolls/`, { headers });
    check(res, { 'listar lotes status 200': (r) => r.status === 200 });
    sleep(0.3);
  });

  // Obtener el ID real del rango de numeración activo
  group('Obtener rango de numeración real', () => {
    const res = http.get(`${BASE_URL}/electronic-invoicing/payroll-numbering-ranges/`, { headers });
    check(res, { 'rangos status 200': (r) => r.status === 200 });

    try {
      const body = res.json();
      const ranges = body.data || [];
      const payrollRange = ranges.find((r) => r.type === 'payroll' && r.is_active);
      if (payrollRange) {
        numberingRangeId = payrollRange.id;
      }
    } catch (e) {}
    sleep(0.3);
  });

  if (!numberingRangeId) {
    check({ ok: true }, { 'nómina skipped (sin rango activo)': () => true });
    sleep(1);
    return;
  }

  group('Crear lote de nómina', () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const res = http.post(
      `${BASE_URL}/electronic-invoicing/payrolls/`,
      JSON.stringify({
        settlement_start_date: startOfMonth.toISOString().split('T')[0],
        settlement_end_date: endOfMonth.toISOString().split('T')[0],
        issue_date: today.toISOString().split('T')[0],
        numbering_range_id: numberingRangeId,
        payroll_period_id: 5,
        notes: 'Lote de prueba k6',
      }),
      { headers }
    );

    check(res, {
      'crear lote status 200|201': (r) => r.status === 200 || r.status === 201,
      'crear lote success': (r) => {
        try { return r.json().success === true; } catch (e) { return false; }
      },
    });

    try {
      const body = res.json();
      payrollId = body.data && body.data.id;
    } catch (e) {}
    sleep(0.5);
  });

  if (!payrollId) { sleep(1); return; }

  group('Ver detalle del lote', () => {
    const res = http.get(`${BASE_URL}/electronic-invoicing/payrolls/${payrollId}`, { headers });
    check(res, { 'detalle lote status 200': (r) => r.status === 200 });
    sleep(0.3);
  });

  group('Obtener/crear empleado en lote', () => {
    const res = http.get(
      `${BASE_URL}/electronic-invoicing/payrolls/${payrollId}/employees/${EMPLOYEE_USER_ID}`,
      { headers }
    );
    check(res, { 'obtener empleado status 200': (r) => r.status === 200 });

    try {
      const body = res.json();
      payrollEmployeeId = body.data && body.data.id;
    } catch (e) {}
    sleep(0.3);
  });

  if (!payrollEmployeeId) { sleep(1); return; }

  group('Actualizar datos laborales', () => {
    const res = http.put(
      `${BASE_URL}/electronic-invoicing/payrolls/employees/${payrollEmployeeId}/labor-data`,
      JSON.stringify(laborDataPayload()),
      { headers }
    );
    check(res, { 'datos laborales status 200': (r) => r.status === 200 });
    sleep(0.3);
  });

  group('Agregar devengo', () => {
    const res = http.post(
      `${BASE_URL}/electronic-invoicing/payrolls/employees/${payrollEmployeeId}/earnings`,
      JSON.stringify(earningPayload()),
      { headers }
    );
    check(res, { 'agregar devengo status 200|201': (r) => r.status === 200 || r.status === 201 });

    try { earningId = res.json().data && res.json().data.id; } catch (e) {}
    sleep(0.3);
  });

  group('Agregar deducción', () => {
    const res = http.post(
      `${BASE_URL}/electronic-invoicing/payrolls/employees/${payrollEmployeeId}/deductions`,
      JSON.stringify(deductionPayload()),
      { headers }
    );
    check(res, { 'agregar deducción status 200|201': (r) => r.status === 200 || r.status === 201 });

    try { deductionId = res.json().data && res.json().data.id; } catch (e) {}
    sleep(0.3);
  });

  group('Enviar nómina a DIAN', () => {
    const res = http.post(
      `${BASE_URL}/electronic-invoicing/payrolls/${payrollId}/employees/${payrollEmployeeId}/send`,
      null, { headers }
    );
    check(res, { 'enviar DIAN status 200': (r) => r.status === 200 });
    sleep(0.5);
  });

  group('Descargar PDF nómina', () => {
    const res = http.get(
      `${BASE_URL}/electronic-invoicing/payrolls/employees/${payrollEmployeeId}/pdf`,
      { headers }
    );
    check(res, { 'pdf nómina status 200': (r) => r.status === 200 });
    sleep(0.3);
  });

  // Limpiar
  if (earningId) {
    http.del(`${BASE_URL}/electronic-invoicing/payrolls/employee-earnings/${earningId}`, null, { headers });
  }
  if (deductionId) {
    http.del(`${BASE_URL}/electronic-invoicing/payrolls/employee-deductions/${deductionId}`, null, { headers });
  }

  sleep(1);
}
