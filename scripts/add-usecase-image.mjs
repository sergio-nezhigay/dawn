#!/usr/bin/env node
/**
 * add-usecase-image.mjs
 *
 * Bulk-attach one "use-case" photo (a USB-C cable charging a laptop from a
 * powerbank) to every product in a collection whose `specifications.type`
 * metafield marks it as a real charging *cable*, skipping any product that
 * already shows that image under any filename.
 *
 * Zero npm dependencies. Talks to the Admin API through `shopify store execute`
 * (uses the Shopify CLI's own stored auth), decodes PNGs with the built-in
 * zlib, and compares images with a perceptual dHash so re-uploads under a
 * different name are still detected.
 *
 * Usage:
 *   node scripts/add-usecase-image.mjs              # dry run (default) -> writes plan + review.html
 *   node scripts/add-usecase-image.mjs --apply      # execute the ADDs from the last plan
 *   node scripts/add-usecase-image.mjs --apply --limit 1
 *   node scripts/add-usecase-image.mjs --undo       # remove media added by a previous --apply
 *
 * Before --apply, authorise write scopes once:
 *   shopify store auth --store c2da09-15.myshopify.com --scopes read_products,write_products
 */

import { execSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const STORE = process.env.STORE || "c2da09-15.myshopify.com";
const API_VERSION = "2026-07";
const COLLECTION_ID = "gid://shopify/Collection/505435357500";
const SOURCE_PRODUCT_ID = "gid://shopify/Product/9803162452284";
const SOURCE_MEDIA_INDEX = 1; // 0-based: the 2nd media

const METAFIELD = { namespace: "specifications", key: "type" };
const ACCEPTED_VALUES = [
  "Type-C кабель живлення ноутбука",
  "Комплект USB Type-C кабель з адаптером розміру",
];
const ALT_MARKER = "Приклад: заряджання ноутбука від павербанка через кабель USB-C";
const DHASH_MAX_DISTANCE = 12;

const OUT_DIR = process.env.OUT_DIR || path.resolve("usecase-image-out");
const PLAN_FILE = path.join(OUT_DIR, "usecase-image-plan.json");
const REVIEW_FILE = path.join(OUT_DIR, "usecase-image-review.html");
const APPLIED_FILE = path.join(OUT_DIR, "usecase-image-applied.json");

// ---------------------------------------------------------------------------
// Shopify CLI wrapper
// ---------------------------------------------------------------------------
const cliTmp = mkdtempSync(path.join(tmpdir(), "usecase-img-"));

function gql(query, variables, { mutation = false } = {}) {
  const qf = path.join(cliTmp, "q.graphql");
  const vf = path.join(cliTmp, "v.json");
  const of = path.join(cliTmp, "out.json");
  writeFileSync(qf, query);
  writeFileSync(vf, JSON.stringify(variables || {}));
  const args = [
    "shopify", "store", "execute",
    "--store", STORE,
    "--json",
    "--version", API_VERSION,
    "--query-file", qf,
    "--variable-file", vf,
    "--output-file", of,
  ];
  if (mutation) args.push("--allow-mutations");
  const cmd = args.map((a) => (/[^A-Za-z0-9_.:@/\\-]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(" ");
  try {
    execSync(cmd, { stdio: ["ignore", "ignore", "pipe"] });
  } catch (err) {
    const stderr = (err.stderr || "").toString();
    throw new Error(`shopify store execute failed:\n${stderr || err.message}`);
  }
  const raw = readFileSync(of, "utf8");
  let json;
  try { json = JSON.parse(raw); } catch { throw new Error(`Non-JSON response from CLI:\n${raw.slice(0, 500)}`); }
  const payload = json.data ?? json;
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return payload;
}

// ---------------------------------------------------------------------------
// Image download + PNG decode + dHash
// ---------------------------------------------------------------------------
async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Minimal PNG decoder: 8-bit, colour type 2 (RGB) or 6 (RGBA). Returns null for anything else. */
function decodePNG(buf) {
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  let off = 8, w = 0, h = 0, bd = 0, ct = 0;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  if (bd !== 8 || (ct !== 2 && ct !== 6) || !w || !h) return null;
  const chan = ct === 6 ? 4 : 3;
  let raw;
  try { raw = inflateSync(Buffer.concat(idat)); } catch { return null; }
  const stride = w * chan;
  if (raw.length < (stride + 1) * h) return null;
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++];
    for (let x = 0; x < stride; x++) {
      const rv = raw[p++];
      const a = x >= chan ? out[y * stride + x - chan] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= chan && y > 0 ? out[(y - 1) * stride + x - chan] : 0;
      let v;
      if (ft === 0) v = rv;
      else if (ft === 1) v = rv + a;
      else if (ft === 2) v = rv + b;
      else if (ft === 3) v = rv + ((a + b) >> 1);
      else if (ft === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v = rv + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      } else return null;
      out[y * stride + x] = v & 255;
    }
  }
  return { w, h, chan, data: out };
}

/** 9x8 grey grid -> 64-bit row-wise difference hash, as a bit string. */
function dhash(img) {
  const W = 9, H = 8;
  const g = new Float64Array(W * H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const sx = Math.floor((i * img.w) / W), ex = Math.max(Math.floor(((i + 1) * img.w) / W), sx + 1);
      const sy = Math.floor((j * img.h) / H), ey = Math.max(Math.floor(((j + 1) * img.h) / H), sy + 1);
      let s = 0, n = 0;
      for (let y = sy; y < ey; y++) {
        for (let x = sx; x < ex; x++) {
          const o = (y * img.w + x) * img.chan;
          s += 0.299 * img.data[o] + 0.587 * img.data[o + 1] + 0.114 * img.data[o + 2];
          n++;
        }
      }
      g[j * W + i] = s / n;
    }
  }
  let bits = "";
  for (let j = 0; j < H; j++) for (let i = 0; i < W - 1; i++) bits += g[j * W + i] < g[j * W + i + 1] ? "1" : "0";
  return bits;
}

