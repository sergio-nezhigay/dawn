# Method — product page: informatica theme vs Dawn 16.0.0

**Status:** draft for approval (2026-09-10). Nothing has been created on the store yet.
**Question:** how much does the customized theme cost on the product page compared with the
latest Dawn, under identical store, product, app and measurement conditions?
**Scope:** research only. No theme code changes.

Every rule below was checked empirically on 2026-09-10 unless marked *source*.

---

## 1. Variants — the ladder

| Rung | Theme | What it contains | Step isolates |
|---|---|---|---|
| **R0** Dawn bare | existing `Dawn` **#188293415228** (read-only) | Dawn 16.0.0 theme-store install, stock `Dawn` preset, **no app embeds / blocks** | — |
| **R1** Dawn + apps | **new** `PERF-REF Dawn16 apps` | R0's files + your 4 app embeds + Judge.me blocks | **app cost** (R1 − R0) |
| **R2** Dawn mirrored | **new** `PERF-REF Dawn16 mirrored` | R1 + **your theme settings** + **your product template** mapped onto Dawn | **configuration cost** (R2 − R1) |
| **R3** current theme | live `dawn/main` **#188294955324** | your code, settings and template | **custom code cost** (R3 − R2) |

Why each rung is its own theme: theme settings (`settings_data.json`) are per theme, so a
mirrored-settings rung cannot share a theme with a stock-settings rung. It also removes any reliance
on `?view=` alternate templates, which fall back to the default template silently. Slots: 17 → **19/20**
during the test, back to 17 afterwards.

**R0 — why reuse #188293415228.** Its `Shopify.theme` reports 16.0.0 / `theme_store_id` 887, its
`settings_data.json` holds only the stock `Dawn` preset, and neither `settings_data.json` nor
`product.json` references any `shopify://apps/`. It is only measured, never modified.

**R1 — built from R0's own files** (`shopify theme pull` R0 → scratchpad), not from a GitHub
checkout, so R1 − R0 contains nothing but the apps. Added:
- the 4 app embeds from `config/settings_data.json` `blocks`: Judge.me core, Shop chat agent (same
  welcome message), Clarity `clarity_js` + `brandAgents_js`;
- Judge.me `preview_badge` (after the title) and `review_widget` in an `apps` section after the main
  product (`review_data: sample_data`, `show_shop_reviews: false`, `max_width: 1200`).
- Pushed with `shopify theme push --unpublished`. If an embed doesn't activate from the push, enable it
  in the theme editor → App embeds.

**R2 — R1 plus two ports:**
- **Theme settings:** all 115 keys of your `settings_data.json` `current` exist in Dawn 16's schema
  (0 unmapped), plus the 5 color schemes. 29 values differ from R0's defaults. The ones that plausibly
  move performance:

  | Setting | Dawn default (R0/R1) | Yours (R2/R3) | Why it can matter |
  |---|---|---|---|
  | `type_header_font` / `type_body_font` | `assistant_n4` | `sans-serif` (system) | Dawn downloads font files; yours downloads none |
  | `cart_type` | `notification` | `drawer` + `cart_drawer_collection` | drawer markup, CSS/JS, collection cards |
  | `page_width` | 1200 | 1600 | image sizes chosen from `srcset` |
  | `logo` / `logo_width` | none / 90 | webp / 220 | extra image |
  | `animations_hover_elements` | `none` | `default` | CSS |
  | card/media/button radius + shadows | 0 | 5–12 | paint only |

- **Product template:** your `templates/product.json` settings Dawn supports: `thumbnail_slider`,
  `media_size: small`, `constrain_to_viewport`, `media_fit: contain`, `enable_sticky_info`,
  `image_zoom: hover`, `mobile_thumbnails: hide`, same block order and disabled blocks (SKU, share,
  complementary), paddings. Dawn's `related-products` ×2 (`related` + `complementary`, 6 products)
  stand in for your `product-suggestions` ×2.
- **No Dawn equivalent, so these land in R3 − R2 by design:** recently-viewed section,
  description show-more toggle (`desktop_description_threshold`), `judgeme-enhancements.js`,
  `tailwind.output.css`.

**Store-wide payload is matched automatically:** Google Tag, Shopify web pixels (`wpm`) and checkout
prefetch load whatever the theme.

**Never publish R0/R1/R2.** Dawn 16.0.0 removes the legacy customer-account templates (*source:* Dawn
v16.0.0 release notes). Previewing is safe.

