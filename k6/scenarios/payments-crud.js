import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, getAuthHeaders, getBaseUrl } from '../helpers/auth.js';

const BASE_URL = getBaseUrl();

/**
 * Scenario: Pagos - listado + pendientes
 * Solo operaciones de lectura para evitar efectos secundarios no deseados en stress test
 */
export default function () {
  let token;

  group('Login', () => {
    token = login();
  });

  const headers = getAuthHeaders(token);

  group('Listar pagos', () => {
    const res = http.get(`${BASE_URL}/payments?per_page=15`, {
      headers,
      tags: { name: 'GET_payments_list' },
    });

    check(res, {
      'payments list status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  group('Pagos filtrados por tipo', () => {
    const res = http.get(`${BASE_URL}/payments?type=income&per_page=10`, {
      headers,
      tags: { name: 'GET_payments_income' },
    });

    check(res, {
      'payments income status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  group('Ventas pendientes de pago', () => {
    const res = http.get(`${BASE_URL}/payments/sales-pending`, {
      headers,
      tags: { name: 'GET_sales_pending' },
    });

    check(res, {
      'sales pending status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  group('Compras pendientes de pago', () => {
    const res = http.get(`${BASE_URL}/payments/purchases-pending`, {
      headers,
      tags: { name: 'GET_purchases_pending' },
    });

    check(res, {
      'purchases pending status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  sleep(0.5);
}
