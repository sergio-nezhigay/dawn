// CI smoke gate: fail if any tracked template failed to render through `shopify theme dev`.
//
//   node docs/perf/ci-gate.js <outDir>
//
// Reads <outDir>/lh_summary.json (written by measure.js) and checks that every expected
// URL produced a numeric Lighthouse performance score. A missing / errored result means
// the page 500'd, hit a Liquid error, or failed to load -- that is the signal worth
// blocking a merge on. Absolute scores are NOT gated: on shared CI runners they swing
// 20+ points run-to-run on identical code (see docs/perf/backlog.md). The medians table
// is printed for humans to eyeball drift; field data in baseline.json is the real
// perf source of truth.
const fs = require('fs');
const path = require('path');

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: node docs/perf/ci-gate.js <outDir>');
  process.exit(2);
}

const REQUIRED = [
  'home_mobile',
  'home_desktop',
  'product_mobile',
  'product_desktop',
  'collection_mobile',
  'collection_desktop',
];

const summary = JSON.parse(fs.readFileSync(path.join(outDir, 'lh_summary.json'), 'utf8'));

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('url', 20), pad('median', 8), pad('status', 10), 'runs');

let failed = false;
for (const key of REQUIRED) {
  const r = summary[key];
  if (!r || r.error || typeof r.perf !== 'number') {
    console.log(pad(key, 20), pad('-', 8), pad('NO RESULT', 10), r && r.error ? r.error : 'missing');
    failed = true;
    continue;
  }
  console.log(pad(key, 20), pad((r.perf / 100).toFixed(2), 8), pad('rendered', 10), (r.all_perf || []).join(','));
}

if (failed) {
  console.error('\nSmoke gate FAILED — a tracked template did not render. See the run log above.');
  process.exit(1);
}
console.log('\nSmoke gate passed — all tracked templates rendered.');
