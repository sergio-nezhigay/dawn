// Compare product-page performance across themes on the same store.
// Method and rationale: docs/perf/dawn-compare/METHOD.md
//
//   npx -y lighthouse@13 --version                       # once: puts Lighthouse + puppeteer-core in the npx cache
//   node docs/perf/compare-themes.mjs load        <out>  # variants x products x {mobile,desktop} x PERF_RUNS page loads
//   node docs/perf/compare-themes.mjs interaction <out>  # add-to-cart timespan on P3, mobile, PERF_RUNS_INTERACTION
//   node docs/perf/compare-themes.mjs profile     <out>  # shopify theme profile (Liquid render), PERF_RUNS_PROFILE
//   node docs/perf/compare-themes.mjs summarize   <out>  # -> <out>/results.json (every run + per-cell stats + ladder deltas)
//
// Env: PERF_VARIANTS="R0=<themeId>,R1=<themeId>,..." (ladder order), PERF_RUNS (default 7),
//      PERF_RUNS_INTERACTION (5), PERF_RUNS_PROFILE (5), CHROME_PATH, LH_NODE_MODULES.
// Each mode appends one JSON line per run and skips runs already recorded, so an interrupted
// run resumes where it stopped.
//
// Memory: the in-process Lighthouse API leaks ~34 MB per run, so a 168-run load pass exhausts the
// default ~4 GB heap after ~120 runs and the process dies without a failure record. Run load with
// `node --max-old-space-size=6144 …`, or simply re-run the same command — it resumes.
import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const [MODE, OUT_ARG] = process.argv.slice(2);
const OUT = path.resolve(OUT_ARG || 'perf-compare');
fs.mkdirSync(OUT, { recursive: true });

const ORIGIN = 'https://informatica.com.ua';
const STORE_HOST = 'informatica.com.ua';
const SHOP = 'c2da09-15.myshopify.com';
const PRODUCTS = {
  P1: '/products/kvr32s22d816',
  P2: '/products/ustroystvo-videozakhvata-easycap-usb-20',
  P3: '/products/perekhodnik-audio-optikakoaksial-to-2rca-35mm-blok-pitaniy',
};
const VARIANTS = Object.fromEntries(
  (process.env.PERF_VARIANTS || 'R0=188293415228,R3=188294955324').split(',').map((p) => p.split('='))
);
const RUNS = { load: +(process.env.PERF_RUNS || 7), interaction: +(process.env.PERF_RUNS_INTERACTION || 5), profile: +(process.env.PERF_RUNS_PROFILE || 5) };
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ATC = 'button[id^="ProductSubmitButton-"]';
const CART_OPEN = '#cart-notification.active, cart-drawer.active';

const log = (...a) => process.stderr.write(a.join(' ') + '\n');
const jsonl = (name) => path.join(OUT, `${name}.jsonl`);
const readJsonl = (name) =>
  fs.existsSync(jsonl(name)) ? fs.readFileSync(jsonl(name), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const append = (name, obj) => fs.appendFileSync(jsonl(name), JSON.stringify(obj) + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Lighthouse + puppeteer-core from the npx cache ----------
function findNodeModules() {
  if (process.env.LH_NODE_MODULES) return process.env.LH_NODE_MODULES;
  const npx = path.join(execSync('npm config get cache').toString().trim(), '_npx');
  for (const d of fs.existsSync(npx) ? fs.readdirSync(npx) : []) {
    const nm = path.join(npx, d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'lighthouse/package.json')) && fs.existsSync(path.join(nm, 'puppeteer-core/package.json'))) return nm;
  }
  throw new Error('Lighthouse not found in the npx cache. Run `npx -y lighthouse@13 --version` first, or set LH_NODE_MODULES.');
}

async function loadTools() {
  const nm = findNodeModules();
  const require = createRequire(path.join(nm, 'lighthouse/package.json'));
  const lh = await import(pathToFileURL(path.join(nm, 'lighthouse/core/index.js')).href);
  const { default: desktopConfig } = await import(pathToFileURL(path.join(nm, 'lighthouse/core/config/desktop-config.js')).href);
  return { puppeteer: require('puppeteer-core'), lighthouse: lh.default, startFlow: lh.startFlow, desktopConfig, lhVersion: require('lighthouse/package.json').version };
}

