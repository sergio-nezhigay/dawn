# Performance prompts

Two prompts that drive the performance work on this theme. Paste them into a **fresh**
Claude Code session — they are self-contained.

- **Prompt A** — already run, 2026-09-05. **Do not run it again** unless you are re-baselining
  from scratch; it would overwrite `backlog.md` and `baseline.json`. Kept for the record.
  Several facts embedded in it were disproved by the run itself — see the note below.
- **Prompt B** — paste **every week**. Executes one ~1–2 hour slice from the backlog, proves
  it helped and proves it broke nothing, then updates the baseline. **This is the one to use.**

Files involved:

```
docs/perf/
  PROMPTS.md      <- this file
  backlog.md      <- ranked <=2h items, data sources, gotchas   READ THIS FIRST
  baseline.json   <- field + lab + profile + bytes; the contract
  measure.js      <- Lighthouse runner (fixed conditions)
  mkfield.js      <- ShopifyQL web_performance -> field.json
  mkbaseline.js   <- assembles baseline.json
```

Written 2026-09-05 against Shopify CLI 4.7.1. Prompt B was corrected on the same date after
Prompt A's run contradicted it.

> **What Prompt A got wrong** (corrected in Prompt B, kept here so it is not rediscovered):
> - Admin GraphQL `performanceMetrics` returns an **empty array** for this shop. Field data
>   comes from the **ShopifyQL `web_performance`** schema instead.
> - `tailwind.output.css` transfers as **0 KB / 0 ms**. It was not a byte problem; it ships a
>   stale-build *correctness* bug instead.
> - Measuring via `?preview_theme_id=` adds a **302 worth ~780 ms** to every LCP. Theme
>   186192232764 is **live**, so the plain URL renders this repo's code — and `npm run dev`
>   syncs edits to production.
> - The lab and the field disagree: lab product/mobile LCP 8437 ms vs field p75 1624 ms
>   (good). Prioritise from field data.
> - Real traffic is product 74.7% / collection 14.4% / index 3.8% — not Shopify's generic
>   17/40/43 weighting.

---

## Prompt A — Performance audit, baseline + regression guard (run once)

