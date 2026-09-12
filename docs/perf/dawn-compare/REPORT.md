# Product page — informatica theme vs Dawn 16.0.0

**Measured:** 2026-09-10 · **Store:** `c2da09-15.myshopify.com` · **Method:** [`METHOD.md`](./METHOD.md)
· **Raw data:** [`results.json`](./results.json) (every run) · **Runner:** [`../compare-themes.mjs`](../compare-themes.mjs)
**Scope:** research only — no theme code was changed.

---

## Verdict

**Your theme is not slower than Dawn where it shows up for users, but its own code measurably costs
main-thread time.**

- **Same scores and server speed as Dawn.** Desktop Lighthouse is 98–99 on every rung. Liquid server
  render is 39–44 ms on your theme vs 35–59 ms on the Dawn rungs — no difference.
- **Lighter overall than Dawn 16.** Your page transfers 237–261 KB less and makes ~100 fewer requests than
  the mirrored Dawn. That is not your optimisation: Dawn 16.0.0's new customer-account popover pulls in Shop
  sign-in and Shop Pay login components (§3). It's an upstream change.
- **The cost your code adds (R3 vs mirrored Dawn R2, desktop, all 3 products):**
  - **+284 to +350 ms main-thread work**, and TBT +35 to +69 ms (still small in absolute terms);
  - **+17–23% DOM nodes** (2,176–2,442 vs 1,804–1,991) and **+19–27 KB HTML**;
  - **+50 KB theme asset transfer** (59 files / 156 KB vs 51 / 106 KB);
  - **+100 to +216 ms lab LCP** — still ~0.8–0.9 s, and field LCP p75 is 1.6–1.8 s (good).
- **The apps cost about as much as your whole customisation.** Adding Judge.me, Shop chat and Clarity to stock
  Dawn (R1 − R0) adds +313 to +390 ms main-thread work, +208–298 KB and +65–73 KB HTML.
- **Add-to-cart responsiveness is fine everywhere:** lab INP 42–59 ms on all rungs (threshold 200 ms).

- **Both costs trace to two specific, contained causes** (§4a, §4b):
  - **The footer-reveal scroll effect** (`vendor-motion-scroll.min.js` plus a blur/scale `update()` on every
    scroll frame) is 85–90% of your theme's script-attributed time, on **every page of the site**.
  - **The mobile fullscreen lightbox** downloads every product image at original size on page load:
    **+~270 KB of images per mobile product view**.
- **Mobile confirms the byte, DOM and request findings.** Your theme has the highest TBT on all 3 products,
  but under the mobile preset that difference is lost in app and Google Tag noise (§7).

---

## 1. What was compared

| Rung | Theme | Contents | Step isolates |
|---|---|---|---|
| **R0** | `Dawn` #188293415228 | stock Dawn 16.0.0, no apps | — |
| **R1** | #188298821948 | R0 + your 4 app embeds + Judge.me badge/reviews | **apps** |
| **R2** | #188298854716 | R1 + your theme settings, product template, header/footer groups | **configuration** |
| **R3** | live `dawn/main` #188294955324 | your theme | **your code** |

Top 3 landing products (ShopifyQL, 90 days): **P1** `kvr32s22d816` (612 sessions), **P2** `ustroystvo-videozakhvata-easycap-usb-20`
(281), **P3** `perekhodnik-audio-optikakoaksial-to-2rca-35mm-blok-pitaniy` (235).

Every run was a fresh headless Chrome, selecting the theme with a domain-scoped `_shopify_essential` preview
cookie. That gives 0 redirects and a TTFB identical to the live theme. Every run asserted the rendered
`Shopify.theme.id`. Variants were interleaved with a rotated order each round; 7 runs per cell, medians with IQR.
**0 failed attempts** across all runs.

## 2. Page load — desktop (7 runs × 3 products, complete)

Medians; the ranges span the three products. ✱✱ = beyond the larger IQR on ≥ 2 of 3 products, same direction
(METHOD §6 rules 1–2).