// ---------- theme selection: domain-scoped preview cookie, no redirect ----------
async function previewCookie(themeId) {
  const res = await fetch(`${ORIGIN}/?preview_theme_id=${themeId}&pb=0`, { redirect: 'manual' });
  const c = res.headers.getSetCookie().find((s) => s.startsWith('_shopify_essential='));
  if (!c) throw new Error(`no _shopify_essential cookie for theme ${themeId} (status ${res.status})`);
  return { name: '_shopify_essential', value: c.split(';')[0].slice('_shopify_essential='.length), domain: STORE_HOST, path: '/', secure: true, httpOnly: true };
}

async function openBrowser(puppeteer, themeId) {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true, defaultViewport: null,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  const cookie = await previewCookie(themeId);
  if (typeof browser.setCookie === 'function') await browser.setCookie(cookie);
  else await page.setCookie(cookie);
  return { browser, page };
}

async function assertTheme(page, themeId) {
  const id = await page.evaluate(() => (window.Shopify && Shopify.theme ? String(Shopify.theme.id) : null)).catch(() => null);
  if (id !== String(themeId)) throw new Error(`rendered theme ${id}, expected ${themeId}`);
}

// ---------- request ownership ----------
function owner(u, docUrl) {
  if (u.startsWith('data:') || u.startsWith('blob:')) return 'inline';
  // bootup-time / long-tasks attribute some work to non-URLs ("Unattributable", "Other").
  if (!URL.canParse(u)) return 'unattributable';
  const { hostname: h, pathname: p } = new URL(u);
  if (u === docUrl) return 'document';
  if (h.endsWith('judge.me') || p.includes('judge-me')) return 'app: judge.me';
  if (h.endsWith('clarity.ms') || p.includes('microsoft-clarity')) return 'app: clarity';
  if (p.includes('shop-chat-agent')) return 'app: shop chat';
  if (/googletagmanager|google-analytics|analytics\.google|doubleclick|(^|\.)google\.[a-z.]+$/.test(h)) return 'google tag';
  if (p.includes('/cdn/shop/t/')) return 'theme assets';
  if (/\/cdn\/shop\/(files|products|collections)\//.test(p)) return 'images';
  if (p.includes('/checkouts/') || p.includes('checkout-web')) return 'platform: checkout prefetch';
  if (p.includes('/cdn/wpm/') || p.includes('web-pixels')) return 'platform: web pixels';
  if (h.endsWith('shopifysvc.com')) return 'platform: telemetry';
  if (h === 'shop.app' || h.endsWith('.shop.app')) return 'platform: shop.app';
  if (h === 'cdn.shopify.com' || p.startsWith('/cdn/shopifycloud/')) return 'platform: shopify cdn';
  if (h === 'fonts.shopifycdn.com') return 'fonts';
  if (h === STORE_HOST) return 'store: other same-origin';
  return `other: ${h}`;
}

const num = (a, k) => (a[k] && typeof a[k].numericValue === 'number' ? a[k].numericValue : null);

function sumBy(items, keyFn, valFn) {
  const out = {};
  for (const it of items) {
    const k = keyFn(it);
    out[k] = +((out[k] || 0) + valFn(it)).toFixed(1);
  }
  return out;
}

function extractLoad(lhr, docUrl) {
  const a = lhr.audits;
  const reqs = a['network-requests'].details.items;
  const doc = reqs.find((r) => r.resourceType === 'Document');
  const failedOwned = reqs.filter((r) => (r === doc || r.url.includes('/cdn/shop/t/')) && (r.statusCode >= 400 || r.failed));
  const byOwner = {};
  for (const r of reqs) {
    const k = owner(r.url, doc && doc.url);
    byOwner[k] ??= { n: 0, kb: 0 };
    byOwner[k].n++;
    byOwner[k].kb = +(byOwner[k].kb + (r.transferSize || 0) / 1024).toFixed(1);
  }
  const shopifyCdnPrefixes = sumBy(
    reqs.filter((r) => owner(r.url, doc && doc.url) === 'platform: shopify cdn'),
    (r) => new URL(r.url).pathname.split('/').slice(0, 4).join('/'),
    () => 1
  );
  const items = (k) => (a[k] && a[k].details && a[k].details.items) || [];
  return {
    redirects: items('redirects').length,
    doc_status: doc ? doc.statusCode : null,
    failed_owned: failedOwned.map((r) => `${r.statusCode} ${r.url}`),
    score: Math.round((lhr.categories.performance.score || 0) * 100),
    lcp_ms: Math.round(num(a, 'largest-contentful-paint')),
    fcp_ms: Math.round(num(a, 'first-contentful-paint')),
    tbt_ms: Math.round(num(a, 'total-blocking-time')),
    cls: +(num(a, 'cumulative-layout-shift') || 0).toFixed(4),
    si_ms: Math.round(num(a, 'speed-index')),
    ttfb_ms: Math.round(num(a, 'server-response-time')),
    total_kb: Math.round(num(a, 'total-byte-weight') / 1024),
    requests: reqs.length,
    html_kb: doc ? +((doc.resourceSize || 0) / 1024).toFixed(1) : null,
    dom_size: num(a, 'dom-size'),
    mainthread_ms: Math.round(num(a, 'mainthread-work-breakdown')),
    script_ms_by_owner: sumBy(items('bootup-time'), (it) => owner(it.url, doc && doc.url), (it) => it.total || 0),
    long_tasks_ms_by_owner: sumBy(items('long-tasks'), (it) => owner(it.url, doc && doc.url), (it) => it.duration || 0),
    by_owner: byOwner,
    shopify_cdn_prefixes: shopifyCdnPrefixes,
  };
}

// ---------- run scheduling: interleaved, rotated variant order per run ----------
function schedule(mode, products, formFactors) {
  const names = Object.keys(VARIANTS);
  const plan = [];
  for (const ff of formFactors)
    for (const product of products)
      for (let run = 1; run <= RUNS[mode]; run++)
        for (let i = 0; i < names.length; i++) {
          const variant = names[(i + run - 1) % names.length];
          plan.push({ mode, variant, theme_id: VARIANTS[variant], product, ff, run });
        }
  return plan;
}
const keyOf = (r) => [r.mode, r.variant, r.product, r.ff, r.run].join('|');

async function runPlan(mode, plan, once) {
  const done = new Set(readJsonl(mode).map(keyOf));
  const todo = plan.filter((p) => !done.has(keyOf(p)));
  log(`${mode}: ${plan.length} runs planned, ${plan.length - todo.length} already done, ${todo.length} to go`);
  const t0 = Date.now();
  for (const [i, job] of todo.entries()) {
    let lastErr;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const metrics = await once(job);
        append(mode, { ...job, at: new Date().toISOString(), attempt, ...metrics });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        append('failures', { ...job, attempt, at: new Date().toISOString(), error: String(e.message || e).slice(0, 400) });
      }
    }
    const eta = Math.round(((Date.now() - t0) / (i + 1)) * (todo.length - i - 1) / 60000);
    log(`${lastErr ? 'FAILED' : 'ok'} ${keyOf(job)} (${i + 1}/${todo.length}, ~${eta} min left)${lastErr ? ' ' + lastErr.message : ''}`);
  }
}

