import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, getAuthHeaders, getBaseUrl } from '../helpers/auth.js';
import { dateRange } from '../helpers/data-core.js';

const BASE_URL = getBaseUrl();

/**
 * Scenario: Reportes contables - queries pesadas con JOINs
 */
export default function () {
  let token;

  group('Login', () => {
    token = login();
  });

  const headers = getAuthHeaders(token);
  const dates = dateRange();
  const params = `date_from=${dates.date_from}&date_to=${dates.date_to}`;

  group('Balance de comprobacion', () => {
    const res = http.get(`${BASE_URL}/accounting/reports/trial-balance?${params}`, {
      headers,
      tags: { name: 'GET_trial_balance' },
    });

    check(res, {
      'trial balance status 200': (r) => r.status === 200,
    });

    sleep(0.5);
  });

  group('Libro mayor', () => {
    const res = http.get(`${BASE_URL}/accounting/reports/general-ledger?${params}&per_page=20`, {
      headers,
      tags: { name: 'GET_general_ledger' },
    });

    check(res, {
      'general ledger status 200': (r) => r.status === 200 || r.status === 422,
    });

    sleep(0.5);
  });

  group('Estado de resultados', () => {
    const res = http.get(`${BASE_URL}/accounting/reports/income-statement?${params}`, {
      headers,
      tags: { name: 'GET_income_statement' },
    });

    check(res, {
      'income statement status 200': (r) => r.status === 200,
    });

    sleep(0.5);
  });

  group('Balance general', () => {
    const res = http.get(`${BASE_URL}/accounting/reports/balance-sheet?${params}`, {
      headers,
      tags: { name: 'GET_balance_sheet' },
    });

    check(res, {
      'balance sheet status 200': (r) => r.status === 200,
    });

    sleep(0.5);
  });

  sleep(0.5);
}
