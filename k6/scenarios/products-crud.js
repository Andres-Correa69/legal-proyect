import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, getAuthHeaders, getBaseUrl } from '../helpers/auth.js';

const BASE_URL = getBaseUrl();

/**
 * Scenario: Productos CRUD + analytics
 * GET /products usa ->get() sin paginacion (posible cuello de botella)
 */
export default function () {
  let token;

  group('Login', () => {
    token = login();
  });

  const headers = getAuthHeaders(token);
  let firstProductId = null;

  group('Listar productos', () => {
    const res = http.get(`${BASE_URL}/products`, {
      headers,
      tags: { name: 'GET_products_list' },
    });

    check(res, {
      'products list status 200': (r) => r.status === 200,
      'products returns array': (r) => {
        try {
          const body = r.json();
          const list = body.data || body;
          return Array.isArray(list) || (list && list.data);
        } catch (e) { return false; }
      },
    });

    if (res.status === 200) {
      try {
        const body = res.json();
        const list = body.data || body;
        const arr = Array.isArray(list) ? list : (list.data || []);
        if (arr.length > 0) {
          firstProductId = arr[Math.floor(Math.random() * arr.length)].id;
        }
      } catch (e) { /* ignore */ }
    }

    sleep(0.3);
  });

  group('Buscar productos', () => {
    const res = http.get(`${BASE_URL}/products?search=producto`, {
      headers,
      tags: { name: 'GET_products_search' },
    });

    check(res, {
      'products search status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  group('Productos bajo stock', () => {
    const res = http.get(`${BASE_URL}/products/low-stock`, {
      headers,
      tags: { name: 'GET_products_low_stock' },
    });

    check(res, {
      'low stock status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  if (firstProductId) {
    group('Detalle producto', () => {
      const res = http.get(`${BASE_URL}/products/${firstProductId}`, {
        headers,
        tags: { name: 'GET_product_detail' },
      });

      check(res, {
        'product detail status 200': (r) => r.status === 200,
      });

      sleep(0.3);
    });

    group('Analytics producto', () => {
      const res = http.get(`${BASE_URL}/products/${firstProductId}/analytics`, {
        headers,
        tags: { name: 'GET_product_analytics' },
      });

      check(res, {
        'product analytics status 200': (r) => r.status === 200 || r.status === 404,
      });

      sleep(0.3);
    });
  }

  sleep(0.5);
}
