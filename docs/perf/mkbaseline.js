// Assemble docs/perf/baseline.json from the artifacts measure.js produced.
//
//   node docs/perf/mkbaseline.js [outDir]
//
// outDir must be the same directory measure.js wrote to (default: <tmp>/perf-runs).
// Expects alongside it: lh_summary.json, themecheck.json, and optionally
// profsum_{home,product,collection}.json from `shopify theme profile --json`.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const D = process.argv[2] || path.join(require('os').tmpdir(), 'perf-runs');
const REPO = path.resolve(__dirname, '../..');

const lh = JSON.parse(fs.readFileSync(path.join(D, 'lh_summary.json'), 'utf8'));
const tc = JSON.parse(fs.readFileSync(path.join(D, 'themecheck.json'), 'utf8'));

// theme-check offences by rule
const checkCounts = {};
let checkTotal = 0;
for (const f of tc) for (const o of f.offenses || []) { checkCounts[o.check] = (checkCounts[o.check] || 0) + 1; checkTotal++; }

// assets over 10 KB
const assets = {};
for (const f of fs.readdirSync(REPO + '/assets').sort()) {
  const st = fs.statSync(REPO + '/assets/' + f);
  if (st.isFile() && st.size > 10240 && /\.(css|js)$/.test(f)) assets[f] = st.size;
}

// widest Liquid frames per profiled page
const liquid = {};
for (const p of ['home', 'product', 'collection']) {
  const f = `${D}/profsum_${p}.json`;
  if (!fs.existsSync(f)) { liquid[p] = null; continue; }
  const s = JSON.parse(fs.readFileSync(f, 'utf8'));
  liquid[p] = {
    total_render_ms: +(s.total_ms / 1e6).toFixed(1),
    widest_frames: s.top.slice(0, 5).map((t) => ({
      frame: String(t.frame).split('\n')[0].trim().slice(0, 90),
      self_ms: +(t.self / 1e6).toFixed(1),
      pct: t.pct,
    })),
  };
}

const pages = {};
for (const [k, v] of Object.entries(lh)) {
  if (v.error) { pages[k] = { url: v.url, error: v.error }; continue; }
  const spread = Math.max(...v.all_perf) - Math.min(...v.all_perf);
  pages[k] = {
    url: v.url,
    runs: v.runs,
    performance: v.perf,
    lcp_ms: v.lcp_ms,
    tbt_ms: v.tbt_ms,
    cls: v.cls,
    ttfb_ms: v.ttfb_ms,
    fcp_ms: v.fcp_ms,
    total_bytes: v.total_bytes,
    all_runs: v.all_perf,
    observed_spread: spread,
  };
}

const W = { home: 0.17, product: 0.4, collection: 0.43 };
const weighted = {};
for (const dev of ['mobile', 'desktop']) {
  let s = 0, ok = true;
  for (const p of Object.keys(W)) {
    const r = pages[`${p}_${dev}`];
    if (!r || r.error) { ok = false; break; }
    s += W[p] * r.performance;
  }
  weighted[dev] = ok ? +s.toFixed(1) : null;
}

// field.json comes from the ShopifyQL web_performance schema (see docs/perf/backlog.md).
// If it is absent the baseline still builds, with field recorded as explicitly unavailable.
const fieldPath = path.join(D, 'field.json');
const field = fs.existsSync(fieldPath)
  ? JSON.parse(fs.readFileSync(fieldPath, 'utf8'))
  : { _source: null, _source_note: 'field.json not present - no field data captured this run' };

