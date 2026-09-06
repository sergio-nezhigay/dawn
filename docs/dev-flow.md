# Dev flow

How changes reach the live store, and what is still open. Set up 2026-09-06 (PRs #1–#2).

## Making a change

1. Branch off `main`.
2. Push, open a PR to `main`.
3. CI runs (see below). `main` is a **protected branch** — you cannot push to it directly.
4. Squash-merge the PR once checks are green. Delete the branch.

`main` protection: PR required, `strict` status checks, **0** required approvals,
`enforce_admins = false` (you can bypass in a real emergency). Change it with
`gh api -X PUT repos/sergio-nezhigay/dawn/branches/main/protection`.

## CI checks (`.github/workflows/ci.yml`)

| Check | Required to merge | What it does |
|---|---|---|
| **Theme Check** | ✅ yes | `shopify/theme-check-action` — Liquid/schema lint. Must be 0 errors (warnings pass). |
| **Theme Check Report** | ✅ yes | The annotations report from the same action. |
| **Lighthouse** | ❌ not yet | Serves branch code via `shopify theme dev` + hardcoded store, runs Lighthouse 13 ×3 per URL × {mobile,desktop}, and **fails only if a tracked template (home / product / collection) did not render**. It is a render smoke test, not a score gate — shared-runner CPU swings scores 20+ pts run-to-run. Promote to *required* once it has been stable for ~3–5 PRs. |

Only secret used: `SHOP_ACCESS_TOKEN` (a `shptka_…` Theme Access password for
`c2da09-15.myshopify.com`). All other `SHOP_*` / `LHCI_*` secrets were deleted 2026-09-06.

## Local development

| Command | Target | Notes |
|---|---|---|
| `npm run dev` | unpublished theme **`188186001724`** ("DEV informatica (do not publish)") | Safe — local edits never touch the live storefront. |
| `npm run push` | live theme `186192232764` | Deliberate deploy. Prefer PR + merge over this. |
| `npm run pull` | live theme `186192232764` | Read-only pull of live settings/templates. |

## Open follow-ups

- **Rotate the Theme Access token** *(optional, recommended)*. The `shptka_…` value was
  entered in cleartext in a terminal during CI debugging, so it now sits in this machine's
  shell history and the session transcript. The token grants **read/write to all theme files
  plus create/publish** on the live store (no admin/orders/customers access). Risk is low
  while this machine and the Anthropic account are secure, but the exposure does not expire on
  its own. To rotate: Shopify admin → *Apps → Theme Access → regenerate*, then update the
  `SHOP_ACCESS_TOKEN` repo secret (CI breaks until you do).
- **Promote `Lighthouse` to a required check** once it has passed cleanly on a few PRs — add
  `"Lighthouse"` to the `contexts` array in the branch-protection call.
- **Performance work** — the ranked, evidence-backed backlog and week-by-week sequence live in
  [`docs/perf/backlog.md`](./perf/backlog.md). Next up: **P1-2** (rebuild
  `assets/tailwind.output.css` with the pinned v4.1.4 command), then **P1-1** (trace
  product/mobile INP). P2-1 is already done (PR #1).