```text
You are in the Shopify theme repo at C:\projects\informatica\dawn — a customized Dawn theme
with an added, likely stale Tailwind v4 build. Windows / PowerShell. Dev store:
c2da09-15.myshopify.com. Live storefront: informatica.com.ua. Local dev = `npm run dev`
(shopify theme dev). Do NOT use `shopify theme push` / `pull`.

GOAL: Produce (1) a grounded, prioritized, weekly-executable performance backlog, (2) a
committed measurement baseline, and (3) a working CI regression guard. This session changes
NO theme code — the only files you may create or edit are docs/perf/* and
.github/workflows/ci.yml.

Deliverables, all committed on one branch:
  docs/perf/backlog.md    — ranked fix items, each sized <= 2 hours
  docs/perf/baseline.json — the numbers every future week is compared against
  .github/workflows/ci.yml — regression guard repaired (details in STEP 5)

=== VERIFIED FACTS — rely on these, do not re-derive them ===
- Core Web Vitals = LCP, INP, CLS. TTFB and FCP are diagnostics, not CWV.
- Shopify's official method: field data to FIND problems, lab data to DEBUG them, field data
  again to VERIFY the fix landed. Follow that order.
- Target bar: average Lighthouse performance >= 60 across home + product + collection, on
  BOTH mobile and desktop. Shopify's page weighting: home 17%, product 40%, collection 43%
  — product/collection regressions cost the most.
- Lab protocol: test a shopifypreview.com URL with `?pb=0` appended, in a clean profile;
  run each URL >= 3 times and use the MEDIAN. Single runs vary 5–10 points, so any delta
  under ~10 points from a single run is noise, not a result.
- `AssetSizeCSS` / `AssetSizeJavaScript` do NOT exist in the current Shopify CLI Theme Check
  (verified on CLI 4.7.1 via `shopify theme check --list`; they were legacy Ruby-gem rules).
  Do not try to enable them. Budget bytes via Lighthouse `total-byte-weight`,
  `unused-css-rules`, `unused-javascript` and DevTools coverage instead.
- Perf rules that DO ship: ParserBlockingScript, CdnPreconnect, ImgWidthAndHeight (errors);
  RemoteAsset, AssetPreload, PaginationSize (maxSize 250), DeprecateLazysizes,
  DeprecateBgsizes (warnings). .theme-check.yml disables only PreconnectLinks,
  TemplateLength, MatchingTranslations.
- `shopify theme profile --url=<path> --json` exists on CLI 4.7.1 and gives Liquid
  server-render timings as JSON — use it, not screenshots, so it can be diffed later.
- Known suspects: assets/tailwind.output.css (~21 KB) is rendered unconditionally with
  `stylesheet_tag` near the end of layout/theme.liquid's <head> (~line 328 as of
  2026-09-05 — the repo CLAUDE.md says line 300 and is already stale, so re-locate it
  rather than trusting either number). It is an extra render-blocking stylesheet AND it
  conflicts with this project's own rule against using Tailwind for new styling. Other
  large raw assets: base.css ~126 KB, section-main-product.css ~46 KB,
  component-facets.css ~34 KB, global.js ~44 KB. The rest of the <head> is clean —
  scripts deferred, font_display: swap, gated fonts.shopifycdn.com preconnect.

=== STEP 0 — Tooling setup (do this first, report what worked) ===
Check `claude mcp list`. As of 2026-09-05 neither server below was connected. Add whatever
is missing, then re-run `claude mcp list` to confirm:
  claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest
  claude mcp add shopify-dev -e LIQUID=true -e LIQUID_VALIDATION_MODE=full -- npx -y @shopify/dev-mcp@latest
What they give you:
  - chrome-devtools: performance_start_trace(pageId, reload, autoStop, filePath),
    performance_stop_trace, performance_analyze_insight(pageId, insightName, insightSetId),
    lighthouse_audit, emulate(cpuThrottlingRate, networkConditions, viewport),
    list_network_requests / get_network_request, evaluate_script, take_snapshot,
    list_console_messages. It also pulls CrUX field data into trace insights automatically.
    Shopify's own 2026 performance-tooling guidance recommends this server.
  - shopify-dev: call `learn_shopify_api` FIRST (it issues the conversation token every
    other tool needs), then Liquid docs search plus `validate_theme` (whole directory) and
    `validate_theme_codeblocks` (single file).
If chrome-devtools MCP will not start, fall back to the claude-in-chrome tools already in
this environment plus manual Lighthouse runs, and say so explicitly in backlog.md. Never
silently degrade the measurement method.
The Shopify AI Toolkit plugin (shopify-admin / shopify-admin-execution skills) should
already be installed; if those skills are missing, install it with
`/plugin marketplace add Shopify/shopify-ai-toolkit` then
`/plugin install shopify-plugin@shopify-ai-toolkit`.

=== STEP 1 — Establish data sources (try in order; record which worked) ===
a) FIELD DATA — Shopify RUM. Use the shopify-admin skill to search the docs and VALIDATE
   the query, then shopify-admin-execution to run it:
     shopify store auth --store informatica.com.ua --scopes read_reports
     shopify store execute --store informatica.com.ua --query '...'
   The root query is `performanceMetrics(aggregationLevel: DAILY, deviceTypes: [ALL],
   maxDays: 90, storefrontId: "online_store")` returning `deviceType` and
   `metrics` (JSON). IMPORTANT: this query is only available on the **unstable** API
   version — it is explicitly unsupported on 2026-07/latest, so target `unstable` or the
   call will fail. It needs the authenticated user to have themes AND reports access.
   Extract p75 LCP / INP / CLS by page type and device, and capture the RUM **event
   annotations** (they correlate metric moves with theme and app updates — that is your
   history of past regressions and who caused them).
b) FALLBACKS, in order, if (a) is unavailable: ask me to paste an export or screenshot of
   Admin > Online Store > Themes (web performance dashboard); or read CrUX for
   informatica.com.ua (origin summary + top URLs) — chrome-devtools MCP surfaces CrUX in
   trace insights, and the CrUX API is also directly queryable.
c) TRAFFIC — top pages by sessions, last 90 days. Prefer ShopifyQL through the same skills;
   look up the current sessions-by-page dataset and dimension names in the docs rather than
   assuming them. Admin Analytics "Top online store pages" is an equivalent source. If
   neither is reachable, ask me for a Shopify Analytics or GA4 top-pages export.
Collapse URLs into template buckets: index, product, collection, blog, article, page, cart,
search, customers/*. Record each bucket's session share.

=== STEP 2 — Choose the pages that matter ===
Rank template buckets by (session share) x (field CWV gap vs the "good" thresholds) x
(purchase proximity: product/cart > collection/search > blog/page). Cross-check against the
17/40/43 weighting. Select 3–5 representative REAL URLs — at minimum a real product, a real
collection and the home page. List each with its reason. These URLs become the tracked set
in baseline.json and must not change week to week without a note saying why.

=== STEP 3 — Baseline measurement of THIS repo's code ===
Start `npm run dev`, take the preview URL, append `?pb=0`.
Fix the measurement conditions once and reuse them everywhere: use chrome-devtools
`emulate` with an explicit cpuThrottlingRate and networkConditions (state the values you
chose in baseline.json) so future runs are comparable. Close other tabs.
For each tracked URL, on mobile emulation and on desktop:
  - `lighthouse_audit` 3x -> record the MEDIAN performance score, LCP, TBT, CLS.
  - `performance_start_trace(reload: true, autoStop: true)` once ->
    `performance_analyze_insight` on every insight it flags. Record the LCP subparts
    breakdown (TTFB / load delay / load time / render delay), render-blocking resources,
    long tasks, and layout-shift culprits. This is the part Lighthouse scores cannot tell
    you, and it is where the actual fixes come from.
  - `list_network_requests` -> third-party origins, their byte weight and blocking behavior.
Then, repo-wide:
  - `shopify theme check` — capture every performance finding.
  - `shopify theme profile --url=<product path> --json` and the same for the collection
    path — capture the widest Liquid frames (server/TTFB cost) and their source files.
  - `validate_theme` via shopify-dev MCP — record the current violation count.
  - Asset audit: list assets/*.js and assets/*.css by raw byte size; use the Lighthouse
    treemap and coverage data for unused-CSS/JS % on the largest files; audit
    layout/theme.liquid's <head> for render-blocking links, preloads, preconnects, fonts.
  - Tailwind flow: is tailwind.output.css actually referenced, and where exactly? How stale
    is it versus tailwind.input.css? What fraction of its rules is used on the tracked
    templates? What breaks if it is removed? Write a concrete removal/migration path.
  - Third-party + store settings: enumerate app embeds and injected scripts (content_for_
    header, app blocks, app entries in settings_data.json), tracking pixels, external
    domains. Also in scope: oversized/unoptimized images, missing image_url sizing,
    redirect chains, checkout "additional scripts", apps injecting storefront JS. Mark each
    as THEME-CODE action or STORE-OWNER action, and for store-owner items give the exact
    Admin click-path.

=== STEP 4 — Write docs/perf/baseline.json ===
This file is the regression contract. Machine-readable, one object:
  - `measured_at`, `commit` (git SHA), `cli_version`, `tooling` (which MCP servers/fallback)
  - `conditions`: cpuThrottlingRate, networkConditions, viewport(s), preview URL pattern
  - `field`: p75 LCP/INP/CLS per template bucket per device, plus the data source used
  - `pages`: for each tracked URL x device -> median performance score, LCP, TBT, CLS, and
    the total transferred bytes
  - `liquid_profile`: the widest frames per profiled URL, in ms, from `theme profile --json`
  - `assets`: raw byte size of every file in assets/ over 10 KB
  - `theme_check`: offense count by rule; `validate_theme`: violation count
  - `noise_band`: 10 (points) — the threshold below which a Lighthouse delta means nothing
Keep it small enough to read in a diff. Every future week compares against this file.

=== STEP 5 — Repair the CI regression guard (.github/workflows/ci.yml) ===
Current state: `shopify/theme-check-action@v2` runs and is fine. The
`shopify/lighthouse-ci-action@v1` block at lines 23-39 is fully commented out AND stale.
Fix all four problems:
  1. The workflow triggers `on: [push]`. Add `pull_request` — LHCI's whole value is score
     comments on PRs, which never fire on push-only.
  2. The commented block passes `access_token:` — legacy custom-app auth. Shopify stopped
     allowing new custom apps in January 2026; the action now takes `client_id` +
     `client_secret` from a Dev Dashboard app. Rewrite it that way and tell me exactly which
     repository secrets to create and where in the Dev Dashboard to get each value.
  3. It is pinned at `lhci_min_score_performance: 0.8`, well above the action's own 0.6
     default and far tighter than Dawn+Tailwind run-to-run noise allows — that is almost
     certainly why it was disabled. Set it to 0.6, matching the >= 60 bar.
  4. Uncomment and enable it. `lhci_github_app_token` is optional; if I have not supplied
     one, leave it out and rely on the job's own pass/fail plus its log output rather than
     blocking on a token I may never create.
Do NOT touch the tailwindcss-update job above it — leave it commented as found.
Verify the workflow YAML parses before committing.

=== STEP 6 — Write docs/perf/backlog.md ===
  - Header: date; which data sources actually worked; ranked template list with session
    shares; the baseline table (URL x device -> median perf / LCP / CLS), pointing at
    baseline.json as the source of truth.
  - A prioritized list of fix items. EACH item must have:
      * ID + one-line title
      * Problem + evidence (which measurement, which file/line, which URL, which trace
        insight)
      * Metric it moves (LCP / INP / CLS / TTFB / bytes) + rough expected gain
      * Fix outline (specific files under C:\projects\informatica\dawn)
      * Effort estimate — size EVERY item to <= 2 hours; split anything larger
      * Risk + exact revert path
      * Verification — the before/after check, naming the tracked URLs to re-measure
      * Depends-on — other item IDs, or "store owner" if it needs Admin access
  - Sort by (impact / effort), P1 first. Add a suggested week-by-week sequence (~1 slice per
    week, each <= 2h) while keeping items independently pickable.
  - Subsection "Quick wins": under 30 minutes, zero risk.
  - Subsection "Needs the store owner": Admin/settings/app items, each with the exact Admin
    click-path so it can be handed to me verbatim.
  - Subsection "Regression watch": what has historically regressed (from the RUM event
    annotations), which app or theme change caused it, and what to check first if scores
    drop again.

Commit all of it on one branch. Change no theme code. Finish by printing the Week 1 slice.
```

