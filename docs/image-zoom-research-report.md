# Image Zoom on Hover — Research Report
**Date:** 2026-05-27  
**Goal:** Understand how Amazon and Rozetka implement the "lens + zoom panel to the right" feature on product pages, so we can implement the same pattern on our Dawn/Shopify store.

---

## 1. What the Feature Does

When a user **hovers over the main product image** (no click needed):
1. A semi-transparent **lens rectangle** appears, following the cursor and staying constrained within the image bounds.
2. A large **zoom panel** appears to the right of the image, showing the area under the lens magnified ~4×.
3. Moving the mouse pans the zoomed view in real time.
4. On mouseout everything hides instantly.

---

## 2. Amazon — Full DOM Inspection

Amazon's implementation was fully inspected via live browser DOM analysis.

### 2.1 Key HTML Elements

| Element | ID/Class | Description |
|---|---|---|
| Main image | `#landingImage` | Displayed product image |
| Image wrapper | `#imgTagWrapperId .imgTagWrapper` | Receives mouse events |
| Lens overlay | `#magnifierLens` | Created dynamically on first hover |
| Zoom panel | `#zoomWindow` | Appended to `<body>`, visible on hover |
| Hi-res image | `#detailImg` | Inside `#zoomWindow`, moves to show zoomed region |

### 2.2 Data Attributes on Main Image

```html
<img
  id="landingImage"
  class="a-dynamic-image"
  data-old-hires="[URL to hi-res image]"
  data-a-dynamic-image='{"url1": [355,355], "url2": [450,450], ..., "url7": [679,679]}'
  onload="markFeatureRenderForImageBlock()"
/>
```

- **`data-old-hires`** — URL of the full hi-res image used inside the zoom window (natural size: **1139 × 830 px**).
- **`data-a-dynamic-image`** — JSON map of responsive image URLs → their pixel dimensions. The largest available is 679 × 679 px as the display source.

### 2.3 Magnifier Lens (`#magnifierLens`)

Created dynamically and appended to `#imgTagWrapperId` on first hover.

```css
#magnifierLens {
  position: absolute;
  background-image: url("tile._CB483369110_.gif"); /* tiled semi-transparent gif */
  cursor: pointer;
  width: 177px;
  height: 154px;
  left: [cursor-driven]; 
  top: [cursor-driven];
}
```

- The visual "glass" effect is achieved via a **tiled semi-transparent GIF** as background-image — not opacity or rgba.
- The lens is constrained inside the main image bounds (never goes outside).

### 2.4 Zoom Window (`#zoomWindow`)

Appended directly to `<body>` — **not** inside the product card DOM.

```css
#zoomWindow {
  position: absolute;          /* relative to document */
  left: 735.5px;               /* positioned right of image column */
  top: 236px;
  width: 695px;
  height: 604px;
  overflow: hidden;
  background-color: white;
  z-index: 199;
  display: none;               /* hidden until hover */
}
```

Contains a single child:

```css
#detailImg {
  position: absolute;
  left: [computed];  /* negative offset, changes on mousemove */
  top: [computed];
}
```

### 2.5 Zoom Math

All measured values from live inspection:

| Measurement | Value |
|---|---|
| Main image displayed size | 460 × 336 px |
| Lens size | 177 × 154 px |
| Zoom window size | 695 × 604 px |
| hi-res image natural size | 1139 × 830 px |
| Zoom factor (window/lens) | **~3.93×** horizontal, **~3.92×** vertical |
| hi-res vs displayed ratio | **2.476×** |

**Position calculation for `#detailImg`** (derived from measured values):

```
scaleX = hiResWidth / displayedWidth        // 1139 / 460 = 2.476
scaleY = hiResHeight / displayedHeight      // 830 / 336 = 2.470

// When cursor is at (cursorX, cursorY) within the displayed image:
lensLeft = clamp(cursorX - lensWidth/2, 0, displayedWidth - lensWidth)
lensTop  = clamp(cursorY - lensHeight/2, 0, displayedHeight - lensHeight)

// Center of lens in displayed-image coords:
centerX = lensLeft + lensWidth/2
centerY = lensTop  + lensHeight/2

// detailImg offset (scroll to show the right region):
detailImg.style.left = -(centerX * scaleX - zoomWindowWidth / 2) + 'px'
detailImg.style.top  = -(centerY * scaleY - zoomWindowHeight / 2) + 'px'
```

**Verification:** At center hover, measured `detailImg.left = -220.588px`, formula gives `-(229.7 × 2.476 - 695/2) = -221.6px`. ✓

### 2.6 Event Handling

Amazon uses their proprietary `P` module system (not jQuery). The triggers are:

| Event | Target | Action |
|---|---|---|
| `mouseover` | `#imgTagWrapperId` | Show `#zoomWindow` (display:block), create/show lens |
| `mousemove` | `#imgTagWrapperId` | Update lens `left`/`top`, update `#detailImg` `left`/`top` |
| `mouseout`  | `#imgTagWrapperId` | Hide `#zoomWindow` (display:none), hide lens |

