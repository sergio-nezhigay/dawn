# Theme deploy audit

_Researched 2026-09-10. Question that prompted it: the collection-description block is visible
on `informatica.com.ua`, and other recent commits feel like they should be live, but the
Shopify **Themes** page says the active theme was "Last saved: Jul 28 at 6:43 pm"._

---

## TL;DR

1. **"Last saved: Jul 28" is not a deploy indicator.** That field only moves when the theme is
   saved in the admin **Theme Editor** (Customize). It does **not** move on `shopify theme push`
   / `npm run push` / Theme Access API uploads. Your CLI deploys are invisible to it.
2. **Your recent code is live.** Verified against the published theme (see evidence below):
   the collection-description block (PR #4, Sept 7), the product-description show-more toggle,
   and the Aug 30 footer link are all in the live HTML right now.
3. **There is no automatic deploy.** Merging to `main` does nothing. CI lints + smoke-tests
   only; it never pushes. Live changes only through `npm run push`, the Theme Access API, or
   the admin Theme Editor. Nothing records _which commit_ is live.
4. **The one genuinely-unverified change** is a 3-line tweak to
   `snippets/product-variant-options.liquid` (PR #1). Everything else merged since July is
   either verified live or not a theme file.
5. **The store has 46 themes.** 27 are leaked CI scratch themes, ~15 are stale copies. Only 2
   are worth keeping.

---

## Evidence: what is actually published

`curl` with **no cookies** can only ever return the _published_ theme (a `?preview_theme_id`
cookie is the only way to see anything else, and curl carries none). Run against
`https://informatica.com.ua/collections/perehonhik_com_usb` on 2026-09-10:

| Check | Result |
|---|---|
| `grep -o 'Shopify.theme = [^;]*'` | `"name":"rolledback gallery zoom","id":186192232764,...,"role":"main"` |
| `grep -c collection-description` | `9` — PR #4 block is live |
| `grep -c product-description-toggle` | `3` — the show-more custom element is live |
| footer copyright link | `https://portfolio.nezhihai.workers.dev/` — the Aug 30 change is live |

Re-verify any single change like this:

```bash
curl -s https://informatica.com.ua/<path> | grep -o 'Shopify.theme = [^;]*'   # which theme is live
curl -s https://informatica.com.ua/<path> | grep -c '<marker unique to your change>'
```

---

## How code reaches the live theme today

```
   local edits ──(npm run dev)──▶  DEV theme #188186001724   (preview only, unpublished)

   branch ──PR──▶ main    ──▶  CI: Theme Check + Lighthouse smoke test   (NO deploy)
                          └──▶  nothing else happens automatically

   main (or local) ──(npm run push)──▶  LIVE theme #186192232764   ← the only real deploy path
```

- `.github/workflows/ci.yml` runs `shopify/theme-check-action` and a Lighthouse render smoke
  test (it starts `shopify theme dev` and checks the tracked templates render). **It never runs
  `shopify theme push`.**
- `package.json` scripts: `dev` → DEV theme `188186001724`; `push` / `pull` → LIVE theme
  `186192232764`.
- Because deploys are a manual `npm run push` and the "Last saved" field ignores them, there is
  no visible record of what is deployed. The commit that is live is whatever was last pushed —
  currently everything on `main` except possibly the item below.

### Is anything on `main` not deployed?

Merged since the July work, only these touch theme files:

| PR | Theme files | Status |
|---|---|---|
| #4 `1a01e206` | `sections/collection-description.liquid`, `templates/collection.json`, `templates/collection.brand-collection.json`, `assets/component-collection-description.css`, `assets/product-description-toggle.js` | first two **verified live**; other three near-certainly shipped in the same push |
| #1 `05a0ad48` | `snippets/product-variant-options.liquid` (3-line change) | **verified live** — 2026-09-10 `theme pull` of #186192232764 is byte-identical to `main` for every theme file. The change is output-identical Liquid (`value \| escape` inline → assigned first), so a curl marker was never possible; the diff is the only check. |
| #6 `8b0a8ab2` | _(none — `scripts/add-usecase-image.mjs` is a local helper)_ | n/a |

Working tree is clean. To get a definitive answer, diff the live theme against `main`:

```bash
mkdir -p "$TMP/live"
shopify theme pull --store c2da09-15.myshopify.com --theme 186192232764 --path "$TMP/live"
git --work-tree="$TMP/live" diff --stat HEAD -- ':!config/settings_data.json' ':!templates/*.json'
```

Then classify each diff: **live-only** → commit to git; **main-only** → `npm run push` it;
**JSON config** (`settings_data.json`, `templates/*.json`) → decide who owns it (see caveat
under "Target state").

---

## Theme inventory (46 total)

**Keep (2):**

| ID | Role | Name | Why |
|---|---|---|---|
| 186192232764 | live | `rolledback gallery zoom` | the live storefront. Rename to something honest, e.g. `LIVE — main`. |
| 188186001724 | unpublished | `DEV informatica (do not publish)` | the `npm run dev` preview target. |

**Delete — leaked CI scratch themes (27):** every `development`-role theme. 26 are
`Development (<hash>-runnervmejwal)` — one spawned per CI Lighthouse run because
`shopify theme dev` creates a dev theme per machine fingerprint and GitHub runners have
throwaway hostnames. 1 is `Development (a6aa90-DESKTOP-4H60LKK)` from a local machine.
Development themes auto-expire after ~7 days of inactivity, but CI keeps recreating them.

```
188177449276 188178465084 188178497852 188178530620 188178563388 188178825532
188178858300 188178956604 188178989372 188179054908 188179185980 188185936188
188186034492 188186263868 188186558780 188186624316 188186689852 188214018364
188214083900 188214477116 188215132476 188215263548 188215296316 188215361852
188215460156 188215656764 188215722300
```

**Delete — stale copies / trials (15):**

| ID | Name | Note |
|---|---|---|
| 169406562620 | `hydrogen-redirect-theme-main-1` | old Hydrogen redirect experiment |
| 177967661372 | `dawn/dawn-init` | init snapshot |
| 181509718332 | `Tinker` | Shopify theme-store trial |
| 181515616572 | `Vessel` | trial |
| 181717303612 | `Horizon-new` | trial |
| 181780185404 | `Horizon` | trial |
| 181780250940 | `Taste` | trial |
| 181780283708 | `Colorblock` | trial |
| 181780316476 | `Craft` | trial |
| 182215934268 | `Dawn/main` | old GitHub-connect attempt? |
| 182466019644 | `Dawn/main new` | ditto |
| 182573760828 | `1701 live version` | old live snapshot |
| 183160996156 | `Copy of  11/01/26 for the collection page update` | ad-hoc backup |
| 184724914492 | `Copy of live` | ad-hoc backup |
| 184741757244 | `live 0305` | ad-hoc backup |
| 185917899068 | `Updated copy of Horizon` | trial |
| 188293415228 | `Dawn` (v16.0.0) | fresh unused download |

Optionally keep **one** recent `Copy of live` as a rollback safety net and delete the rest.

Delete procedure (dev themes need `-d`):

```bash
shopify theme delete --store c2da09-15.myshopify.com -d -t <id>          # development
shopify theme delete --store c2da09-15.myshopify.com -t <id>             # unpublished (prompts)
```

---

## Recommendations

### 1. Stop the CI theme leak

In the `lhci` job of `.github/workflows/ci.yml`, either:

- **delete-on-exit** — capture the dev theme id `shopify theme dev` prints and add a trap:
  `shopify theme delete -d -f -t "$DEV_THEME_ID"` in the `EXIT` trap alongside the `kill`; or
- **pinned CI preview theme** — create one unpublished `CI preview` theme and, instead of
  `shopify theme dev`, `shopify theme push --theme <id> --nodelete` then run Lighthouse against
  its preview URL. No new theme per run.

### 2. Target state: Shopify GitHub integration (chosen direction)

Replace the manual `npm run push` with an admin-managed connection so every push to `main`
deploys.

1. Online Store → **Themes** → **Add theme** → **Connect from GitHub**.
2. Authorize the `sergio-nezhigay/dawn` repo, pick branch `main`.
3. This creates a **new** GitHub-connected theme. Verify it renders, then **Publish** it and
   retire `rolledback gallery zoom` (keep it unpublished briefly as rollback).
4. From then on: merge to `main` → Shopify auto-pulls → live updates within ~1 min.

**Two-way-sync caveat.** `templates/collection.json` and `config/settings_data.json` carry the
auto-generated header _"may be updated by the Shopify admin theme editor"_, and the live copies
already hold editor-set values. A connected theme **commits Theme Editor edits back to `main`**
as commits authored by Shopify. If you also hand-edit those JSON files in the repo you get
merge noise / clobbered settings. Mitigation:

- Treat `config/settings_data.json` and `templates/*.json` as **Shopify-owned** — change them
  only via the Theme Editor, let Shopify's commits land, never hand-edit. Section _code_
  (`.liquid`, `.css`, `.js`) stays developer-owned in the repo as normal.
- Keep `npm run push` / `npm run pull` in `package.json` as the manual escape hatch (e.g. to
  force-sync after a botched merge), but they stop being the routine path.
- Update `docs/dev-flow.md` "How changes reach the live store" to describe the connected flow.

### 3. Housekeeping

- Rename the live theme to `LIVE — main` (or similar) so the Themes page is self-explanatory.
- Delete the 27 CI themes and the stale copies per the inventory above.

---

## Follow-up checklist

- [x] Run the live-vs-`main` diff (2026-09-10). **Clean** — `main` is byte-identical to
      #186192232764 for every theme file, `config/settings_data.json` and `templates/*.json`
      included. No drift to reconcile. This also verifies PR #1 is live.
- [x] Add CI cleanup so the dev-theme leak stops — `lhci` job now deletes the throwaway
      development theme in its exit trap (`.github/workflows/ci.yml`).
- [ ] Delete the 27 `development` themes (one-off — CI stops creating new ones once the fix
      above merges).
- [x] Decide + document JSON ownership — `config/settings_data.json` + `templates/*.json`
      are Shopify-owned (Theme Editor only); see `docs/dev-flow.md` "JSON ownership".
- [x] Rewrite `docs/dev-flow.md` for the connected flow; link this audit.
- [ ] Rename the live theme → `PRE-GITHUB rollback (186192232764)`.
- [ ] Connect `main` via GitHub integration; publish the connected theme; keep the renamed
      old one unpublished as rollback for ~1–2 weeks.
- [ ] After the connected theme is proven live: delete the stale unpublished copies (keep
      DEV + one recent `Copy of live`), then delete the renamed rollback theme.
