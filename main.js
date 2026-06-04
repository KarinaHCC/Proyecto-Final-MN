/* ═══════════════════════════════════════════
   MÉTODOS NUMÉRICOS — CRISIS SIMULATOR
   main.js — Todos los escenarios A-G
═══════════════════════════════════════════ */

// ── Chart instances storage ──
const charts = {};

// ══════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════
function showSection(id) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const sec = document.getElementById(id);
  if (sec) sec.classList.add('active');
  const link = document.querySelector(`[data-section="${id}"]`);
  if (link) link.classList.add('active');
  // close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
  window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', () => {
  // Nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      showSection(link.dataset.section);
    });
  });

  // Hamburger
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Init scenario C table
  initTablaC();
});

// ══════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════
function fmt(n, d = 4) {
  if (typeof n !== 'number' || isNaN(n)) return '—';
  return n.toFixed(d);
}

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function makeChart(id, config) {
  destroyChart(id);
  const ctx = document.getElementById(id).getContext('2d');
  charts[id] = new Chart(ctx, config);
}

function setResult(id, html) {
  document.getElementById(id).innerHTML = html;
}

function setQuestions(id, qArr) {
  const el = document.getElementById(id);
  el.innerHTML = qArr.map(q => `
    <div class="question-card">
      <div class="q-text">${q.q}</div>
      <div class="q-answer ${q.a ? '' : 'pending'}">${q.a || 'Ejecuta la simulación primero'}</div>
    </div>`).join('');
}

function statRow(label, value, cls = '') {
  return `<div class="result-stat"><span class="label">${label}</span><span class="value ${cls}">${value}</span></div>`;
}

function alert_(type, msg) {
  return `<div class="alert alert-${type}">${msg}</div>`;
}

// ═══════════════════════════════════════════════════════
// ══  ESCENARIO A — SISTEMAS LINEALES  ══════════════════
// ═══════════════════════════════════════════════════════

function runEscenarioA() {
  const cap1 = +document.getElementById('a_cap1').value;
  const cap2 = +document.getElementById('a_cap2').value;
  const cap3 = +document.getElementById('a_cap3').value;
  const dN   = +document.getElementById('a_dN').value;
  const dC   = +document.getElementById('a_dC').value;
  const dS   = +document.getElementById('a_dS').value;
  const met  = document.getElementById('metodA').value;
  const blq  = document.getElementById('a_bloqueo').value;
  const om   = +document.getElementById('a_omega').value;

  const totalCap    = cap1 + cap2 + cap3;
  const totalDemand = dN + dC + dS;

  // Build 3x3 system: distribute from 3 plants to 3 zones
  // Simple model: each plant contributes proportionally
  // Ax = b  →  3 balance equations per zone
  // x[0..2] = plant1 sends to N,C,S; similar for P2,P3
  // We solve a simplified 3x3: total from each plant = its capacity
  // zone balance: sum of each column = zone demand

  // Actually solve: given capacities and demands, find optimal split
  // Use distribution matrix approach
  // A * [x1,x2,x3]^T = [dN,dC,dS] where plants cover proportions

  // Build coefficient matrix - cost-based distribution
  let A = [
    [1, 1, 1],      // total from plant 1 = cap1 (after scaling)
    [1, 1, 1],
    [1, 1, 1]
  ];

  // Better model: each row is zone balance from 3 plants
  // Plant shares based on capacity ratios
  const totalC = totalCap || 1;
  const r1 = cap1 / totalC;
  const r2 = cap2 / totalC;
  const r3 = cap3 / totalC;

  // A matrix for system (zones × plants)
  A = [
    [r1, r2, r3],
    [r1 * 1.1, r2 * 0.9, r3],
    [r1, r2, r3 * 1.05]
  ];

  // Apply blockage
  if (blq === 'P1_C') A[1][0] = 0;
  if (blq === 'P2_N') A[0][1] = 0;
  if (blq === 'P3_S') A[2][2] = 0;

  const b = [dN, dC, dS];

  let sol, iters, method_used;
  try {
    if (met === 'lu') {
      sol = solveLU(A, b);
      iters = 1; method_used = 'Descomposición LU';
    } else if (met === 'jacobi') {
      const r = solveJacobi(A, b, 1000, 1e-6);
      sol = r.x; iters = r.iters; method_used = 'Jacobi';
    } else if (met === 'sor') {
      const r = solveSOR(A, b, om, 1000, 1e-6);
      sol = r.x; iters = r.iters; method_used = `SOR (ω=${om})`;
    } else {
      const r = solveGaussSeidel(A, b, 1000, 1e-6);
      sol = r.x; iters = r.iters; method_used = 'Gauss-Seidel';
    }
  } catch (e) {
    setResult('resultA', alert_('danger', 'Error: ' + e.message));
    return;
  }

  // Scale solutions to actual units
  const scale = totalDemand / (sol[0] + sol[1] + sol[2] || 1);
  const xN = Math.max(0, sol[0] * scale);
  const xC = Math.max(0, sol[1] * scale);
  const xS = Math.max(0, sol[2] * scale);

  // Distribution per plant (proportional by capacity)
  const P1_N = Math.round(cap1 * (xN / totalDemand));
  const P1_C = Math.round(cap1 * (xC / totalDemand));
  const P1_S = cap1 - P1_N - P1_C;
  const P2_N = Math.round(cap2 * (xN / totalDemand));
  const P2_C = Math.round(cap2 * (xC / totalDemand));
  const P2_S = cap2 - P2_N - P2_C;
  const P3_N = Math.round(cap3 * (xN / totalDemand));
  const P3_C = Math.round(cap3 * (xC / totalDemand));
  const P3_S = cap3 - P3_N - P3_C;

  const totalEnvN = P1_N + P2_N + P3_N;
  const totalEnvC = P1_C + P2_C + P3_C;
  const totalEnvS = P1_S + P2_S + P3_S;

  const deficit_N = dN - totalEnvN;
  const deficit_C = dC - totalEnvC;
  const deficit_S = dS - totalEnvS;

  const zonaAfectada = [
    {z:'Norte', d: deficit_N},
    {z:'Centro', d: deficit_C},
    {z:'Sur', d: deficit_S}
  ].sort((a,b) => b.d - a.d)[0];

  const condNum = conditionNumber(A);

  const html = `
    <div class="result-title">Método: ${method_used} · Iteraciones: ${iters}</div>
    ${statRow('Oferta total', totalCap + ' unidades')}
    ${statRow('Demanda total', totalDemand + ' unidades')}
    ${statRow('Balance', totalCap >= totalDemand ? '✔ Superávit ' + (totalCap - totalDemand) : '⚠ Déficit ' + (totalDemand - totalCap), totalCap >= totalDemand ? 'safe' : 'danger')}
    ${statRow('Enviado → Norte', totalEnvN + ' uds', deficit_N > 0 ? 'danger' : 'safe')}
    ${statRow('Enviado → Centro', totalEnvC + ' uds', deficit_C > 0 ? 'danger' : 'safe')}
    ${statRow('Enviado → Sur', totalEnvS + ' uds', deficit_S > 0 ? 'danger' : 'safe')}
    ${statRow('Déficit Norte', deficit_N > 0 ? deficit_N + ' uds' : '0', deficit_N > 0 ? 'danger' : 'safe')}
    ${statRow('Déficit Centro', deficit_C > 0 ? deficit_C + ' uds' : '0', deficit_C > 0 ? 'danger' : 'safe')}
    ${statRow('Déficit Sur', deficit_S > 0 ? deficit_S + ' uds' : '0', deficit_S > 0 ? 'danger' : 'safe')}
    ${statRow('Número de condición', fmt(condNum, 2))}
    ${blq !== 'none' ? alert_('warn', '⚠ Ruta bloqueada: la distribución fue redirigida.') : ''}
    <div style="margin-top:10px;font-size:11px;color:var(--text3)">
      Distribución P1: N=${P1_N} C=${P1_C} S=${P1_S} &nbsp;|&nbsp;
      P2: N=${P2_N} C=${P2_C} S=${P2_S} &nbsp;|&nbsp;
      P3: N=${P3_N} C=${P3_C} S=${P3_S}
    </div>
  `;
  setResult('resultA', html);

  makeChart('chartA', {
    type: 'bar',
    data: {
      labels: ['Zona Norte', 'Zona Centro', 'Zona Sur'],
      datasets: [
        { label: 'Planta 1', data: [P1_N, P1_C, P1_S], backgroundColor: 'rgba(245,158,11,0.8)' },
        { label: 'Planta 2', data: [P2_N, P2_C, P2_S], backgroundColor: 'rgba(16,185,129,0.8)' },
        { label: 'Planta 3', data: [P3_N, P3_C, P3_S], backgroundColor: 'rgba(99,102,241,0.8)' },
        { label: 'Demanda', data: [dN, dC, dS], type: 'line', borderColor: '#ef4444', borderWidth: 2, pointRadius: 5, fill: false, backgroundColor: 'transparent' }
      ]
    },
    options: chartOpts('Distribución de unidades por zona', true)
  });

  setQuestions('questionsA', [
    { q: '¿Cuánto debe enviarse a cada zona?', a: `Norte: ${totalEnvN} uds | Centro: ${totalEnvC} uds | Sur: ${totalEnvS} uds` },
    { q: '¿Qué pasa si una ruta se bloquea?', a: blq === 'none' ? 'Sin bloqueo activo. Activa un bloqueo para ver el efecto.' : `Bloqueo activo en ${blq.replace('_','→')}. La distribución fue redirigida desde otras plantas.` },
    { q: '¿Qué zona queda más afectada?', a: `Zona ${zonaAfectada.z} (déficit: ${Math.max(0,zonaAfectada.d)} unidades)` },
    { q: '¿El sistema es estable o sensible?', a: condNum < 100 ? `Estable (cond = ${fmt(condNum,1)})` : `⚠ Mal condicionado (cond = ${fmt(condNum,1)}) — sensible a perturbaciones` },
    { q: '¿La solución cambia si la demanda aumenta?', a: totalCap >= totalDemand ? `Con oferta=${totalCap} y demanda=${totalDemand}, hay margen. Un aumento modesto es absorbible.` : `⚠ Ya hay déficit de ${totalDemand-totalCap} uds. Cualquier aumento de demanda empeora la situación.` }
  ]);
}

