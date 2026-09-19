# Lab A/B, 2026-09-19 — before/after PRs #9–#12

`node --max-old-space-size=6144 docs/perf/compare-themes.mjs load <out>` with
`PERF_VARIANTS=BEFORE=186192232764,AFTER=188294955324 PERF_RUNS=7` → **84 runs, 0 failed attempts**
(3 products × mobile/desktop × 7). Method: [`../dawn-compare/METHOD.md`](../dawn-compare/METHOD.md).

- `load.jsonl` — every run. `results.json` — per-cell medians / IQR (`node compare-themes.mjs summarize <out>`).
- **BEFORE** = `PRE-GITHUB rollback` #186192232764 (unpublished): the 2026-09-10 snapshot, still carrying
  `footer-reveal`, the eager mobile lightbox and the stale Tailwind build.
  **AFTER** = live `dawn/main` #188294955324.
- **Confound:** other, non-perf changes merged between the two snapshots (`layout/theme.liquid`,
  header, `main-product`, structured data, language switcher, policy pages, related-collections
  widget). Only theme script time (footer-reveal) and mobile image bytes (lightbox) are
  mechanistically attributable to #11/#12. Read the deltas under those rules — see
  [`../backlog.md`](../backlog.md) → *Status 2026-09-19*.
- `by_owner`/`script_ms_by_owner` keys that are absent mean *below Lighthouse's 50 ms reporting
  threshold*, not zero.
