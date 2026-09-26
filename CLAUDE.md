# CLAUDE.md

@../_shared/informatica-store.md

Customized Shopify Dawn theme for informatica.com.ua. Deploy flow, CI checks and JSON ownership: [`docs/dev-flow.md`](docs/dev-flow.md).

## Working rules
- Test with `npm run dev` (unpublished dev theme). Deploy only through a PR into `main`, see the shared store file.
- CI requires `shopify theme check` to pass with 0 errors. Run it before opening a PR.
- **Don't hand-edit `config/settings_data.json` or `templates/*.json`.** They are Shopify-owned: the theme editor commits them back to `main`. Change them in the admin Theme Editor.
- **Tailwind:** don't add new Tailwind; use it only where it already exists. After changing `assets/tailwind.input.css`, regenerate `assets/tailwind.output.css` with the Tailwind v4 CLI.
- Use the `image_url` filter, never the deprecated `img_url`.
- **Never hardcode section IDs.** Use `{{ section.id }}` (e.g. `#shopify-section-{{ section.id }}`); hardcoded IDs break when a section is duplicated or moved.

## Store data
For live store data (products, orders, settings), use the `shopify-plugin` skills: `shopify-admin` to build the GraphQL, `shopify-use-shopify-cli` to run it.
