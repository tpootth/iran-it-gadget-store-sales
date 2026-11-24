'use strict';
const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const icon = (n, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${(window.ICONS || {})[n] || ''}</svg>`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/* tooltip */
const tip = $('#tip');
function showTip(html, e) {
  tip.innerHTML = html; tip.style.display = 'block';
  const r = tip.getBoundingClientRect();
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
  if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
const hideTip = () => { tip.style.display = 'none'; };
addEventListener('scroll', hideTip, { passive: true });

function segmented(id, onChange) {
  const host = document.getElementById(id);
  host.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    host.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    onChange(b.dataset.v);
  });
}

/* ---------- trend: area line with hover ---------- */
function trend(data, mode) {
  const v = data.map(r => mode === 'index' ? r.sales / data[0].sales * 100 : r.sales);
  const host0 = $('#trend'), W = Math.max(300, Math.round(host0.clientWidth || 1100)), H = W < 600 ? 230 : 300, L = W < 600 ? 44 : 56, R = 16, T = 24, B = 34;
  const lo = mode === 'index' ? Math.min(...v) * 0.9 : 0, hi = Math.max(...v) * 1.18;
  const x = i => L + i * (W - L - R) / (v.length - 1), y = t => H - B - (t - lo) / (hi - lo) * (H - T - B);
  const pts = v.map((t, i) => `${x(i).toFixed(1)},${y(t).toFixed(1)}`).join(' ');
  const imax = v.indexOf(Math.max(...v)), imin = v.indexOf(Math.min(...v));
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly completed sales"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${css('--teal')}" stop-opacity=".22"/><stop offset="1" stop-color="${css('--teal')}" stop-opacity="0"/></linearGradient></defs>`;
  for (let i = 0; i <= 4; i++) { const t = lo + (hi - lo) * i / 4; s += `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="${css('--line')}"/><text x="${L - 10}" y="${y(t) + 4}" text-anchor="end">${compact.format(t)}</text>`; }
  data.forEach((d, i) => { if (d.name.endsWith('-01')) s += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" style="font-weight:650;fill:${css('--ink')}">${d.name.slice(0, 4)}</text>`; else if (d.name.endsWith('-07') && W >= 600) s += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">Jul</text>`; });
  s += `<polygon points="${L},${y(lo)} ${pts} ${x(v.length - 1)},${y(lo)}" fill="url(#ga)"/><polyline points="${pts}" fill="none" stroke="${css('--teal')}" stroke-width="2.5" stroke-linejoin="round"/>`;
  const mark = (i, label, up) => `<circle cx="${x(i)}" cy="${y(v[i])}" r="5" fill="${css('--card')}" stroke="${css('--teal')}" stroke-width="2.5"/><text x="${x(i) < L + 70 ? x(i) - 8 : x(i)}" y="${y(v[i]) + (up ? -12 : 20)}" text-anchor="${x(i) < L + 70 ? 'start' : x(i) > W - 70 ? 'end' : 'middle'}" style="font-weight:700;fill:${css('--ink')}">${label} ${compact.format(v[i])}</text>`;
  s += mark(imax, 'Peak', true) + mark(imin, 'Low', false);
  s += `<line id="tl" y1="${T}" y2="${H - B}" stroke="${css('--ink')}" stroke-opacity=".25" visibility="hidden"/><circle id="td" r="5" fill="${css('--teal')}" visibility="hidden"/><rect id="th" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/></svg>`;
  const host = $('#trend'); host.innerHTML = s;
  const svg = host.querySelector('svg'), tl = svg.querySelector('#tl'), td = svg.querySelector('#td');
  svg.querySelector('#th').addEventListener('pointermove', e => {
    const b = svg.getBoundingClientRect(), sx = (e.clientX - b.left) / b.width * W;
    const i = Math.max(0, Math.min(v.length - 1, Math.round((sx - L) / (W - L - R) * (v.length - 1))));
    tl.setAttribute('x1', x(i)); tl.setAttribute('x2', x(i)); tl.setAttribute('visibility', 'visible');
    td.setAttribute('cx', x(i)); td.setAttribute('cy', y(v[i])); td.setAttribute('visibility', 'visible');
    const [yy, mm] = data[i].name.split('-');
    showTip(`<b>${MONTHS[+mm - 1]} ${yy}</b><br>${mode === 'index' ? 'Index ' + v[i].toFixed(0) : fmt.format(v[i]) + ' sales'}`, e);
  });
  svg.querySelector('#th').addEventListener('pointerleave', () => { hideTip(); tl.setAttribute('visibility', 'hidden'); td.setAttribute('visibility', 'hidden'); });
}

/* ---------- heatmap year x month ---------- */
function heat(data) {
  const by = {}; data.forEach(d => { const [y, m] = d.name.split('-'); (by[y] = by[y] || {})[+m] = d.sales; });
  const vals = data.map(d => d.sales), lo = Math.min(...vals), hi = Math.max(...vals);
  const mix = t => { const a = [213, 235, 231], b = [22, 115, 105]; return `rgb(${a.map((c, i) => Math.round(c + (b[i] - c) * t)).join(',')})`; };
  let h = '<div class="heat"><div></div>' + MONTHS.map(m => `<div class="mh">${m}</div>`).join('');
  Object.keys(by).sort().forEach(y => {
    h += `<div class="yr">${y}</div>`;
    for (let m = 1; m <= 12; m++) {
      const s = by[y][m];
      if (s == null) { h += '<div class="c na" title="No data"></div>'; continue; }
      const t = (s - lo) / (hi - lo);
      h += `<div class="c" style="background:${mix(t)};color:${t > .55 ? '#fff' : css('--ink')}" data-tip="<b>${MONTHS[m - 1]} ${y}</b><br>${fmt.format(s)} sales">${compact.format(s)}</div>`;
    }
  });
  $('#heat').innerHTML = h + '</div>';
  $('#heat-legend').innerHTML = `${compact.format(lo)} <i></i> ${compact.format(hi)}`;
}

/* ---------- treemap (squarified) ---------- */
function squarify(items, x, y, w, h) {
  const out = [], total = items.reduce((s, d) => s + d.v, 0);
  let rest = items.map(d => ({ ...d, a: d.v / total * w * h }));
  while (rest.length) {
    const short = Math.min(w, h); let row = [rest[0]], best = worst(row, short);
    for (let i = 1; i < rest.length; i++) { const t = [...row, rest[i]], wv = worst(t, short); if (wv > best) break; row = t; best = wv; }
    const sum = row.reduce((s, d) => s + d.a, 0);
    if (w >= h) { const cw = sum / h; let cy = y; row.forEach(d => { const ch = d.a / cw; out.push({ ...d, x, y: cy, w: cw, h: ch }); cy += ch; }); x += cw; w -= cw; }
    else { const ch = sum / w; let cx = x; row.forEach(d => { const cw = d.a / ch; out.push({ ...d, x: cx, y, w: cw, h: ch }); cx += cw; }); y += ch; h -= ch; }
    rest = rest.slice(row.length);
  }
  return out;
  function worst(r, s) { const sum = r.reduce((a, d) => a + d.a, 0), mx = Math.max(...r.map(d => d.a)), mn = Math.min(...r.map(d => d.a)); return Math.max(s * s * mx / (sum * sum), sum * sum / (s * s * mn)); }
}
function treemap(cats) {
  const total = cats.reduce((s, c) => s + c.sales, 0);
  const pal = [['--teal', '#fff'], ['--teal-2', '#fff'], ['--teal-3', '--ink'], ['--teal-4', '--ink'], ['--gold-2', '--ink'], ['--soft', '--ink']];
  const el = $('#treemap'), AR = (el.clientWidth / el.clientHeight) || 1.45, WW = AR * 100;
  const rects = squarify([...cats].sort((a, b) => b.sales - a.sales).map(c => ({ ...c, v: c.sales })), 0, 0, WW, 100);
  $('#treemap').innerHTML = rects.map((r, i) => {
    const [bg, fg] = pal[i], share = r.sales / total * 100, area = r.w * r.h * (el.clientWidth / WW) * (el.clientHeight / 100) / 25;
    const cls = area < 700 ? 'tiny' : area < 1600 ? 'small' : '';
    return `<div class="tm ${cls}" style="left:${r.x / WW * 100}%;top:${r.y}%;width:${r.w / WW * 100}%;height:${r.h}%;background:${css(bg)};color:${fg.startsWith('--') ? css(fg) : fg}" data-tip="<b>${esc(r.name)}</b><br>${share.toFixed(1)}% of sales · ${fmt.format(r.orders)} orders">${cls === 'tiny' ? '' : icon(r.name)}<div><b>${share.toFixed(share < 10 ? 1 : 0)}%</b><br><span>${esc(r.name)}</span></div></div>`;
  }).join('');
}

/* ---------- bubbles: orders vs average order value ---------- */
function bubbles(cats) {
  const W = Math.max(300, Math.round($('#bubbles').clientWidth || 560)), H = Math.max(280, Math.round(W * .64)), L = 50, R = 16, T = 40, B = 44;
  const xs = cats.map(c => c.orders), ys = cats.map(c => c.sales / c.orders);
  const xmax = Math.max(...xs) * 1.12, ymax = Math.ceil(Math.max(...ys) * 1.15 / 50) * 50, smax = Math.max(...cats.map(c => c.sales));
  const x = v => L + v / xmax * (W - L - R), y = v => H - B - v / ymax * (H - T - B), r = s => 6 + Math.sqrt(s / smax) * Math.min(34, W * .06);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Category orders versus average order value">`;
  for (let i = 0; i <= 4; i++) { const t = ymax * i / 4; s += `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="${css('--line')}"/><text x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${fmt.format(t)}</text>`; }
  for (let i = 0; i <= 4; i++) { const t = xmax * i / 4; s += `<text x="${x(t)}" y="${H - 22}" text-anchor="middle">${compact.format(t)}</text>`; }
  s += `<text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle" style="font-weight:600">Completed orders →</text><text x="${L - 8}" y="14" text-anchor="start" style="font-weight:600">↑ Avg. order value</text>`;
  [...cats].sort((a, b) => b.sales - a.sales).forEach(c => {
    const cx = x(c.orders), cy = y(c.sales / c.orders), rr = r(c.sales);
    s += `<g data-tip="<b>${esc(c.name)}</b><br>${fmt.format(c.orders)} orders · avg ${fmt.format(c.sales / c.orders)}<br>${fmt.format(c.sales)} sales"><circle cx="${cx}" cy="${cy}" r="${rr}" fill="${css('--teal')}" fill-opacity=".18" stroke="${css('--teal')}" stroke-width="1.5"/>${(() => { const top = c.name === 'Home Office', left = !top && cx > W * .7; const lx = top ? cx : left ? cx - rr - 6 : cx + rr + 6; const ly = top ? cy - rr - 8 : c.name === 'Wearables' ? cy + rr * .6 + 4 : cy + 4; return `<text x="${lx}" y="${ly}" text-anchor="${top ? 'middle' : left ? 'end' : 'start'}" style="font-weight:650;fill:${css('--ink')}">${esc(c.name)}</text>`; })()}</g>`;
  });
  $('#bubbles').innerHTML = s + '</svg>';
}

/* ---------- product shelf ---------- */
function shelf(products, mode) {
  const rows = products.map(p => ({ ...p, aov: p.sales / p.orders })).sort((a, b) => b[mode] - a[mode]);
  const max = rows[0][mode];
  $('#shelf').innerHTML = rows.map((p, i) => `
    <article class="prod${i < 3 ? ' top3' : ''}">
      <div class="art">${icon(p.name)}</div><span class="rk">#${i + 1}</span>
      <div class="nm">${esc(p.name)}</div>
      <div class="val">${mode === 'orders' ? fmt.format(p.orders) : fmt.format(mode === 'aov' ? p.aov : p.sales)}</div>
      <div class="meter"><i style="width:${p[mode] / max * 100}%"></i></div>
      <div class="sub">${mode === 'sales' ? fmt.format(p.orders) + ' orders · avg ' + fmt.format(p.aov) : mode === 'orders' ? compact.format(p.sales) + ' sales · avg ' + fmt.format(p.aov) : compact.format(p.sales) + ' sales · ' + fmt.format(p.orders) + ' orders'}</div>
    </article>`).join('');
}

/* ---------- map ---------- */
function map(cities, mode) {
  const g = window.IRAN; if (!g) return;
  const max = Math.max(...cities.map(c => c[mode]));
  const rows = [...cities].sort((a, b) => b[mode] - a[mode]);
  let s = `<svg viewBox="0 0 ${g.w} ${g.h}" role="img" aria-label="Map of Iran with city ${mode}"><path d="${g.d}" fill="${css('--soft')}" stroke="${css('--teal-3')}" stroke-width="1.2" stroke-linejoin="round"/>`;
  [...rows].reverse().forEach(c => {
    const p = g.cities[c.name]; if (!p) return;
    const r = 6 + Math.sqrt(c[mode] / max) * 46;
    s += `<g class="city" data-c="${esc(c.name)}" data-tip="<b>${esc(c.name)}</b><br>${fmt.format(c.sales)} sales · ${fmt.format(c.orders)} orders"><circle class="city-dot" cx="${p[0]}" cy="${p[1]}" r="${r.toFixed(1)}" fill="${css('--teal')}" fill-opacity=".28" stroke="${css('--teal')}" stroke-width="1.5"/><circle cx="${p[0]}" cy="${p[1]}" r="2.5" fill="${css('--ink')}"/></g>`;
  });
  const rad = c => 6 + Math.sqrt(c[mode] / max) * 46, fs = Math.min(24, 13 * g.w / Math.max(280, $('#map').clientWidth || g.w));
  rows.slice(0, 7).forEach(c => { const p = g.cities[c.name]; if (!p) return; const r = rad(c), left = c.name === 'Karaj' || c.name === 'Ahvaz' || c.name === 'Mashhad';
    s += `<text x="${left ? p[0] - r - 5 : p[0] + r + 5}" y="${c.name === 'Karaj' ? p[1] - 8 : p[1] + 4}" text-anchor="${left ? 'end' : 'start'}" style="font-weight:700;fill:${css('--ink')};font-size:${fs.toFixed(1)}px;paint-order:stroke;stroke:${css('--card')};stroke-width:3px">${esc(c.name)}</text>`; });
  $('#map').innerHTML = s + '</svg>';
  $('#city-rank').innerHTML = rows.map((c, i) => `<li data-c="${esc(c.name)}"><span class="n">${i + 1}</span><span>${esc(c.name)}</span><b>${mode === 'sales' ? compact.format(c.sales) : fmt.format(c.orders)}</b><span class="bar"><i style="width:${c[mode] / max * 100}%"></i></span></li>`).join('');
  const hl = name => {
    document.querySelectorAll('#city-rank li').forEach(li => li.classList.toggle('on', li.dataset.c === name));
    document.querySelectorAll('#map .city-dot').forEach(d => d.setAttribute('fill-opacity', d.parentNode.dataset.c === name ? '.6' : '.28'));
  };
  document.querySelectorAll('#map .city, #city-rank li').forEach(el => {
    el.addEventListener('pointerenter', () => hl(el.dataset.c));
    el.addEventListener('pointerleave', () => hl(null));
  });
}

/* ---------- order outcomes ---------- */
function statuses(st, total) {
  const rows = [['Completed', '--teal'], ['Cancelled', '--red'], ['Returned', '--gold']].map(([n, c]) => ({ n, c: css(c), v: st[n] || 0 }));
  $('#status-total').textContent = fmt.format(total) + ' orders';
  $('#status').innerHTML = `<div class="stack">${rows.map(r => `<div style="flex:${r.v};background:${r.c}" data-tip="<b>${r.n}</b><br>${fmt.format(r.v)} orders">${r.v / total > .08 ? (r.v / total * 100).toFixed(1) + '%' : ''}</div>`).join('')}</div>
    <div class="status-legend">${rows.map(r => `<div style="border-color:${r.c}"><small>${r.n}</small><b>${(r.v / total * 100).toFixed(1)}%</b><small>${fmt.format(r.v)}</small></div>`).join('')}</div>`;
}

/* ---------- customer segments ---------- */
function segments(segs) {
  const ideas = { 'Higher cumulative spend': 'Test retention bundles; measure repeat purchases.', 'Longer since last purchase': 'Test a small reactivation campaign; measure return rate and cost.' };
  $('#segments').innerHTML = [...segs].sort((a, b) => b.share - a.share).map(s => `
    <div class="seg-row"><h4>${esc(s.name)} <span class="muted">· ${fmt.format(s.customers)} customers</span></h4>
      <div class="pair"><span>Customers</span><div class="t"><i style="width:${s.customerShare}%;background:${css('--teal-3')}"></i></div><b>${s.customerShare.toFixed(0)}%</b></div>
      <div class="pair"><span>Value</span><div class="t"><i style="width:${s.share}%;background:${css('--teal')}"></i></div><b>${s.share.toFixed(0)}%</b></div>
      <p class="idea">${icon('lightbulb')}<span>${ideas[s.name] || ''}</span></p></div>`).join('');
}

/* ---------- init ---------- */
async function init() {
  const res = await fetch('data.json'); if (!res.ok) throw Error('Dataset unavailable');
  const d = await res.json();
  const [sy, sm] = d.start.split('-'), [ey, em] = d.end.split('-');
  $('#period').textContent = `${fmt.format(d.orders)} orders from ${d.cities.length} cities, ${MONTHS[+sm - 1]} ${sy} – ${MONTHS[+em - 1]} ${ey}.`;
  $('#mosaic').innerHTML = d.products.slice(0, 6).map((p, i) => `<div class="tile t${i}">${icon(p.name)}<span>${esc(p.name)}</span></div>`).join('');
  $('#kpis').innerHTML = [['store', 'Completed sales', compact.format(d.sales)], ['receipt', 'Completed orders', fmt.format(d.completed)], ['users', 'Customers', fmt.format(d.customers)], ['shopping-bag', 'Avg. order value', fmt.format(d.sales / d.completed)]]
    .map(([ic, k, v]) => `<div class="kpi"><span class="ic">${icon(ic)}</span><div><small>${k}</small><b>${v}</b></div></div>`).join('');
  let tmode = 'sales'; trend(d.monthly, tmode); segmented('trend-mode', v => { tmode = v; trend(d.monthly, v); });
  heat(d.monthly);
  treemap(d.categories); bubbles(d.categories);
  shelf(d.products, 'sales'); segmented('prod-sort', v => shelf(d.products, v));
  map(d.cities, 'sales'); segmented('city-mode', v => map(d.cities, v));
  statuses(d.status, d.orders); segments(d.segments);
  document.addEventListener('pointermove', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTip(t.dataset.tip, e); else if (!e.target.closest('#trend')) hideTip(); });
  let rt, lastW = innerWidth; addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; clearTimeout(rt); rt = setTimeout(() => { trend(d.monthly, tmode); treemap(d.categories); bubbles(d.categories); map(d.cities, document.querySelector('#city-mode [aria-pressed=true]').dataset.v); }, 150); });
}
init().catch(e => { $('#period').textContent = 'Unable to load dashboard data. Please refresh.'; console.error(e); });
