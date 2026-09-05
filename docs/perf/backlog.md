# Performance backlog — informatica.com.ua

**Baseline date:** 2026-09-05 · **Commit:** `6d9f677f` · **Branch:** `perf/baseline-and-guard`
**Source of truth for all numbers:** [`baseline.json`](./baseline.json). This file explains
them; that file is what CI and future weeks diff against.

No theme code was changed in this session. Only `docs/perf/*` and `.github/workflows/ci.yml`.

---

## Data sources — what actually worked

| Source | Status |
|---|---|
| **Lab: Lighthouse CLI 13.4.1** | ✅ **Used.** 3 runs × 3 URLs × 2 devices = 18 runs, median reported. |
| **Liquid: `shopify theme profile --json`** | ✅ **Used.** Home, product, collection. |
| **`shopify theme check`** | ✅ **Used.** 32 offenses, **zero** performance-rule offenses. |
| **chrome-devtools MCP** | ⚠️ **Configured and healthy, but unusable this session.** `claude mcp add` succeeded and `claude mcp list` shows it connected, but MCP tools load only at session start. Trace insights, `performance_analyze_insight` and LCP-subpart breakdowns are **deferred to week 1**, which will have the tools from the start. |
| **shopify-dev MCP (`validate_theme`)** | ⚠️ Same session-start limitation. `validate_theme` violation count is `null` in baseline.json. |
| **Field: Shopify RUM `performanceMetrics`** | ❌ **Not captured.** Needs the Shopify AI Toolkit plugin, which is not installed. |
| **Field: CrUX via PageSpeed Insights** | ❌ **Not captured.** Keyless endpoint returned `Quota exceeded for quota metric 'Queries' … 'Queries per day'`. |
| **Traffic: sessions by page** | ❌ **Not captured.** Same missing plugin. Template ranking below falls back to Shopify's published weighting. |

> **This baseline is lab-only.** Shopify's method is field-data-to-find, lab-to-debug,
> field-to-verify. We are starting at step two. Closing the field gap is item **P1-0** and
> should happen before the ranking below is trusted as a priority order rather than a
> plausible one.

### Measurement conditions (and one trap worth knowing)

Tracked URL pattern is `https://informatica.com.ua/<path>?pb=0` — the **plain storefront
URL**, because theme `186192232764` is the **live** theme, so the public URL already renders
this repo's code.

The obvious alternative, `?preview_theme_id=186192232764`, is **wrong for measurement**: it
adds a 302 that injected ~780 ms of pure artifact into every LCP. Measured both ways:

| Home / mobile | Score | LCP |
|---|---|---|
| via `?preview_theme_id=` | 76 | 4156 ms |
| via plain URL (used) | **87** | **2914 ms** |

Anyone re-measuring must use the plain URL or the numbers are not comparable.

---

## Template ranking

Session-share data was unavailable, so this uses Shopify's published page weighting and
purchase proximity. **Re-rank once RUM/analytics is connected (P1-0).**

| Rank | Template | Weight | Mobile score | Why |
|---|---|---|---|---|
| 1 | **product** | 40% | **61** | Only page near the ≥60 bar; highest purchase proximity. |
| 2 | **collection** | 43% | 87 | Highest weight; slowest server render (232 ms). |
| 3 | home | 17% | 87 | Lowest weight, comfortable score. |

## Baseline (medians of 3 runs)

| URL | Device | Perf | LCP | TBT | CLS | Bytes | Run spread |
|---|---|---|---|---|---|---|---|
| home | mobile | 87 | 2914 ms | 215 ms | 0.023 | 2498 KB | 4 |
| home | desktop | 97 | 989 ms | 97 ms | 0.017 | 2738 KB | 6 |
| **product** | **mobile** | **61** | **8437 ms** | 166 ms | 0.000 | 2108 KB | **30** |
| product | desktop | 99 | 812 ms | 69 ms | 0.001 | 2277 KB | 2 |
| collection | mobile | 87 | 3069 ms | 174 ms | 0.003 | 2384 KB | 3 |
| collection | desktop | 97 | 1090 ms | 10 ms | 0.005 | 2384 KB | 5 |

**Weighted (17/40/43): mobile 76.6 · desktop 97.8.** Both clear the ≥60 bar today.

### Threshold collision — read before trusting a red CI run

