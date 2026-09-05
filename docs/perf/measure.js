// Run Lighthouse 3x per tracked URL x form factor and take medians.
//
//   npx -y lighthouse@13 --version     # once, to populate the npx cache
//   node docs/perf/measure.js [outDir] # writes lh_*.json + lh_summary.json
//
// Then `node docs/perf/mkbaseline.js [outDir]` turns those into baseline.json.
const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'perf-runs');
fs.mkdirSync(OUT, { recursive: true });

// Resolve the Lighthouse CLI entry from the npx cache. Spawning `npx.cmd` directly is not an
// option: Node 24 refuses to spawn .cmd without a shell, and a shell would read the '&' in
// the query string as a command separator.
function findLhCli() {
  if (process.env.LH_CLI) return process.env.LH_CLI;
  const root = execSync('npm config get cache').toString().trim();
  const npx = path.join(root, '_npx');
  for (const d of fs.existsSync(npx) ? fs.readdirSync(npx) : []) {
    const p = path.join(npx, d, 'node_modules/lighthouse/cli/index.js');
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Lighthouse CLI not found. Run `npx -y lighthouse@13 --version` first, or set LH_CLI.');
}
const LH_CLI = findLhCli();

// Theme 186192232764 is the LIVE theme, so the plain storefront URL already renders this
// repo's theme code. Using ?preview_theme_id= instead adds a 302 that put ~780ms of
// pure measurement artifact into every LCP, so it is deliberately not used here.
//
// Base URL and page paths are overridable via env so CI can point Lighthouse at a local
// `shopify theme dev` server (branch code) instead of production. Defaults reproduce the
// production baseline measurement in baseline.json.
const BASE = process.env.PERF_BASE_URL || 'https://informatica.com.ua';
const PRODUCT_PATH =
  process.env.PERF_PRODUCT_PATH ||
  '/products/адаптер-живлення-магнітний-type-c-magsafe-3-pd-100-вт-для-apple-macbook';
const COLLECTION_PATH = process.env.PERF_COLLECTION_PATH || '/collections/hdmi_cable';
const PREVIEW = (p) => `${BASE}${p}${p.includes('?') ? '&' : '?'}pb=0`;

const URLS = {
  home: PREVIEW('/'),
  product: PREVIEW(PRODUCT_PATH),
  collection: PREVIEW(COLLECTION_PATH),
};

const RUNS = 3;
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

function runOnce(url, formFactor, tag) {
  const out = path.join(OUT, `lh_${tag}.json`);
  try { fs.unlinkSync(out); } catch {}
  const args = [
    LH_CLI, url,
    '--output=json', `--output-path=${out}`,
    '--only-categories=performance',
    '--quiet',
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage',
    '--max-wait-for-load=60000',
  ];
  if (formFactor === 'desktop') args.push('--preset=desktop');
  // Spawn the CLI's JS entry with node directly: shell:false keeps '&' in the URL from
  // being read as a cmd separator, and Node 24 refuses to spawn .cmd without a shell.
  const r = spawnSync(process.execPath, args, {
    stdio: ['ignore', 'ignore', 'pipe'], timeout: 240000, cwd: OUT, windowsHide: true,
  });
  // chrome-launcher throws EPERM cleaning its temp dir on Windows AFTER writing results,
  // so trust the output file rather than the exit code.
  if (!fs.existsSync(out)) {
    throw new Error('no output: ' + String(r.stderr).slice(-300));
  }
  const j = JSON.parse(fs.readFileSync(out, 'utf8'));
  if (j.runtimeError) throw new Error('runtimeError: ' + j.runtimeError.code);
  const a = j.audits;
  const num = (k) => (a[k] && typeof a[k].numericValue === 'number' ? a[k].numericValue : null);
  return {
    perf: Math.round(j.categories.performance.score * 100),
    lcp: Math.round(num('largest-contentful-paint')),
    tbt: Math.round(num('total-blocking-time')),
    cls: +num('cumulative-layout-shift').toFixed(4),
    ttfb: Math.round(num('server-response-time')),
    bytes: Math.round(num('total-byte-weight')),
    fcp: Math.round(num('first-contentful-paint')),
  };
}

(async () => {
  const results = {};
  for (const [name, url] of Object.entries(URLS)) {
    for (const ff of ['mobile', 'desktop']) {
      const runs = [];
      for (let i = 1; i <= RUNS; i++) {
        const tag = `${name}_${ff}_${i}`;
        process.stderr.write(`running ${tag}\n`);
        try { runs.push(runOnce(url, ff, tag)); }
        catch (e) { process.stderr.write(`FAILED ${tag}: ${String(e.message).slice(0, 300)}\n`); }
      }
      if (!runs.length) { results[`${name}_${ff}`] = { url, error: 'all runs failed' }; }
      else {
        results[`${name}_${ff}`] = {
          url, runs: runs.length,
          perf: median(runs.map((r) => r.perf)),
          lcp_ms: median(runs.map((r) => r.lcp)),
          tbt_ms: median(runs.map((r) => r.tbt)),
          cls: median(runs.map((r) => r.cls)),
          ttfb_ms: median(runs.map((r) => r.ttfb)),
          fcp_ms: median(runs.map((r) => r.fcp)),
          total_bytes: median(runs.map((r) => r.bytes)),
          all_perf: runs.map((r) => r.perf),
        };
      }
      fs.writeFileSync(path.join(OUT, 'lh_summary.json'), JSON.stringify(results, null, 2));
      process.stderr.write(JSON.stringify(results[`${name}_${ff}`]) + '\n');
    }
  }
  console.log(JSON.stringify(results, null, 2));
})();