// ---------- modes ----------
async function modeLoad() {
  const tools = await loadTools();
  await runPlan('load', schedule('load', Object.keys(PRODUCTS), ['desktop', 'mobile']), async (job) => {
    const { browser, page } = await openBrowser(tools.puppeteer, job.theme_id);
    try {
      const url = `${ORIGIN}${PRODUCTS[job.product]}?pb=0`;
      const config = job.ff === 'desktop' ? tools.desktopConfig : undefined;
      const { lhr } = await tools.lighthouse(url, { output: 'json', onlyCategories: ['performance'], logLevel: 'error', maxWaitForLoad: 60000 }, config, page);
      if (lhr.runtimeError) throw new Error(`runtimeError ${lhr.runtimeError.code}`);
      await assertTheme(page, job.theme_id);
      const m = extractLoad(lhr, url);
      m.dom_size = await page.evaluate(() => document.getElementsByTagName('*').length); // Lighthouse 13 dom-size has no numericValue
      if (m.redirects !== 0) throw new Error(`redirects=${m.redirects}`);
      if (!(m.doc_status >= 200 && m.doc_status < 300)) throw new Error(`document status ${m.doc_status}`);
      if (m.failed_owned.length) throw new Error(`theme requests failed: ${m.failed_owned.join(', ')}`);
      return { lighthouse: tools.lhVersion, ...m };
    } finally {
      await browser.close().catch(() => {});
    }
  });
}