// ── Linear solvers ──
function solveLU(A, b) {
  const n = A.length;
  const L = Array.from({length:n}, (_,i) => Array(n).fill(0).map((_,j) => i===j?1:0));
  const U = A.map(r => [...r]);
  for (let k = 0; k < n; k++) {
    for (let i = k+1; i < n; i++) {
      if (Math.abs(U[k][k]) < 1e-12) throw new Error('Sistema singular o mal condicionado');
      L[i][k] = U[i][k] / U[k][k];
      for (let j = k; j < n; j++) U[i][j] -= L[i][k] * U[k][j];
    }
  }
  // Forward substitution Ly = b
  const y = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    y[i] = b[i];
    for (let j = 0; j < i; j++) y[i] -= L[i][j] * y[j];
  }
  // Backward substitution Ux = y
  const x = Array(n).fill(0);
  for (let i = n-1; i >= 0; i--) {
    x[i] = y[i];
    for (let j = i+1; j < n; j++) x[i] -= U[i][j] * x[j];
    if (Math.abs(U[i][i]) < 1e-12) throw new Error('División por cero en LU');
    x[i] /= U[i][i];
  }
  return x;
}

function solveGaussSeidel(A, b, maxIter=1000, tol=1e-6) {
  const n = A.length;
  let x = Array(n).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    const xOld = [...x];
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      for (let j = 0; j < n; j++) if (j !== i) sum -= A[i][j] * x[j];
      if (Math.abs(A[i][i]) < 1e-12) { x[i] = 0; continue; }
      x[i] = sum / A[i][i];
    }
    const err = Math.max(...x.map((v,i) => Math.abs(v - xOld[i])));
    if (err < tol) return { x, iters: iter+1 };
  }
  return { x, iters: maxIter };
}

function solveJacobi(A, b, maxIter=1000, tol=1e-6) {
  const n = A.length;
  let x = Array(n).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    const xNew = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      for (let j = 0; j < n; j++) if (j !== i) sum -= A[i][j] * x[j];
      if (Math.abs(A[i][i]) < 1e-12) { xNew[i] = 0; continue; }
      xNew[i] = sum / A[i][i];
    }
    const err = Math.max(...xNew.map((v,i) => Math.abs(v - x[i])));
    x = xNew;
    if (err < tol) return { x, iters: iter+1 };
  }
  return { x, iters: maxIter };
}

function solveSOR(A, b, omega=1.25, maxIter=1000, tol=1e-6) {
  const n = A.length;
  let x = Array(n).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    const xOld = [...x];
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      for (let j = 0; j < n; j++) if (j !== i) sum -= A[i][j] * x[j];
      if (Math.abs(A[i][i]) < 1e-12) continue;
      const xGs = sum / A[i][i];
      x[i] = (1 - omega) * x[i] + omega * xGs;
    }
    const err = Math.max(...x.map((v,i) => Math.abs(v - xOld[i])));
    if (err < tol) return { x, iters: iter+1 };
  }
  return { x, iters: maxIter };
}

function conditionNumber(A) {
  // Estimate via norm ratio (simplified Frobenius)
  const n = A.length;
  let normA = 0;
  for (let i=0; i<n; i++) for (let j=0; j<n; j++) normA += A[i][j]**2;
  normA = Math.sqrt(normA);
  // Inverse via LU
  try {
    const invCols = [];
    for (let k=0; k<n; k++) {
      const e = Array(n).fill(0); e[k] = 1;
      invCols.push(solveLU(A.map(r=>[...r]), e));
    }
    let normInv = 0;
    for (let i=0; i<n; i++) for (let j=0; j<n; j++) normInv += invCols[j][i]**2;
    normInv = Math.sqrt(normInv);
    return normA * normInv;
  } catch { return Infinity; }
}

// ═══════════════════════════════════════════════════════
// ══  ESCENARIO B — EDO RESERVAS  ═══════════════════════
// ═══════════════════════════════════════════════════════

