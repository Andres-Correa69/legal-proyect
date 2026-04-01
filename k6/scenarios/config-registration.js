import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, getAuthHeaders, getBaseUrl } from '../helpers/auth.js';
import { registerPayload, configPayload, setEnvironmentPayload } from '../helpers/data.js';

const BASE_URL = getBaseUrl();

/**
 * Scenario: Flujo de registro, configuración y habilitación
 * 1. Login
 * 2. Registrar empresa en DIAN
 * 3. Obtener configuración
 * 4. Actualizar configuración
 * 5. Obtener resoluciones
 * 6. Verificar estado de habilitación
 * 7. Configurar ambiente (set-environment)
 */
export default function () {
  let token;

  group('Login', () => {
    token = login();
  });

  const headers = getAuthHeaders(token);

  group('Obtener catálogos DIAN', () => {
    const res = http.get(
      `${BASE_URL}/electronic-invoicing/catalogs`,
      { headers }
    );
    check(res, {
      'catálogos status 200': (r) => r.status === 200,
    });
    sleep(0.3);
  });

  group('Registrar empresa en DIAN', () => {
    const payload = registerPayload();
    const res = http.post(
      `${BASE_URL}/electronic-invoicing/register`,
      JSON.stringify(payload),
      { headers }
    );

    check(res, {
      'registro status 200|400|409|422': (r) =>
        r.status === 200 || r.status === 400 || r.status === 409 || r.status === 422,
      // 400/409/422 son válidos si la empresa ya está registrada
    });
    sleep(0.5);
  });

  group('Obtener configuración', () => {
    const res = http.get(
      `${BASE_URL}/electronic-invoicing/config`,
      { headers }
    );
    check(res, {
      'config status 200': (r) => r.status === 200,
    });
    sleep(0.3);
  });

  group('Actualizar configuración', () => {
    const payload = configPayload();
    const res = http.put(
      `${BASE_URL}/electronic-invoicing/config`,
      JSON.stringify(payload),
      { headers }
    );

    check(res, {
      'actualizar config status 200': (r) => r.status === 200,
    });
    sleep(0.3);
  });

  group('Obtener resoluciones', () => {
    const res = http.get(
      `${BASE_URL}/electronic-invoicing/resolutions`,
      { headers }
    );
    check(res, {
      'resoluciones status 200': (r) => r.status === 200,
    });
    sleep(0.3);
  });

  group('Estado de habilitación', () => {
    const res = http.get(
      `${BASE_URL}/electronic-invoicing/habilitacion/status`,
      { headers }
    );
    check(res, {
      'habilitación status 200': (r) => r.status === 200,
    });
    sleep(0.3);
  });

  group('Configurar ambiente DIAN', () => {
    const payload = setEnvironmentPayload();
    const res = http.post(
      `${BASE_URL}/electronic-invoicing/habilitacion/set-environment`,
      JSON.stringify(payload),
      { headers }
    );

    check(res, {
      'set environment status 200|400': (r) => r.status === 200 || r.status === 400,
      // 400 es válido si los datos de certificado son placeholder
    });
    sleep(0.3);
  });

  sleep(1);
}