The ≥60 bar, the CI floor of `0.6`, and the 10-point noise band interact badly on one page.
`product_mobile` scored **[61, 59, 89]** across three runs — a **30-point spread at
identical byte weight** (2024 KB vs 2108 KB, same 510 KB of GTM in both). Its median of 61
sits one point above the CI floor.

**Expect the LHCI job to flap red on product/mobile until P1-1 lands.** Do not treat a single
red run as a regression — compare medians, and read the job's log output rather than only its
pass/fail. Do not raise or lower the `0.6` floor to make the flapping stop.

---

## Where the weight actually is

Per-page transferred bytes on mobile, by owner:

| Page | Total | Shopify checkout prefetch | Google Tag | Judge.me | Shopify pixels (`wpm`) |
|---|---|---|---|---|---|
| home | 2499 KB | 852 KB | 346 KB | 143 KB | 124 KB |
| product | 2024 KB | 749 KB | **510 KB** | 170 KB | 72 KB |
| collection | 2385 KB | 849 KB | **510 KB** | 119 KB | 72 KB |

Two things this table settles:

- **The theme's own assets are not the problem.** Roughly 1.3–1.6 MB of each ~2–2.5 MB page
  is platform and third-party payload. The biggest single theme CSS file transfers at 5–7 KB
  gzipped.
- **`tailwind.output.css` is not a performance problem at all.** Lighthouse reports it as
  **0 KB / 0 ms render-blocking**. The prompt's premise that it is an expensive extra
  stylesheet does not survive measurement. It still has a real *correctness* bug — see P1-3.

---

# Prioritized backlog

Sorted by impact ÷ effort. Every item is sized ≤ 2 hours.

## P1-0 — Connect field data (RUM + traffic)
- **Problem/evidence:** `baseline.json.field` is entirely `null`. RUM needs the Shopify AI
  Toolkit plugin (not installed); CrUX via PSI hit `Quota exceeded … Queries per day`.
- **Metric:** none directly — it makes every other ranking trustworthy instead of assumed.
- **Fix:** install the plugin (see *Needs the store owner*), then query
  `performanceMetrics(aggregationLevel: DAILY, deviceTypes: [ALL], maxDays: 90,
  storefrontId: "online_store")` on the **`unstable`** API version (it is unsupported on
  2026-07/latest). Fill `field.*` and re-rank the template table.
- **Effort:** 45 min · **Risk:** none, read-only · **Revert:** n/a
- **Verification:** `baseline.json.field.product.mobile.lcp_p75` is a number.
- **Depends on:** store owner.

## P1-1 — Product mobile: LCP paints ~9 s after the image is ready
- **Problem/evidence:** The LCP element is the gallery image
  (`div.product__media > img.image-magnify-hover`). It is **24 KB and downloads in 32 ms** —
  `networkRequestTime` 1446 → `networkEndTime` 1478 in the slow run. Yet LCP was **11912 ms**
  in that run and 3135 ms in a fast one. In the slow run **LCP == TTI == 11.9 s** and
  main-thread work was 3.6 s. So LCP is **paint-blocked by main-thread work, not by network
  or by image weight.** Lighthouse's LCP-discovery checklist already passes
  (`fetchpriority=high` applied, discoverable in the initial document, not lazy) — there is
  nothing left to fix on the discovery side.
- **Metric:** LCP. Closing the bimodality alone moves the median from 8437 ms toward the
  ~3100 ms the good runs already achieve, i.e. roughly **61 → 85+** on the weightiest page.
- **Fix outline:** this needs a trace before code. Week 1: capture
  `performance_start_trace(reload: true)` + `performance_analyze_insight` on the product URL
  with chrome-devtools MCP (available from session start next time) and identify what defers
  the paint. Prime suspects, in order: `assets/global.js` (168 ms long task, contains
  `SliderComponent` at `global.js:727`, which owns the gallery), then
  `assets/media-gallery.js` / `assets/product-info.js`.
- **Effort:** 2 h (trace + diagnosis only; the fix itself is a separate sized item once the
  culprit is named) · **Risk:** none this week — measurement only
- **Verification:** re-measure `product_mobile`; the run-to-run spread should collapse below
  10 points before any score claim is made.
- **Depends on:** nothing.

## P1-2 — Google Tag is loaded two or three times over
- **Problem/evidence:** product and collection pages each fetch **`gtag/js` 190 KB +
  `gtag/destination` 161 KB + `gtm.js` 156 KB = 510 KB**. Home fetches 346 KB. That is a
  duplicate-install signature: GTM container *and* a standalone gtag, likely one from a
  Shopify app / Admin pixel and one hardcoded.