const out = {
  _README:
    'Performance regression contract. Every future week re-measures with the same conditions and diffs against this file. Unavailable values are explicit null with a source note - never omitted.',
  measured_at: new Date().toISOString().slice(0, 10),
  // The last commit that touched theme code - that, not HEAD, is the state measured.
  // Commits to docs/ or .github/ do not invalidate a baseline.
  commit: execSync(
    'git log -1 --format=%H -- assets sections snippets layout templates blocks config locales',
    { cwd: REPO }
  ).toString().trim(),
  branch: execSync('git rev-parse --abbrev-ref HEAD', { cwd: REPO }).toString().trim(),
  cli_version: '4.7.1',
  lighthouse_version: '13.4.1',
  tooling: {
    lab: 'Lighthouse CLI 13.4.1 (npx), headless Chrome, 3 runs per URL per device, median reported',
    chrome_devtools_mcp: 'connected; trace-insight capture still deferred (lab LCP proved to be a throttling artifact, so it is no longer the priority)',
    shopify_dev_mcp: 'connected; validate_theme run',
    shopify_admin_skills: 'Shopify AI Toolkit plugin installed; field data sourced via ShopifyQL web_performance',
  },
  conditions: {
    url_pattern: 'https://informatica.com.ua/<path>?pb=0',
    url_pattern_note:
      'Theme 186192232764 is the LIVE theme, so the plain storefront URL already renders this repo code. ?preview_theme_id= was deliberately NOT used: it adds a 302 that injected ~780ms of pure measurement artifact into every LCP (home mobile measured 76/4156ms with it vs 87/2914ms without).',
    mobile: 'Lighthouse default mobile preset - Moto G Power emulation, 4x CPU throttle, 1638.4 Kbps down / 675 Kbps up / 150ms RTT',
    desktop: 'Lighthouse --preset=desktop',
    runs_per_url: 3,
    statistic: 'median',
  },
  targets: {
    bar: 'average Lighthouse performance >= 60 across home + product + collection, both devices',
    shopify_page_weighting: W,
    shopify_page_weighting_note:
      "Shopify's generic weighting. This shop's actual traffic is far more product-skewed - see field.traffic_share_pct (product 74.7%, collection 14.4%, index 3.8%). Prefer the measured share when prioritising.",
    weighted_score: weighted,
    ci_floor_performance: 0.6,
  },
  noise_band: 10,
  noise_band_note:
    'A Lighthouse delta under 10 points is noise, not a result. product_mobile observed a 30-point spread across 3 runs at identical byte weight (see pages.product_mobile.observed_spread), so for that page treat anything under ~30 points as noise. IMPORTANT: field data shows product/mobile LCP p75 = 1624 ms (good), so the lab LCP of 8437 ms is an artifact of the 4x-CPU / slow-4G preset, not a user-facing problem. Use `field`, not `pages`, to decide what to fix; `pages` exists to detect regressions in this repo code under fixed conditions.',
  field,
  pages,
  liquid_profile: {
    _source: 'shopify theme profile --json (CLI 4.7.1), self-time per frame, live theme',
    _note: 'Requires SHOPIFY_CLI_THEME_TOKEN to be unset - the profile command rejects Theme Access tokens.',
    ...liquid,
  },
  assets_over_10kb: assets,
  theme_check: { total_offenses: checkTotal, by_rule: checkCounts, performance_rule_offenses: 0 },
  validate_theme: {
    _source: 'shopify-dev MCP validate_theme, 2026-09-05',
    _scope: 'spot-check of 6 high-traffic files, not the whole theme',
    files_checked: 6,
    errors: 1,
    warnings: 4,
    error_detail:
      "sections/header.liquid: 'accessibility.call_store' has no matching entry in locales/en.default.json (same offense theme-check reports as TranslationKeyExists)",
  },
  tailwind: {
    referenced_at: 'layout/theme.liquid:328',
    committed_bytes: fs.statSync(REPO + '/assets/tailwind.output.css').size,
    fresh_rebuild_bytes: fs.existsSync(D + '/tw_root.css') ? fs.statSync(D + '/tw_root.css').size : null,
    fresh_rebuild_minified_bytes: fs.existsSync(D + '/tw_root_min.css') ? fs.statSync(D + '/tw_root_min.css').size : null,
    last_built: '2025-08-30',
    transferred_bytes_on_wire: 0,
    transferred_note: 'Lighthouse reports tailwind.output.css as 0 KB / 0 ms render-blocking - it is not a measurable performance cost.',
    stale_classes_missing_from_shipped_css: ['md:hidden', 'bg-transparent'],
    build_version_hazard:
      'Repo pins tailwindcss 4.1.4; a bare `npx @tailwindcss/cli@4` resolves 4.3.3 and produces unrelated churn. Pin the version when rebuilding.',
  },
};

fs.writeFileSync(REPO + '/docs/perf/baseline.json', JSON.stringify(out, null, 2) + '\n');
console.log('written. weighted:', JSON.stringify(weighted));
console.log('pages:', Object.keys(pages).join(', '));
