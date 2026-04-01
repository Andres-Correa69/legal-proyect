import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, getAuthHeaders, getBaseUrl } from '../helpers/auth.js';
import { dateRange } from '../helpers/data-core.js';

const BASE_URL = getBaseUrl();

/**
 * Scenario: Reportes de negocio - ventas, productos, clientes
 */
export default function () {
  let token;

  group('Login', () => {
    token = login();
  });

  const headers = getAuthHeaders(token);
  const dates = dateRange();
  const params = `date_from=${dates.date_from}&date_to=${dates.date_to}`;

  group('Ventas por producto', () => {
    const res = http.get(`${BASE_URL}/reports/sales-products?${params}`, {
      headers,
      tags: { name: 'GET_report_sales_products' },
    });

    check(res, {
      'sales products status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  group('Mas vendidos', () => {
    const res = http.get(`${BASE_URL}/reports/best-sellers?${params}`, {
      headers,
      tags: { name: 'GET_report_best_sellers' },
    });

    check(res, {
      'best sellers status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  group('Top clientes', () => {
    const res = http.get(`${BASE_URL}/reports/top-clients?${params}`, {
      headers,
      tags: { name: 'GET_report_top_clients' },
    });

    check(res, {
      'top clients status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  group('Ingresos vs gastos', () => {
    const res = http.get(`${BASE_URL}/reports/income-expenses?${params}`, {
      headers,
      tags: { name: 'GET_report_income_expenses' },
    });

    check(res, {
      'income expenses status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  group('Inventario', () => {
    const res = http.get(`${BASE_URL}/reports/inventory`, {
      headers,
      tags: { name: 'GET_report_inventory' },
    });

    check(res, {
      'inventory report status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  sleep(0.5);
}