function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

const _dhashCache = new Map();
async function fetchDhash(url) {
  if (_dhashCache.has(url)) return _dhashCache.get(url);
  let result = null;
  try {
    if (/\.png(\?|$)/i.test(url)) {
      const img = decodePNG(await download(url));
      if (img) result = dhash(img);
    }
  } catch { result = null; }
  _dhashCache.set(url, result);
  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function stemOf(url) {
  const base = decodeURIComponent(url.split("?")[0].split("/").pop() || "");
  return base.replace(/\.(png|jpe?g|webp|gif|avif)$/i, "");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------
async function resolveSource() {
  const q = `
    query Src($id: ID!) {
      product(id: $id) {
        media(first: 15) { nodes { __typename ... on MediaImage { image { url } } } }
      }
    }`;
  const d = gql(q, { id: SOURCE_PRODUCT_ID });
  const nodes = d.product?.media?.nodes || [];
  const node = nodes[SOURCE_MEDIA_INDEX];
  if (!node || node.__typename !== "MediaImage" || !node.image?.url) {
    throw new Error(`Source media index ${SOURCE_MEDIA_INDEX} on ${SOURCE_PRODUCT_ID} is not an image`);
  }
  const url = node.image.url;
  const hash = await fetchDhash(url);
  if (!hash) throw new Error(`Could not decode source image: ${url}`);
  return { url, stem: stemOf(url), hash };
}

function readCollection() {
  const q = `
    query Coll($id: ID!) {
      collection(id: $id) {
        products(first: 250) {
          nodes {
            id
            title
            featuredImage { url }
            specType: metafield(namespace: "${METAFIELD.namespace}", key: "${METAFIELD.key}") { value }
            media(first: 25) { nodes { ... on MediaImage { id alt image { url } } } }
          }
        }
      }
    }`;
  const d = gql(q, { id: COLLECTION_ID });
  return d.collection?.products?.nodes || [];
}

async function classify(product, source) {
  const value = product.specType?.value || null;
  const inScope = ACCEPTED_VALUES.includes(value);
  const record = {
    productId: product.id,
    title: product.title,
    metafieldValue: value,
    featuredImage: product.featuredImage?.url || null,
    action: "skip",
    reason: inScope ? null : "not-in-scope",
  };
  if (!inScope) return record;

  const imgs = (product.media?.nodes || []).filter((m) => m && m.image?.url);

  // 1. alt marker (images this helper added)
  if (imgs.some((m) => (m.alt || "") === ALT_MARKER)) {
    record.reason = "already-has-image:alt";
    return record;
  }
  // 2. filename stem (same file, or a Shopify-suffixed copy of it)
  if (imgs.some((m) => {
    const s = stemOf(m.image.url);
    return s === source.stem || s.startsWith(source.stem + "_");
  })) {
    record.reason = "already-has-image:filename";
    return record;
  }
  // 3. perceptual dHash of each PNG this product carries
  let best = Infinity, unverified = 0;
  for (const m of imgs) {
    const h = await fetchDhash(m.image.url);
    if (!h) { unverified++; continue; }
    best = Math.min(best, hamming(source.hash, h));
  }
  if (best <= DHASH_MAX_DISTANCE) {
    record.reason = "already-has-image:dhash";
    record.dhashDistance = best;
    return record;
  }

  record.action = "add";
  record.reason = null;
  if (Number.isFinite(best)) record.dhashDistance = best;
  if (unverified) record.unverified = unverified;
  return record;
}

function writeReviewHtml(records, source) {
  const inScope = records.filter((r) => r.action === "add" || (r.reason || "").startsWith("already-has-image"));
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const thumb = (u) => (u ? esc(u.split("?")[0]) + "?width=240" : "");
  const counts = {
    add: records.filter((r) => r.action === "add").length,
    already: records.filter((r) => (r.reason || "").startsWith("already-has-image")).length,
    notInScope: records.filter((r) => r.reason === "not-in-scope").length,
    unverified: records.filter((r) => r.unverified).length,
  };
  const card = (r) => {
    const add = r.action === "add";
    return `<figure class="card ${add ? "add" : "skip"}">
      <img loading="lazy" src="${thumb(r.featuredImage)}" alt="">
      <figcaption>
        <span class="badge">${add ? "ADD" : esc(r.reason)}</span>
        <b>${esc(r.title)}</b>
        <small>${esc(r.metafieldValue)}</small>
        ${r.dhashDistance != null ? `<small>nearest dHash: ${r.dhashDistance}</small>` : ""}
        ${r.unverified ? `<small>⚠ ${r.unverified} image(s) could not be hashed</small>` : ""}
      </figcaption>
    </figure>`;
  };
  const html = `<!doctype html><meta charset="utf-8"><title>Use-case image — review</title>
<style>
  body{font:14px/1.4 system-ui,sans-serif;margin:24px;color:#111}
  header{display:flex;gap:16px;align-items:center;margin-bottom:16px}
  header img{width:160px;height:160px;object-fit:cover;border:1px solid #ccc;border-radius:8px}
  .tally span{display:inline-block;margin-right:14px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
  .card{margin:0;border:2px solid #ddd;border-radius:8px;overflow:hidden;background:#fafafa}
  .card.add{border-color:#1a7f37;background:#eaf6ec}
  .card img{width:100%;height:180px;object-fit:cover;display:block;background:#fff}
  figcaption{padding:8px;display:flex;flex-direction:column;gap:3px}
  .badge{align-self:flex-start;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;background:#ddd}
  .add .badge{background:#1a7f37;color:#fff}
  small{color:#555}
</style>
<header>
  <img src="${thumb(source.url)}" alt="use-case photo">
  <div>
    <h1>Use-case image — dry run</h1>
    <p class="tally">
      <span><b style="color:#1a7f37">${counts.add}</b> to ADD</span>
      <span><b>${counts.already}</b> already have it</span>
      <span><b>${counts.notInScope}</b> not in scope (hidden)</span>
      <span>${counts.unverified ? `⚠ <b>${counts.unverified}</b> with unhashable media` : ""}</span>
    </p>
    <p><small>Source: 2nd media of product ${esc(SOURCE_PRODUCT_ID.split("/").pop())} — ${esc(source.stem)}</small></p>
  </div>
</header>
<div class="grid">
${inScope.map(card).join("\n")}
</div>`;
  writeFileSync(REVIEW_FILE, html);
}

async function runDryRun() {
  const source = await resolveSource();
  const products = readCollection();
  console.log(`Collection: ${products.length} products; source image ${source.stem}`);
  const records = [];
  for (const p of products) {
    records.push(await classify(p, source));
  }
  const plan = { source, generatedAt: new Date().toISOString(), records };
  writeFileSync(PLAN_FILE, JSON.stringify(plan, null, 2));
  writeReviewHtml(records, source);
  const add = records.filter((r) => r.action === "add").length;
  const already = records.filter((r) => (r.reason || "").startsWith("already-has-image")).length;
  const oos = records.filter((r) => r.reason === "not-in-scope").length;
  console.log(`\n  ADD:            ${add}`);
  console.log(`  already-has:    ${already}`);
  console.log(`  not-in-scope:   ${oos}`);
  console.log(`\nPlan written:   ${PLAN_FILE}`);
  console.log(`Review page:    ${REVIEW_FILE}`);
  console.log(`\nReview the page, then run:  node scripts/add-usecase-image.mjs --apply`);
}

async function runApply(limit) {
  if (!existsSync(PLAN_FILE)) throw new Error(`No plan file at ${PLAN_FILE} — run a dry run first`);
  const plan = JSON.parse(readFileSync(PLAN_FILE, "utf8"));
  const source = await resolveSource();
  if (source.stem !== plan.source.stem) {
    throw new Error(`Source image changed since the plan was generated (${plan.source.stem} -> ${source.stem}); re-run the dry run`);
  }
  const done = existsSync(APPLIED_FILE)
    ? new Set(readFileSync(APPLIED_FILE, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l).productId))
    : new Set();
  let todo = plan.records.filter((r) => r.action === "add" && !done.has(r.productId));
  if (limit != null) todo = todo.slice(0, limit);
  console.log(`Applying to ${todo.length} product(s)${limit != null ? ` (--limit ${limit})` : ""}...`);

  const mutation = `
    mutation Add($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media { ... on MediaImage { id status } }
        mediaUserErrors { field message }
      }
    }`;
  let ok = 0, failed = 0;
  for (const r of todo) {
    const vars = {
      productId: r.productId,
      media: [{ originalSource: source.url, mediaContentType: "IMAGE", alt: ALT_MARKER }],
    };
    let attempt = 0, result;
    while (true) {
      attempt++;
      try {
        result = gql(mutation, vars, { mutation: true });
        break;
      } catch (e) {
        if (attempt < 2 && /throttl|timeout|502|503|429/i.test(e.message)) { await sleep(3000); continue; }
        result = { __error: e.message };
        break;
      }
    }
    const errs = result.__error
      ? [{ message: result.__error }]
      : result.productCreateMedia?.mediaUserErrors || [];
    if (errs.length) {
      failed++;
      console.log(`  ✗ ${r.title}\n      ${errs.map((e) => e.message).join("; ")}`);
    } else {
      ok++;
      const mediaId = result.productCreateMedia?.media?.[0]?.id || null;
      appendFileSync(APPLIED_FILE, JSON.stringify({ productId: r.productId, mediaId, ts: new Date().toISOString() }) + "\n");
      console.log(`  ✓ ${r.title}`);
    }
    await sleep(1000);
  }
  console.log(`\nDone. added ${ok}, failed ${failed}. Undo log: ${APPLIED_FILE}`);
}

async function runUndo() {
  if (!existsSync(APPLIED_FILE)) throw new Error(`Nothing to undo — no ${APPLIED_FILE}`);
  const entries = readFileSync(APPLIED_FILE, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const byProduct = new Map();
  for (const e of entries) {
    if (!e.mediaId) continue;
    if (!byProduct.has(e.productId)) byProduct.set(e.productId, []);
    byProduct.get(e.productId).push(e.mediaId);
  }
  console.log(`Undoing media on ${byProduct.size} product(s)...`);
  const mutation = `
    mutation Del($productId: ID!, $mediaIds: [ID!]!) {
      productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
        deletedMediaIds
        mediaUserErrors { field message }
      }
    }`;
  for (const [productId, mediaIds] of byProduct) {
    try {
      const res = gql(mutation, { productId, mediaIds }, { mutation: true });
      const errs = res.productDeleteMedia?.mediaUserErrors || [];
      console.log(errs.length ? `  ✗ ${productId}: ${errs.map((e) => e.message).join("; ")}` : `  ✓ ${productId} (${mediaIds.length})`);
    } catch (e) {
      console.log(`  ✗ ${productId}: ${e.message}`);
    }
    await sleep(1000);
  }
  console.log(`\nUndo complete. Delete ${APPLIED_FILE} if you are finished.`);
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const limitArg = argv.includes("--limit") ? Number(argv[argv.indexOf("--limit") + 1]) : null;

mkdirSync(OUT_DIR, { recursive: true });

try {
  if (has("--undo")) await runUndo();
  else if (has("--apply")) await runApply(limitArg);
  else await runDryRun();
} catch (e) {
  console.error(`\nERROR: ${e.message}`);
  process.exit(1);
}