async function modeInteraction() {
  const tools = await loadTools();
  await runPlan('interaction', schedule('interaction', ['P3'], ['mobile']), async (job) => {
    const { browser, page } = await openBrowser(tools.puppeteer, job.theme_id);
    try {
      const url = `${ORIGIN}${PRODUCTS[job.product]}?pb=0`;
      const flow = await tools.startFlow(page, { name: keyOf(job), flags: { logLevel: 'error', throttlingMethod: 'devtools' } });
      await flow.navigate(url, { name: 'load' });
      await assertTheme(page, job.theme_id);
      await sleep(5000); // let deferred theme + app scripts settle before interacting
      await page.$eval(ATC, (el) => el.scrollIntoView({ block: 'center' }));
      await sleep(500);
      await flow.startTimespan({ name: 'add-to-cart' });
      const t0 = Date.now();
      await page.click(ATC);
      const opened = await page.waitForSelector(CART_OPEN, { timeout: 15000 }).then(() => true).catch(() => false);
      const openMs = Date.now() - t0;
      await sleep(2000);
      await flow.endTimespan();
      if (!opened) throw new Error('cart did not open within 15 s');
      const { steps } = await flow.createFlowResult();
      const a = steps[1].lhr.audits;
      const items = (k) => (a[k] && a[k].details && a[k].details.items) || [];
      return {
        lighthouse: tools.lhVersion,
        cart_ui: await page.$eval(CART_OPEN, (el) => el.tagName.toLowerCase()),
        cart_open_wall_ms: openMs,
        inp_ms: num(a, 'interaction-to-next-paint'),
        tbt_ms: Math.round(num(a, 'total-blocking-time')),
        cls: +(num(a, 'cumulative-layout-shift') || 0).toFixed(4),
        long_tasks_ms_by_owner: sumBy(items('long-tasks'), (it) => owner(it.url, steps[0].lhr.finalDisplayedUrl), (it) => it.duration || 0),
        script_ms_by_owner: sumBy(items('bootup-time'), (it) => owner(it.url, steps[0].lhr.finalDisplayedUrl), (it) => it.total || 0),
        requests_during: items('network-requests').length,
      };
    } finally {
      await browser.close().catch(() => {});
    }
  });
}

function liquidProfile(themeId, urlPath) {
  const env = { ...process.env };
  delete env.SHOPIFY_CLI_THEME_TOKEN; // `theme profile` rejects Theme Access tokens
  const r = spawnSync('shopify', ['theme', 'profile', '--store', SHOP, '--theme', themeId, '--url', urlPath, '--json'], {
    shell: true, env, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 180000, windowsHide: true,
  });
  const out = r.stdout || '';
  const i = out.indexOf('{"$schema"');
  if (i < 0) throw new Error('no profile JSON: ' + (r.stderr || out).slice(-300));
  const prof = JSON.parse(out.slice(i));
  const p = prof.profiles[0];
  const frames = prof.shared.frames;
  const self = new Map();
  const stack = [];
  for (const ev of p.events) {
    if (ev.type === 'O') stack.push({ frame: ev.frame, at: ev.at, child: 0 });
    else {
      const open = stack.pop();
      const dur = ev.at - open.at;
      self.set(open.frame, (self.get(open.frame) || 0) + dur - open.child);
      if (stack.length) stack[stack.length - 1].child += dur;
    }
  }
  const total = p.endValue - p.startValue;
  const top = [...self.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([f, ns]) => ({
    frame: `${String(frames[f].name).split('\n')[0].slice(0, 80)}${frames[f].file ? ` (${frames[f].file})` : ''}`,
    self_ms: +(ns / 1e6).toFixed(1),
    pct: +((ns / total) * 100).toFixed(1),
  }));
  return { total_render_ms: +(total / 1e6).toFixed(1), widest_frames: top };
}

async function modeProfile() {
  await runPlan('profile', schedule('profile', Object.keys(PRODUCTS), ['server']), async (job) => liquidProfile(job.theme_id, PRODUCTS[job.product]));
}

