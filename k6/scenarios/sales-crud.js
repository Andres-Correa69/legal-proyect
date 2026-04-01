import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, getAuthHeaders, getBaseUrl } from '../helpers/auth.js';
import { salePayload } from '../helpers/data-core.js';
import { fetchTestData, randomItem } from '../helpers/setup.js';

const BASE_URL = getBaseUrl();

/**
 * Scenario: Ventas CRUD completo
 * POST /sales es la operacion mas pesada (5+ tablas + observers contables)
 */
export default function () {
  let token;

  group('Login', () => {
    token = login();
  });

  const headers = getAuthHeaders(token);

  // Fetch IDs necesarios
  let productId, clientId, cashRegisterId, paymentMethodId;

  group('Fetch IDs', () => {
    const prodRes = http.get(`${BASE_URL}/products`, { headers, tags: { name: 'GET_products_for_sale' } });
    if (prodRes.status === 200) {
      try {
        const body = prodRes.json();
        const list = body.data || body;
        const arr = Array.isArray(list) ? list : (list.data || []);
        if (arr.length > 0) productId = arr[Math.floor(Math.random() * arr.length)].id;
      } catch (e) { /* ignore */ }
    }

    const cliRes = http.get(`${BASE_URL}/clients`, { headers, tags: { name: 'GET_clients_for_sale' } });
    if (cliRes.status === 200) {
      try {
        const body = cliRes.json();
        const list = body.data || body;
        const arr = Array.isArray(list) ? list : (list.data || []);
        if (arr.length > 0) clientId = arr[Math.floor(Math.random() * arr.length)].id;
      } catch (e) { /* ignore */ }
    }

    const cashRes = http.get(`${BASE_URL}/cash-registers`, { headers, tags: { name: 'GET_cash_registers_for_sale' } });
    if (cashRes.status === 200) {
      try {
        const body = cashRes.json();
        const list = body.data || body;
        const arr = Array.isArray(list) ? list : (list.data || []);
        if (arr.length > 0) cashRegisterId = arr[Math.floor(Math.random() * arr.length)].id;
      } catch (e) { /* ignore */ }
    }

    const pmRes = http.get(`${BASE_URL}/payment-methods`, { headers, tags: { name: 'GET_payment_methods_for_sale' } });
    if (pmRes.status === 200) {
      try {
        const body = pmRes.json();
        const list = body.data || body;
        const arr = Array.isArray(list) ? list : (list.data || []);
        if (arr.length > 0) paymentMethodId = arr[Math.floor(Math.random() * arr.length)].id;
      } catch (e) { /* ignore */ }
    }
  });

  // Listar ventas
  group('Listar ventas', () => {
    const res = http.get(`${BASE_URL}/sales?per_page=15`, {
      headers,
      tags: { name: 'GET_sales_list' },
    });

    check(res, {
      'sales list status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  // Stats
  group('Sales Stats', () => {
    const res = http.get(`${BASE_URL}/sales/stats`, {
      headers,
      tags: { name: 'GET_sales_stats' },
    });

    check(res, {
      'sales stats status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  // Crear venta (solo si tenemos IDs)
  let createdSaleId = null;
  if (productId && clientId && cashRegisterId && paymentMethodId) {
    group('Crear venta', () => {
      const payload = salePayload(productId, clientId, cashRegisterId, paymentMethodId);
      const res = http.post(`${BASE_URL}/sales`, JSON.stringify(payload), {
        headers,
        tags: { name: 'POST_sales_create' },
      });

      check(res, {
        'sale created 200|201': (r) => r.status === 200 || r.status === 201,
      });

      if (res.status === 200 || res.status === 201) {
        try {
          const body = res.json();
          createdSaleId = body.data ? body.data.id : body.id;
        } catch (e) { /* ignore */ }
      }

      sleep(0.5);
    });
  }

  // Detalle de venta
  if (createdSaleId) {
    group('Detalle venta', () => {
      const res = http.get(`${BASE_URL}/sales/${createdSaleId}`, {
        headers,
        tags: { name: 'GET_sale_detail' },
      });

      check(res, {
        'sale detail status 200': (r) => r.status === 200,
      });

      sleep(0.3);
    });

    group('PDF venta', () => {
      const res = http.get(`${BASE_URL}/sales/${createdSaleId}/pdf`, {
        headers,
        tags: { name: 'GET_sale_pdf' },
      });

      check(res, {
        'sale pdf status 200': (r) => r.status === 200,
      });

      sleep(0.5);
    });
  }

  sleep(0.5);
}
