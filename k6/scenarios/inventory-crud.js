import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, getAuthHeaders, getBaseUrl } from '../helpers/auth.js';

const BASE_URL = getBaseUrl();

/**
 * Scenario: Inventario - compras + movimientos (solo lectura)
 */
export default function () {
  let token;

  group('Login', () => {
    token = login();
  });

  const headers = getAuthHeaders(token);

  group('Listar compras', () => {
    const res = http.get(`${BASE_URL}/inventory-purchases?per_page=15`, {
      headers,
      tags: { name: 'GET_purchases_list' },
    });

    check(res, {
      'purchases list status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  group('Movimientos de inventario', () => {
    const res = http.get(`${BASE_URL}/inventory-movements?per_page=15`, {
      headers,
      tags: { name: 'GET_inventory_movements' },
    });

    check(res, {
      'movements status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  group('Ajustes de inventario', () => {
    const res = http.get(`${BASE_URL}/inventory-adjustments?per_page=15`, {
      headers,
      tags: { name: 'GET_inventory_adjustments' },
    });

    check(res, {
      'adjustments status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  group('Transferencias', () => {
    const res = http.get(`${BASE_URL}/inventory-transfers?per_page=15`, {
      headers,
      tags: { name: 'GET_inventory_transfers' },
    });

    check(res, {
      'transfers status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  sleep(0.5);
}