### 2.7 Layout — How the Panel Sits to the Right

- The entire `#imageBlock` lives inside `#leftCol` which has `position: sticky`.
- `#zoomWindow` is appended to `<body>` with fixed pixel `left` value calculated as `imageBlock.getBoundingClientRect().right + gap`.
- This avoids any z-index conflicts with the product info column on the right.

---

## 3. Rozetka — Analysis from Screenshot

Rozetka page was not inspectable via automation (domain blocked by hook). Analysis is based on the provided screenshot.

### 3.1 Visual Observations

- **Lens**: Light green-tinted semi-transparent rectangle overlay on main image. Appears to use `rgba(200, 230, 200, 0.5)` or similar green tint — different from Amazon's tiled GIF approach.
- **Zoom panel**: Large area to the right of the full image + thumbnail column. Takes up roughly the same width as the product info column (~600 px wide).
- **Trigger**: Hover only, no click required (same as Amazon).
- **Image label**: Shows product name tooltip at bottom of main image during hover — a Rozetka-specific UX addition.

### 3.2 Likely Implementation

From visual inspection, Rozetka's zoom closely matches the **background-image approach** (CSS background-position method) used by libraries like `js-image-zoom` or `EasyZoom`:

```js
// Result panel uses background instead of a nested <img>
result.style.backgroundImage = `url(${hiResUrl})`;
result.style.backgroundSize = `${displayedWidth * zoomFactor}px ${displayedHeight * zoomFactor}px`;
result.style.backgroundPosition = `-${lensLeft * zoomFactor}px -${lensTop * zoomFactor}px`;
```

OR it could use the same absolute-img approach as Amazon — both produce identical visual results.

---

## 4. Two Technical Approaches Compared

### Method A: Absolute-positioned hi-res `<img>` (Amazon)

**How it works:**
1. A real `<img>` with the hi-res src is placed inside `overflow: hidden` zoom div.
2. Its `left`/`top` is shifted on every `mousemove` to pan to the correct region.

**Pros:**
- Browser handles image rendering (hardware acceleration).
- Can lazy-load the hi-res image naturally.
- Works even if zoomed image has a different aspect ratio.

**Cons:**
- Slightly more complex JS (two elements to sync).
- Hi-res image appended to body — must manage cleanup.

### Method B: CSS `background-image` on result div (W3Schools / most libraries)

**How it works:**
1. The zoom result div sets `background-image` to the hi-res URL.
2. `background-size` is set to `img.width * cx` × `img.height * cy`.
3. `background-position` is updated on mousemove.

**Pros:**
- Simpler DOM (no separate img element inside zoom div).
- No need to calculate center offset — `background-position` does it.

**Cons:**
- Background images are not preloaded by browsers by default.
- Less control over image rendering quality.

**Recommendation:** Use **Method A** (absolute img) — it's what Amazon uses, gives better control, and aligns with Shopify's image delivery (we can pass `image_url` filter for the hi-res version).

---

## 5. Implementation Plan for Dawn/Shopify

### 5.1 HTML Structure (in `sections/main-product.liquid`)

```html
<!-- Main image wrapper — receives mousemove -->
<div class="product-media-zoom-container" id="productZoomContainer">
  <div class="imgTagWrapper" id="productZoomWrapper">
    <img 
      id="productZoomMainImg"
      src="{{ media | image_url: width: 600 }}"
      data-zoom-hires="{{ media | image_url: width: 1500 }}"
      width="600" height="600"
      loading="eager"
    />
    <!-- Lens injected here by JS -->
  </div>
</div>

<!-- Zoom panel — positioned via JS -->
<div id="productZoomWindow" style="display:none; overflow:hidden; position:absolute; z-index:199;">
  <img id="productZoomDetail" style="position:absolute;" />
</div>
```

### 5.2 CSS

```css
.imgTagWrapper {
  position: relative;
  display: inline-block;
}

#productZoomLens {
  position: absolute;
  background-color: rgba(200, 230, 200, 0.4); /* Rozetka-style green tint */
  /* OR: background: url('lens-tile.gif') repeat; for Amazon style */
  cursor: crosshair;
  pointer-events: none;
  border: 1px solid rgba(0,0,0,0.2);
}

#productZoomWindow {
  background: white;
}
```

### 5.3 JavaScript Core