| Metric | R0 stock | R1 + apps | R2 mirrored | R3 yours | R1−R0 apps | R2−R1 config | R3−R2 your code |
|---|---|---|---|---|---|---|---|
| Score | 99 | 99 | 99 | 98–99 | 0 | 0 | 0 to −1 |
| LCP ms | 730–778 | 748–788 | 665–694 | 768–910 | −1 to +58 | **−54 to −122 ✱✱** | **+101 to +216 ✱✱** |
| FCP ms | 563–566 | 600–602 | 603–605 | 612–619 | **+36 to +39 ✱✱** | +1 to +3 | **+7 to +16 ✱✱** |
| TBT ms | 20–29 | 17–28 | 23–24 | 59–92 | −3 to −1 | −4 to +7 | **+35 to +69 ✱✱** |
| CLS | 0.000 | 0.000 | 0.000–0.001 | 0.000 | 0 | 0 | 0 |
| Speed Index ms | 1073–1098 | 1078–1197 | 934–1013 | 990–1029 | +5 to +107 | **−138 to −252 ✱✱** | −23 to +95 |
| Main thread ms | 1280–1377 | 1623–1713 | 1582–1605 | 1884–1946 | **+313 to +390 ✱✱** | −23 to −108 | **+284 to +350 ✱✱** |
| Transfer KB | 2606–2974 | 2904–3182 | 2593–3025 | 2332–2788 | **+208 to +298 ✱✱** | **−112 to −311 ✱✱** | **−237 to −261 ✱✱** |
| Requests | 332–358 | 371–380 | 371–384 | 265–282 | **+22 to +42 ✱✱** | −4 to +13 | **−100 to −106 ✱✱** |
| HTML KB | 202–218 | 267–289 | 270–297 | 289–324 | **+65 to +73 ✱✱** | **+3 to +8 ✱✱** | **+19 to +27 ✱✱** |
| DOM nodes | 1349–1423 | 1548–1728 | 1804–1991 | 2176–2442 | **+199 to +328 ✱✱** | **+256 to +265 ✱✱** | **+326 to +451 ✱✱** |

Reading the steps:
- **Apps (R1−R0)** is the largest main-thread step: Judge.me's 13 extension files, the Shop chat widget, and the
  inline JSON/scripts the embeds add to the HTML.
- **Configuration (R2−R1)** makes Dawn *faster*. Your system fonts remove the 23 KB font download, and
  dynamic-checkout buttons are off in your template, which drops the "portable wallets" scripts. It also adds
  ~260 DOM nodes (two recommendation grids, the cart drawer).
- **Your code (R3−R2)** trades ~100 fewer requests and ~250 KB less transfer (upstream popover absent) for
  ~+300 ms of main-thread work, +20% DOM and a slightly later LCP.

## 3. Where the bytes and requests go

Desktop transfer by owner (median across products, requests / KB):

| Owner | R0 | R1 | R2 | R3 |
|---|---:|---:|---:|---:|
| Shopify checkout prefetch | 98 / 859 | 108 / 872 | 108 / 872 | 88 / 843 |
| Shopify CDN (`cdn.shopify.com`, `shopifycloud`) | 91 / 426 | 106 / 605 | 104 / 530 | **42 / 288** |
| Google Tag | 15 / 512 | 16 / 512 | 16 / 512 | 15 / 512 |
| Images | 9 / 481 | 9 / 480 | 20 / 447 | 21 / 478 |
| Shopify web pixels | 8 / 168 | 8 / 168 | 8 / 168 | 8 / 168 |
| **Theme assets** (`/cdn/shop/t/`) | 42 / 90 | 42 / 90 | 51 / 106 | **59 / 156** |
| Document (HTML, compressed) | 1 / 35 | 1 / 50 | 1 / 51 | 1 / 56 |
| `shop.app` | 3 / 41 | 3 / 41 | 3 / 41 | 1 / 4 |
| Fonts | 0 / 0 | 2 / 23 | 2 / 23 | 0 / 0 |
| Shopify telemetry | 48 / 1 | 47 / 1 | 35 / 1 | 15 / 0 |
| Shop chat · Judge.me (own hosts) | — | 2 / 14 · 2 / 2 | 2 / 14 · 2 / 2 | 2 / 14 · 2 / 2 |

**The ~100-request gap is Dawn 16.0.0's customer-account popover**, not your theme. Shopify CDN paths on P1
(median requests per run):

| Path | R0 | R1 | R2 | R3 |
|---|---:|---:|---:|---:|
| `shopifycloud/shop-js/modules` | 43 | 43 | 43 | 19 |
| `shopifycloud/arrive-server/pay` (Shop Pay login) | 31 | 31 | 31 | 0 |
| `storefront/web-components/account*`, `login-form.js`, `standard-events.js` | 6 | 6 | 6 | 0 |
| `shopifycloud/portable-wallets` (dynamic checkout) | 2 | 2 | 0 | 0 |
| Judge.me extension (`extensions/…/judgeme-749`) | 0 | 13 | 13 | 13 |