function runEscenarioB() {
  const R0      = +document.getElementById('b_r0').value;
  const entrada = +document.getElementById('b_entrada').value;
  const consumo = +document.getElementById('b_consumo').value;
  const panico  = +document.getElementById('b_panico').value;
  const dias    = +document.getElementById('b_dias').value;
  const critico = +document.getElementById('b_critico').value;
  const met     = document.getElementById('metodB').value;

  const h = 1; // step = 1 día
  const f = (t, R) => {
    // Consumo aumenta progresivamente con pánico
    const consumoReal = consumo * (1 + (panico - 1) * Math.min(t / dias, 1));
    return entrada - consumoReal;
  };

  let t = 0, R = R0;
  const ts = [0], Rs = [R0];
  let diaCritico = null;

  for (let i = 0; i < dias; i++) {
    let Rnew;
    if (met === 'euler') {
      Rnew = R + h * f(t, R);
    } else if (met === 'heun') {
      const k1 = f(t, R);
      const k2 = f(t + h, R + h * k1);
      Rnew = R + h * (k1 + k2) / 2;
    } else { // rk4
      const k1 = f(t, R);
      const k2 = f(t + h/2, R + h/2 * k1);
      const k3 = f(t + h/2, R + h/2 * k2);
      const k4 = f(t + h, R + h * k3);
      Rnew = R + h * (k1 + 2*k2 + 2*k3 + k4) / 6;
    }
    t += h;
    R = Math.max(0, Rnew);
    ts.push(t);
    Rs.push(R);
    if (diaCritico === null && R <= critico) diaCritico = t;
    if (R <= 0) break;
  }

  const diasRestantes = diaCritico !== null ? diaCritico : dias;
  const consumoFinal = consumo * panico;
  const tasaNeta = entrada - consumoFinal;
  const metodName = {euler:'Euler',heun:'Heun',rk4:'Runge-Kutta 4'}[met];

  let html = `
    <div class="result-title">Método: ${metodName}</div>
    ${statRow('Reserva inicial', R0 + ' miles L')}
    ${statRow('Consumo base diario', consumo + ' miles L/día')}
    ${statRow('Consumo con pánico', fmt(consumoFinal,1) + ' miles L/día')}
    ${statRow('Entrada diaria', entrada + ' miles L/día')}
    ${statRow('Tasa neta final', fmt(tasaNeta,1) + ' miles L/día', tasaNeta >= 0 ? 'safe' : 'danger')}
    ${statRow('Reserva final (día ' + (ts.length-1) + ')', fmt(Rs[Rs.length-1],1) + ' miles L', Rs[Rs.length-1] <= critico ? 'danger' : 'safe')}
  `;
  if (diaCritico !== null) {
    html += alert_('danger', `⚠ La reserva alcanza nivel crítico (${critico} miles L) en el día ${diaCritico}`);
  } else {
    html += alert_('success', `✔ La reserva NO alcanza nivel crítico durante los ${dias} días simulados`);
  }
  html += statRow('Reserva mínima registrada', fmt(Math.min(...Rs), 1) + ' miles L', Math.min(...Rs) <= critico ? 'danger' : 'safe');
  setResult('resultB', html);

  // Chart with critical line
  const critLineData = ts.map(() => critico);
  makeChart('chartB', {
    type: 'line',
    data: {
      labels: ts,
      datasets: [
        { label: 'Reserva (miles L)', data: Rs, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.3, pointRadius: 0 },
        { label: 'Nivel crítico', data: critLineData, borderColor: '#ef4444', borderDash: [6,3], borderWidth: 1.5, pointRadius: 0, fill: false }
      ]
    },
    options: chartOpts('Evolución de Reservas en el Tiempo', false, 'Día', 'Miles de Litros')
  });

  setQuestions('questionsB', [
    { q: '¿En cuántos días la reserva llega al nivel crítico?', a: diaCritico !== null ? `Día ${diaCritico}` : `No llega al nivel crítico en ${dias} días` },
    { q: '¿Qué pasa si aumenta el consumo diario?', a: `Con factor de pánico ${panico}x, el consumo sube a ${fmt(consumoFinal,1)} miles L/día. Mayor pánico agota la reserva más rápido.` },
    { q: '¿Qué pasa si se reduce el abastecimiento?', a: `La tasa neta es ${fmt(tasaNeta,1)} miles L/día. Si la entrada baja más, el agotamiento se acelera exponencialmente.` },
    { q: '¿Qué método da aproximación más estable?', a: 'RK4 es el más estable y preciso. Euler puede acumular error significativo en simulaciones largas. Heun es un punto intermedio.' },
    { q: '¿Cuál es la diferencia entre Euler, Heun y RK4?', a: 'Euler: O(h) — Heun: O(h²) predictor-corrector — RK4: O(h⁴) cuatro evaluaciones de la derivada. Mayor orden = mayor precisión.' }
  ]);
}

// ═══════════════════════════════════════════════════════
// ══  ESCENARIO C — INTERPOLACIÓN  ══════════════════════
// ═══════════════════════════════════════════════════════

let filasC = [];

function initTablaC() {
  filasC = [
    {dia: 1,  precio: 8},
    {dia: 5,  precio: 10},
    {dia: 10, precio: 13},
    {dia: 15, precio: 16},
    {dia: 20, precio: 19},
    {dia: 30, precio: 22}
  ];
  renderTablaC();
}

function renderTablaC() {
  const cont = document.getElementById('tablaPreciosC');
  cont.innerHTML = '<div class="data-row-header"><span>Día</span><span>Precio (Bs)</span><span></span></div>';
  filasC.forEach((f, i) => {
    const row = document.createElement('div');
    row.className = 'data-row';
    row.innerHTML = `
      <input type="number" value="${f.dia}" min="1" max="31" onchange="filasC[${i}].dia=+this.value" />
      <input type="number" value="${f.precio}" step="0.5" min="0" onchange="filasC[${i}].precio=+this.value" />
      <button class="btn-del" onclick="eliminarFilaC(${i})">✕</button>`;
    cont.appendChild(row);
  });
}

function agregarFilaC() {
  const lastDia = filasC.length ? filasC[filasC.length-1].dia + 5 : 1;
  filasC.push({ dia: Math.min(lastDia, 31), precio: 10 });
  renderTablaC();
}

function eliminarFilaC(i) {
  if (filasC.length <= 2) return;
  filasC.splice(i, 1);
  renderTablaC();
}