```js
class ProductImageZoom {
  constructor(wrapperEl, zoomWindowEl) {
    this.wrapper = wrapperEl;
    this.img = wrapperEl.querySelector('img');
    this.zoomWindow = zoomWindowEl;
    this.detailImg = zoomWindowEl.querySelector('img');
    this.lens = null;

    this.ZOOM_WINDOW_W = 600;  // px
    this.ZOOM_WINDOW_H = 600;  // px
    this.LENS_W = 150;         // px — adjust based on desired zoom level
    this.LENS_H = 150;         // px

    this.wrapper.addEventListener('mouseover', () => this.show());
    this.wrapper.addEventListener('mouseout',  () => this.hide());
    this.wrapper.addEventListener('mousemove', (e) => this.onMove(e));
  }

  show() {
    if (!this.lens) this.createLens();
    // Preload hi-res
    if (!this.detailImg.src) {
      this.detailImg.src = this.img.dataset.zoomHires;
    }
    // Position zoom window to the right of wrapper
    const rect = this.wrapper.getBoundingClientRect();
    this.zoomWindow.style.left = (rect.right + window.scrollX + 16) + 'px';
    this.zoomWindow.style.top  = (rect.top  + window.scrollY) + 'px';
    this.zoomWindow.style.width  = this.ZOOM_WINDOW_W + 'px';
    this.zoomWindow.style.height = this.ZOOM_WINDOW_H + 'px';
    this.zoomWindow.style.display = 'block';
    this.lens.style.display = 'block';
  }

  hide() {
    this.zoomWindow.style.display = 'none';
    if (this.lens) this.lens.style.display = 'none';
  }

  onMove(e) {
    const rect  = this.img.getBoundingClientRect();
    const imgW  = rect.width;
    const imgH  = rect.height;
    const hiW   = this.detailImg.naturalWidth  || 1500;
    const hiH   = this.detailImg.naturalHeight || 1500;

    // Cursor position relative to image
    let curX = e.clientX - rect.left;
    let curY = e.clientY - rect.top;

    // Lens position (constrained within image)
    let lensX = Math.max(0, Math.min(curX - this.LENS_W / 2, imgW - this.LENS_W));
    let lensY = Math.max(0, Math.min(curY - this.LENS_H / 2, imgH - this.LENS_H));

    this.lens.style.left = lensX + 'px';
    this.lens.style.top  = lensY + 'px';

    // Scale from displayed to hi-res
    const scaleX = hiW / imgW;
    const scaleY = hiH / imgH;

    // Center of lens in displayed-image coords
    const centerX = lensX + this.LENS_W / 2;
    const centerY = lensY + this.LENS_H / 2;

    // Offset detailImg so the lens-center region is centered in zoomWindow
    this.detailImg.style.left = -(centerX * scaleX - this.ZOOM_WINDOW_W / 2) + 'px';
    this.detailImg.style.top  = -(centerY * scaleY - this.ZOOM_WINDOW_H / 2) + 'px';
  }

  createLens() {
    this.lens = document.createElement('div');
    this.lens.id = 'productZoomLens';
    this.lens.style.cssText = `
      position: absolute;
      width: ${this.LENS_W}px;
      height: ${this.LENS_H}px;
      background: rgba(200,230,200,0.4);
      border: 1px solid rgba(0,0,0,0.2);
      pointer-events: none;
      cursor: crosshair;
      display: none;
    `;
    this.wrapper.appendChild(this.lens);
  }
}
```

### 5.4 Zoom Factor Calculation

To choose lens size vs zoom window size:

```
zoomFactor = zoomWindowWidth / lensWidth
           = 600 / 150 = 4×   ← same as Amazon

The hi-res image must be at least:
  hiResWidth ≥ displayedWidth × zoomFactor
  e.g.: 600 × 4 = 2400px   (use Shopify's width: 2400 in image_url filter)
```

### 5.5 Files to Create/Modify

| File | Change |
|---|---|
| `sections/main-product.liquid` | Add `data-zoom-hires` attribute to main image, add `#productZoomWindow` div |
| `assets/product-zoom.js` | New JS file with `ProductImageZoom` class |
| `assets/component-product-zoom.css` | Lens and zoom window styles |
| `layout/theme.liquid` | Load CSS + JS (or use `{% stylesheet %}`/`{% javascript %}` in section) |

### 5.6 Mobile Handling

- Disable the feature entirely on touch devices (`'ontouchstart' in window`).
- On mobile, use a tap-to-fullscreen approach instead (already present in Dawn's lightbox).

---

## 6. Libraries to Consider (if not building custom)

| Library | Size | Dependency | Notes |
|---|---|---|---|
| `js-image-zoom` (malaman) | ~3KB | None | Closest to what we need; right-side panel; configurable lens |
| `Drift` | ~3KB | None | Clean API, actively maintained |
| `Magic Zoom Plus` | Commercial | None | Feature-rich, used by many Shopify themes |
| `jQuery Zoom` | ~2KB | jQuery | Simple but requires jQuery (Dawn doesn't use it) |

**Best fit:** `js-image-zoom` or custom implementation based on the code above.

---

## 7. Key Takeaways

1. **No click needed** — hover only, triggered by `mouseover`/`mousemove`/`mouseout`.
2. **Two DOM elements** — a lens overlay on the main image + a separate zoom panel to the right.
3. **Zoom panel is absolutely positioned** — appended to `<body>` or a fixed container, not inside the product card.
4. **Hi-res image is essential** — needs ~4× the displayed size (for 600px display → 2400px hi-res via Shopify CDN).
5. **Lens size drives zoom factor** — smaller lens = more zoom; adjust to taste.
6. **Amazon's math** — detailImg offset = `-(lensCenter × hiResScale - zoomWindowHalf)` — centers the hovered region in the zoom window.
7. **Mobile**: disable entirely, use tap/lightbox instead.