**Confound — "latest Dawn" mixes upstream work with yours.** 15.3.0 → 16.0.0 includes a CLS body-layout
change (15.5.0) and a new header customer-account popover (16.0.0). Bounded with a static
`v15.3.0 ↔ v16.0.0` diff of the files the product page loads, reported next to every delta. R0 is also
diffed against the GitHub `v16.0.0` tag, to confirm the theme-store build matches the tag.

## 2. How each variant is loaded — no redirect, no URL difference

`?preview_theme_id=` always answers **302**, with `pb=0` and with `test=1` alike, so the forum claim
that these avoid it is false here. The 302 sets a **`_shopify_essential`** cookie. With that cookie, the
plain URL renders the preview theme and **does not redirect**.

| Method (desktop) | Redirects | TTFB | Theme rendered |
|---|---|---|---|
| live theme, plain URL (home) | 0 | 15 ms | 15.3.0 ✅ |
| Dawn 16, `?preview_theme_id=` URL (home) | **2** | **269 ms** | 16.0.0 |
| Dawn 16, cookie via CLI `--extra-headers` (home) | 0 | 15 ms | 16.0.0 |
| **Dawn 16, domain-scoped cookie, puppeteer + Lighthouse API (P1)** | **0** | **12–16 ms** | **16.0.0 ✅** |
| **live, same method (P1)** | **0** | **9–15 ms** | **15.3.0 ✅** |

**Chosen:** the Lighthouse 13.4.1 Node API on a puppeteer-core 25.6.0 page. Before each run, a fresh
`_shopify_essential` cookie is primed for that variant's theme id (R3 included) and set **scoped to
`informatica.com.ua`**. Checked on two runs each: the cookie survives Lighthouse's storage reset, and
`Shopify.theme.id` after the run is the intended theme. Same-origin `/recommendations/products` fetches
return 200.

CLI `--extra-headers` is **rejected**: it sends the cookie to every third-party origin and overwrites
the page's own cookies (cart, session).

**Per-run assertions** — a failing run is discarded and logged, never kept silently:
- `Shopify.theme.id` == the variant's theme id (this also tells R1 and R2 apart);
- `redirects == 0`, no Lighthouse `runtimeError`;
- the document and theme assets (`/cdn/shop/t/`) return 2xx. Platform requests are **not** asserted:
  checkout-web prefetch returned a Shopify-side 502 once, and `favicon.ico` 404s on stock Dawn.

## 3. Pages — top 3 landing products

ShopifyQL `FROM sessions SHOW sessions WHERE human_or_bot_session = 'Human' GROUP BY landing_page_type,
landing_page_path SINCE -90d`, run 2026-09-10:

| # | Path | Human landing sessions (90 d) | Shape |
|---|---|---|---|
| P1 | `/products/kvr32s22d816` | 612 | 3 media, 324-char description |
| P2 | `/products/ustroystvo-videozakhvata-easycap-usb-20` | 281 | 6 media, 840 chars |
| P3 | `/products/perekhodnik-audio-optikakoaksial-to-2rca-35mm-blok-pitaniy` | 235 | 5 media, 1,097 chars |

`kvr32s22s816` (274) was skipped as a near-duplicate of P1. **Limitation:** all three are
single-variant, so the variant picker is not exercised. Ukrainian paths only (no `/ru/`).

## 4. Run design

- **Cells:** 4 variants × 3 products × 2 form factors (Lighthouse mobile default / `desktop-config`).
- **Interleaved:** the innermost loop cycles variants (`R0,R1,R2,R3,R0,R1…`) within each product × form
  factor, so drift over time (CDN, network, CPU) spreads across all variants equally.
- **7 runs per cell** → 168 page-load runs, ≈ 1.5–2 h unattended. `baseline.json` shows a 30-point
  spread over 3 runs on product/mobile, so 3 runs cannot resolve a theme delta.
- **Every run of every metric is kept** in `results.json`, plus the full requests list per run for owner
  grouping. Reported per cell: median, min–max, IQR.
- **Desktop is the more sensitive instrument** (baseline spread 2–6 vs up to 30 on mobile). Mobile is
  still reported, because 52% of loads are mobile.

## 5. Metrics, in order of trust

1. **Static bytes** — CSS/JS files loaded on the product page, raw + gzip: repo vs R0's pulled files,
   plus `v15.3.0 → v16.0.0` upstream drift. No store needed.
2. **Transfer bytes + request count by owner** — theme assets / images / Judge.me / Clarity / Shop chat /
   Google Tag / Shopify platform (checkout prefetch, `wpm` pixels, `cdn.shopify.com`, `shop.app`,
   telemetry). Deterministic except checkout prefetch (86 vs 93 requests on identical code).