function runEscenarioC() {
  // Re-read values from inputs
  const rows = document.querySelectorAll('#tablaPreciosC .data-row');
  const puntos = [];
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    puntos.push({ dia: +inputs[0].value, precio: +inputs[1].value });
  });
  puntos.sort((a, b) => a.dia - b.dia);

  if (puntos.length < 2) {
    setResult('resultC', alert_('danger', 'Se necesitan al menos 2 puntos'));
    return;
  }

  const met = document.getElementById('metodC').value;
  const diaEstimar = +document.getElementById('c_dia_estimar').value;

  const xs = puntos.map(p => p.dia);
  const ys = puntos.map(p => p.precio);

  // Dense evaluation for chart
  const N = 200;
  const xMin = xs[0], xMax = xs[xs.length-1];
  const xDense = Array.from({length: N}, (_, i) => xMin + i * (xMax - xMin) / (N-1));
  let yDense, valorEstimado, metodNombre;

  try {
    if (met === 'lagrange') {
      yDense = xDense.map(x => lagrange(xs, ys, x));
      valorEstimado = lagrange(xs, ys, diaEstimar);
      metodNombre = 'Lagrange';
    } else if (met === 'newton') {
      const dd = dividedDifferences(xs, ys);
      yDense = xDense.map(x => newtonInterp(xs, dd, x));
      valorEstimado = newtonInterp(xs, dd, diaEstimar);
      metodNombre = 'Newton (Diferencias Divididas)';
    } else {
      const sp = cubicSpline(xs, ys);
      yDense = xDense.map(x => evalSpline(xs, ys, sp, x));
      valorEstimado = evalSpline(xs, ys, sp, diaEstimar);
      metodNombre = 'Splines Cúbicos';
    }
  } catch(e) {
    setResult('resultC', alert_('danger', 'Error en interpolación: ' + e.message));
    return;
  }

  const incremento = ((ys[ys.length-1] - ys[0]) / ys[0] * 100).toFixed(1);
  const maxPrecio = Math.max(...ys);
  const minPrecio = Math.min(...ys);

  // Check if diaEstimar is in range
  const inRange = diaEstimar >= xMin && diaEstimar <= xMax;

  let html = `
    <div class="result-title">Método: ${metodNombre}</div>
    ${statRow('Precio estimado (día ' + diaEstimar + ')', 'Bs ' + fmt(valorEstimado, 2), '')}
    ${!inRange ? alert_('warn', '⚠ El día solicitado está fuera del rango de datos (extrapolación)') : ''}
    ${statRow('Incremento total del período', incremento + '%', +incremento > 20 ? 'danger' : 'safe')}
    ${statRow('Precio mínimo registrado', 'Bs ' + minPrecio + ' (día ' + puntos.find(p=>p.precio===minPrecio).dia + ')')}
    ${statRow('Precio máximo registrado', 'Bs ' + maxPrecio + ' (día ' + puntos.find(p=>p.precio===maxPrecio).dia + ')')}
    ${statRow('Nº de puntos de datos', puntos.length)}
    ${statRow('Confiabilidad', puntos.length >= 5 ? 'Alta (≥5 puntos)' : 'Media — agregar más datos mejora la precisión', puntos.length >= 5 ? 'safe' : '')}
  `;
  setResult('resultC', html);

  makeChart('chartC', {
    type: 'line',
    data: {
      labels: xDense.map(x => fmt(x, 1)),
      datasets: [
        { label: `Curva ${metodNombre}`, data: yDense, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', fill: true, tension: 0.3, pointRadius: 0 },
        { label: 'Datos reales', data: (() => {
            return xDense.map((x,i) => {
              const found = puntos.find(p => Math.abs(p.dia - x) < (xMax-xMin)/N*1.5);
              return found ? found.precio : null;
            });
          })(), borderColor: '#10b981', backgroundColor: '#10b981', pointRadius: 5, showLine: false, spanGaps: false },
        { label: `Estimado día ${diaEstimar}`, data: xDense.map((x,i) => Math.abs(x - diaEstimar) < (xMax-xMin)/N*1.5 ? valorEstimado : null), borderColor: '#ef4444', backgroundColor: '#ef4444', pointRadius: 8, pointStyle: 'star', showLine: false, spanGaps: false }
      ]
    },
    options: chartOpts('Curva de Precios Interpolada', false, 'Día', 'Precio (Bs)')
  });

  const diasDispersos = xs.length > 3 ? 'Sí, los datos son dispersos — Splines dan mejores resultados para mayor suavidad.' : 'Los datos están bien distribuidos.';

  setQuestions('questionsC', [
    { q: '¿Cuál sería el precio aproximado en un día sin dato?', a: `Día ${diaEstimar}: Bs ${fmt(valorEstimado, 2)} (método: ${metodNombre})` },
    { q: '¿Cómo se comporta la curva de precios durante el mes?', a: `El precio aumenta ${incremento}% a lo largo del período, de Bs ${minPrecio} a Bs ${maxPrecio}.` },
    { q: '¿Qué producto tuvo mayor incremento?', a: `La canasta muestra un incremento de Bs ${(maxPrecio-minPrecio).toFixed(1)} en el período analizado.` },
    { q: '¿Qué tan confiable es la interpolación?', a: puntos.length >= 5 ? `Alta confiabilidad con ${puntos.length} puntos. Splines garantizan continuidad y suavidad.` : `Media — con ${puntos.length} puntos puede haber oscilaciones (fenómeno de Runge).` },
    { q: '¿Qué pasa si los datos son muy dispersos?', a: diasDispersos }
  ]);
}

// ── Interpolation methods ──
function lagrange(xs, ys, x) {
  const n = xs.length;
  let result = 0;
  for (let i = 0; i < n; i++) {
    let L = 1;
    for (let j = 0; j < n; j++) {
      if (i !== j) L *= (x - xs[j]) / (xs[i] - xs[j]);
    }
    result += ys[i] * L;
  }
  return result;
}

function dividedDifferences(xs, ys) {
  const n = xs.length;
  const dd = ys.map(y => [y]);
  for (let j = 1; j < n; j++) {
    for (let i = 0; i < n - j; i++) {
      dd[i].push((dd[i+1][j-1] - dd[i][j-1]) / (xs[i+j] - xs[i]));
    }
  }
  return dd.map(row => row[row.length-1]);
}

function newtonInterp(xs, dd, x) {
  const n = xs.length;
  let result = dd[0];
  let product = 1;
  for (let i = 1; i < n; i++) {
    product *= (x - xs[i-1]);
    result += dd[i] * product;
  }
  return result;
}

function cubicSpline(xs, ys) {
  const n = xs.length;
  const h = xs.map((x, i) => i < n-1 ? xs[i+1]-x : 0);
  const A2 = Array.from({length: n}, () => Array(n).fill(0));
  const rhs = Array(n).fill(0);
  A2[0][0] = 1; A2[n-1][n-1] = 1;
  for (let i = 1; i < n-1; i++) {
    A2[i][i-1] = h[i-1];
    A2[i][i]   = 2*(h[i-1]+h[i]);
    A2[i][i+1] = h[i];
    rhs[i] = 3*((ys[i+1]-ys[i])/h[i] - (ys[i]-ys[i-1])/h[i-1]);
  }
  const M = solveTridiagonal(A2, rhs, n);
  return M;
}

function solveTridiagonal(A, b, n) {
  const x = Array(n).fill(0);
  const c = A.map(r=>[...r]);
  const d = [...b];
  for (let i = 1; i < n; i++) {
    if (Math.abs(c[i-1][i-1]) < 1e-12) continue;
    const m = c[i][i-1] / c[i-1][i-1];
    c[i][i] -= m * c[i-1][i];
    d[i] -= m * d[i-1];
  }
  x[n-1] = d[n-1] / (c[n-1][n-1] || 1);
  for (let i = n-2; i >= 0; i--) {
    x[i] = (d[i] - c[i][i+1]*x[i+1]) / (c[i][i] || 1);
  }
  return x;
}

function evalSpline(xs, ys, M, x) {
  const n = xs.length;
  let i = n-2;
  for (let k=0; k<n-1; k++) {
    if (x >= xs[k] && x <= xs[k+1]) { i = k; break; }
  }
  const h = xs[i+1] - xs[i];
  if (Math.abs(h) < 1e-12) return ys[i];
  const A = (xs[i+1]-x)/h, B = (x-xs[i])/h;
  return A*ys[i] + B*ys[i+1] + ((A*A*A-A)*M[i] + (B*B*B-B)*M[i+1])*(h*h)/6;
}

// ═══════════════════════════════════════════════════════
// ══  ESCENARIO D — INTEGRACIÓN NUMÉRICA  ═══════════════
// ═══════════════════════════════════════════════════════

