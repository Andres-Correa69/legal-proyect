import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, getAuthHeaders, getBaseUrl } from '../helpers/auth.js';

const BASE_URL = getBaseUrl();

/**
 * Scenario: Cajas registradoras - listado y detalle
 */
export default function () {
  let token;

  group('Login', () => {
    token = login();
  });

  const headers = getAuthHeaders(token);
  let firstCashRegisterId = null;

  group('Listar cajas', () => {
    const res = http.get(`${BASE_URL}/cash-registers`, {
      headers,
      tags: { name: 'GET_cash_registers_list' },
    });

    check(res, {
      'cash registers list status 200': (r) => r.status === 200,
    });

    if (res.status === 200) {
      try {
        const body = res.json();
        const list = body.data || body;
        const arr = Array.isArray(list) ? list : (list.data || []);
        if (arr.length > 0) firstCashRegisterId = arr[0].id;
      } catch (e) { /* ignore */ }
    }

    sleep(0.3);
  });

  if (firstCashRegisterId) {
    group('Detalle caja', () => {
      const res = http.get(`${BASE_URL}/cash-registers/${firstCashRegisterId}`, {
        headers,
        tags: { name: 'GET_cash_register_detail' },
      });

      check(res, {
        'cash register detail status 200': (r) => r.status === 200,
      });

      sleep(0.3);
    });

    group('Sesion actual', () => {
      const res = http.get(`${BASE_URL}/cash-registers/${firstCashRegisterId}/current-session`, {
        headers,
        tags: { name: 'GET_cash_register_session' },
      });

      check(res, {
        'session status 200|404': (r) => r.status === 200 || r.status === 404,
      });

      sleep(0.3);
    });
  }

  // Sesiones
  group('Listar sesiones', () => {
    const res = http.get(`${BASE_URL}/cash-sessions`, {
      headers,
      tags: { name: 'GET_cash_sessions_list' },
    });

    check(res, {
      'cash sessions status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  sleep(0.5);
}