About 1.3 MB of every page, on every rung, is store-wide and theme-independent: checkout prefetch, Google Tag and
web pixels. `backlog.md` already lists those as store-owner items.

## 4. Static code size (no store involved)

CSS + JS files your product page references: **468 KB raw / 111 KB gzip on your theme vs 322 KB / 74 KB on
Dawn 16 (+46% raw, +50% gzip).** Upstream 15.3.0 → 16.0.0 grew the equivalent Dawn file set by only +9 KB gzip,
so almost all of the difference is yours. Full table: [`static-bytes.txt`](./static-bytes.txt).

| File | Yours (raw / gz) | Upstream base 15.3.0 | Note |
|---|---|---|---|
| `base.css` | 126 / 21.9 KB | 80 / 13.4 KB | +46 KB raw, +2,538 changed lines |
| `section-main-product.css` | 46 / 8.2 KB | 32 / 5.8 KB | +14 KB |
| `tailwind.output.css` | 21 / 4.4 KB | — | added (render-blocking link) |
| `vendor-motion-scroll.min.js` | 15 / 6.3 KB | — | added |
| `product-price-update.js` | 14 / 4.0 KB | — | added |
| `product-modal.js` | 9.1 / 2.2 KB | 1.3 / 0.5 KB | ×7 |
| `media-gallery.js`, `product-info.js`, `global.js` | 7.2 · 18.8 · 44.7 KB | 4.9 · 16.1 · 43.8 KB | modified |
| `judgeme-enhancements.js`, `product-description-toggle.js`, `component-product-info-block.css` | 6.7 · 6.5 · 5.7 KB | — | added |
| `footer-reveal.js/.css`, `recently-viewed-related.js`, `shared-backgrounds.css`, `magnify.js`, `quantity-popover.*` | 1–3.5 KB each | some from base | added or config |

Since the 15.3.0 base (`54102dd4`): 125 theme files changed (+14,561 / −4,001 lines; 58 new, 66 modified).
The product-page render path alone is +4,434 / −1,863 lines.

### 4a. Which of your scripts cost main-thread time

A diagnostic Lighthouse run per rung × device on P1 and P3, with the 50 ms reporting threshold removed. These
are single runs, for attribution, not statistics. Script evaluation per theme file, ms:

| Theme file | R3 desktop P1 / P3 | R3 mobile P1 / P3 | Loaded by |
|---|---:|---:|---|
| **`vendor-motion-scroll.min.js`** | **435 / 453** | **581 / 640** | `sections/footer-reveal.liquid:2` |
| `footer-reveal.js` | 19 / 31 | 34 / 30 | `sections/footer-reveal.liquid:3` |
| `global.js` | 19 / 8 | 29 / 40 | `layout/theme.liquid` (Dawn) |
| `judgeme-enhancements.js` | 2 / 3 | 7 / 11 | `layout/theme.liquid:414` |
| ↳ of which JavaScript execution (`vendor-motion-scroll.min.js`) | 35 / 32 | 152 / 173 | |
| **All theme scripts** | **506 / 519** | **764 / 826** | |
| All theme scripts on R0 / R1 / R2 | 26–55 | 90–250 | |

**One effect explains your theme's main-thread cost, and it isn't the download.**
`vendor-motion-scroll.min.js` (15 KB, the Motion library) accounts for 85–90% of your theme's script-attributed
time. But only **32–35 ms on desktop / 152–173 ms on mobile** of that is JavaScript execution. The remaining
~400 ms is style, layout and paint work that Lighthouse attributes to the script:

- `footer-reveal.js` registers `window.Motion.scroll(update)`.
- `update()` writes `opacity`, `transform` **and `filter: blur()`** to the footer, once on setup and again on
  every scroll frame.
- That forces geometry reads and expensive blur repaints.

Nothing else in the theme uses `window.Motion`. **`footer-reveal` sits in `footer-group.json`, so this runs on
every page of the site**, not just product pages. The add-to-cart test agrees: 998 ms of theme script during a
timespan that scrolls the button into view, vs ~0 on the Dawn rungs (§5).