3. **Liquid server render** — `shopify theme profile --theme <id> --url <path> --json`, 5 runs per
   variant × product, median total ms + widest frames. Checked working on unpublished #188293415228
   (5.5 s per call; `SHOPIFY_CLI_THEME_TOKEN` must be unset).
4. **Lighthouse load metrics** — LCP, FCP, TBT, CLS, Speed Index, score; main-thread time and long
   tasks, split into theme vs third-party scripts.
5. **Interaction cost (INP proxy)** — Lighthouse user flow on mobile emulation (4× CPU), 5 runs per
   variant, on P3: `startTimespan` → interaction → `endTimespan`. Reports interaction latency, TBT during
   the span, and long tasks. Which interaction: see *Needs your decision*.

**Pre-flight finding (P1, desktop, one run each): R0 makes 331 requests vs 275 on R3.** Grouped by
owner, the gap is **not** theme code — R0 loads *fewer* theme assets (45 vs 59):

| Owner | R3 live | R0 Dawn 16 |
|---|---|---|
| `cdn.shopify.com` | 37 req / 255 KB | **85 req / 311 KB** |
| Shopify telemetry (`otlp`, `monorail`, `error-analytics`) | 15 | **39** |
| `shop.app` | 1 req / 4 KB | **3 req / 41 KB** |
| theme assets (`/cdn/shop/t/`) | **59 req / 156 KB** | 45 req / 95 KB |
| images | 21 req / 690 KB | 13 req / 726 KB |
| checkout prefetch | 86 req / 822 KB | 93 req / 851 KB |
| Google Tag | 3 req / 507 KB | 3 req / 507 KB |

The working hypothesis is Dawn 16.0.0's customer-account popover in the header, which loads Shopify
platform components. That is an upstream change, not yours. Step 4 keeps full request lists, so the report
can confirm or reject this.

## 6. Decision rule (fixed before measuring)

A delta becomes a **candidate follow-up task** only if **all** hold:

1. the medians differ by more than the larger IQR of the two cells, **and**
2. it holds in **≥ 2 of 3 products**, **and**
3. it lands on something that matters here: mobile interaction cost (INP is the only field metric near
   its threshold — product/mobile p75 160 ms), **or** a byte/request cost owned by theme code, **or**
   field-relevant LCP/CLS.

Lab LCP alone is never enough: product/mobile lab LCP was 8,437 ms while field p75 is 1,624 ms.
Deltas caused by the upstream 15.3.0 → 16.0.0 changes (§1 confound) are reported, but they are not your
regressions.

## 7. Side effects on the store

- **2 unpublished themes created** (`PERF-REF Dawn16 apps`, `PERF-REF Dawn16 mirrored`), deleted after
  measurement with your OK. R0 (#188293415228) is only read. Theme count returns to 17.
- **Analytics noise:** ≈ 200 headless page loads. Lighthouse's user agent should be classed as a bot by
  Shopify analytics. Clarity (on R1–R3) may record them. No reviews or orders are created.
- The live theme is never modified.

## 8. Outputs

- `docs/perf/compare-themes.js` — the runner (this method, re-runnable after future fixes)
- `docs/perf/dawn-compare/results.json` — every run
- `docs/perf/dawn-compare/REPORT.md` + a published Artifact — ladder tables, owner breakdown, static
  diff, upstream-drift bound, interaction findings, verdict per §6
- `baseline.json` is **not** touched.

---

## Decisions (approved by the store owner, 2026-09-10)

1. **R0 = existing `Dawn` #188293415228, read-only.** Confirmed untouched. 2 new themes → 19/20 slots:
   **R1 = #188298821948** `PERF-REF Dawn16 apps (do not publish)`, **R2 = #188298854716**
   `PERF-REF Dawn16 mirrored (do not publish)`, both pushed 2026-09-10, theme check 0 errors.
   Port notes for R2: recently-viewed section dropped (no Dawn equivalent); both `product-suggestions`
   sections → Dawn `related-products` (related intent only; complementary returns 5–6 products live, so
   the card count matches); custom `footer-reveal` footer → Dawn stock `footer`; product-template
   settings Dawn lacks (`enable_sticky_buy_*`, `mobile_lightbox_style`,
   `desktop_description_threshold`, section paddings on `apps`) dropped.
2. **Interaction = add-to-cart → cart opens**, on P3, mobile emulation, 5 runs per variant. R0/R1 open
   Dawn's notification popup; R2/R3 open the drawer, which is part of the configuration cost. The
   throwaway headless carts are accepted.
3. **7 runs per cell** (168 page-load runs, ≈ 2 h unattended).
