// Inline SVG line chart of both teams' running totals.

function niceStep(rough) {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 1)));
  const ratio = rough / magnitude;
  const factor = ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10;
  return factor * magnitude;
}

export function scoreChart(rows, target) {
  const W = 340;
  const H = 210;
  const left = 40;
  const right = 14;
  const top = 14;
  const bottom = 26;
  const count = rows.length;
  const maxValue = Math.max(target, ...rows.map((row) => Math.max(row.totals.us, row.totals.them)));

  const x = (i) => left + (W - left - right) * (count ? i / count : 0);
  const y = (value) => H - bottom - (H - top - bottom) * (value / maxValue);
  const path = (team) =>
    [[x(0), y(0)], ...rows.map((row, i) => [x(i + 1), y(row.totals[team])])]
      .map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`)
      .join(' ');

  const step = niceStep(maxValue / 4);
  const ticks = [];
  for (let value = 0; value <= maxValue; value += step) ticks.push(value);

  const grid = ticks
    .map(
      (value) => `
      <line class="chart-grid" x1="${left}" x2="${W - right}" y1="${y(value).toFixed(1)}" y2="${y(value).toFixed(1)}"/>
      <text class="chart-label" x="${left - 6}" y="${(y(value) + 4).toFixed(1)}" text-anchor="end">${value}</text>`,
    )
    .join('');

  const last = rows[count - 1];
  const dots = last
    ? ['us', 'them']
        .map((team) => `<circle class="chart-dot ${team}" cx="${x(count).toFixed(1)}" cy="${y(last.totals[team]).toFixed(1)}" r="4.5"/>`)
        .join('')
    : '';

  return `
  <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution du score donne après donne">
    ${grid}
    <line class="chart-target" x1="${left}" x2="${W - right}" y1="${y(target).toFixed(1)}" y2="${y(target).toFixed(1)}"/>
    <path class="chart-line them" d="${path('them')}"/>
    <path class="chart-line us" d="${path('us')}"/>
    ${dots}
    <text class="chart-label" x="${left}" y="${H - 6}" text-anchor="start">Début</text>
    <text class="chart-label" x="${W - right}" y="${H - 6}" text-anchor="end">Donne ${count}</text>
  </svg>`;
}