### 4b. Why your theme downloads more images on mobile

Image requests on the diagnostic runs, KB:

| | R2 mirrored Dawn | R3 yours |
|---|---|---|
| P1 mobile | **217** — 3 product images at `?width=713` + logo | **541** — the same 3 images as **originals, no width** (208 + 129 + 68 KB) **plus** `?width=650` copies |
| P3 mobile | **123** — 3 images at `?width=713` | **268** — originals (80 + 72 + 53 KB) plus `?width=650` copies |
| P1 / P3 desktop | 643 / 175 | 689 / 222 (in line) |

**Cause: the custom fullscreen mobile lightbox loads every product image on page load.**

1. The lightbox (`snippets/product-media-modal.liquid`) holds a copy of every product image, rendered by
   `snippets/product-media.liquid` with `loading="lazy"` and
   `sizes="(min-width: 750px) calc(100vw - 22rem), 1100px"`. Below 750 px that asks for an **1100 px** slot, and
   for images narrower than that the only large enough `srcset` candidate is the **original**.
2. Dawn keeps those copies from loading by hiding inactive items with `display: none`
   (`assets/section-main-product.css:910`).
3. Your mobile fullscreen style overrides that with
   `.product-media-modal[data-mobile-style="fullscreen"] .product-media-modal__content > * { display: flex !important; flex: 0 0 100vw; }`
   (`assets/section-main-product.css:1823`). The closed lightbox is only `visibility: hidden`, and it is
   `position: fixed; top: 0`, so the browser treats the laid-out lazy images as in view and downloads the
   originals immediately — before anyone taps an image.

Stock Dawn uses the same `product-media.liquid` markup and doesn't download them, which confirms the trigger is
the fullscreen override, not the snippet.

## 5. Add-to-cart interaction (P3, mobile emulation, 5 runs)

| Metric | R0 | R1 | R2 | R3 |
|---|---:|---:|---:|---:|
| Lab INP ms (median · IQR) | 42 · 4 | 50 · 2 | 44 · 1 | **59 · 12** |
| TBT during interaction ms | 188 · 54 | 199 · 4 | 220 · 59 | 242 · 125 |
| Click → cart visible ms | 1327 (popup) | 1259 (popup) | 1822 (drawer) | 1762 (drawer) |
| Script ms during interaction (≥ 50 ms scripts) | 1493 | 1569 | 1844 | **2127** |

- **INP is far below 200 ms on every rung.** Your theme's +15 ms over mirrored Dawn is beyond IQR but tiny.
  Field INP p75 on product/mobile is 160 ms — the gap to the threshold comes from real-device CPU and third
  parties, not from a theme regression this lab setup can see.
- **The drawer takes ~500 ms longer to appear than Dawn's popup** (R2 − R1 +563 ms). That's configuration
  (`cart_type: drawer` re-renders cart sections), and R3 matches R2.
- During the click, **998 ms of script is attributed to your theme's own JS files**, vs none above the 50 ms
  reporting threshold on the Dawn rungs. That fits the footer-reveal scroll handler (§4a) firing when the test
  scrolls the button into view.

## 6. Liquid server render (5 runs × 3 products)

| Product | R0 | R1 | R2 | R3 |
|---|---:|---:|---:|---:|
| P1 | 37 · 3 | 39 · 15 | 59 · 16 | 40 · 3 |
| P2 | 35 · 5 | 46 · 14 | 45 · 5 | 44 · 13 |
| P3 | 36 · 2 | 42 · 5 | 49 · 13 | 39 · 1 |

No meaningful difference. Your widest frames are `content_for_header` (platform, ~3 ms), translation `t`,
`inline_asset_content` and `json_template`, each ~2–3 ms. Note that the first, cold-cache profile of a page
takes 200 ms+, and a single profile run is misleading.

## 7. Page load — mobile (Lighthouse mobile preset, 7 runs × 3 products)

Same layout as §2. ✱✱ = beyond IQR on ≥ 2 of 3 products, same direction.

