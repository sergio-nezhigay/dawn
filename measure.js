// Usage: node measure.js <prefix>   (e.g. node measure.js stage-0-baseline)
const { execSync } = require('child_process');
const fs = require('fs');

const URL = 'http://127.0.0.1:9292/products/perekhodnik-audio-optikakoaksial-to-2rca-35mm-blok-pitaniy';
const RUNS = 5;
const PREFIX = process.argv[2] || 'measure';
const METRICS = ['first-contentful-paint','largest-contentful-paint','cumulative-layout-shift','total-blocking-time','interactive'];

const median = arr => { const s=[...arr].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; };

const results = [];
for (let i = 0; i < RUNS; i++) {
  const out = `${PREFIX}-run${i+1}.json`;
  console.log(`\nRun ${i+1}/${RUNS}...`);
  try {
    execSync(`npx lighthouse "${URL}" --output=json --output-path=${out} --only-categories=performance --chrome-flags="--headless --no-sandbox"`, { stdio: 'inherit' });
  } catch (e) {
    // Lighthouse exits non-zero on Windows due to temp dir cleanup (EPERM).
    // The JSON output is written before cleanup, so continue if the file exists.
    if (!fs.existsSync(out)) throw e;
    console.log('(Ignoring non-fatal Lighthouse exit error — output file exists)');
  }
  const d = JSON.parse(fs.readFileSync(out, 'utf8'));
  const row = { score: Math.round(d.categories.performance.score * 100) };
  METRICS.forEach(k => { row[k] = d.audits[k]?.numericValue ?? null; });
  results.push(row);
}

const med = { score: median(results.map(r => r.score)) };
METRICS.forEach(k => { med[k] = median(results.map(r => r[k])); });

console.log('\n=== MEDIAN ===');
console.log(`Score: ${med.score}`);
console.log(`FCP:   ${(med['first-contentful-paint']/1000).toFixed(2)}s`);
console.log(`LCP:   ${(med['largest-contentful-paint']/1000).toFixed(2)}s  (target <2.5s)`);
console.log(`CLS:   ${med['cumulative-layout-shift']?.toFixed(3)}    (target <0.1)`);
console.log(`TBT:   ${Math.round(med['total-blocking-time'])}ms         (target <200ms)`);

fs.writeFileSync(`${PREFIX}-median.json`, JSON.stringify(med, null, 2));
console.log(`Saved → ${PREFIX}-median.json`);
