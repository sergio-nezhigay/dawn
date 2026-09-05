// Fail CI when a median Lighthouse performance score drops below its per-URL floor.
//
//   node docs/perf/ci-gate.js <outDir>
//
// Reads <outDir>/lh_summary.json (written by measure.js) and docs/perf/ci-floors.json.
// Exits 1 on any breach (or missing/errored result), 0 otherwise.
const fs = require('fs');
const path = require('path');

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: node docs/perf/ci-gate.js <outDir>');
  process.exit(2);
}

const summary = JSON.parse(fs.readFileSync(path.join(outDir, 'lh_summary.json'), 'utf8'));
const floors = JSON.parse(fs.readFileSync(path.join(__dirname, 'ci-floors.json'), 'utf8'));

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('url', 20), pad('median', 8), pad('floor', 7), pad('status', 12), 'runs');

let failed = false;
for (const [key, floor] of Object.entries(floors)) {
  if (key.startsWith('_')) continue;
  const r = summary[key];
  if (!r || r.error || typeof r.perf !== 'number') {
    console.log(pad(key, 20), pad('-', 8), pad(floor, 7), pad('NO RESULT', 12), r && r.error ? r.error : '');
    failed = true;
    continue;
  }
  const score = r.perf / 100;
  const ok = score >= floor;
  console.log(
    pad(key, 20),
    pad(score.toFixed(2), 8),
    pad(floor, 7),
    pad(ok ? 'ok' : 'BELOW FLOOR', 12),
    (r.all_perf || []).join(',')
  );
  if (!ok) failed = true;
}

if (failed) {
  console.error('\nLighthouse gate FAILED');
  process.exit(1);
}
console.log('\nLighthouse gate passed');