| Metric | R0 stock | R1 + apps | R2 mirrored | R3 yours | R1−R0 apps | R2−R1 config | R3−R2 your code |
|---|---|---|---|---|---|---|---|
| Score | 73–75 | 72–74 | 73–76 | 72–73 | −3 to +1 | 0 to +3 | −4 to −1 |
| LCP ms | 3177–3328 | 3327–3330 | 3352–3440 | 3254–3325 | 0 to +150 | +25 to +113 | −27 to −186 |
| FCP ms | 2214–2219 | 2215–2222 | 2110–2114 | 2141–2161 | +1 to +3 | **−102 to −108 ✱✱** | +28 to +51 |
| TBT ms | 564–656 | 588–682 | 488–641 | **700–740** | −54 to +118 | −100 to +39 | +63 to +212 (1/3 ✱) |
| CLS | 0.000 | 0.000 | 0.000–0.001 | 0.000–0.066 | 0 | 0 | 0 to +0.065 (P3, noisy) |
| Speed Index ms | 3105–3493 | 3421–3651 | 2927–3379 | 2610–2876 | +17 to +372 | −272 to −550 | **−317 to −503 ✱✱** |
| Main thread ms | 4969–5134 | 6247–6636 | 6224–6447 | 5726–6196 | **+1197 to +1502 ✱✱** | −322 to +70 | −146 to −588 (1/3 ✱) |
| Transfer KB | 2334–2396 | 2584–2652 | 2503–2584 | 2420–2623 | **+245 to +289 ✱✱** | **−68 to −82 ✱✱** | −121 to +39 (mixed) |
| Requests | 315–329 | 361–368 | 355–363 | 255–271 | **+36 to +46 ✱✱** | **−5 to −8 ✱✱** | **−88 to −100 ✱✱** |
| **Images KB** (owner table) | 126 | 126 | 134 | **403** | 0 | +8 | **+269** |
| HTML KB · DOM nodes | as desktop | | | | | | **+19–28 KB · +326–452 nodes ✱✱** |

Reading mobile:
- **Scores and LCP are the same on every rung** (72–76, ~3.2–3.4 s under the throttled preset).
- **The apps are the dominant mobile cost**: +1.2–1.5 s of main-thread work (R1 − R0) on all 3 products. Google
  Tag alone runs ~910 ms of script and ~800 ms of long tasks on every rung.
- **Your code's main-thread cost is present but drowned in that noise.** TBT is highest on your theme for all 3
  products (700–740 ms vs 488–641 ms on R2), but only 1 of 3 clears IQR, so the METHOD rule doesn't count it on
  mobile. Desktop, the steadier instrument, does (§2).
- **Your theme downloads ~270 KB more images on mobile** — a new, theme-owned cost that desktop doesn't show.
  Cause in §4b.
