import http from 'k6/http';
import { check } from 'k6';
import { login, getAuthHeaders, getBaseUrl } from './auth.js';

const BASE_URL = getBaseUrl();

/**
 * Funcion setup() compartida: login + fetch de IDs existentes en la BD.
 * Retorna un objeto con token y arrays de IDs para usar en los scenarios.
 */
export function fetchTestData() {
  const token = login();
  const headers = getAuthHeaders(token);

  const data = { token, headers };

  // Productos
  const productsRes = http.get(`${BASE_URL}/products`, { headers });
  if (productsRes.status === 200) {
    try {
      const body = productsRes.json();
      const products = body.data || body;
      if (Array.isArray(products) && products.length > 0) {
        data.productIds = products.map(p => p.id);
        data.firstProductId = products[0].id;
      }
    } catch (e) { /* ignore parse errors */ }
  }

  // Clientes
  const clientsRes = http.get(`${BASE_URL}/clients`, { headers });
  if (clientsRes.status === 200) {
    try {
      const body = clientsRes.json();
      const clients = body.data || body;
      if (Array.isArray(clients) && clients.length > 0) {
        data.clientIds = clients.map(c => c.id);
        data.firstClientId = clients[0].id;
      }
    } catch (e) { /* ignore */ }
  }

  // Cajas registradoras
  const cashRes = http.get(`${BASE_URL}/cash-registers`, { headers });
  if (cashRes.status === 200) {
    try {
      const body = cashRes.json();
      const items = body.data || body;
      const list = Array.isArray(items) ? items : (items.data || []);
      if (list.length > 0) {
        data.cashRegisterIds = list.map(c => c.id);
        data.firstCashRegisterId = list[0].id;
      }
    } catch (e) { /* ignore */ }
  }

  // Metodos de pago
  const pmRes = http.get(`${BASE_URL}/payment-methods`, { headers });
  if (pmRes.status === 200) {
    try {
      const body = pmRes.json();
      const items = body.data || body;
      const list = Array.isArray(items) ? items : (items.data || []);
      if (list.length > 0) {
        data.paymentMethodIds = list.map(p => p.id);
        data.firstPaymentMethodId = list[0].id;
      }
    } catch (e) { /* ignore */ }
  }

  // Cuentas contables (leaf)
  const accRes = http.get(`${BASE_URL}/accounting/accounts/leaf`, { headers });
  if (accRes.status === 200) {
    try {
      const body = accRes.json();
      const items = body.data || body;
      const list = Array.isArray(items) ? items : (items.data || []);
      if (list.length >= 2) {
        data.accountIds = list.map(a => a.id);
        data.debitAccountId = list[0].id;
        data.creditAccountId = list[1].id;
      }
    } catch (e) { /* ignore */ }
  }

  // Proveedores
  const suppRes = http.get(`${BASE_URL}/suppliers`, { headers });
  if (suppRes.status === 200) {
    try {
      const body = suppRes.json();
      const items = body.data || body;
      const list = Array.isArray(items) ? items : (items.data || []);
      if (list.length > 0) {
        data.supplierIds = list.map(s => s.id);
        data.firstSupplierId = list[0].id;
      }
    } catch (e) { /* ignore */ }
  }

  // Bodegas
  const whRes = http.get(`${BASE_URL}/warehouses`, { headers });
  if (whRes.status === 200) {
    try {
      const body = whRes.json();
      const items = body.data || body;
      const list = Array.isArray(items) ? items : (items.data || []);
      if (list.length > 0) {
        data.warehouseIds = list.map(w => w.id);
        data.firstWarehouseId = list[0].id;
      }
    } catch (e) { /* ignore */ }
  }

  // Ventas existentes (para pagos de ingreso)
  const salesRes = http.get(`${BASE_URL}/sales?per_page=5`, { headers });
  if (salesRes.status === 200) {
    try {
      const body = salesRes.json();
      const items = body.data || body;
      const list = Array.isArray(items) ? items : (items.data || []);
      if (list.length > 0) {
        data.saleIds = list.map(s => s.id);
        data.firstSaleId = list[0].id;
      }
    } catch (e) { /* ignore */ }
  }

  return data;
}

/**
 * Selecciona un elemento aleatorio de un array.
 */
export function randomItem(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}