---

## Prompt B — Weekly slice, regression-checked (paste each week, fresh session)

```text
Repo: C:\projects\informatica\dawn (customized Dawn + Tailwind v4). Windows / PowerShell.
Store c2da09-15.myshopify.com, custom domain informatica.com.ua.

DANGER: `npm run dev` targets `--theme 186192232764`, which is the LIVE theme, so
`shopify theme dev` syncs local edits straight to production. Do not run it while editing
theme files. Measurement never needs it — the tracked URLs are public.
Do NOT use `shopify theme push` / `pull` either.

GOAL: Execute ONE ~1–2 hour performance slice from docs/perf/backlog.md, prove it helped and
prove it broke nothing, then update the baseline. One slice only, then stop.

0. If docs/perf/backlog.md or docs/perf/baseline.json is missing, stop and tell me to run
   Prompt A from docs/perf/PROMPTS.md first. Do not improvise either file.
   READ FIRST, and prefer them over this prompt wherever they disagree — they were written
   from measurement, this prompt was written from assumptions:
     - docs/perf/backlog.md sections "Data sources", "Gotchas worth keeping", and
       "Reproducing this baseline"
     - docs/perf/baseline.json `conditions`, `field` and `noise_band_note`
   chrome-devtools + shopify-dev MCP and the Shopify AI Toolkit plugin are already
   installed. Confirm with `claude mcp list`; re-add only if missing:
     claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest
     claude mcp add shopify-dev -e LIQUID=true -e LIQUID_VALIDATION_MODE=full -- npx -y @shopify/dev-mcp@latest
   Call `learn_shopify_api` before any other shopify-dev tool.

1. REGRESSION SWEEP FIRST, before picking any work. Read baseline.json, then pull current
   field data with ShopifyQL — NOT with Admin GraphQL `performanceMetrics`, which returns an
   empty array for this shop (verified 2026-09-05 with valid auth and read_reports, with and
   without storefrontId, with explicit deviceTypes). Do not retry it.

     shopify store auth --store c2da09-15.myshopify.com --scopes read_reports
     shopify store execute --store c2da09-15.myshopify.com --json --query 'query {
       shopifyqlQuery(query: """
         FROM web_performance
         SHOW page_loads, percent_of_page_loads, lcp_p75_ms, inp_p75_ms, p75_cls, fcp_p75_ms
         GROUP BY page_type, device_type SINCE -90d ORDER BY page_loads DESC
       """) { tableData { columns { name dataType } rows } parseErrors } }'

   Note: `--store` needs the .myshopify.com domain (the custom domain makes the CLI request
   `informatica.com.ua.myshopify.com` and fail on a cert mismatch); the flag is `--version`,
   not `--api-version`; and metric naming is `lcp_p75_ms` / `inp_p75_ms` but `p75_cls`.

   Compare against baseline.json's `field` block. Judge regressions on FIELD data, not lab
   scores. Weight by real traffic share (product 74.7%, collection 14.4%, index 3.8%) — not
   Shopify's generic 17/40/43. Ignore any page_type/week with fewer than ~30 page loads:
   index/mobile runs 4-19 loads a week and its p75 swings wildly for that reason alone.
   RUM event annotations are NOT available (same dead query), so a regression cannot be
   auto-attributed — check the Admin changelog and recent commits by hand instead.
   If anything regressed beyond the noise band, that regression IS this week's slice —
   name the likely cause and fix or revert it instead of taking the next backlog item.

2. Otherwise pick the highest (impact / effort) item that is P1 or P2, has its depends-on
   satisfied, and is <= 2h. State which item and why.
   - If that item is marked "needs store owner", do NOT skip it. Run it as this week's
     slice: give me the exact Admin click-path and the precise setting or value to change,
     wait for me to confirm I have done it, then verify with the same measurement protocol
     below and mark it done. Note in the backlog that this change lives in the Admin, not
     in git, so it will not show up in any diff.

3. For a theme-code item, create a branch perf/<item-id>.

4. BEFORE. Reproduce baseline.json's `conditions` exactly by running the committed script —
   do NOT hand-roll the conditions with chrome-devtools `emulate`, or the numbers will not
   compare to baseline.json:

     npx -y lighthouse@13 --version        # once, populates the npx cache
     node docs/perf/measure.js <outDir>    # 3 runs x 3 URLs x 2 devices, medians

   DO NOT start `npm run dev` and DO NOT use `?preview_theme_id=`. Theme 186192232764 is the
   LIVE theme, so (a) the plain URL `https://informatica.com.ua/<path>?pb=0` already renders
   this repo's code, and (b) `theme dev` would sync your edits straight to production.
   `preview_theme_id` also adds a 302 worth ~780ms of pure artifact to every LCP (home mobile
   measured 76/4156ms with it vs 87/2914ms without).

   Then run one `performance_start_trace(reload: true, autoStop: true)` +
   `performance_analyze_insight` on the flagged insights for the item's target URL. For an
   INP item, interact with the page (variant picker, add-to-cart) and analyze `INPBreakdown`.
   Also capture `shopify theme check` for the files you will touch.
   If today's "before" numbers differ from baseline.json by more than the noise band on an
   untouched page, stop and investigate — the environment or the store drifted.

