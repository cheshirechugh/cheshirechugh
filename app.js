(() => {
  const KEY = 'mood.entries.v1';
  const $ = (s) => document.querySelector(s);
  const slider = $('#mood'), swatch = $('#swatch'), saveBtn = $('#save');
  const chart = $('#chart'), calendar = $('#calendar'), list = $('#entries');
  const DAY = 864e5;

  // value 0..100 → red (0°) .. green (120°)
  const color = (v) => `hsl(${v * 1.2} 70% 50%)`;

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const store = (e) => { try { localStorage.setItem(KEY, JSON.stringify(e)); } catch {} };
  let entries = load(); // [{t: ms, v: 0..100}]
  let range = 30;
  try { range = +(localStorage.getItem('mood.range') ?? 30); } catch {}
  let shown = 20;

  function setMood(v) { document.documentElement.style.setProperty('--mood', color(v)); }
  slider.addEventListener('input', () => setMood(+slider.value));
  if (entries.length) slider.value = entries[entries.length - 1].v;
  setMood(+slider.value);

  saveBtn.addEventListener('click', () => {
    entries.push({ t: Date.now(), v: +slider.value });
    store(entries);
    saveBtn.classList.add('done'); swatch.classList.add('pulse');
    if (navigator.vibrate) navigator.vibrate(15);
    setTimeout(() => { saveBtn.classList.remove('done'); swatch.classList.remove('pulse'); }, 600);
    render();
  });

  document.querySelectorAll('.ranges button').forEach((b) => {
    b.addEventListener('click', () => {
      range = +b.dataset.range;
      try { localStorage.setItem('mood.range', range); } catch {}
      render();
    });
  });

  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const fmtDate = (t, opts) => new Date(t).toLocaleDateString(undefined, opts);
  const fmtTime = (t) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const ns = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => { const n = document.createElementNS(ns, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };

  function inRange() {
    if (!range) return entries;
    const from = startOfDay(Date.now()) - (range - 1) * DAY;
    return entries.filter((e) => e.t >= from);
  }

  function renderChart(data) {
    chart.replaceChildren();
    const W = chart.clientWidth || 500, H = 180, pl = 6, pr = 6, pt = 10, pb = 20;
    chart.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const defs = el('defs', {});
    const g = el('linearGradient', { id: 'mg', x1: 0, y1: 1, x2: 0, y2: 0 });
    [[0, 0], [50, 50], [100, 100]].forEach(([o, v]) => g.appendChild(el('stop', { offset: o + '%', 'stop-color': color(v), 'stop-opacity': .12 })));
    defs.appendChild(g); chart.appendChild(defs);
    chart.appendChild(el('rect', { x: pl, y: pt, width: W - pl - pr, height: H - pt - pb, fill: 'url(#mg)', rx: 8 }));
    [0, 50, 100].forEach((v) => {
      const y = pt + (1 - v / 100) * (H - pt - pb);
      chart.appendChild(el('line', { class: 'grid', x1: pl, x2: W - pr, y1: y, y2: y }));
    });

    if (!data.length) {
      const t = el('text', { class: 'empty', x: W / 2, y: H / 2, 'text-anchor': 'middle' });
      t.textContent = '—';
      chart.appendChild(t);
      return;
    }

    const now = Date.now();
    const t0 = range ? startOfDay(now) - (range - 1) * DAY : Math.min(data[0].t, startOfDay(now));
    const t1 = range ? startOfDay(now) + DAY : Math.max(now, t0 + DAY);
    const x = (t) => pl + ((t - t0) / (t1 - t0)) * (W - pl - pr);
    const y = (v) => pt + (1 - v / 100) * (H - pt - pb);

    // Daily-average trend line
    const byDay = new Map();
    data.forEach((e) => { const d = startOfDay(e.t); (byDay.get(d) || byDay.set(d, []).get(d)).push(e.v); });
    const days = [...byDay.entries()].sort((a, b) => a[0] - b[0]);
    if (days.length > 1) {
      const pts = days.map(([d, vs]) => `${x(d + DAY / 2).toFixed(1)},${y(vs.reduce((a, b) => a + b) / vs.length).toFixed(1)}`);
      chart.appendChild(el('polyline', { class: 'trend', points: pts.join(' ') }));
    }

    const r = data.length > 200 ? 2.5 : data.length > 60 ? 3.5 : 5;
    data.forEach((e) => {
      const c = el('circle', { cx: x(e.t), cy: y(e.v), r, fill: color(e.v) });
      const tt = el('title', {}); tt.textContent = `${fmtDate(e.t, { month: 'short', day: 'numeric' })} ${fmtTime(e.t)}`;
      c.appendChild(tt); chart.appendChild(c);
    });

    // x-axis labels: start / end
    [[t0, 'start'], [t1 - 1, 'end']].forEach(([t, anchor]) => {
      const lbl = el('text', { class: 'axis', x: anchor === 'start' ? pl : W - pr, y: H - 4, 'text-anchor': anchor });
      lbl.textContent = fmtDate(t, { month: 'short', day: 'numeric' });
      chart.appendChild(lbl);
    });
  }

  function renderCalendar() {
    calendar.replaceChildren();
    const today = startOfDay(Date.now());
    const n = range === 7 ? 7 : range === 30 ? 35 : range === 365 ? 371 : Math.max(35, Math.ceil((today - startOfDay(entries[0]?.t ?? today)) / DAY / 7 + 1) * 7);
    // Align so the last column ends on today's weekday row; Monday-first weeks.
    const dow = (new Date(today).getDay() + 6) % 7;
    const end = today + (6 - dow) * DAY;
    const start = end - (Math.ceil(n / 7) * 7 - 1) * DAY;
    const avg = new Map();
    entries.forEach((e) => { const d = startOfDay(e.t); const a = avg.get(d) || [0, 0]; a[0] += e.v; a[1]++; avg.set(d, a); });
    calendar.style.gridTemplateColumns = 'repeat(7, 1fr)';
    calendar.style.maxWidth = n > 70 ? '100%' : '';
    for (let d = start; d <= end; d = startOfDay(d + DAY * 1.5)) {
      const cell = document.createElement('div');
      cell.className = 'day';
      if (d > today) cell.classList.add('blank');
      else {
        const a = avg.get(d);
        if (a) cell.style.background = color(a[0] / a[1]);
        cell.title = fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric' });
        if (d === today) cell.classList.add('today');
      }
      calendar.appendChild(cell);
    }
    // Long ranges: lay weeks out as columns (GitHub-style) so it stays compact.
    if (n > 70) {
      calendar.style.gridTemplateColumns = '';
      calendar.style.gridAutoFlow = 'column';
      calendar.style.gridTemplateRows = 'repeat(7, 1fr)';
      calendar.style.gridAutoColumns = '1fr';
      calendar.style.gap = '2px';
    } else {
      calendar.style.gridAutoFlow = calendar.style.gridTemplateRows = calendar.style.gridAutoColumns = '';
      calendar.style.gap = '';
    }
  }

  function renderList() {
    list.replaceChildren();
    const items = entries.slice().reverse();
    items.slice(0, shown).forEach((e) => {
      const row = document.createElement('div');
      row.className = 'entry';
      row.innerHTML = `<span class="dot"></span><span class="when"></span><span class="bar"><span></span></span><button class="del" aria-label="Delete entry">×</button>`;
      row.querySelector('.dot').style.background = color(e.v);
      row.querySelector('.when').textContent = `${fmtDate(e.t, { month: 'short', day: 'numeric' })} · ${fmtTime(e.t)}`;
      const fill = row.querySelector('.bar span');
      fill.style.width = e.v + '%'; fill.style.background = color(e.v);
      row.querySelector('.del').addEventListener('click', () => {
        if (!confirm('Delete this entry?')) return;
        entries = entries.filter((x) => x !== e); store(entries); render();
      });
      list.appendChild(row);
    });
    if (items.length > shown) {
      const more = document.createElement('button');
      more.className = 'more'; more.textContent = '···'; more.setAttribute('aria-label', 'Show more');
      more.addEventListener('click', () => { shown += 20; renderList(); });
      list.appendChild(more);
    }
  }

  function render() {
    document.querySelectorAll('.ranges button').forEach((b) => b.setAttribute('aria-selected', +b.dataset.range === range));
    renderChart(inRange());
    renderCalendar();
    renderList();
  }

  window.addEventListener('resize', () => renderChart(inRange()));
  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