- Your theme paints progressively faster (Speed Index −317 to −503 ms), and still makes ~90–100 fewer requests
  (Dawn 16's popover, §3).

## 8. Verdict against the decision rule (METHOD §6)

A delta becomes a follow-up task only if it (1) exceeds IQR, (2) holds on ≥ 2 of 3 products, and
(3) lands on INP, a theme-owned byte/request cost, or field-relevant LCP/CLS.

| Finding | Rules 1–2 | Rule 3 | Result |
|---|---|---|---|
| **`vendor-motion-scroll.min.js` (footer reveal): +284–350 ms main thread, +35–69 ms TBT (desktop)** | ✅ 3/3 · 2/3 (mobile: highest TBT on 3/3, 1/3 beyond IQR) | ✅ main-thread JS is what INP is made of; field mobile INP 160 ms is the only CWV near its limit | **Follow-up #1** |
| **Mobile lightbox downloads originals: +~270 KB images per mobile product view** | ✅ owner table 403 vs 134 KB; diagnostic confirms on P1 and P3 | ✅ theme-owned byte cost, on 52% of traffic | **Follow-up #2** |
| **+37 KB gzip CSS/JS (`base.css` +46 KB raw, `tailwind.output.css` 21 KB)** | ✅ deterministic | ✅ theme-owned byte cost | **Follow-up #3** |
| **+20% DOM nodes / +20 KB HTML** | ✅ deterministic | ✅ theme-owned; large DOMs slow style and layout on every interaction | **Follow-up #4** (after #1–#3) |
| CLS 0.066 on some mobile P3 runs | ❌ IQR equals the value | field CLS p75 is 0 | watch only |
| +100–216 ms desktop lab LCP | ✅ 2/3 | ❌ field LCP p75 1.6–1.8 s is good | reported, **not a task** |
| Liquid render | ❌ | — | no difference |
| ~100 fewer requests / ~250 KB less than Dawn 16 | ✅ | upstream Dawn change, not yours | **don't "fix"**; note it if you ever rebase onto Dawn 16 |
| Apps (+313–390 ms main thread, +208–298 KB) | ✅ | not theme code | store-owner review (see `backlog.md` "Needs the store owner") |

### Follow-up tasks (candidates for a next session — nothing here has been implemented)

1. **Rework the footer reveal effect.** Files: `sections/footer-reveal.liquid`, `assets/footer-reveal.js`,
   `assets/vendor-motion-scroll.min.js`. The effect is site-wide: the section is in `footer-group.json`.
   - The cost is the per-frame `update()` (blur filter + scale + opacity), not the library download.
     **Deferring the library load won't fix it** for anyone who scrolls.
   - Fix: replace it with a CSS scroll-driven animation (`animation-timeline: view()`, compositor-only
     `opacity`/`transform`, no `filter: blur()`), with a static footer where that isn't supported. That also
     removes the 15 KB library.
   - Expected: up to the measured whole-theme delta — **about −280 to −350 ms desktop main-thread work and most of
     the +35–69 ms TBT**. The larger 435–640 ms per-file figure comes from a different audit (`bootup-time`,
     which attributes style/layout work to the script), so it isn't additive.
   - Verify: re-run `compare-themes.mjs load` for R2 vs R3 (desktop TBT and main thread), then field INP for
     product/mobile a week later (`web_performance`).
2. **Stop the closed mobile lightbox from loading images.** Files: `assets/section-main-product.css:1823`,
   `snippets/product-media.liquid:31`.
   - Options: keep inactive items out of layout until the lightbox opens, and/or give the lightbox images a
     phone-sized `sizes` value.
   - Expected: about −270 KB of images per mobile product view. This is a bandwidth cost on 52% of traffic;
     there is **no measured LCP effect** — your mobile LCP is already slightly lower than mirrored Dawn's, and
     the originals load at `Low` priority.
   - Verify: image bytes in the mobile owner table, plus swipe and pinch-zoom still working in the lightbox.
3. **Trim render-path CSS.** `base.css` is +46 KB raw / +8.5 KB gzip over Dawn; `section-main-product.css` is
   +14 KB; `tailwind.output.css` is 21 KB and stale (`backlog.md` P1-2). Lower priority: desktop FCP cost
   measured only +7 to +16 ms.
4. **DOM size.** After #1–#3, find what adds 330–450 nodes over mirrored Dawn (info blocks, recently-viewed,
   footer-reveal markup, inline SVGs). Track it with the runner's deterministic `dom_size`.

**For the store owner, not theme code:** the apps cost about as much as your whole customisation (R1 − R0).
Worth reviewing: Clarity's second embed (`brandAgents_js`), Judge.me's 13 extension files, and Google Tag,
which is 512 KB and ~800 ms of mobile long tasks on every rung. See `backlog.md` → "Needs the store owner".

## 9. Caveats

- **§4a/§4b diagnostics are single runs** (one per rung × device × product), used to attribute causes, not to
  size them. Sizes come from the 7-run tables.
- **P2 mobile was measured in two sittings**: rounds 1–2 at 17:53, rounds 3–7 at 18:18. Every round contains all
  four rungs, so the comparison stays fair within that product.

- **Lab, not field.** These are controlled comparisons, and the real-user source of truth stays
  `baseline.json.field`. Absolute mobile numbers under the Moto G / slow-4G preset are far worse than real
  users see.
- **All three products are single-variant**, so variant switching was not measured.
- **R2 is an approximation of your configuration.** Dawn lacks recently-viewed, the description toggle,
  sticky buy bars, `mobile_lightbox_style` and the `footer-reveal` footer. Both suggestion sections use Dawn's
  `related-products` (related intent only, same card count). Your white logo is invisible on Dawn's white
  header, but it still downloads. Anything Dawn couldn't mirror is counted as "your code".
- **Script-by-owner tables only include scripts ≥ 50 ms** (Lighthouse `bootup-time` threshold). Dawn's
  individually small files therefore read as 0.
- **Preview-mode artifacts are constant across rungs:** `theme-hot-reload` (1 request) loads on every variant,
  the live theme included.
- **Load mode ran out of Node heap after 120 runs** (in-process Lighthouse leaks ~34 MB per run). It resumed in a
  fresh process, and METHOD's interleaving still holds within each resumed round.
