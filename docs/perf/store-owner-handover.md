# Store-owner handover — the performance levers theme code can't pull

**Measured:** 2026-09-19 · live theme `dawn/main` #188294955324 · raw data:
[`ab-2026-09-19/`](./ab-2026-09-19/) (AFTER cells, 3 product pages × desktop/mobile, 7 runs each).

**Why this exists.** Every Core Web Vital for real users is already "good" and the theme's own code
now costs almost nothing (theme-owned script time is below Lighthouse's 50 ms reporting floor). What
is left on the main thread is **third-party and platform code that lives in the Shopify admin, not in
this repo**. Nothing below needs a developer — each item is a settings change — but each is your
call, because each can affect analytics, ads attribution, reviews or chat.

Theme perf work is paused until field data shows a problem (`docs/perf/field-weekly.mjs`, added alongside this doc).

## What it costs today (median of the 3 tracked product pages, AFTER)

| Owner | Transfer | Requests | Script time, mobile* | Long tasks, mobile* | Who controls it |
|---|---:|---:|---:|---:|---|
| **Google Tag** (`gtag/js` + destination + `gtm.js`) | **516 KB** | 15 | ~910 ms | ~790 ms | **you** (admin) |
| **Shopify web pixels** (`cdn/wpm/*`) | 146 KB | 7 | ~620 ms | ~350 ms | **you** (Customer events) |
| Shop chat agent | 15 KB | 2 | not separately reported | — | you (app embed) |
| Judge.me (widget files + loader) | 2–21 KB† | 2–3 | not separately reported | — | you (app embed) |
| Microsoft Clarity (2 embeds) | not separately reported | — | inside "document"/"unattributable" | — | you (app embed) |
| Shopify checkout prefetch | ~900 KB | 110–120 | ~0 (`VeryLow` priority) | — | **platform — cannot change** |

\* Lighthouse mobile preset: 4× CPU throttle, so real phones are faster; the *ratios* are what matter.
† Judge.me's bytes are small on pages with no reviews widget rendered; the widget CSS is ~95% unused
when it does render (baseline measurement).

Together Google Tag + web pixels are about **1.5 s of script and ~1.1 s of long tasks per mobile page
load in the lab**, versus ~0 for the theme. They are also the most plausible source of the 144–164 ms
mobile INP in the field (the only Core Web Vital within ~20% of its limit).

## Checklist, biggest first

Do one at a time, record what you changed and the date at the bottom of this file, then re-measure
(see *How to verify*).

### 1. Google Tag may be installed more than once — upper bound: all 516 KB / ~0.9 s mobile script; real saving unknown until the duplicate is confirmed
`gtag/js` (190 KB) + `gtag/destination` (161 KB) + `gtm.js` (156 KB) load on every product and
collection page. Three files from two families (gtag *and* GTM) is a duplicate-install signature.
- `Settings → Customer events` → look for a Google Tag / GTM **custom pixel**.
- `Online Store → Preferences` → the *Google Analytics* / *Google tag* field.
- `Apps` → *Google & YouTube* (or any GTM app) also injecting a tag.
- **Keep one path. Remove the others.** Write down which container / measurement ID you removed.
- Risk: removing the wrong one can stop conversion or ads reporting — check GA4 / Google Ads
  "receiving data" for a day afterwards.

### 2. Prune Shopify web pixels — upper bound: 146 KB / ~0.6 s mobile script; saving depends on how many pixels are unused
`cdn/wpm/*.js` is 146 KB per page, ~40% unused (baseline measurement), and runs the second-longest
mobile long tasks after Google Tag.
- `Settings → Customer events` → remove pixels for channels you no longer run ads on
  (e.g. sales channels or ad apps you have since stopped using).
- Risk: each removed pixel stops that channel's conversion tracking — only remove ones you don't use.

### 3. Clarity — confirm both embeds are wanted — saving: small, not separately measured
`config/settings_data.json` registers **two** Clarity blocks: `clarity_js` and `brandAgents_js`.
`brandAgents_js` is the second one; if you don't use Clarity's brand-agent feature, disable it.
- `Online Store → Themes → Customize → App embeds` → toggle it off.
- Theme-side equivalent (only if you want it in git): set `"disabled": true` on the block in
  `config/settings_data.json`. Do this in the theme editor instead unless you have a reason —
  the file is overwritten by editor saves.

### 4. Scope or drop Judge.me / Shop chat on pages that don't need them — saving: small
Judge.me's widget CSS is 94–99% unused on the pages measured, and `loader.js` is a ~53 ms long task.
Shop chat adds a 15 KB embed on every page.
- App embeds in the theme editor are all-or-nothing site-wide. Whether Judge.me can be limited to
  product pages is a setting inside the Judge.me app itself — check its documentation; this repo
  can't do it.
- Only do this if you'd accept losing the widget/chat on some pages.

### Not actionable
Shopify **checkout prefetch** (~900 KB, 110–120 `VeryLow`-priority requests) is a platform
behaviour. It doesn't compete with page rendering and there is no theme or admin setting for it.

## How to verify

1. **Same day, lab:** the owner table in
   `node --max-old-space-size=6144 docs/perf/compare-themes.mjs load <outDir>` with
   `PERF_VARIANTS=NOW=188294955324 PERF_RUNS=5` shows Google Tag / web pixels KB, request counts and
   script ms directly. Google Tag should shrink from 516 KB / 15 requests if item 1 removes a duplicate.
   (Lab wins here are real but small in the field — see below.)
2. **3–4 weeks later, field:** `node docs/perf/field-weekly.mjs --since <change date>`. Judge on
   **product/mobile INP** (needs ≥ 200 loads/week) against the 128–240 ms historical weekly band. One
   week inside the band is *not* evidence of change — weekly INP moves ±50 ms on its own.
3. Use the measurement rule from `dawn-compare/METHOD.md` §6 before claiming a win: beyond IQR, on at
   least 2 of 3 products, same direction.

## Change log (fill in)

| Date | Item | What was removed / changed | Container / pixel ID | Checked GA4 / Ads still receiving? |
|---|---|---|---|---|
| | | | | |
