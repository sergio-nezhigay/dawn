# scripts/

Standalone maintenance helpers. Not part of the Dawn theme — run them with Node
directly. They talk to the Admin API through `shopify store execute`, which uses
the Shopify CLI's own stored auth for the store.

## add-usecase-image.mjs

Attaches one "use-case" photo (a USB-C cable charging a laptop from a powerbank —
the 2nd media of product `9803162452284`) to every product in the collection
`laptop-charger-adapters` (`gid://shopify/Collection/505435357500`) whose
`specifications.type` metafield is one of:

- `Type-C кабель живлення ноутбука`
- `Комплект USB Type-C кабель з адаптером розміру`

A product is skipped when it already shows that image — detected by, in order:
the helper's own `alt` marker, the source filename stem (incl. Shopify-suffixed
copies), then a perceptual **dHash** of every PNG on the product (so a manual
re-upload under a different name is still caught).

`CreateMediaInput.originalSource` only accepts a URL, so each product gets its own
copy of the file (one `MediaImage` + one `Files` row per product) — there is no
"reference one File from many products" API.

### Prerequisite (once, before `--apply`)

```
shopify store auth --store c2da09-15.myshopify.com --scopes read_products,write_products
```

The dry run is read-only and works with whatever auth the CLI already has.

### Use

```bash
# 1. dry run (default) — writes usecase-image-out/usecase-image-plan.json
#    and usecase-image-out/usecase-image-review.html
node scripts/add-usecase-image.mjs

# 2. open the review page, sanity-check the "ADD" set

# 3. one real add first
node scripts/add-usecase-image.mjs --apply --limit 1

# 4. the rest
node scripts/add-usecase-image.mjs --apply

# re-running the dry run now reports 0 ADD (idempotent)
```

`--apply` executes the `ADD` rows from the **existing** plan file (it does not
re-classify), appends every created media id to
`usecase-image-out/usecase-image-applied.json`, and can be re-run safely — rows
already in that log are skipped.

### Undo

```bash
node scripts/add-usecase-image.mjs --undo   # productDeleteMedia for everything in the applied log
```

### Config

Constants at the top of the script (collection id, source product, accepted
metafield values, `ALT_MARKER`, `DHASH_MAX_DISTANCE`). `STORE` and `OUT_DIR` can
be overridden by env vars.
