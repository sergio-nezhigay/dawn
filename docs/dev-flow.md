# Dev flow

How changes reach the live store, and what is still open. Set up 2026-09-06 (PRs #1–#2);
deploy pipeline moved to the Shopify GitHub integration 2026-09-10 (see
[`theme-deploy-audit.md`](./theme-deploy-audit.md)).

## Making a change

1. Branch off `main`.
2. Push, open a PR to `main`.
3. CI runs (see below). `main` is a **protected branch** — you cannot push to it directly.
4. Squash-merge the PR once checks are green. Delete the branch.
5. Shopify's GitHub integration auto-pulls `main` and updates the live theme within ~1–2 min.

`main` protection: PR required, `strict` status checks, **0** required approvals,
`enforce_admins = false` (you can bypass in a real emergency). Change it with
`gh api -X PUT repos/sergio-nezhigay/dawn/branches/main/protection`.

## How changes reach the live store

```
   local edits ──(npm run dev)──▶  DEV theme #188186001724   (preview only, unpublished)

   branch ──PR──▶ main    ──▶  CI: Theme Check + Lighthouse smoke test   (no deploy)
                          └──▶  Shopify GitHub integration auto-pulls main ──▶ LIVE theme
```

- The live theme is a **GitHub-connected theme** bound to `sergio-nezhigay/dawn` branch
  `main`. Merging to `main` is the deploy. There is no manual step in the routine path.
- `npm run push` / `npm run pull` (in `package.json`) remain as a **manual escape hatch** —
  e.g. to force-sync the theme after a botched merge, or to pull editor-set JSON back into a
  branch. They are no longer the routine deploy path. Note `push` targets whatever theme id
  is set in `package.json`; update it if the connected theme's id differs from
  `186192232764`.
- The previous live theme `rolledback gallery zoom` (renamed
  `PRE-GITHUB rollback (186192232764)`) is kept **unpublished** as a rollback for ~1–2 weeks,
  then deleted.

## JSON ownership — do not hand-edit

`config/settings_data.json` and `templates/*.json` carry Shopify's auto-generated header
_"may be updated by the Shopify admin theme editor"_ and hold editor-set values. With a
GitHub-connected theme, **Theme Editor edits are committed back to `main`** as commits
authored by Shopify.

- **Shopify-owned:** `config/settings_data.json`, `templates/*.json`. Change these only via
  the admin **Theme Editor** (Customize). Let Shopify's commits land. Never hand-edit them in
  a PR — you will get merge conflicts or clobbered merchant settings.
- **Developer-owned:** section / snippet / asset _code_ (`.liquid`, `.css`, `.js`), section
  `{% schema %}` blocks, `locales/*.json`. Normal PR workflow.
- If you must change a template's section structure in code, do it in a PR and accept that a
  follow-up Shopify commit may reformat it.

## CI checks (`.github/workflows/ci.yml`)

| Check | Required to merge | What it does |
|---|---|---|
| **Theme Check** | ✅ yes | `shopify/theme-check-action` — Liquid/schema lint. Must be 0 errors (warnings pass). |
| **Theme Check Report** | ✅ yes | The annotations report from the same action. |
| **Lighthouse** | ❌ not yet | Serves branch code via `shopify theme dev` + hardcoded store, runs Lighthouse 13 ×3 per URL × {mobile,desktop}, and **fails only if a tracked template (home / product / collection) did not render**. It is a render smoke test, not a score gate — shared-runner CPU swings scores 20+ pts run-to-run. Promote to *required* once it has been stable for ~3–5 PRs. |

The `lhci` job now **deletes the throwaway development theme** `shopify theme dev` creates,
in its exit trap — CI runs no longer leak `Development (<hash>-runnervm…)` themes onto the
store.

Only secret used: `SHOP_ACCESS_TOKEN` (a `shptka_…` Theme Access password for
`c2da09-15.myshopify.com`). All other `SHOP_*` / `LHCI_*` secrets were deleted 2026-09-06.

## Local development

| Command | Target | Notes |
|---|---|---|
| `npm run dev` | unpublished theme **`188186001724`** ("DEV informatica (do not publish)") | Safe — local edits never touch the live storefront. |
| `npm run push` | live theme `186192232764` | **Escape hatch only.** Routine deploys go through merge-to-`main`. |
| `npm run pull` | live theme `186192232764` | Read-only pull of live settings/templates (e.g. to sync editor-set JSON into a branch). |

## Open follow-ups

- **Finish the GitHub connect** (one-time, admin panel): Online Store → Themes → Add theme →
  Connect from GitHub → authorize `sergio-nezhigay/dawn`, branch `main` → verify the built
  theme renders → **Publish** it. Keep `PRE-GITHUB rollback (186192232764)` unpublished as
  rollback. If the connected theme's id ≠ `186192232764`, update `package.json`'s `push` /
  `pull` scripts.
- **Sweep the stale theme copies** once the connected theme is proven live — see the
  "stale copies (15)" table in [`theme-deploy-audit.md`](./theme-deploy-audit.md). Keep one
  recent `Copy of live` as a safety net.
- **Rotate the Theme Access token** *(optional, recommended)*. The `shptka_…` value was
  entered in cleartext in a terminal during CI debugging, so it now sits in this machine's
  shell history and the session transcript. The token grants **read/write to all theme files
  plus create/publish** on the live store (no admin/orders/customers access). To rotate:
  Shopify admin → *Apps → Theme Access → regenerate*, then update the `SHOP_ACCESS_TOKEN`
  repo secret (CI breaks until you do).
- **Promote `Lighthouse` to a required check** once it has passed cleanly on a few PRs — add
  `"Lighthouse"` to the `contexts` array in the branch-protection call.
- **Performance work** — the ranked, evidence-backed backlog and week-by-week sequence live in
  [`docs/perf/backlog.md`](./perf/backlog.md). Next up: **P1-2** (rebuild
  `assets/tailwind.output.css` with the pinned v4.1.4 command), then **P1-1** (trace
  product/mobile INP). P2-1 is already done (PR #1).