- **Metric:** bytes + INP/TBT. Removing one install saves ~156–190 KB on the two heaviest
  templates.
- **Fix:** audit and de-duplicate — Admin click-paths in *Needs the store owner*.
- **Effort:** 1 h · **Risk:** medium — removing the wrong one breaks analytics continuity.
  **Revert:** re-add the removed tag; keep a dated note of which container ID was removed.
- **Verification:** re-run product mobile; `www.googletagmanager.com` bytes in
  `list_network_requests` should drop by the removed container's size.
- **Depends on:** store owner.

## P1-3 — Tailwind build is 12 months stale and ships broken classes
- **Problem/evidence:** `assets/tailwind.output.css` was last built **2025-08-30**; the input
  has not changed since 2025-04-23. Rebuilding with the repo's pinned v4.1.4 and diffing
  selectors shows the shipped CSS is **missing classes that Liquid uses today**:
  - `.md\:hidden` — **absent from the shipped file** (it contains only `.max-md\:hidden`),
    but used at `sections/header.liquid:320` on the phone icon. **That icon is therefore
    visible on desktop when it should be hidden at ≥48rem.** Verified by grepping both files.
  - `.bg-transparent` — absent from the shipped file, used in `sections/popular-categories.liquid`
    and `sections/product-suggestions.liquid`.

  It also carries **49 dead utility rules** no longer referenced anywhere.
- **Metric:** correctness first; bytes are negligible (**the file transfers as 0 KB / 0 ms**).
  Raw size 21 031 B → 13 464 B minified, but this is not why you should do it.
- **Fix:** rebuild, pinning the repo's version — a bare `npx @tailwindcss/cli@4` resolves
  **4.3.3** and produces unrelated churn:
  ```
  npx @tailwindcss/cli@4.1.4 -i assets/tailwind.input.css -o assets/tailwind.output.css --minify
  ```
  Then visually check the header phone icon at ≥768 px.
- **Effort:** 30 min · **Risk:** low, but it is a real visual change — the phone icon will
  *disappear* on desktop, which is the intended behaviour.
  **Revert:** `git checkout assets/tailwind.output.css`.
- **Verification:** `grep -F 'md\:hidden' assets/tailwind.output.css` finds a standalone
  `.md\:hidden` rule; header phone icon hidden ≥768 px, visible below.
- **Depends on:** nothing.

## P2-1 — `component-facets.css` blocks collection render for 305 ms
- **Problem/evidence:** Lighthouse render-blocking table, collection mobile:
  `component-facets.css` **305 ms**, the largest single render-blocking cost measured
  anywhere. 33 958 B raw / ~5 KB gzipped. Collection carries 43% of the weighting.
- **Metric:** FCP/LCP on collection, ~0.2–0.3 s.
- **Fix:** in `sections/main-collection-product-grid.liquid`, the facets CSS is needed only
  when `section.settings.enable_filtering` is on (it is). Split the above-the-fold rules from
  the drawer/panel rules and load the latter non-blocking, matching the
  `media="print" onload="this.media='all'"` pattern already used in `layout/theme.liquid`.
- **Effort:** 2 h · **Risk:** medium — a flash of unstyled filters if the split is wrong.
  **Revert:** restore the single `stylesheet_tag`.
- **Verification:** re-measure `collection_mobile`; `component-facets.css` should leave the
  render-blocking list. Needs ≥10 points or a clear LCP drop to count.
- **Depends on:** nothing.

## P2-2 — `section-main-product.css` blocks product render for 454 ms
- **Problem/evidence:** Render-blocking table, product mobile: **454 ms**, 46 447 B raw
  (~7 KB gzipped) — the largest theme CSS file.
- **Metric:** FCP/LCP on product.
- **Fix:** same split-and-defer approach as P2-1, on `sections/main-product.liquid`.
- **Effort:** 2 h · **Risk:** medium (above-the-fold product layout is the most visible thing
  on the site). **Revert:** restore the single `stylesheet_tag`.
- **Verification:** re-measure `product_mobile`. **Do this after P1-1** — while the 30-point
  spread persists, no result here is readable.
- **Depends on:** P1-1.