5. Implement the fix — surgical and minimal, matching Dawn's existing style. Obey the repo
   CLAUDE.md rules: no new Tailwind; never hardcode section IDs (use {{ section.id }}); one
   {% schema %} block per section file; image_url not img_url; vanilla JS / Web Components;
   console.log for debugging. Validate every file you touched with
   `validate_theme_codeblocks` (shopify-dev MCP) as you go. Confirm no visual regression on
   the affected templates using the claude-in-chrome tools or the shopify-frontend-loop
   skill. NOTE for the Tailwind REBUILD item (P1-2): it is expected to change what renders —
   the shipped CSS is missing `.md\:hidden`, so the header phone icon at
   sections/header.liquid:320 is currently visible on desktop and SHOULD disappear at
   >=768px after the rebuild. That is the fix, not a regression.

6. AFTER — and this is the regression guard, not a formality:
   a) Re-measure the TARGET URL(s) with `node docs/perf/measure.js`. Record the delta.
      Noise band is 10 points — EXCEPT product/mobile, which showed a 30-point spread
      ([61,59,89]) across three runs at identical byte weight, so nothing under ~30 points
      is a result there. "No measurable change" is an honest outcome; a 6-point gain is not
      a win.
   b) LAB CANNOT VERIFY EVERY ITEM. The lab and the field disagree on this store: Lighthouse
      reports product/mobile LCP at 8437ms, the field says 1624ms (good) — the lab number is
      an artifact of the 4x-CPU / slow-4G preset. So:
        - For a BYTES or RENDER-BLOCKING item, the lab delta is valid evidence.
        - For an INP or LCP item, the lab proves nothing. Verification is next week's
          `web_performance` query (step 1). Say so plainly, mark the item
          "awaiting field verification" in backlog.md, and do NOT claim a win from a lab
          score. This is the "verify in the field" step of Shopify's method; it takes a week
          and cannot be rushed.
   c) Re-measure EVERY OTHER tracked URL in baseline.json, mobile and desktop. A slice that
      helps the product page and quietly costs the collection page is a net loss.
   d) `shopify theme check` and `validate_theme` must be no worse than baseline.json's
      counts.
   e) Asset bytes: no file in assets/ may grow versus baseline.json without an explicit
      justification in the commit message. (Expected exception: rebuilding
      assets/tailwind.output.css — minified it should SHRINK from 21031 bytes; if it grows,
      you used the wrong CLI version. Pin @tailwindcss/cli@4.1.4; a bare @4 pulls 4.3.3.)
   If (c), (d) or (e) regresses beyond the noise band and you cannot fix it inside the
   timebox, REVERT the slice, and add what you learned to the backlog item. A reverted
   slice that documented a dead end is a good week.