// ---------- summarize ----------
function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
function stats(values) {
  const v = values.filter((x) => typeof x === 'number').sort((a, b) => a - b);
  if (!v.length) return null;
  const r = (x) => +x.toFixed(3);
  return { n: v.length, median: r(quantile(v, 0.5)), min: v[0], max: v[v.length - 1], iqr: r(quantile(v, 0.75) - quantile(v, 0.25)) };
}

function cells(rows, metricKeys, groupKeys) {
  const groups = {};
  for (const row of rows) (groups[groupKeys.map((k) => row[k]).join('|')] ??= []).push(row);
  const out = {};
  for (const [g, rs] of Object.entries(groups)) {
    out[g] = {};
    for (const m of metricKeys) out[g][m] = stats(rs.map((r) => r[m]));
    for (const nested of ['by_owner', 'script_ms_by_owner', 'long_tasks_ms_by_owner']) {
      if (!rs[0][nested]) continue;
      const owners = new Set(rs.flatMap((r) => Object.keys(r[nested])));
      out[g][nested] = {};
      for (const o of owners) {
        out[g][nested][o] = nested === 'by_owner'
          ? { n: stats(rs.map((r) => (r.by_owner[o] ? r.by_owner[o].n : 0))).median, kb: stats(rs.map((r) => (r.by_owner[o] ? r.by_owner[o].kb : 0))).median }
          : stats(rs.map((r) => r[nested][o] || 0)).median;
      }
    }
  }
  return out;
}

function ladder(cellMap, metricKeys, restKeyOf) {
  const names = Object.keys(VARIANTS);
  const out = {};
  for (const g of Object.keys(cellMap)) {
    const [variant, ...rest] = g.split('|');
    if (variant !== names[0]) continue;
    const rk = rest.join('|');
    out[rk] = {};
    for (let i = 1; i < names.length; i++) {
      const a = cellMap[[names[i - 1], ...rest].join('|')];
      const b = cellMap[[names[i], ...rest].join('|')];
      if (!a || !b) continue;
      const step = `${names[i]}-${names[i - 1]}`;
      out[rk][step] = {};
      for (const m of metricKeys) {
        if (!a[m] || !b[m]) continue;
        const delta = +(b[m].median - a[m].median).toFixed(3);
        out[rk][step][m] = { delta, beyond_iqr: Math.abs(delta) > Math.max(a[m].iqr, b[m].iqr) };
      }
    }
  }
  return out;
}

function modeSummarize() {
  const load = readJsonl('load');
  const interaction = readJsonl('interaction');
  const profile = readJsonl('profile');
  const loadMetrics = ['score', 'lcp_ms', 'fcp_ms', 'tbt_ms', 'cls', 'si_ms', 'ttfb_ms', 'total_kb', 'requests', 'html_kb', 'dom_size', 'mainthread_ms'];
  const interactionMetrics = ['inp_ms', 'tbt_ms', 'cls', 'cart_open_wall_ms', 'requests_during'];
  const loadCells = cells(load, loadMetrics, ['variant', 'product', 'ff']);
  const interactionCells = cells(interaction, interactionMetrics, ['variant', 'product', 'ff']);
  const profileCells = cells(profile, ['total_render_ms'], ['variant', 'product', 'ff']);
  const result = {
    _method: 'docs/perf/dawn-compare/METHOD.md',
    generated_at: new Date().toISOString(),
    variants: VARIANTS,
    products: PRODUCTS,
    statistic: 'median per cell; iqr = interquartile range; ladder beyond_iqr = |delta of medians| > larger IQR of the two cells',
    load: { cells: loadCells, ladder: ladder(loadCells, loadMetrics) },
    interaction: { cells: interactionCells, ladder: ladder(interactionCells, interactionMetrics) },
    profile: { cells: profileCells, ladder: ladder(profileCells, ['total_render_ms']) },
    failures: readJsonl('failures'),
    runs: { load, interaction, profile },
  };
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(result, null, 2) + '\n');
  log(`results.json: ${load.length} load, ${interaction.length} interaction, ${profile.length} profile runs, ${result.failures.length} failed attempts`);
}

const MODES = { load: modeLoad, interaction: modeInteraction, profile: modeProfile, summarize: modeSummarize };
if (!MODES[MODE]) {
  log(`usage: node docs/perf/compare-themes.mjs <${Object.keys(MODES).join('|')}> <outDir>`);
  process.exit(1);
}
await MODES[MODE]();