function runEscenarioD() {
  const p0      = +document.getElementById('d_p0').value;
  const pf      = +document.getElementById('d_pf').value;
  const ingreso = +document.getElementById('d_ingreso').value;
  const dias    = +document.getElementById('d_dias').value;
  const met     = document.getElementById('metodD').value;
  const tipo    = document.getElementById('d_tipo').value;

  // Build price curve
  const precio = t => {
    if (tipo === 'lineal') return p0 + (pf - p0) * t / dias;
    if (tipo === 'exponencial') return p0 * Math.exp(Math.log(pf/p0) * t / dias);
    // escalon: 3 shocks
    if (t < dias*0.33) return p0;
    if (t < dias*0.66) return p0 + (pf-p0)*0.5;
    return pf;
  };

  const ts = Array.from({length: dias+1}, (_, i) => i);
  const ps = ts.map(t => precio(t));

  // Integration
  const n = dias;
  let gastReal, gastSin;

  if (met === 'trapecio') {
    gastReal = trapecio(ps, 1);
    gastSin  = trapecio(ts.map(() => p0), 1);
  } else if (met === 'simpson13') {
    const n2 = n % 2 === 0 ? n : n-1;
    gastReal = simpson13(ps.slice(0, n2+1), 1);
    gastSin  = p0 * n2;
  } else {
    const n3 = Math.floor(n/3)*3;
    gastReal = simpson38(ps.slice(0, n3+1), 1);
    gastSin  = p0 * n3;
  }

  const perdida = gastReal - gastSin;
  const porcPerdida = (perdida / ingreso * 100).toFixed(1);
  const gastoPorcentaje = (gastReal / ingreso * 100).toFixed(1);
  const metodNombre = {trapecio:'Trapecio',simpson13:'Simpson 1/3',simpson38:'Simpson 3/8'}[met];

  // Compare all methods
  const gT = trapecio(ps, 1);
  const psS13 = ps.length % 2 === 0 ? ps : ps.slice(0,-1);
  const gS13 = simpson13(psS13, 1);
  const nS38 = Math.floor((ps.length-1)/3)*3;
  const gS38 = simpson38(ps.slice(0, nS38+1), 1);

  let html = `
    <div class="result-title">Método usado: ${metodNombre}</div>
    ${statRow('Gasto real del mes', 'Bs ' + fmt(gastReal, 2), gastReal > ingreso ? 'danger' : '')}
    ${statRow('Gasto si no subieran precios', 'Bs ' + fmt(gastSin, 2))}
    ${statRow('Pérdida poder adquisitivo', 'Bs ' + fmt(perdida, 2), 'danger')}
    ${statRow('Gasto / Ingreso', gastoPorcentaje + '%', +gastoPorcentaje > 100 ? 'danger' : +gastoPorcentaje > 80 ? '' : 'safe')}
    ${gastReal > ingreso ? alert_('danger', `⚠ El gasto (Bs ${fmt(gastReal,2)}) SUPERA el ingreso (Bs ${ingreso}). Déficit familiar: Bs ${fmt(gastReal-ingreso,2)}`) : alert_('success', `✔ El ingreso alcanza, pero el ${porcPerdida}% del ingreso adicional se perdió por inflación`)}
    <div class="result-title" style="margin-top:12px">Comparación entre métodos:</div>
    ${statRow('Trapecio', 'Bs ' + fmt(gT, 2))}
    ${statRow('Simpson 1/3', 'Bs ' + fmt(gS13, 2))}
    ${statRow('Simpson 3/8', 'Bs ' + fmt(gS38, 2))}
    ${statRow('Método más preciso', 'Simpson 1/3 (O(h⁴)) para curvas suaves', 'safe')}
  `;
  setResult('resultD', html);

  // Cumulative cost chart
  const acumulado = [];
  let acum = 0;
  ps.forEach((p, i) => {
    if (i > 0) acum += (ps[i-1] + p) / 2; // trapecio incremental
    acumulado.push(acum);
  });
  const acumSin = ts.map(t => t * p0);

  makeChart('chartD', {
    type: 'line',
    data: {
      labels: ts,
      datasets: [
        { label: 'Gasto acumulado real (Bs)', data: acumulado, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.3, pointRadius: 0 },
        { label: 'Sin aumento de precios (Bs)', data: acumSin, borderColor: '#10b981', borderDash: [5,3], fill: false, tension: 0, pointRadius: 0 },
        { label: 'Precio diario (Bs)', data: ps, borderColor: '#f59e0b', yAxisID: 'y2', fill: false, tension: 0.3, pointRadius: 0 }
      ]
    },
    options: {
      ...chartOpts('Gasto Acumulado vs Precio Diario', false, 'Día', 'Bs'),
      scales: {
        x: { ticks: { color: '#8b8fa8' }, grid: { color: '#2a2d3a' } },
        y: { ticks: { color: '#8b8fa8' }, grid: { color: '#2a2d3a' }, title: { display: true, text: 'Gasto acumulado (Bs)', color: '#8b8fa8' } },
        y2: { position: 'right', ticks: { color: '#f59e0b' }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Precio diario (Bs)', color: '#f59e0b' } }
      }
    }
  });

  setQuestions('questionsD', [
    { q: '¿Cuánto gastó una familia durante el mes?', a: `Bs ${fmt(gastReal, 2)} con precios en alza (${tipo})` },
    { q: '¿Cuánto hubiera gastado si los precios no subían?', a: `Bs ${fmt(gastSin, 2)} (precio fijo en Bs ${p0}/día)` },
    { q: '¿Cuál fue la pérdida aproximada del poder adquisitivo?', a: `Bs ${fmt(perdida, 2)} (${porcPerdida}% del ingreso mensual)` },
    { q: '¿Qué método de integración fue más preciso?', a: `Simpson 1/3 (error O(h⁴)). Trapecio: Bs ${fmt(gT,2)} | S1/3: Bs ${fmt(gS13,2)} | S3/8: Bs ${fmt(gS38,2)}` },
    { q: '¿Qué producto afectó más al gasto mensual?', a: `La canasta básica con incremento de Bs ${(pf-p0).toFixed(1)}/día (${tipo}) es el mayor impacto.` }
  ]);
}

function trapecio(ys, h) {
  const n = ys.length - 1;
  return h * (ys[0]/2 + ys[n]/2 + ys.slice(1,n).reduce((s,v)=>s+v,0));
}

function simpson13(ys, h) {
  const n = ys.length - 1;
  let s = ys[0] + ys[n];
  for (let i = 1; i < n; i++) s += ys[i] * (i%2===0?2:4);
  return h * s / 3;
}

function simpson38(ys, h) {
  const n = ys.length - 1;
  let s = ys[0] + ys[n];
  for (let i = 1; i < n; i++) s += ys[i] * (i%3===0?2:3);
  return 3*h * s / 8;
}

// ═══════════════════════════════════════════════════════
// ══  ESCENARIO E — RAÍCES DE ECUACIONES  ═══════════════
// ═══════════════════════════════════════════════════════

function updateFuncionE() {
  const f = document.getElementById('e_funcion').value;
  const desc = {
    precio_limite: 'f(x) = precio_base·(1+x)·30 − Ingreso<br/><small>x = tasa de incremento que agota el ingreso familiar</small>',
    reposicion: 'f(x) = consumo·(1+x) − entrada<br/><small>x = factor de demanda donde consumo = entrada (tasa crítica)</small>',
    conflicto: 'f(x) = α·x² − β·x − umbral<br/><small>x = nivel de malestar donde estalla el conflicto social</small>'
  };
  document.getElementById('e_funcion_desc').innerHTML = desc[f];
}

function runEscenarioE() {
  const fTipo  = document.getElementById('e_funcion').value;
  const met    = document.getElementById('metodE').value;
  const a      = +document.getElementById('e_a').value;
  const b      = +document.getElementById('e_b').value;
  const tol    = +document.getElementById('e_tol').value;
  const ingreso = +document.getElementById('e_ingreso').value;
  const pbase  = +document.getElementById('e_precio_base').value;

  let f, df, fLabel;
  if (fTipo === 'precio_limite') {
    f = x => pbase * (1 + x) * 30 - ingreso;
    df = x => pbase * 30;
    fLabel = `f(x)=${pbase}·(1+x)·30 − ${ingreso}`;
  } else if (fTipo === 'reposicion') {
    const entrada = 30, consumo = 40;
    f = x => consumo * (1 + x) - entrada;
    df = x => consumo;
    fLabel = `f(x)=${consumo}·(1+x) − ${entrada}`;
  } else {
    f = x => 0.5*x*x - 1.2*x - 3;
    df = x => x - 1.2;
    fLabel = 'f(x)=0.5x²−1.2x−3';
  }

  let raiz, iteraciones, convergio;
  try {
    if (met === 'biseccion') {
      const r = biseccion(f, a, b, tol);
      raiz = r.raiz; iteraciones = r.iters; convergio = r.convergio;
    } else if (met === 'newton') {
      const r = newtonRaphson(f, df, (a+b)/2, tol);
      raiz = r.raiz; iteraciones = r.iters; convergio = r.convergio;
    } else {
      const r = secante(f, a, b, tol);
      raiz = r.raiz; iteraciones = r.iters; convergio = r.convergio;
    }
  } catch(e) {
    setResult('resultE', alert_('danger', 'Error: ' + e.message));
    return;
  }

  const fRaiz = f(raiz);
  const metodNombre = {biseccion:'Bisección',newton:'Newton-Raphson',secante:'Secante'}[met];

  let interpretacion = '';
  if (fTipo === 'precio_limite') {
    interpretacion = `La canasta agota el ingreso cuando el precio sube un ${fmt(raiz*100,2)}%. Con precio base Bs ${pbase}/día, el límite es Bs ${fmt(pbase*(1+raiz),2)}/día.`;
  } else if (fTipo === 'reposicion') {
    interpretacion = `El consumo iguala la entrada cuando la demanda aumenta en x=${fmt(raiz,4)}. Más allá de este punto, las reservas se vacían.`;
  } else {
    interpretacion = `El malestar social alcanza el umbral crítico de conflicto en x=${fmt(raiz,4)}.`;
  }

  // Build iteration table
  let tableRows = '';
  const itersData = met === 'biseccion' ? biseccion(f, a, b, tol, true).tabla :
                    met === 'newton' ? newtonRaphson(f, df, (a+b)/2, tol, true).tabla :
                    secante(f, a, b, tol, true).tabla;

  const maxRows = Math.min(itersData.length, 15);
  for (let i = 0; i < maxRows; i++) {
    const it = itersData[i];
    tableRows += `<tr><td>${i+1}</td><td>${fmt(it.x,6)}</td><td>${fmt(it.fx,8)}</td><td>${fmt(it.err,8)}</td></tr>`;
  }

  let html = `
    <div class="result-title">Método: ${metodNombre}</div>
    ${convergio ? alert_('success', '✔ Convergió') : alert_('warn', '⚠ No convergió completamente')}
    ${statRow('Raíz encontrada', fmt(raiz, 6))}
    ${statRow('f(raíz)', fmt(fRaiz, 8))}
    ${statRow('Iteraciones', iteraciones)}
    ${statRow('Tolerancia', tol)}
    <div style="margin:10px 0;font-size:12px;color:var(--text2)">${interpretacion}</div>
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>Iter</th><th>x</th><th>f(x)</th><th>Error</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
  setResult('resultE', html);

  // Plot function and root
  const xPlot = Array.from({length: 200}, (_, i) => a + i*(b-a)/199);
  const yPlot = xPlot.map(x => f(x));
  const yZero = xPlot.map(() => 0);
  const rootY = [{ x: raiz, y: 0 }];

  makeChart('chartE', {
    type: 'line',
    data: {
      labels: xPlot.map(x => fmt(x,3)),
      datasets: [
        { label: fLabel, data: yPlot, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.05)', fill: true, tension: 0.3, pointRadius: 0 },
        { label: 'f(x)=0', data: yZero, borderColor: '#ef4444', borderDash: [4,3], borderWidth: 1, pointRadius: 0, fill: false },
        { label: `Raíz x=${fmt(raiz,4)}`, data: xPlot.map(x => Math.abs(x-raiz) < (b-a)/200*2 ? f(x) : null), borderColor: '#10b981', backgroundColor: '#10b981', pointRadius: 8, showLine: false, spanGaps: false }
      ]
    },
    options: chartOpts('Función y Raíz Encontrada', false, 'x', 'f(x)')
  });

  // Convergence chart
  const errores = itersData.map(it => Math.abs(it.err));

  setQuestions('questionsE', [
    { q: '¿Cuál es el umbral/punto crítico encontrado?', a: `x = ${fmt(raiz, 6)} con f(x) = ${fmt(fRaiz, 8)}` },
    { q: '¿Cuántas iteraciones necesitó cada método?', a: `${metodNombre}: ${iteraciones} iteraciones hasta tolerancia ${tol}` },
    { q: '¿Cuál método converge más rápido?', a: 'Newton-Raphson: convergencia cuadrática. Secante: superlineal (~1.618). Bisección: lineal (más lento pero siempre converge).' },
    { q: '¿Qué significa la raíz en el contexto real?', a: interpretacion },
    { q: '¿Es sensible a la condición inicial?', a: met === 'newton' ? 'Newton-Raphson SÍ es sensible. Si x₀ está lejos de la raíz o f\'(x₀)≈0, puede divergir.' : met === 'biseccion' ? 'Bisección NO es sensible si f(a)·f(b)<0. Siempre converge.' : 'Secante requiere dos puntos iniciales cercanos a la raíz. Sensibilidad media.' }
  ]);
}

function biseccion(f, a, b, tol, returnTabla=false) {
  if (f(a)*f(b) > 0) throw new Error('f(a) y f(b) deben tener signos opuestos');
  const tabla = [];
  let raiz = (a+b)/2, iters = 0, convergio = false;
  for (let i = 0; i < 200; i++) {
    const c = (a+b)/2;
    const fc = f(c);
    const err = (b-a)/2;
    tabla.push({ x: c, fx: fc, err });
    if (err < tol || Math.abs(fc) < tol) { raiz = c; iters = i+1; convergio = true; break; }
    if (f(a)*fc < 0) b = c; else a = c;
    raiz = c; iters = i+1;
  }
  return returnTabla ? { raiz, iters, convergio, tabla } : { raiz, iters, convergio };
}

function newtonRaphson(f, df, x0, tol, returnTabla=false) {
  const tabla = [];
  let x = x0, convergio = false, iters = 0;
  for (let i = 0; i < 200; i++) {
    const fx = f(x), dfx = df(x);
    if (Math.abs(dfx) < 1e-14) throw new Error('Derivada ≈ 0, el método diverge');
    const xNew = x - fx/dfx;
    const err = Math.abs(xNew - x);
    tabla.push({ x: xNew, fx: f(xNew), err });
    x = xNew; iters = i+1;
    if (err < tol) { convergio = true; break; }
  }
  return returnTabla ? { raiz: x, iters, convergio, tabla } : { raiz: x, iters, convergio };
}

function secante(f, x0, x1, tol, returnTabla=false) {
  const tabla = [];
  let xp = x0, xc = x1, convergio = false, iters = 0;
  for (let i = 0; i < 200; i++) {
    const fp = f(xp), fc = f(xc);
    const denom = fc - fp;
    if (Math.abs(denom) < 1e-14) throw new Error('Denominador ≈ 0');
    const xNew = xc - fc*(xc-xp)/denom;
    const err = Math.abs(xNew - xc);
    tabla.push({ x: xNew, fx: f(xNew), err });
    xp = xc; xc = xNew; iters = i+1;
    if (err < tol) { convergio = true; break; }
  }
  return returnTabla ? { raiz: xc, iters, convergio, tabla } : { raiz: xc, iters, convergio };
}

// ═══════════════════════════════════════════════════════
// ══  ESCENARIO F — RUMORES Y SISTEMAS MAL CONDICIONADOS
// ═══════════════════════════════════════════════════════

function updateRumorF() {
  // Auto-update the demand fields based on rumor level
}

function runEscenarioF() {
  const rumorFactor = +document.getElementById('f_rumor').value;
  const dN = +document.getElementById('f_dN').value;
  const dC = +document.getElementById('f_dC').value;
  const dS = +document.getElementById('f_dS').value;

  // Cost matrix
  const C = [
    [+document.getElementById('f_c11').value, +document.getElementById('f_c12').value, +document.getElementById('f_c13').value],
    [+document.getElementById('f_c21').value, +document.getElementById('f_c22').value, +document.getElementById('f_c23').value],
    [+document.getElementById('f_c31').value, +document.getElementById('f_c32').value, +document.getElementById('f_c33').value]
  ];

  // Demand with rumor perturbation
  const bBase  = [dN, dC, dS];
  const bRumor = bBase.map(d => d * (1 + rumorFactor));

  // Build system: A·x = b (least cost distribution)
  // A represents the cost-weighted distribution matrix
  const A = C.map(row => [...row]);

  let solBase, solRumor, condNum;
  try {
    solBase  = solveLU(A.map(r=>[...r]), bBase);
    solRumor = solveLU(A.map(r=>[...r]), bRumor);
    condNum  = conditionNumber(A);
  } catch(e) {
    setResult('resultF', alert_('danger', 'Error resolviendo sistema: ' + e.message));
    return;
  }

  // Perturbation analysis
  const perturbaciones = solBase.map((v, i) => {
    const delta = solRumor[i] - v;
    const pct = v !== 0 ? (delta/v*100).toFixed(1) : '∞';
    return { zona: ['Norte','Centro','Sur'][i], base: v, rumor: solRumor[i], delta, pct };
  });

  const rumorLabels = {0:'Sin rumor',0.05:'Rumor bajo (+5%)',0.15:'Rumor medio (+15%)',0.30:'Rumor alto (+30%)',0.60:'Pánico (+60%)'};
  const rumorLabel = rumorLabels[rumorFactor] || `+${(rumorFactor*100).toFixed(0)}%`;

  const zonaVulnerable = perturbaciones.sort((a,b) => Math.abs(b.delta)-Math.abs(a.delta))[0];

  let html = `
    <div class="result-title">Escenario: ${rumorLabel}</div>
    ${statRow('Número de condición', fmt(condNum, 2), condNum > 1000 ? 'danger' : condNum > 100 ? '' : 'safe')}
    ${condNum > 1000 ? alert_('danger', '⚠ Sistema MUY MAL CONDICIONADO — pequeñas perturbaciones generan grandes cambios') : condNum > 100 ? alert_('warn', '⚠ Sistema moderadamente mal condicionado') : alert_('success', '✔ Sistema bien condicionado')}
    <div class="result-title" style="margin-top:12px">Impacto en distribución:</div>
  `;
  perturbaciones.forEach(p => {
    html += statRow(`Zona ${p.zona}`, `Base: ${fmt(p.base,1)} → Rumor: ${fmt(p.rumor,1)} (${p.pct >= 0 ? '+' : ''}${p.pct}%)`, Math.abs(+p.pct) > 30 ? 'danger' : '');
  });
  html += statRow('Zona más vulnerable', zonaVulnerable.zona, 'danger');
  html += `<div style="margin-top:8px;font-size:12px;color:var(--text2)">El número de condición κ=${fmt(condNum,2)} indica que el sistema ${condNum > 1000 ? 'amplifica' : condNum > 100 ? 'magnifica moderadamente' : 'transmite casi sin amplificar'} los errores.</div>`;

  setResult('resultF', html);

  makeChart('chartF', {
    type: 'bar',
    data: {
      labels: ['Zona Norte', 'Zona Centro', 'Zona Sur'],
      datasets: [
        { label: 'Distribución base', data: perturbaciones.map(p => p.base), backgroundColor: 'rgba(16,185,129,0.7)' },
        { label: `Con ${rumorLabel}`, data: perturbaciones.map(p => p.rumor), backgroundColor: 'rgba(239,68,68,0.7)' }
      ]
    },
    options: chartOpts('Impacto del Rumor en la Distribución', true)
  });

  const rumorPct = rumorFactor * 100;
  setQuestions('questionsF', [
    { q: '¿Qué pasa si la demanda aumenta solo un 5%?', a: rumorFactor === 0.05 ? `Con +5% de demanda, las necesidades crecen pero el sistema ${condNum < 100 ? 'absorbe bien el cambio' : 'amplifica el impacto por mal condicionamiento'}` : 'Selecciona "Rumor bajo (+5%)" para ver este caso específico.' },
    { q: '¿La solución cambia poco o demasiado?', a: `Con κ=${fmt(condNum,2)}, un cambio del ${rumorPct}% en demanda genera cambios de hasta ${Math.max(...perturbaciones.map(p=>Math.abs(+p.pct))).toFixed(1)}% en la distribución.` },
    { q: '¿El sistema es estable o mal condicionado?', a: condNum < 100 ? `Estable (κ=${fmt(condNum,2)}). El sistema responde proporcionalmente.` : `⚠ Mal condicionado (κ=${fmt(condNum,2)}). Perturbaciones pequeñas se amplifican.` },
    { q: '¿Cómo afecta el rumor al abastecimiento?', a: `El rumor del ${rumorPct}% aumenta la demanda efectiva de ${dN+dC+dS} a ${fmt((dN+dC+dS)*(1+rumorFactor),0)} unidades, generando escasez artificial.` },
    { q: '¿Qué zona o mercado se vuelve más vulnerable?', a: `Zona ${zonaVulnerable.zona} con variación de ${Math.abs(+zonaVulnerable.pct).toFixed(1)}% respecto al escenario base.` }
  ]);
}

// ═══════════════════════════════════════════════════════
// ══  ESCENARIO G — DIFUSIÓN SOCIAL (EDO SISTEMA)  ══════
// ═══════════════════════════════════════════════════════

function runEscenarioG() {
  const N0   = +document.getElementById('g_N0').value;
  const M0   = +document.getElementById('g_M0').value;
  const D0   = +document.getElementById('g_D0').value;
  const a    = +document.getElementById('g_a').value;
  const b    = +document.getElementById('g_b').value;
  const c    = +document.getElementById('g_c').value;
  const k    = +document.getElementById('g_k').value;
  const r    = +document.getElementById('g_r').value;
  const dias = +document.getElementById('g_dias').value;
  const met  = document.getElementById('metodG').value;

  const h = 0.5; // half-day step
  const steps = Math.floor(dias / h);

  const f_N = (N, M, D) => -a*N*M + b*D;
  const f_M = (N, M, D) => a*N*M - c*M*D;
  const f_D = (N, M, D) => k*M - r*D;

  let N = N0, M = M0, D = D0;
  const ts = [0], Ns = [N0], Ms = [M0], Ds = [D0];

  for (let i = 0; i < steps; i++) {
    let Nn, Mn, Dn;
    if (met === 'heun') {
      const kN1=f_N(N,M,D), kM1=f_M(N,M,D), kD1=f_D(N,M,D);
      const Np=N+h*kN1, Mp=M+h*kM1, Dp=D+h*kD1;
      const kN2=f_N(Np,Mp,Dp), kM2=f_M(Np,Mp,Dp), kD2=f_D(Np,Mp,Dp);
      Nn=N+h*(kN1+kN2)/2; Mn=M+h*(kM1+kM2)/2; Dn=D+h*(kD1+kD2)/2;
    } else { // rk4
      const kN1=f_N(N,M,D), kM1=f_M(N,M,D), kD1=f_D(N,M,D);
      const kN2=f_N(N+h/2*kN1,M+h/2*kM1,D+h/2*kD1);
      const kM2=f_M(N+h/2*kN1,M+h/2*kM1,D+h/2*kD1);
      const kD2=f_D(N+h/2*kN1,M+h/2*kM1,D+h/2*kD1);
      const kN3=f_N(N+h/2*kN2,M+h/2*kM2,D+h/2*kD2);
      const kM3=f_M(N+h/2*kN2,M+h/2*kM2,D+h/2*kD2);
      const kD3=f_D(N+h/2*kN2,M+h/2*kM2,D+h/2*kD2);
      const kN4=f_N(N+h*kN3,M+h*kM3,D+h*kD3);
      const kM4=f_M(N+h*kN3,M+h*kM3,D+h*kD3);
      const kD4=f_D(N+h*kN3,M+h*kM3,D+h*kD3);
      Nn=N+h*(kN1+2*kN2+2*kN3+kN4)/6;
      Mn=M+h*(kM1+2*kM2+2*kM3+kM4)/6;
      Dn=D+h*(kD1+2*kD2+2*kD3+kD4)/6;
    }
    N=Math.max(0,Nn); M=Math.max(0,Mn); D=Math.max(0,Dn);
    const t = (i+1)*h;
    if (Number.isFinite(t) && t % 1 === 0) {
      ts.push(t); Ns.push(N); Ms.push(M); Ds.push(D);
    }
  }

  const Mmax = Math.max(...Ms);
  const dayMmax = ts[Ms.indexOf(Mmax)];
  const Mfinal = Ms[Ms.length-1];
  const tendencia = Mfinal < M0 ? '📉 Decreciente — el conflicto tiende a resolverse' : Mfinal > M0*1.5 ? '📈 Creciente — el conflicto se masifica' : '↔ Estable — el conflicto se mantiene';
  const metodNombre = met === 'rk4' ? 'Runge-Kutta 4' : 'Heun';

  let html = `
    <div class="result-title">Método: ${metodNombre}</div>
    ${statRow('Pico de manifestantes', fmt(Mmax,0) + ' personas (día ' + dayMmax + ')')}
    ${statRow('Manifestantes finales', fmt(Mfinal,0), Mfinal > M0 ? 'danger' : 'safe')}
    ${statRow('Neutrales finales', fmt(Ns[Ns.length-1],0))}
    ${statRow('Mediadores finales', fmt(Ds[Ds.length-1],0))}
    ${statRow('Tendencia del conflicto', tendencia)}
    ${Mfinal > M0*2 ? alert_('danger','⚠ El conflicto se MASIFICA. Los mediadores no son suficientes.') : Mfinal < M0*0.5 ? alert_('success','✔ El conflicto tiende a resolverse gracias al diálogo.') : alert_('warn','⚠ Situación de equilibrio inestable. Pequeños cambios pueden escalar.')}
    <div style="margin-top:8px;font-size:12px;color:var(--text2)">
      Parámetros: a=${a} (contagio) b=${b} (retorno) c=${c} (diálogo) k=${k} (institucional) r=${r} (desgaste)
    </div>
  `;
  setResult('resultG', html);

  makeChart('chartG', {
    type: 'line',
    data: {
      labels: ts,
      datasets: [
        { label: 'Neutrales N(t)', data: Ns, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', fill: true, tension: 0.3, pointRadius: 0 },
        { label: 'Manifestantes M(t)', data: Ms, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.3, pointRadius: 0 },
        { label: 'Mediadores D(t)', data: Ds, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: 0.3, pointRadius: 0 }
      ]
    },
    options: chartOpts('Dinámica Social en el Tiempo', false, 'Día', 'Personas')
  });

  setQuestions('questionsG', [
    { q: '¿El conflicto tiende a estabilizarse?', a: Mfinal < M0 * 1.1 ? `Sí. Los manifestantes pasan de ${M0} a ${fmt(Mfinal,0)} al final del período.` : `No. Los manifestantes crecen de ${M0} a ${fmt(Mfinal,0)}, indicando escalada.` },
    { q: '¿El número de manifestantes aumenta o disminuye?', a: tendencia },
    { q: '¿Qué pasa si mejora la tasa de diálogo (c)?', a: `Aumentar c (actualmente ${c}) reduce M(t) más rápido. El parámetro c controla cuántos manifestantes son convencidos por los mediadores por día.` },
    { q: '¿Qué pasa si no existen mediadores (D₀=0)?', a: D0 === 0 ? `Sin mediadores, no hay k·M ni reducción. El modelo degenera y el conflicto crece sin control si a·N·M > 0.` : `Con D₀=${D0} mediadores actuales. Prueba con D₀=0 para ver el escenario sin mediación.` },
    { q: '¿Qué parámetros hacen que el conflicto se masifique?', a: `Alta tasa de contagio (a↑), bajo retorno (b↓), poca efectividad del diálogo (c↓) y escasa reacción institucional (k↓) llevan al conflicto a masificarse.` }
  ]);
}

// ═══════════════════════════════════════════════════════
// ══  CHART OPTIONS  ════════════════════════════════════
// ═══════════════════════════════════════════════════════
function chartOpts(title, stacked=false, xLabel='', yLabel='') {
  return {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#8b8fa8', font: { size: 11 } } },
      title: { display: true, text: title, color: '#e2e4ed', font: { size: 13, weight: '600' } }
    },
    scales: {
      x: {
        stacked,
        ticks: { color: '#8b8fa8', maxTicksLimit: 10 },
        grid: { color: '#2a2d3a' },
        title: xLabel ? { display: true, text: xLabel, color: '#8b8fa8' } : undefined
      },
      y: {
        stacked,
        ticks: { color: '#8b8fa8' },
        grid: { color: '#2a2d3a' },
        title: yLabel ? { display: true, text: yLabel, color: '#8b8fa8' } : undefined
      }
    }
  };
}