7. Timebox: if the work runs past ~2 hours, stop, commit only what is measured and verified,
   and write the remainder back into docs/perf/backlog.md as a new, smaller item.

8. Update both files:
   - docs/perf/backlog.md: mark the item done with the date, the measured before/after
     numbers, and the commit/PR link. Add newly found issues as new items, each <= 2h.
   - docs/perf/baseline.json: DO NOT hand-edit it. Regenerate:
       node docs/perf/mkfield.js    <outDir>   # needs webperf.json + webperf_trend.json
       node docs/perf/mkbaseline.js <outDir>   # needs lh_summary.json + themecheck.json
     `commit` auto-resolves to the last theme-code change, so doc-only commits do not
     invalidate a baseline. Leave `conditions` and `noise_band` alone — changing measurement
     conditions silently invalidates every past comparison. If they must change, say so
     loudly and re-baseline every tracked page in the same commit.

9. Commit; open a PR (ask me before pushing if you are unsure of the repo norm). CI runs
   theme-check plus the Lighthouse CI action on the PR — wait for it and report the result.
   Print a 3-line summary: what changed, measured impact, suggested next slice.

Stop after one slice. Do not batch multiple items.
```

---

## Sources

- [Testing for performance — shopify.dev](https://shopify.dev/docs/storefronts/themes/best-practices/performance/testing-for-performance)
- [Web Performance Tools for 2026 — performance.shopify.com](https://performance.shopify.com/blogs/blog/web-performance-tools-for-2026)
- [ShopifyQL `web_performance` schema](https://shopify.dev/docs/api/shopifyql/2026-07/schemas/sessions_and_behavior/web_performance) — the field-data source that actually works here
- [PerformanceMetrics (unstable) — GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/unstable/objects/performancemetrics) — documented, but returns an empty array for this shop
- [Shopify Lighthouse CI GitHub Action](https://shopify.dev/docs/storefronts/themes/tools/lighthouse-ci)
- [Shopify Dev MCP now supports Liquid](https://shopify.dev/changelog/dev-mcp-now-supports-liquid)
- [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)
