import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, getAuthHeaders, getBaseUrl } from '../helpers/auth.js';
import { journalEntryPayload } from '../helpers/data-core.js';

const BASE_URL = getBaseUrl();

/**
 * Scenario: Contabilidad CRUD - plan de cuentas + asientos
 */
export default function () {
  let token;

  group('Login', () => {
    token = login();
  });

  const headers = getAuthHeaders(token);

  group('Plan de cuentas (tree)', () => {
    const res = http.get(`${BASE_URL}/accounting/accounts/tree`, {
      headers,
      tags: { name: 'GET_accounts_tree' },
    });

    check(res, {
      'accounts tree status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  // Fetch leaf accounts para crear asiento
  let debitAccountId = null;
  let creditAccountId = null;

  group('Cuentas leaf', () => {
    const res = http.get(`${BASE_URL}/accounting/accounts/leaf`, {
      headers,
      tags: { name: 'GET_accounts_leaf' },
    });

    check(res, {
      'accounts leaf status 200': (r) => r.status === 200,
    });

    if (res.status === 200) {
      try {
        const body = res.json();
        const list = body.data || body;
        const arr = Array.isArray(list) ? list : (list.data || []);
        if (arr.length >= 2) {
          debitAccountId = arr[0].id;
          creditAccountId = arr[1].id;
        }
      } catch (e) { /* ignore */ }
    }

    sleep(0.3);
  });

  group('Listar asientos', () => {
    const res = http.get(`${BASE_URL}/accounting/journal-entries?per_page=15`, {
      headers,
      tags: { name: 'GET_journal_entries_list' },
    });

    check(res, {
      'journal entries list status 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  // Crear asiento manual
  if (debitAccountId && creditAccountId) {
    group('Crear asiento', () => {
      const payload = journalEntryPayload(debitAccountId, creditAccountId);
      const res = http.post(`${BASE_URL}/accounting/journal-entries`, JSON.stringify(payload), {
        headers,
        tags: { name: 'POST_journal_entry_create' },
      });

      check(res, {
        'journal entry created': (r) => r.status === 200 || r.status === 201,
      });

      sleep(0.3);
    });
  }

  sleep(0.5);
}
