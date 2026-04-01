import http from 'k6/http';
import { check, fail } from 'k6';

const BASE_URL = __ENV.K6_BASE_URL || 'http://127.0.0.1:8000/api';
const USER_EMAIL = __ENV.K6_USER_EMAIL || 'contacto@grupocp.com';
const USER_PASSWORD = __ENV.K6_USER_PASSWORD || 'password';

/**
 * Realiza login via API y retorna el token Bearer.
 * Falla el test si el login no es exitoso.
 */
export function login(email, password) {
  const loginEmail = email || USER_EMAIL;
  const loginPassword = password || USER_PASSWORD;

  const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: loginEmail,
    password: loginPassword,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  const success = check(res, {
    'login status 200': (r) => r.status === 200,
    'login returns token': (r) => {
      const body = r.json();
      return body && body.access_token;
    },
  });

  if (!success) {
    fail(`Login fallido: status=${res.status} body=${res.body}`);
  }

  return res.json().access_token;
}

/**
 * Construye headers estándar con autenticación Bearer.
 */
export function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Retorna la base URL configurada.
 */
export function getBaseUrl() {
  return BASE_URL;
}
