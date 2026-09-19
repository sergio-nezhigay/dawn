// Weekly field check: ShopifyQL `web_performance` (real-user p75 LCP / INP / CLS) vs baseline.json.
//
//   node docs/perf/field-weekly.mjs                                  # last 7 full days
//   node docs/perf/field-weekly.mjs --since 2026-09-13 --until 2026-09-19
//   node docs/perf/field-weekly.mjs --write                          # also merge COMPLETED weeks into
//                                                                    # baseline.json weekly_inp_history_mobile
//   node docs/perf/field-weekly.mjs --baseline <path>                # use another baseline file (testing)
//
// Needs one-time auth:  shopify store auth --store c2da09-15.myshopify.com --scopes read_reports
// Zero dependencies. Trust rules (backlog.md): product/mobile is the only series with enough volume;
// rows with fewer than 30 page loads are flagged `?` and should be ignored.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const STORE = 'c2da09-15.myshopify.com'; // must be the .myshopify.com domain, not informatica.com.ua
const MIN_LOADS = 30;
const TRACKED = ['product', 'collection', 'index'];
const DAY = 86400000;

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const today = iso(Date.now());
const UNTIL = opt('until') || iso(Date.now() - DAY);
const SINCE = opt('since') || iso(Date.parse(today) - 7 * DAY);
const BASELINE = path.resolve(opt('baseline') || path.join(path.dirname(fileURLToPath(import.meta.url)), 'baseline.json'));
const WRITE = args.includes('--write');
for (const d of [SINCE, UNTIL]) if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`bad date "${d}", expected YYYY-MM-DD`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'field-weekly-'));
function shopifyql(query) {
  const qf = path.join(tmp, 'q.graphql');
  const of = path.join(tmp, 'out.json');
  const gql = `query { shopifyqlQuery(query: """${query}""") { tableData { rows } parseErrors } }`;
  fs.writeFileSync(qf, gql);
  try {
    execSync(`shopify store execute --store ${STORE} --json --query-file "${qf}" --output-file "${of}"`, { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (err) {
    throw new Error(`shopify store execute failed (run the auth command in the header?):\n${(err.stderr || err.message).toString()}`);
  }
  const json = JSON.parse(fs.readFileSync(of, 'utf8'));
  const r = json.data?.shopifyqlQuery ?? json.shopifyqlQuery;
  if (!r) throw new Error(`unexpected response: ${JSON.stringify(json).slice(0, 300)}`);
  if (r.parseErrors?.length) throw new Error(`ShopifyQL parse errors: ${JSON.stringify(r.parseErrors)}`);
  return r.tableData.rows;
}

const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const fmt = (v, w) => String(v ?? '-').padStart(w);
const delta = (a, b, digits = 0) => (a === null || b === null ? '' : ` (${a - b >= 0 ? '+' : ''}${(a - b).toFixed(digits)})`);

// ---------- 1. window vs baseline ----------
const baselineRaw = fs.readFileSync(BASELINE, 'utf8');
const baseline = JSON.parse(baselineRaw);
// p75_cls, not cls_p75 - ShopifyQL metric naming quirk
const rows = shopifyql(
  `FROM web_performance SHOW page_loads, lcp_p75_ms, inp_p75_ms, p75_cls, fcp_p75_ms GROUP BY page_type, device_type SINCE ${SINCE} UNTIL ${UNTIL} ORDER BY page_loads DESC`
);

console.log(`\nField p75, ${SINCE} -> ${UNTIL}  vs baseline (${baseline.field.window_days}d to ${baseline.measured_at}).  ? = under ${MIN_LOADS} loads, ignore.\n`);
console.log('template/device'.padEnd(20), 'loads'.padStart(6), '  LCP ms (vs base)'.padEnd(20), '  INP ms (vs base)'.padEnd(20), '  CLS (vs base)');
for (const t of TRACKED) {
  for (const d of ['mobile', 'desktop']) {
    const r = rows.find((x) => x.page_type === t && String(x.device_type).toLowerCase() === d);
    if (!r) { console.log(`${t}/${d}`.padEnd(20), fmt(0, 6), '  (no data)'); continue; }
    const b = baseline.field.by_page_type?.[t]?.[d] || {};
    const n = Number(r.page_loads);
    const lcp = num(r.lcp_p75_ms), inp = num(r.inp_p75_ms), cls = num(r.p75_cls);
    console.log(
      `${t}/${d}`.padEnd(20), fmt(n, 5) + (n < MIN_LOADS ? '?' : ' '),
      `  ${lcp}${delta(lcp, b.lcp_p75_ms ?? null)}`.padEnd(20),
      `  ${inp}${delta(inp, b.inp_p75_ms ?? null)}`.padEnd(20),
      `  ${cls}${delta(cls, b.cls_p75 ?? null, 2)}`
    );
  }
}

// ---------- 2. weekly INP history (mobile) ----------
// Start on a Monday: `GROUP BY week` buckets are Monday-based, and a window that starts mid-week
// returns a truncated first bucket (few loads, wrong p75) that must never reach --write.
const back = Date.parse(SINCE) - 8 * 7 * DAY;
const HIST_FROM = iso(back - ((new Date(back).getUTCDay() + 6) % 7) * DAY);
const weekly = shopifyql(
  `FROM web_performance SHOW page_loads, inp_p75_ms GROUP BY week, page_type, device_type SINCE ${HIST_FROM} UNTIL ${UNTIL} ORDER BY week`
).filter((r) => String(r.device_type).toLowerCase() === 'mobile' && TRACKED.includes(r.page_type));

const weekStart = (r) => String(r.week).slice(0, 10);
// complete = its Sunday has passed AND the query window covered all of it
const complete = (r) => Date.parse(weekStart(r)) + 7 * DAY <= Date.parse(today) && Date.parse(weekStart(r)) + 6 * DAY <= Date.parse(UNTIL);
const line = (r) => `${weekStart(r)} inp=${Number(r.inp_p75_ms)}ms n=${Number(r.page_loads)}`;

console.log('\nWeekly product/mobile INP p75 (threshold 200; the historical band is what to compare against):');
for (const r of weekly.filter((x) => x.page_type === 'product')) {
  const n = Number(r.page_loads);
  console.log(' ', weekStart(r), fmt(Number(r.inp_p75_ms), 4), 'ms  n=' + fmt(n, 3), complete(r) ? '' : ' (week in progress)', n < MIN_LOADS ? ' ?' : '');
}
console.log('\nOne week inside the band is not evidence of change. Compare against the whole series.');

// ---------- 3. optional: merge completed weeks into baseline.json ----------
if (WRITE) {
  const hist = baseline.field.weekly_inp_history_mobile;
  let added = 0, replaced = 0;
  for (const t of TRACKED) {
    const key = `${t}_mobile`;
    hist[key] = hist[key] || [];
    for (const r of weekly.filter((x) => x.page_type === t && complete(x))) {
      const prefix = weekStart(r) + ' ';
      const i = hist[key].findIndex((s) => s.startsWith(prefix));
      if (i < 0) { hist[key].push(line(r)); added++; }
      else if (hist[key][i] !== line(r)) { console.log(`  updated ${key}: "${hist[key][i]}" -> "${line(r)}"`); hist[key][i] = line(r); replaced++; }
    }
    hist[key].sort();
  }
  // keep the file's existing line endings so the diff shows only the changed weeks
  const eol = baselineRaw.includes('\r\n') ? '\r\n' : '\n';
  if (added || replaced) fs.writeFileSync(BASELINE, (JSON.stringify(baseline, null, 2) + '\n').replace(/\n/g, eol));
  console.log(`\n--write: ${added} week(s) added, ${replaced} updated in ${BASELINE}${added || replaced ? '' : ' (no change)'}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