## P2-3 — Homepage category images ship at one fixed width, no `srcset`
- **Problem/evidence:** `sections/popular-categories.liquid:180-183` calls
  `image_url: width: 500 | image_tag: loading: 'lazy'` with **no `widths:` and no `sizes:`** —
  so every viewport gets the same 500 px asset and no `srcset`. Lighthouse image-delivery
  flags ~48 KB + 35 KB + 27 KB … ≈ **208 KB of savings** on home.
- **Metric:** bytes, ~200 KB on home.
- **Fix:** add `widths: '150, 300, 500, 750'` and a `sizes:` matching the card's rendered
  width, mirroring the pattern already in `sections/slideshow.liquid:173-181`.
- **Effort:** 45 min · **Risk:** low. **Revert:** single-line git revert.
- **Verification:** re-measure `home_mobile`; `total_bytes` should fall ~150–200 KB.
- **Depends on:** nothing.

## P3-1 — Judge.me review widget CSS is 94–99% unused
- **Problem/evidence:** `unused-css-rules`: `judgeme-739/assets/widget_v3_*` — 11 KB of 11 KB
  unused on product (99%), 10 KB of 11 KB on home.
- **Metric:** bytes + a 53 ms `loader.js` long task.
- **Fix:** app-side; restrict the Judge.me embed to templates that render reviews.
- **Effort:** 30 min · **Depends on:** store owner.

## P3-2 — Collection server render is the slowest of the three
- **Problem/evidence:** `theme profile --json`: collection **232 ms** total vs product 132 ms,
  home 190 ms. Widest frames: `render 'facets'` **11.1%**,
  `unless results.filters == empty` **5.7%**, `render 'card-product'` 6.3%,
  `for product in collection.products` 4.0%. `products_per_page` is 36.
- **Metric:** TTFB, tens of ms. **Note this is low-yield** — measured TTFB is already 10 ms
  at the CDN edge; this is server render time, not what users wait for. Listed for
  completeness, not urgency.
- **Effort:** 2 h · **Depends on:** nothing.

---

## Quick wins (< 30 min, zero risk)

1. **P1-3 Tailwind rebuild** — one pinned command, fixes a real visual bug. Highest
   value-per-minute item in this document.
2. **Delete the two stale `.report.html` files** if any Lighthouse run ever drops them in the
   repo root — they are untracked build noise. (Cleaned already this session.)

## Needs the store owner

Each of these needs Admin access, which this session does not have.

1. **Install the Shopify AI Toolkit plugin** (unblocks P1-0 — it was chosen for this session
   but never installed, so all field data is missing). In Claude Code, type:
   ```
   /plugin marketplace add Shopify/shopify-ai-toolkit
   /plugin install shopify-plugin@shopify-ai-toolkit
   ```
   The RUM query also needs the authenticated user to have **both themes and reports** access.

2. **De-duplicate Google Tag** (P1-2).
   - `Shopify admin → Settings → Customer events` — list every custom pixel; look for a
     GTM/gtag snippet added here.
   - `Shopify admin → Online Store → Preferences` — check the Google Analytics field.
   - `Shopify admin → Apps` — check for a Google & YouTube / GTM app also injecting a tag.
   - Keep exactly one. Note the removed container ID and the date.

3. **Prune Shopify Web Pixels** (`cdn/wpm/*.js` — 72–124 KB, 40% of it unused, and a
   **252 ms long task** on home, the largest single long task measured).
   - `Shopify admin → Settings → Customer events` → remove pixels no longer used.

4. **Scope the Judge.me embed** (P3-1).
   - `Shopify admin → Online Store → Themes → Customize → App embeds` → Judge.me.

5. **Review the four active app embeds** in `config/settings_data.json`:
   `judge-me-reviews/judgeme_core`, `shop-chat-agent/chat-interface`,
   `microsoft-clarity/clarity_js`, `microsoft-clarity/brandAgents_js` — Clarity registers two
   separate blocks; confirm both are wanted.
   - `Shopify admin → Online Store → Themes → Customize → App embeds`.

6. **Create the CI secrets** — see below.

## Regression watch

**No history is available.** The RUM **event annotations**, which correlate metric movements
with theme and app updates, were the only source for this and require the plugin from item 1.
This section is deliberately left empty rather than filled with speculation.

Populate it next week once RUM is connected. Until then, if scores drop, check in this order,
based on what this baseline shows dominates each page:

1. **Google Tag byte count** on product/collection — currently 510 KB; a new pixel or app
   shows up here first.
2. **`product_mobile` spread** — it is already bimodal (see P1-1); a drop there may be the
   known flap rather than a new regression. Compare medians of 3 runs, never single runs.
