import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, getAuthHeaders, getBaseUrl } from '../helpers/auth.js';

const BASE_URL = getBaseUrl();

/**
 * Scenario: Dashboard statistics
 * Endpoint pesado: 12+ queries por request, sin cache.
 */
export default function () {
  let token;

  group('Login', () => {
    token = login();
  });

  const headers = getAuthHeaders(token);

  group('Dashboard Statistics', () => {
    const res = http.get(`${BASE_URL}/dashboard/statistics`, {
      headers,
      tags: { name: 'GET_dashboard_statistics' },
    });

    check(res, {
      'dashboard status 200': (r) => r.status === 200,
      'dashboard has stats': (r) => {
        try {
          const body = r.json();
          return body.data && body.data.stats;
        } catch (e) { return false; }
      },
      'dashboard has charts': (r) => {
        try {
          const body = r.json();
          return body.data && body.data.charts;
        } catch (e) { return false; }
      },
    });

    sleep(1);
  });

  sleep(0.5);
}
