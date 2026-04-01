/**
 * Generador de reporte HTML para k6.
 * Usa handleSummary() para exportar resultados a un archivo HTML.
 */

export function generateHtmlReport(data, fileName) {
  const now = new Date().toLocaleString('es-CO');
  const metrics = data.metrics;

  // Extraer métricas principales
  const reqDuration = metrics.http_req_duration ? metrics.http_req_duration.values : {};
  const reqFailed = metrics.http_req_failed ? metrics.http_req_failed.values : {};
  const httpReqs = metrics.http_reqs ? metrics.http_reqs.values : {};
  const checks = metrics.checks ? metrics.checks.values : {};
  const dataReceived = metrics.data_received ? metrics.data_received.values : {};
  const dataSent = metrics.data_sent ? metrics.data_sent.values : {};
  const iterations = metrics.iterations ? metrics.iterations.values : {};
  const vus = metrics.vus ? metrics.vus.values : {};

  // Extraer checks por grupo
  const rootGroup = data.root_group;
  const groupResults = extractGroups(rootGroup);

  // Determinar estado general
  const thresholdsPassed = Object.values(data.thresholds || {}).every(t => t.ok);
  const overallStatus = thresholdsPassed ? 'PASSED' : 'FAILED';
  const statusColor = thresholdsPassed ? '#22c55e' : '#ef4444';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>k6 Report - ${fileName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 28px; margin-bottom: 8px; color: #f8fafc; }
    h2 { font-size: 20px; margin: 24px 0 12px; color: #f8fafc; }
    h3 { font-size: 16px; margin: 16px 0 8px; color: #cbd5e1; }
    .subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
    .status-badge { display: inline-block; padding: 4px 16px; border-radius: 20px; font-weight: 700; font-size: 14px; color: white; background: ${statusColor}; margin-left: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; }
    .card-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .card-value { font-size: 28px; font-weight: 700; color: #f8fafc; }
    .card-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { text-align: left; padding: 12px 16px; background: #1e293b; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #334155; }
    td { padding: 10px 16px; border-bottom: 1px solid #1e293b; font-size: 14px; }
    tr:hover td { background: #1e293b40; }
    .pass { color: #22c55e; }
    .fail { color: #ef4444; }
    .warn { color: #f59e0b; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .tag-pass { background: #22c55e20; color: #22c55e; }
    .tag-fail { background: #ef444420; color: #ef4444; }
    .bar-bg { background: #334155; border-radius: 4px; height: 8px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .bar-green { background: #22c55e; }
    .bar-red { background: #ef4444; }
    .bar-yellow { background: #f59e0b; }
    .section { background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155; margin-bottom: 24px; }
    .threshold-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #334155; }
    .threshold-row:last-child { border-bottom: none; }
    .percentile-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 12px; }
    .percentile-item { text-align: center; padding: 12px 8px; background: #0f172a; border-radius: 8px; }
    .percentile-label { font-size: 11px; color: #64748b; }
    .percentile-value { font-size: 18px; font-weight: 600; color: #f8fafc; margin-top: 2px; }
    footer { text-align: center; color: #475569; font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div>
        <h1>k6 Performance Report <span class="status-badge">${overallStatus}</span></h1>
        <p class="subtitle">${now} &nbsp;|&nbsp; ${fileName}</p>
      </div>
    </div>

    <!-- Métricas Principales -->
    <div class="grid">
      <div class="card">
        <div class="card-label">Total Requests</div>
        <div class="card-value">${formatNumber(httpReqs.count || 0)}</div>
        <div class="card-sub">${formatNumber(httpReqs.rate || 0, 1)} req/s</div>
      </div>
      <div class="card">
        <div class="card-label">Duración Media</div>
        <div class="card-value">${formatMs(reqDuration.avg)}</div>
        <div class="card-sub">min: ${formatMs(reqDuration.min)} / max: ${formatMs(reqDuration.max)}</div>
      </div>
      <div class="card">
        <div class="card-label">P95 Latencia</div>
        <div class="card-value">${formatMs(reqDuration['p(95)'])}</div>
        <div class="card-sub">p(99): ${formatMs(reqDuration['p(99)'])}</div>
      </div>
      <div class="card">
        <div class="card-label">Tasa de Error</div>
        <div class="card-value ${(reqFailed.rate || 0) > 0.05 ? 'fail' : 'pass'}">${((reqFailed.rate || 0) * 100).toFixed(1)}%</div>
        <div class="card-sub">${formatNumber(reqFailed.passes || 0)} fallidos de ${formatNumber((reqFailed.passes || 0) + (reqFailed.fails || 0))}</div>
      </div>
      <div class="card">
        <div class="card-label">Checks Pasados</div>
        <div class="card-value ${(checks.rate || 0) >= 0.95 ? 'pass' : (checks.rate || 0) >= 0.5 ? 'warn' : 'fail'}">${((checks.rate || 0) * 100).toFixed(1)}%</div>
        <div class="card-sub">${formatNumber(checks.passes || 0)} de ${formatNumber((checks.passes || 0) + (checks.fails || 0))}</div>
      </div>
      <div class="card">
        <div class="card-label">VUs / Iteraciones</div>
        <div class="card-value">${formatNumber(vus.max || vus.value || 0)}</div>
        <div class="card-sub">${formatNumber(iterations.count || 0)} iteraciones</div>
      </div>
    </div>

    <!-- Distribución de Latencia -->
    <div class="section">
      <h2>Distribución de Latencia</h2>
      <div class="percentile-grid">
        <div class="percentile-item">
          <div class="percentile-label">min</div>
          <div class="percentile-value">${formatMs(reqDuration.min)}</div>
        </div>
        <div class="percentile-item">
          <div class="percentile-label">med</div>
          <div class="percentile-value">${formatMs(reqDuration.med)}</div>
        </div>
        <div class="percentile-item">
          <div class="percentile-label">avg</div>
          <div class="percentile-value">${formatMs(reqDuration.avg)}</div>
        </div>
        <div class="percentile-item">
          <div class="percentile-label">p(90)</div>
          <div class="percentile-value">${formatMs(reqDuration['p(90)'])}</div>
        </div>
        <div class="percentile-item">
          <div class="percentile-label">p(95)</div>
          <div class="percentile-value">${formatMs(reqDuration['p(95)'])}</div>
        </div>
        <div class="percentile-item">
          <div class="percentile-label">p(99)</div>
          <div class="percentile-value">${formatMs(reqDuration['p(99)'])}</div>
        </div>
      </div>
    </div>

    <!-- Thresholds -->
    ${Object.keys(data.thresholds || {}).length > 0 ? `
    <div class="section">
      <h2>Umbrales (Thresholds)</h2>
      ${Object.entries(data.thresholds).map(([name, t]) => `
        <div class="threshold-row">
          <span>${name}</span>
          <span class="tag ${t.ok ? 'tag-pass' : 'tag-fail'}">${t.ok ? 'PASS' : 'FAIL'}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Checks por Grupo -->
    <div class="section">
      <h2>Checks Detallados</h2>
      <table>
        <thead>
          <tr>
            <th>Check</th>
            <th>Estado</th>
            <th style="width:200px">Resultado</th>
            <th>Pasados</th>
            <th>Fallidos</th>
          </tr>
        </thead>
        <tbody>
          ${groupResults.map(c => {
            const total = c.passes + c.fails;
            const pct = total > 0 ? (c.passes / total * 100) : 0;
            const barColor = pct === 100 ? 'bar-green' : pct >= 50 ? 'bar-yellow' : 'bar-red';
            return `
          <tr>
            <td>${c.name}</td>
            <td><span class="tag ${pct === 100 ? 'tag-pass' : 'tag-fail'}">${pct === 100 ? 'PASS' : 'FAIL'}</span></td>
            <td>
              <div class="bar-bg"><div class="bar-fill ${barColor}" style="width:${pct}%"></div></div>
            </td>
            <td class="pass">${c.passes}</td>
            <td class="${c.fails > 0 ? 'fail' : ''}">${c.fails}</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Datos de Red -->
    <div class="section">
      <h2>Red</h2>
      <div class="grid" style="grid-template-columns: repeat(2, 1fr);">
        <div>
          <div class="card-label">Datos Recibidos</div>
          <div style="font-size: 20px; font-weight: 600; color: #f8fafc;">${formatBytes(dataReceived.count || 0)}</div>
          <div class="card-sub">${formatBytes(dataReceived.rate || 0)}/s</div>
        </div>
        <div>
          <div class="card-label">Datos Enviados</div>
          <div style="font-size: 20px; font-weight: 600; color: #f8fafc;">${formatBytes(dataSent.count || 0)}</div>
          <div class="card-sub">${formatBytes(dataSent.rate || 0)}/s</div>
        </div>
      </div>
    </div>

    <footer>
      Generado por k6 &nbsp;|&nbsp; Facturación Grupo CP &nbsp;|&nbsp; ${now}
    </footer>
  </div>
</body>
</html>`;

  return html;
}

function extractGroups(group) {
  let results = [];
  if (group && group.checks) {
    for (const check of group.checks) {
      results.push({
        name: check.name,
        passes: check.passes,
        fails: check.fails,
      });
    }
  }
  if (group && group.groups) {
    for (const sub of group.groups) {
      results = results.concat(extractGroups(sub));
    }
  }
  return results;
}

function formatMs(val) {
  if (val === undefined || val === null) return '-';
  if (val < 1) return `${(val * 1000).toFixed(0)}µs`;
  if (val < 1000) return `${val.toFixed(0)}ms`;
  return `${(val / 1000).toFixed(2)}s`;
}

function formatNumber(val, decimals = 0) {
  if (val === undefined || val === null) return '0';
  return Number(val).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