3. **New app embeds** in `config/settings_data.json` — the diff is small and readable.
4. **`assets/tailwind.output.css`** — if the commented-out `tailwindcss-update` CI job is ever
   re-enabled, note that Tailwind v4 auto-detects sources across the whole repo, so adding
   docs or JS files can change the generated CSS. Pin the version (P1-3).

---

# CI regression guard

`.github/workflows/ci.yml` — all four defects fixed, YAML verified to parse.

| # | Was | Now |
|---|---|---|
| 1 | `on: [push]` | `on: [push, pull_request]` — LHCI's score comments never fire on push-only |
| 2 | `access_token:` (legacy custom app; Shopify stopped allowing new ones Jan 2026) | `client_id:` + `client_secret:` |
| 3 | `lhci_min_score_performance: 0.8` | `0.6` — matches the ≥60 bar and the action's own default |
| 4 | Entire `lhci` job commented out | Uncommented and enabled |

Input names were verified against the action's own
[`action.yml`](https://github.com/Shopify/lighthouse-ci-action/blob/main/action.yml), not
assumed. `lhci_github_app_token` is intentionally omitted — it is optional, and without it the
job still passes/fails and prints scores to its log. The `tailwindcss-update` job above it was
left commented exactly as found.

### Repository secrets to create

`GitHub repo → Settings → Secrets and variables → Actions → New repository secret`

| Secret | Value |
|---|---|
| `SHOP_STORE_OS2` | `c2da09-15.myshopify.com` |
| `SHOP_CLIENT_ID` | Dev Dashboard app → **Client ID** |
| `SHOP_CLIENT_SECRET` | Dev Dashboard app → **Client secret** |
| `SHOP_PRODUCT_HANDLE` | a stable product handle (else the action uses the first product) |
| `SHOP_COLLECTION_HANDLE` | e.g. `hdmi_cable` (else the first collection) |
| `SHOP_PULL_THEME` | theme whose settings/JSON templates form the test baseline |
| `SHOP_PASSWORD_OS2` | only if the storefront is password-protected — it is not, so this may be left unset |

**Creating the app:** Shopify **Dev Dashboard** → create an app → in the app version's
configuration enable scopes **`read_products`** and **`write_themes`** → install it on the
store → copy Client ID and Client secret from the app's credentials page. The action refreshes
tokens each run (valid 24 h), so nothing needs rotating manually.

> The job cannot be verified end-to-end from here — it needs secrets only the store owner can
> create. What *is* verified: the YAML parses, and every input name exists in the action.
> First real run happens on the next pull request.

---

# Suggested sequence

Each slice is one week and ≤ 2 hours, and items stay independently pickable.

| Week | Item | Why this order |
|---|---|---|
| **1** | **P1-3** Tailwind rebuild (30 min) + **P1-0** connect field data (45 min) | Both are quick, zero-to-low risk, and P1-0 makes every later ranking trustworthy. Fits one slice. |
| 2 | **P1-1** trace product mobile | Needs chrome-devtools MCP, available from session start next time. Diagnosis only. |
| 3 | The fix P1-1 names | Sized once the culprit is known. |
| 4 | **P2-3** category image `srcset` | Independent, low risk, ~200 KB. |
| 5 | **P2-1** facets CSS split | Highest-weight template. |
| 6 | **P2-2** product CSS split | After P1-1, so the measurement is readable. |

Store-owner items (**P1-2**, **P3-1**, pixel pruning) are unblocked at any time and do not
consume a week — hand them over verbatim from *Needs the store owner*.

---

## Week 1 slice

**P1-3 — Rebuild Tailwind (30 min) · P1-0 — Connect field data (45 min)**

```bash
# P1-3 — pin the version; a bare @4 resolves 4.3.3 and adds unrelated churn
cd C:/projects/informatica/dawn
npx @tailwindcss/cli@4.1.4 -i assets/tailwind.input.css -o assets/tailwind.output.css --minify

# verify the bug is fixed: a standalone .md\:hidden rule must now exist
grep -F 'md\:hidden' assets/tailwind.output.css
```
Then check the header phone icon (`sections/header.liquid:320`) is hidden at ≥768 px and
still visible below it. Revert with `git checkout assets/tailwind.output.css`.

For **P1-0**, run the two `/plugin` commands from *Needs the store owner* item 1, then query
RUM on the `unstable` API version and fill `field.*` in `baseline.json`.
