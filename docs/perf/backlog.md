# Performance backlog — informatica.com.ua

**Baseline date:** 2026-09-05 · **Theme code:** `6d9f677f` · **Branch:** `perf/baseline-and-guard`
**Source of truth for all numbers:** [`baseline.json`](./baseline.json). This file explains
them; that file is what CI and future weeks diff against.

No theme code was changed in this session. Only `docs/perf/*` and `.github/workflows/ci.yml`.

---

## Headline: real users are fine. Fix INP, not LCP.

Field data (Shopify's own RUM, 90 days, 7 997 page loads) says **every Core Web Vital is
"good" except INP on mobile**:

| Template | Device | LCP p75 | INP p75 | CLS p75 | Loads |
|---|---|---|---|---|---|
| **product** | mobile | 1624 ms ✅ | 160 ms ✅ | 0.00 ✅ | 3199 |
| product | desktop | 1772 ms ✅ | 48 ms ✅ | 0.03 ✅ | 2773 |
| **collection** | mobile | 1599 ms ✅ | 174 ms ✅ | 0.00 ✅ | 644 |
| collection | desktop | 1820 ms ✅ | 48 ms ✅ | 0.03 ✅ | 508 |
| index | mobile | 1135 ms ✅ | **272 ms ⚠️** | 0.00 ✅ | 106 |
| index | desktop | 1156 ms ✅ | 64 ms ✅ | 0.03 ✅ | 200 |

Thresholds: LCP ≤ 2500 ms, INP ≤ 200 ms, CLS ≤ 0.1.

**This overturns the lab-driven conclusion.** Lighthouse measured product/mobile LCP at
**8437 ms**; the field says **1624 ms**. The lab number is an artifact of Lighthouse's mobile
preset (4× CPU throttle, 1.6 Mbps), which is far harsher than this store's actual traffic.
Chasing it would have been wasted work on the highest-traffic template.

**Use `field` to decide what to fix. Use `pages` (lab) only to detect regressions in this
repo's code under fixed conditions.** That distinction is now recorded in
`baseline.json.noise_band_note`.

### Traffic is far more product-skewed than Shopify's generic weighting

| Template | Real share | Shopify's generic weight |
|---|---|---|
| **product** | **74.7%** | 40% |
| collection | 14.4% | 43% |
| index | 3.8% | 17% |
| search | 3.6% | — |
| page / policy / article / cart / 404 | 3.5% | — |

Device split: **52% mobile / 48% desktop**. Anything that only helps collection is worth
roughly a fifth of the same win on product.

---

## Data sources — what actually worked

| Source | Status |
|---|---|
| **Field: ShopifyQL `web_performance`** | ✅ **Used.** p75 LCP/INP/CLS + FCP by `page_type` × `device_type`, 90 days. This is the right field source for a Shopify theme. |
| **Lab: Lighthouse CLI 13.4.1** | ✅ **Used.** 3 runs × 3 URLs × 2 devices = 18 runs, median. |
| **Liquid: `shopify theme profile --json`** | ✅ **Used.** Home, product, collection. |
| **`shopify theme check`** | ✅ **Used.** 32 offenses, **zero** performance-rule offenses. |
| **`validate_theme` (shopify-dev MCP)** | ✅ **Used** on 6 high-traffic files: 1 error, 4 warnings. |
| **Admin GraphQL `performanceMetrics`** | ❌ **Returns an empty array.** Valid auth, `read_reports` granted, query validated against the schema, tried with and without `storefrontId`, and with explicit `deviceTypes`. Always `{"performanceMetrics": []}`. **Do not spend time on this query again — use ShopifyQL `web_performance` instead.** |
| **CrUX via PageSpeed Insights** | ❌ Keyless endpoint quota exhausted (`Queries per day`). Not needed — ShopifyQL covers it. |

### Gotchas worth keeping

- **`shopify store auth --store` needs the `.myshopify.com` domain**, not the custom domain.
  Passing `informatica.com.ua` makes the CLI request `informatica.com.ua.myshopify.com` and
  fail on a certificate mismatch. Use `c2da09-15.myshopify.com`.
- **`shopify store execute` uses `--version`, not `--api-version`.**
- **`shopify theme profile` requires `SHOPIFY_CLI_THEME_TOKEN` to be unset** — it rejects
  Theme Access tokens with a message that doesn't name the env var.
- **ShopifyQL metric naming is inconsistent**: `lcp_p75_ms` and `inp_p75_ms`, but `p75_cls`.

### Lab measurement conditions (and one trap)

Tracked URL pattern is `https://informatica.com.ua/<path>?pb=0` — the **plain storefront
URL**, because theme `186192232764` is the **live** theme, so the public URL already renders
this repo's code.

`?preview_theme_id=186192232764` is **wrong for measurement**: it adds a 302 worth ~780 ms of
pure artifact per LCP. Measured both ways:

| Home / mobile | Score | LCP |
|---|---|---|
| via `?preview_theme_id=` | 76 | 4156 ms |
| via plain URL (used) | **87** | **2914 ms** |

## Lab baseline (medians of 3 runs)

| URL | Device | Perf | LCP | TBT | CLS | Bytes | Run spread |
|---|---|---|---|---|---|---|---|
| home | mobile | 87 | 2914 ms | 215 ms | 0.023 | 2498 KB | 4 |
| home | desktop | 97 | 989 ms | 97 ms | 0.017 | 2738 KB | 6 |
| product | mobile | 61 | 8437 ms | 166 ms | 0.000 | 2108 KB | **30** |
| product | desktop | 99 | 812 ms | 69 ms | 0.001 | 2277 KB | 2 |
| collection | mobile | 87 | 3069 ms | 174 ms | 0.003 | 2384 KB | 3 |
| collection | desktop | 97 | 1090 ms | 10 ms | 0.005 | 2327 KB | 5 |

Weighted (17/40/43): **mobile 76.6 · desktop 97.8.** Both clear the ≥60 bar.

**On the product/mobile 61:** its three runs were [61, 59, 89] — a 30-point spread at
identical byte weight. Given field LCP is 1624 ms, this is lab variance under heavy
throttling, not a user problem. **Expect the CI job to flap near the 0.6 floor on this page.**
Compare medians, read the job log, and do not move the floor to stop the flapping.

---

## Where the page weight goes

Per-page transferred bytes on mobile, by owner:

| Page | Total | Shopify checkout prefetch | Google Tag | Judge.me | Shopify pixels (`wpm`) |
|---|---|---|---|---|---|
| home | 2499 KB | 852 KB | 346 KB | 143 KB | 124 KB |
| product | 2024 KB | 749 KB | **510 KB** | 170 KB | 72 KB |
| collection | 2385 KB | 849 KB | **510 KB** | 119 KB | 72 KB |

- **The theme's own assets are not the problem.** ~1.3–1.6 MB of each ~2–2.5 MB page is
  platform and third-party payload.
- The checkout-web block is **58 requests, all `VeryLow` priority** — Shopify's platform-level
  checkout prefetch, not something the theme controls.
- **`tailwind.output.css` transfers as 0 KB / 0 ms.** It is not a performance problem. It does
  have a real correctness bug — P1-2.

---

# Prioritized backlog

Sorted by impact ÷ effort. Every item is ≤ 2 hours.

## P1-1 — Mobile INP: the only real field problem
- **Problem/evidence:** INP p75 is the sole CWV outside "good": index/mobile **272 ms**
  (needs-improvement), with collection/mobile 174 ms and product/mobile 160 ms close to the
  200 ms line. Weekly history shows repeated excursions above it —
  product/mobile hit **240 ms** (2026-06-22, n=174) and **206 ms** (2026-08-03, n=273);
  collection/mobile hit **344 ms** (2026-08-24, n=65) and 270 ms (2026-07-13, n=56).
  Full series in `baseline.json.field.weekly_inp_history_mobile`.
- **Caveat that matters:** index/mobile carries only **4–19 loads per week**, so its extremes
  (3890 ms on 2026-08-31, n=7) are statistically meaningless. **Product/mobile is the only
  series with enough volume to trust** — and it is also 75% of traffic. Prioritise by that,
  not by index's scary-looking numbers.
- **Metric:** INP. Target: product/mobile p75 comfortably under 200 ms in every week.
- **Fix outline:** INP is main-thread responsiveness, so the suspects are the long tasks the
  lab already captured on product: `assets/global.js` (168 ms), Shopify pixels
  `cdn/wpm/*.js` (97 + 82 ms), `trekkie.storefront.*.js` (69 ms), Judge.me `loader.js`
  (53 ms). Week 1 is diagnosis: capture a trace with chrome-devtools MCP
  (`performance_start_trace` then `performance_analyze_insight` on `INPBreakdown`) on the
  product URL, interacting with the variant picker and the add-to-cart button, and identify
  which handler owns the delay.
- **Effort:** 2 h (diagnosis only; the fix is a separate sized item once named)
- **Risk:** none this week — measurement only. **Revert:** n/a
- **Verification:** field INP for product/mobile in the following week's
  `web_performance` query. **Field verification takes ~1 week to accumulate** — this is the
  "verify in the field" step of Shopify's method and cannot be rushed with a lab run.
- **Depends on:** nothing.

## P1-2 — Tailwind build is 12 months stale and ships broken classes
- **Problem/evidence:** `assets/tailwind.output.css` was last built **2025-08-30**. Rebuilding
  with the repo's pinned v4.1.4 and diffing selectors shows the shipped CSS is missing classes
  Liquid uses today:
  - `.md\:hidden` — **absent** (the file contains only `.max-md\:hidden`), but used at
    `sections/header.liquid:320` on the phone icon. **That icon is visible on desktop when it
    should be hidden at ≥48rem.**
  - `.bg-transparent` — absent, used in `sections/popular-categories.liquid` and
    `sections/product-suggestions.liquid`.

  It also carries **49 dead utility rules**.
- **Metric:** correctness. Bytes are negligible (the file transfers as 0 KB).
- **Fix:** pin the version — a bare `npx @tailwindcss/cli@4` resolves **4.3.3** and adds
  unrelated churn:
  ```
  npx @tailwindcss/cli@4.1.4 -i assets/tailwind.input.css -o assets/tailwind.output.css --minify
  ```
- **Effort:** 30 min · **Risk:** low, but a real visual change — the phone icon will
  *disappear* on desktop, which is the intent. **Revert:** `git checkout assets/tailwind.output.css`.
- **Verification:** `grep -F 'md\:hidden'` finds a standalone `.md\:hidden` rule; header phone
  icon hidden ≥768 px, visible below.
- **Depends on:** nothing.

## P2-1 — Missing translation key in the header
- **Problem/evidence:** `validate_theme` and `theme check` both flag
  `sections/header.liquid`: `'accessibility.call_store'` has no entry in
  `locales/en.default.json`. It is on the same phone-icon element as P1-2.
- **Metric:** none (accessibility/correctness). Bundled here because it is the same element
  and the same 5 minutes of work.
- **Effort:** 15 min · **Risk:** none · **Revert:** trivial
- **Depends on:** do it with P1-2.

## P2-2 — Homepage category images ship at one fixed width, no `srcset`
- **Problem/evidence:** `sections/popular-categories.liquid:180-183` calls
  `image_url: width: 500 | image_tag: loading: 'lazy'` with **no `widths:` and no `sizes:`** —
  every viewport gets the same 500 px asset. Lighthouse image-delivery flags ~208 KB of
  savings on home.
- **Metric:** bytes (~200 KB on home). **Note:** home is only 3.8% of traffic and its field
  CWV are all good, so this is a hygiene fix, not a win.
- **Fix:** add `widths: '150, 300, 500, 750'` and a `sizes:` matching the card width,
  mirroring `sections/slideshow.liquid:173-181`.
- **Effort:** 45 min · **Risk:** low · **Revert:** one-line
- **Depends on:** nothing.

## P3-1 — `component-facets.css` blocks collection render for 305 ms (lab)
- **Problem/evidence:** largest render-blocking cost measured — 33 958 B raw / ~5 KB gzipped.
- **Metric:** FCP/LCP on collection *in the lab*. **Demoted:** collection field LCP is
  1599 ms (good) and collection is 14.4% of traffic. Do not spend two hours here until
  P1-1 is resolved.
- **Effort:** 2 h · **Risk:** medium (flash of unstyled filters) · **Depends on:** nothing.

## P3-2 — `section-main-product.css` blocks product render for 454 ms (lab)
- Same shape as P3-1: 46 447 B raw / ~7 KB gzipped, largest theme CSS file. Same demotion —
  product field LCP is 1624 ms (good). **Effort:** 2 h · **Depends on:** P1-1.

## P3-3 — Collection server render is the slowest of the three
- **Problem/evidence:** `theme profile`: collection **232 ms** vs product 132 ms, home 190 ms.
  Widest frames: `render 'facets'` 11.1%, `unless results.filters == empty` 5.7%,
  `render 'card-product'` 6.3%. `products_per_page` is 36.
- **Metric:** TTFB. **Low yield** — measured TTFB is already 10 ms at the CDN edge.
- **Effort:** 2 h · **Depends on:** nothing.

---

## Quick wins (< 30 min, zero risk)

1. **P1-2 Tailwind rebuild** — one pinned command, fixes a real visual bug.
2. **P2-1 translation key** — same element, 15 minutes, do them together.

## Needs the store owner

1. **De-duplicate Google Tag.** Product and collection each load `gtag/js` 190 KB +
   `gtag/destination` 161 KB + `gtm.js` 156 KB = **510 KB**. That is a duplicate-install
   signature.
   - `Settings → Customer events` — look for a GTM/gtag custom pixel.
   - `Online Store → Preferences` — check the Google Analytics field.
   - `Apps` — check for a Google & YouTube / GTM app injecting a second tag.
   - Keep one. Record which container ID was removed, and the date.
   - **Also an INP suspect** (P1-1) — less tag JS means less main-thread contention.

2. **Prune Shopify Web Pixels** (`cdn/wpm/*.js`, 72–124 KB, 40% unused, **252 ms long task**
   on home and 97 + 82 ms on product — a direct INP suspect).
   - `Settings → Customer events` → remove unused pixels.

3. **Scope the Judge.me embed** — its widget CSS is **94–99% unused** on the pages measured,
   and `loader.js` costs a 53 ms long task.
   - `Online Store → Themes → Customize → App embeds` → Judge.me.

4. **Review the four active app embeds** in `config/settings_data.json`:
   `judge-me-reviews/judgeme_core`, `shop-chat-agent/chat-interface`,
   `microsoft-clarity/clarity_js`, `microsoft-clarity/brandAgents_js`. Clarity registers two
   blocks — confirm both are wanted.

5. **Create the CI secrets** — see below.

## Regression watch

Now populated from 13 weeks of field data (`baseline.json.field.weekly_inp_history_mobile`).

**What has actually moved:** only INP. LCP p75 sat in a stable 1440–1830 ms band on
product/mobile across every week measured, and CLS never left "good". There is no LCP or CLS
regression history to speak of.

**Known INP excursions above the 200 ms threshold:**

| Week | Template | INP p75 | Loads | Trustworthy? |
|---|---|---|---|---|
| 2026-08-24 | collection/mobile | 344 ms | 65 | yes |
| 2026-07-13 | collection/mobile | 270 ms | 56 | yes |
| 2026-06-22 | product/mobile | 240 ms | 174 | yes |
| 2026-08-03 | collection/mobile | 208 ms | 64 | yes |
| 2026-08-03 | product/mobile | 206 ms | 273 | yes |
| 2026-08-31 | index/mobile | 3890 ms | **7** | **no — sample too small** |
| 2026-08-03 | index/mobile | 584 ms | **15** | **no** |
| 2026-08-24 | index/mobile | 532 ms | **8** | **no** |

**No cause can be attributed yet.** Correlating these dates with app installs or theme
deploys requires the RUM *event annotations*, which the `performanceMetrics` query would have
provided — and that query returns empty for this shop. Attribution therefore has to come from
the Admin changelog by hand.

**If scores drop, check in this order:**

1. **Product/mobile INP** in `web_performance` — 75% of traffic and the only high-volume
   series. Anything else is likely noise.
2. **Google Tag byte count** on product/collection — currently 510 KB; a new pixel or app
   shows up here first.
3. **New app embeds** in `config/settings_data.json` — small, readable diff.
4. **Ignore index/mobile spikes** unless that week has >30 page loads.
5. **`assets/tailwind.output.css`** — if the commented-out `tailwindcss-update` CI job is ever
   re-enabled, note that Tailwind v4 auto-detects sources across the whole repo, so adding
   docs or JS files changes the generated CSS. Pin the version (P1-2).

---

# CI regression guard

`.github/workflows/ci.yml` — the `lhci` (Lighthouse) job.

**How it works (since 2026-09-05):** the job does **not** use
`shopify/lighthouse-ci-action`. That action always creates a scratch development theme
(`themeCreate`) and mis-wires the Theme Access token in CI, 401ing on `publicApiVersions`
([issue #41](https://github.com/Shopify/lighthouse-ci-action/issues/41),
[#47](https://github.com/Shopify/lighthouse-ci-action/issues/47)) — the same command works
from the CLI locally. Instead the job drives the CLI directly:

1. `SHOPIFY_CLI_THEME_TOKEN` (= `SHOP_ACCESS_TOKEN`, the `shptka_…` Theme Access password) +
   a **hardcoded** `--store c2da09-15.myshopify.com` → `shopify theme dev --port 9292` serves
   **branch code** on `http://127.0.0.1:9292` non-interactively. A `shopify theme list` runs
   first as a fast auth check.
2. `node docs/perf/measure.js ci-perf` runs Lighthouse 13 three times per URL × {mobile,
   desktop} against that local server. Only `PERF_BASE_URL` is overridden; the product /
   collection paths fall back to `measure.js` defaults (same handles as `baseline.json`).
3. `node docs/perf/ci-gate.js ci-perf` **fails the job** if any **median** performance score
   is below its floor in `docs/perf/ci-floors.json`.

**Gate is a per-URL median-score floor, not a diff against `baseline.json`.** `baseline.json`
was measured on the production URL (CDN, live tags); the CI localhost `theme dev` render
scores much lower (home/mobile LCP ~7.8 s vs 2.9 s in `baseline.json`).

- **Desktop floors are meaningful.** Runner desktop scores are stable (home 74–85,
  product 84–89, collection 82–86); floors sit ~10 pts under the observed min and will catch
  a real regression.
- **Mobile floors are `0.25` — a "did the page render" check only.** Mobile lab scores swing
  20+ pts run-to-run on shared runners through the dev proxy (`collection/mobile` has ranged
  0.38–0.61), so a tight mobile floor just flakes. Mobile perf regressions are caught by
  field data (P1-1), not here.

The job runs **once per change** (`if: pull_request || ref == main`) — the workflow also
triggers on `push`, but that would double-run this store-hitting job on a branch with an open
PR. Field data in `baseline.json` stays the real perf source of truth; a CI-baseline diff is
a possible later enhancement.

Calibration run `33991882319` (2026-09-06) medians: home m/d **0.61 / 0.82**,
product **0.57 / 0.89**, collection **0.60 / 0.85**.

### Repository secrets

`GitHub repo → Settings → Secrets and variables → Actions`

| Secret | Value | Status |
|---|---|---|
| `SHOP_ACCESS_TOKEN` | Theme Access app password (`shptka_…`) for `c2da09-15.myshopify.com` | **the only one the job uses** |
| `SHOP_STORE_OS2` | was meant to be `c2da09-15.myshopify.com` | **held the wrong domain — caused the 401. Now unused (store is hardcoded).** |
| `SHOP_PRODUCT_HANDLE` / `SHOP_COLLECTION_HANDLE` | product / collection handle | held stale values → `ERRORED_DOCUMENT_REQUEST`. Now unused (measure.js defaults). |
| `SHOP_PULL_THEME`, `SHOP_PASSWORD_OS2`, `SHOP_CLIENT_ID` / `SHOP_CLIENT_SECRET` | — | unused, safe to delete |

### History — why the action was dropped

The `shopify/lighthouse-ci-action` must create a scratch development theme
(`themeCreate`) to audit branch code, and no credential we can issue lets it do that in CI:

- **Dev Dashboard app** (`client_id` + `client_secret`, `write_themes` approved): token
  exchange succeeds, then `themeCreate` → `ACCESS_DENIED` — needs `write_themes` **and a
  Shopify-granted exemption**. That exemption is a separate, slow application that a private
  perf check does not qualify for.
- **Theme Access token** (`shptka_…`): the action 401s on `publicApiVersions`. This was
  **not** actually an action bug or a Theme Access limitation — the `SHOP_STORE_OS2` secret
  held the wrong `*.myshopify.com` domain, so a valid token was being pointed at a store it
  had no access to. Proven 2026-09-06: logged-out, token-only
  `shopify theme list --store c2da09-15.myshopify.com` succeeds, and the token's md5 matches
  the `SHOP_ACCESS_TOKEN` secret. Hardcoding the store fixed CI.

**Fallback if `shopify theme dev` proves flaky headless:** create one permanent *unpublished*
"CI" theme on the store once, `shopify theme push --theme <id> --path .` each run (an update —
no `themeCreate`), and point Lighthouse at `https://<store>/?preview_theme_id=<id>` (accept
the ~780 ms 302 artifact; it is constant run-to-run, so a floor still works).

---

# Suggested sequence

| Week | Item | Why |
|---|---|---|
| **1** | **P1-2** Tailwind rebuild + **P2-1** translation key (45 min) | Quick, low risk, fixes a real visual bug. Same element. |
| 2 | **P1-1** trace mobile INP on product | The only genuine field problem, on 75% of traffic. |
| 3 | The fix P1-1 names | Sized once the culprit is known. |
| 4 | Re-query `web_performance`; confirm product/mobile INP improved | Field verification needs a week of data. |
| 5 | **P2-2** category image `srcset` | Hygiene. |
| 6 | **P3-1/P3-2** CSS splits | Only if field data still justifies it. |

Store-owner items (Google Tag, pixels, Judge.me) are unblocked now and don't consume a week.
Two of them are also INP suspects, so handing them over early may partly resolve P1-1.

---

## Week 1 slice

**P1-2 — Rebuild Tailwind (30 min) · P2-1 — Add the missing translation key (15 min)**

```bash
cd C:/projects/informatica/dawn
npx @tailwindcss/cli@4.1.4 -i assets/tailwind.input.css -o assets/tailwind.output.css --minify
grep -F 'md\:hidden' assets/tailwind.output.css   # must now find a standalone rule
```

Then add `accessibility.call_store` to `locales/en.default.json` (and the other locale files
that carry the same keys), and check the header phone icon at `sections/header.liquid:320` is
hidden ≥768 px and visible below.

Revert: `git checkout assets/tailwind.output.css locales/`.

> **Do not run `npm run dev` while editing theme files** — see the live-theme warning below.

---

## Reproducing this baseline

```bash
npx -y lighthouse@13 --version          # once, populates the npx cache
node docs/perf/measure.js    <outDir>   # 18 runs -> lh_*.json + lh_summary.json
shopify theme check --output=json > <outDir>/themecheck.json
node docs/perf/mkbaseline.js <outDir>   # -> docs/perf/baseline.json
```

Field data (regenerate `<outDir>/field.json` before `mkbaseline.js`):

```bash
shopify store auth --store c2da09-15.myshopify.com --scopes read_reports
shopify store execute --store c2da09-15.myshopify.com --json \
  --query 'query { shopifyqlQuery(query: """
    FROM web_performance
    SHOW page_loads, percent_of_page_loads, lcp_p75_ms, inp_p75_ms, p75_cls, fcp_p75_ms
    GROUP BY page_type, device_type SINCE -90d ORDER BY page_loads DESC
  """) { tableData { columns { name dataType } rows } parseErrors } }'
```

`measure.js` holds the three tracked URLs. Changing them invalidates comparison with this
baseline — if you must, say why in the commit message.

> **Live-theme hazard.** `npm run dev` targets `--theme 186192232764`, which is the **live**
> theme, so `shopify theme dev` syncs local edits straight to production. Do not run it while
> editing theme files. Measurement does not need it — the tracked URLs are public.
