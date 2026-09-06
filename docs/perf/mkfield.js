// Turn the web_performance ShopifyQL results into <outDir>/field.json, which mkbaseline.js
// folds into baseline.json as the `field` block.
//
//   node docs/perf/mkfield.js [outDir]
//
// Expects in outDir: webperf.json (grouped by page_type + device_type) and
// webperf_trend.json (same, plus `week`). See "Reproducing this baseline" in backlog.md
// for the two `shopify store execute` calls that produce them.
const fs = require('fs');
const path = require('path');

const D = process.argv[2] || path.join(require('os').tmpdir(), 'perf-runs');

const rows = JSON.parse(fs.readFileSync(path.join(D, 'webperf.json'), 'utf8')).shopifyqlQuery.tableData.rows;
const trend = JSON.parse(fs.readFileSync(path.join(D, 'webperf_trend.json'), 'utf8')).shopifyqlQuery.tableData.rows;

const total = rows.reduce((s, r) => s + Number(r.page_loads), 0);
const byType = {};
const byDevice = {};
for (const r of rows) {
  const n = Number(r.page_loads);
  byType[r.page_type] = (byType[r.page_type] || 0) + n;
  byDevice[r.device_type] = (byDevice[r.device_type] || 0) + n;
}

const share = (n) => +((n / total) * 100).toFixed(1);

const field = {
  _source: 'Shopify ShopifyQL `web_performance` schema via `shopify store execute` (read_reports), 90 days to 2026-09-05',
  _note:
    'The Admin GraphQL `performanceMetrics` query returns an EMPTY array for this shop even with valid auth and read_reports scope - it is not a usable source here. The ShopifyQL web_performance schema is, and gives p75 per page_type per device directly.',
  _thresholds: { lcp_good_ms: 2500, inp_good_ms: 200, cls_good: 0.1 },
  window_days: 90,
  total_page_loads: total,
  device_split_pct: Object.fromEntries(Object.entries(byDevice).map(([k, v]) => [k.toLowerCase(), share(v)])),
  traffic_share_pct: Object.fromEntries(
    Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, share(v)])
  ),
  by_page_type: {},
};

for (const r of rows) {
  const t = r.page_type;
  const d = String(r.device_type).toLowerCase();
  field.by_page_type[t] = field.by_page_type[t] || {};
  field.by_page_type[t][d] = {
    page_loads: Number(r.page_loads),
    lcp_p75_ms: Number(r.lcp_p75_ms),
    inp_p75_ms: Number(r.inp_p75_ms),
    cls_p75: Number(r.p75_cls),
    fcp_p75_ms: Number(r.fcp_p75_ms),
    lcp_rating: Number(r.lcp_p75_ms) <= 2500 ? 'good' : Number(r.lcp_p75_ms) <= 4000 ? 'needs-improvement' : 'poor',
    inp_rating: Number(r.inp_p75_ms) <= 200 ? 'good' : Number(r.inp_p75_ms) <= 500 ? 'needs-improvement' : 'poor',
    cls_rating: Number(r.p75_cls) <= 0.1 ? 'good' : Number(r.p75_cls) <= 0.25 ? 'needs-improvement' : 'poor',
  };
}

// Weekly INP history, mobile only, for the three tracked templates. This is the regression
// record. LCP and CLS are omitted because they are stable and "good" in every week measured -
// INP is the only metric that moves. Kept compact so baseline.json stays diff-readable.
const hist = {};
for (const r of trend) {
  if (String(r.device_type).toLowerCase() !== 'mobile') continue;
  const k = `${r.page_type}_mobile`;
  (hist[k] = hist[k] || []).push(
    `${String(r.week).slice(0, 10)} inp=${Number(r.inp_p75_ms)}ms n=${Number(r.page_loads)}`
  );
}
for (const k of Object.keys(hist)) hist[k].sort();
field.weekly_inp_history_mobile = {
  _note:
    'p75 INP per week, mobile. n = page loads that week; rows with n under ~30 are statistically meaningless (index/mobile runs 4-19 loads a week, which is why its extremes are noise, not regressions).',
  ...hist,
};

fs.writeFileSync(path.join(D, 'field.json'), JSON.stringify(field, null, 2));

console.log('total page loads:', total);
console.log('device split:', JSON.stringify(field.device_split_pct));
console.log('traffic share %:', JSON.stringify(field.traffic_share_pct));
console.log('\nfield CWV ratings (tracked templates):');
for (const t of ['product', 'collection', 'index'])
  for (const d of ['mobile', 'desktop']) {
    const x = field.by_page_type[t] && field.by_page_type[t][d];
    if (x) console.log(` ${t}/${d}`.padEnd(22), 'LCP', String(x.lcp_p75_ms).padStart(6), x.lcp_rating.padEnd(18), '| INP', String(x.inp_p75_ms).padStart(5), x.inp_rating.padEnd(18), '| CLS', x.cls_p75, x.cls_rating);
  }
console.log('\nworst weekly INP (mobile, tracked templates):');
for (const t of ['product', 'collection', 'index']) {
  const worst = trend
    .filter((r) => r.page_type === t && String(r.device_type).toLowerCase() === 'mobile')
    .sort((a, b) => Number(b.inp_p75_ms) - Number(a.inp_p75_ms))
    .slice(0, 3)
    .map((r) => `${String(r.week).slice(0, 10)}:${Number(r.inp_p75_ms)}ms(n=${Number(r.page_loads)})`);
  console.log(` ${t}_mobile`.padEnd(19), worst.join('  '));
}
