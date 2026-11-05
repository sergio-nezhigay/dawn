if (!customElements.get('product-modal')) {
  customElements.define(
    'product-modal',
    class ProductModal extends ModalDialog {
      constructor() {
        super();
        this._items = [];
        this._index = 0;
        this._scale = 1;
        this._tx = 0;
        this._ty = 0;
        this._gesture = null;
        this._lastTap = null;
        // Back to a page restored from the back/forward cache with the viewer still open: close it.
        window.addEventListener('pageshow', (e) => {
          if (e.persisted && this.hasAttribute('open')) this.hide();
        });
      }

      show(opener) {
        // Phones, also when held sideways (wider than 750px): the layout follows this attribute, not a media query.
        const fullscreen =
          window.innerWidth < 750 || (matchMedia('(pointer: coarse)').matches && window.innerHeight < 750);
        // Computers with a mouse: one large photo at a time instead of Dawn's stacked list.
        const viewer =
          !fullscreen && matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth >= 750;
        this.toggleAttribute('data-fullscreen', fullscreen);
        this.toggleAttribute('data-viewer', viewer);
        if (fullscreen) this._setupFullscreen(opener);
        if (viewer) this._setupViewer(opener);
        super.show(opener);
        if (!fullscreen && !viewer) this._showActiveMedia(opener);
      }

      hide() {
        if (this.hasAttribute('data-fullscreen') || this.hasAttribute('data-viewer')) {
          this._syncPageGallery();
          this._teardown();
          if (this._historyEntry) this._dropHistoryEntry();
        }
        super.hide();
      }

      _showActiveMedia(opener) {
        const openedId = opener.getAttribute('data-media-id');
        this.querySelectorAll(`[data-media-id]:not([data-media-id="${openedId}"])`).forEach(
          (el) => el.classList.remove('active')
        );
        const activeMedia = this.querySelector(`[data-media-id="${openedId}"]`);
        if (!activeMedia) return;
        const tpl = activeMedia.querySelector('template');
        activeMedia.classList.add('active');
        activeMedia.scrollIntoView();
        const container = this.querySelector('[role="document"]');
        container.scrollLeft = (activeMedia.width - container.clientWidth) / 2;
        if (
          activeMedia.nodeName === 'DEFERRED-MEDIA' &&
          tpl?.content?.querySelector('.js-youtube')
        )
          activeMedia.loadContent();
      }

      _setupFullscreen(opener) {
        this._content = this.querySelector('[role="document"]');
        this._items = Array.from(this._content.children);
        const idx = this._items.findIndex((el) => el.dataset.mediaId === opener.dataset.mediaId);
        this._reusePagePhotos();
        this._goTo(Math.max(idx, 0), false);

        // Touch listeners on dialog — it always covers the full viewport regardless
        // of where the content strip is translated to. Listening on the content element
        // itself breaks for images 2+ because translateX moves it out of the hit area.
        this._listeners = new AbortController();
        const signal = this._listeners.signal;
        const dialog = this.querySelector('.product-media-modal__dialog');
        const arrow = (selector, step) =>
          this.querySelector(selector).addEventListener(
            'click',
            (e) => {
              e.stopPropagation();
              this._goTo(this._index + step, true);
            },
            { signal }
          );
        dialog.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: true, signal });
        dialog.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false, signal });
        dialog.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: true, signal });
        // the system took the touch (call, edge-back gesture): settle on the current photo
        dialog.addEventListener('touchcancel', () => {
          this._gesture = null;
          this._slideTo(0, true);
        }, { passive: true, signal });
        dialog.addEventListener('pointerup', (e) => e.stopPropagation(), { signal });
        // Rotation: same photo, re-laid out for the new width. Height-only changes (URL bar) keep the zoom.
        window.addEventListener('resize', () => window.innerWidth !== this._width && this._goTo(this._index, false), {
          signal,
        });
        arrow('.product-media-modal__prev', -1);
        arrow('.product-media-modal__next', 1);
        this._pushHistoryEntry();
      }

      _setupViewer(opener) {
        this._content = this.querySelector('[role="document"]');
        this._items = Array.from(this._content.children);
        // what _fitViewer changes and closing gives back: the photos' srcset sizes, Dawn's own video sizing
        this._saved = this._items.map((el) => (el.tagName === 'IMG' ? el.sizes : el.style.cssText));
        const idx = this._items.findIndex((el) => el.dataset.mediaId === opener.dataset.mediaId);
        this._fitViewer();
        this._reusePagePhotos();
        this._goTo(Math.max(idx, 0), false);

        this._listeners = new AbortController();
        const signal = this._listeners.signal;
        const dialog = this.querySelector('.product-media-modal__dialog');
        const arrow = (selector, step) =>
          this.querySelector(selector).addEventListener('click', () => this._goTo(this._index + step, true), { signal });
        arrow('.product-media-modal__prev', -1);
        arrow('.product-media-modal__next', 1);
        // ModalDialog closes a media modal on any mouse pointerup; here only a click beside the photo closes it.
        dialog.addEventListener(
          'pointerup',
          (e) => {
            e.stopPropagation();
            // controls, the counter and a playing video or 3D model keep their own clicks
            if (e.button !== 0 || e.target.closest('button, .product-media-modal__counter, video, model-viewer')) return;
            const item = this._items[this._index];
            if (!item.contains(e.target)) this.hide(); // the side margins belong to the strip, not the photo
            else if (item.tagName === 'IMG') this._toggleViewerZoom(item, e.clientX, e.clientY);
          },
          { signal }
        );
        dialog.addEventListener('mousemove', (e) => this._scale > 1 && this._followMouse(e.clientX, e.clientY, false), {
          signal,
        });
        this.addEventListener(
          'keydown',
          (e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            this._goTo(this._index + (e.key === 'ArrowRight' ? 1 : -1), true);
          },
          { signal }
        );
        // dragging the window edge fires many resizes: re-lay out once per frame
        let frame;
        window.addEventListener(
          'resize',
          () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
              this._fitViewer();
              this._goTo(this._index, false);
            });
          },
          { signal }
        );
        this._pushHistoryEntry();
      }

      // As large as the window allows beside the arrows, never bigger than the original photo.
      _fitViewer() {
        const boxW = window.innerWidth - 176;
        const boxH = window.innerHeight - 112;
        const place = (item, width, height) => {
          item.style.width = `${width}px`;
          item.style.height = `${height}px`;
          item.style.marginInline = `${(window.innerWidth - width) / 2}px`; // the slide stays one window wide
        };
        this._items.forEach((item) => {
          if (item.tagName !== 'IMG') {
            // video / 3D model: as large as the box allows at its own shape
            const ratio = Number(item.dataset.aspectRatio) || 16 / 9;
            const width = Math.round(Math.min(boxW, boxH * ratio));
            item.style.paddingTop = '0';
            return place(item, width, Math.round(width / ratio));
          }
          const w = Number(item.dataset.originalWidth);
          const h = (w * item.getAttribute('height')) / item.getAttribute('width');
          const fit = Math.min(boxW / w, boxH / h, 1);
          place(item, Math.round(w * fit), Math.round(h * fit));
          item.sizes = `${Math.round(w * fit)}px`;
          // a click shows the photo's real pixels, so it only zooms when there is more to see
          item.classList.toggle('is-zoomable', fit < 0.95);
        });
      }

      _toggleViewerZoom(item, x, y) {
        if (this._scale > 1) return this._resetZoom();
        if (!item.classList.contains('is-zoomable')) return;
        this._scale = Math.min(4, Number(item.dataset.originalWidth) / item.offsetWidth);
        this._loadOriginal(item);
        this._followMouse(x, y, true);
      }

      // The zoomed photo follows the mouse: at the window's left edge you see the photo's left edge, and so on.
      _followMouse(x, y, animated) {
        const item = this._items[this._index];
        const { cx, cy } = this._center(item);
        const w = item.offsetWidth * this._scale;
        const h = item.offsetHeight * this._scale;
        this._tx = w / 2 - cx - ((w - window.innerWidth) * x) / window.innerWidth;
        this._ty = h / 2 - cy - ((h - window.innerHeight) * y) / window.innerHeight;
        this._applyZoom(animated);
      }

      _teardown() {
        this._listeners.abort();
        this._content.style.cssText = '';
        this._items.forEach((el) => (el.style.cssText = ''));
        if (this.hasAttribute('data-viewer')) {
          this._items.forEach((el, i) => (el.tagName === 'IMG' ? (el.sizes = this._saved[i]) : (el.style.cssText = this._saved[i])));
          this.querySelectorAll('[aria-disabled]').forEach((button) => {
            button.removeAttribute('aria-disabled');
            button.removeAttribute('tabindex');
          });
        }
        this.removeAttribute('data-fullscreen');
        this.removeAttribute('data-viewer');
        this.removeAttribute('data-zoomed');
      }

      // The phone's Back button should close the viewer, not leave the page (same pattern as HeaderDrawer in global.js).
      _pushHistoryEntry() {
        if (this._historyEntry || this._historyBackPending) return;
        history.pushState({ ...history.state, productModal: true }, '');
        this._historyEntry = true;
        window.addEventListener('popstate', this._onPopState);
      }

      _onPopState = () => {
        this._historyEntry = false;
        window.removeEventListener('popstate', this._onPopState);
        this.hide();
      };

      // history.back() is asynchronous; a viewer reopened before it lands gets its entry once it does.
      _dropHistoryEntry() {
        this._historyEntry = false;
        this._historyBackPending = true;
        window.removeEventListener('popstate', this._onPopState);
        window.addEventListener(
          'popstate',
          () => {
            this._historyBackPending = false;
            if (this.hasAttribute('data-fullscreen') || this.hasAttribute('data-viewer')) this._pushHistoryEntry();
          },
          { once: true }
        );
        history.back();
      }

      // Show the photo last viewed here in the page gallery too, without scrolling the page.
      _syncPageGallery() {
        const id = this._items[this._index]?.dataset.mediaId;
        const slide = document.querySelector(`media-gallery [data-media-id="${this.dataset.section}-${id}"]`);
        if (!slide) return;
        slide.parentElement.scrollTo({ left: slide.offsetLeft, behavior: 'instant' });
        this.openedBy = slide.querySelector('.product__media-toggle') || this.openedBy;
        if (!this.hasAttribute('data-viewer')) return;
        // Computers: the main photo and its thumbnail follow too (media-gallery's setActiveMedia could scroll the page).
        slide.parentElement.querySelectorAll('.is-active').forEach((el) => el.classList.remove('is-active'));
        slide.classList.add('is-active');
        const gallery = slide.closest('media-gallery');
        const thumbnail = gallery?.elements.thumbnails?.querySelector(`[data-target="${this.dataset.section}-${id}"]`);
        if (thumbnail) gallery.setActiveThumbnail(thumbnail);
      }

      // A page photo that is already as sharp as the screen needs is shown as is: no second download.
      // (naturalWidth of a srcset image is density-corrected, so the width comes from the URL.)
      _reusePagePhotos() {
        const viewer = this.hasAttribute('data-viewer');
        this._items.forEach((item) => {
          if (item.tagName !== 'IMG' || item.dataset.reused) return;
          // phones: the screen width; computers: the size _fitViewer gave the photo
          const needed = (viewer ? parseFloat(item.style.width) : window.innerWidth * 0.9) * window.devicePixelRatio;
          const pageImg = document.querySelector(
            `media-gallery [data-media-id="${this.dataset.section}-${item.dataset.mediaId}"] img`
          );
          const original = Number(item.dataset.originalWidth);
          const width = Math.min(Number(pageImg?.currentSrc.match(/[?&]width=(\d+)/)?.[1] || original), original);
          if (!pageImg?.complete || width < Math.min(needed, original)) return;
          item.removeAttribute('srcset');
          item.src = pageImg.currentSrc;
          item.dataset.reused = true;
          if (width >= original) delete item.dataset.zoomSrc; // already the full photo
        });
      }

      // Zoom shows the original photo; until it arrives the screen-sized one stays.
      _loadOriginal(item) {
        const url = item.dataset.zoomSrc;
        if (!url || item.currentSrc === url || item.dataset.zoomLoading) return;
        item.dataset.zoomLoading = true;
        const original = new Image();
        original.onload = () => {
          item.removeAttribute('srcset');
          item.src = url;
        };
        original.onerror = () => delete item.dataset.zoomLoading; // try again on the next zoom
        original.src = url;
      }

      _goTo(index, animated) {
        const previous = this._index;
        this._index = Math.min(Math.max(index, 0), this._items.length - 1);
        this._width = window.innerWidth;
        this._resetZoom();
        this._slideTo(0, animated);
        this.querySelector('.product-media-modal__index').textContent = this._index + 1;
        if (this.hasAttribute('data-viewer')) {
          if (this._index !== previous) window.pauseAllMedia(); // a video left behind stops playing
          // a page photo reused for a smaller window is too soft after the window grew: load the original
          const item = this._items[this._index];
          if (item.dataset.reused && item.naturalWidth < parseFloat(item.style.width) * window.devicePixelRatio)
            this._loadOriginal(item);
          this._updateArrows();
        }
      }

      // Computers: the arrow at the first or last photo goes invisible but stays in place,
      // so a repeated click there does nothing instead of closing the viewer.
      _updateArrows() {
        [
          ['.product-media-modal__prev', this._index === 0],
          ['.product-media-modal__next', this._index === this._items.length - 1],
        ].forEach(([selector, off]) => {
          const button = this.querySelector(selector);
          if (off && document.activeElement === button) this.querySelector('[role="dialog"]').focus(); // keep ←/→ and Escape working
          button.setAttribute('aria-disabled', off);
          button.tabIndex = off ? -1 : 0;
        });
      }

      _slideTo(offset, animated) {
        this._content.style.transition = animated ? 'transform 0.28s ease' : 'none';
        this._content.style.transform = `translateX(${offset - this._index * window.innerWidth}px)`;
      }

      _resetZoom() {
        this._items.forEach((el) => (el.style.transform = ''));
        this._scale = 1;
        this._tx = 0;
        this._ty = 0;
        this.removeAttribute('data-zoomed');
      }

      // Zoom to `scale`, keeping the photo point under (x, y) where it is.
      _zoomTo(scale, x, y, animated) {
        const item = this._items[this._index];
        if (item.tagName !== 'IMG') return;
        const { cx, cy } = this._center(item);
        const k = scale / this._scale;
        this._tx = x - cx - (x - cx - this._tx) * k;
        this._ty = y - cy - (y - cy - this._ty) * k;
        this._scale = scale;
        if (scale > 1) this._loadOriginal(item);
        this._applyZoom(animated);
      }

      // Centre of the current photo before zoom and pan (the rendered box minus the rendered pan).
      _center(item) {
        const r = item.getBoundingClientRect();
        const m = new DOMMatrix(getComputedStyle(item).transform);
        return { cx: r.left + r.width / 2 - m.e, cy: r.top + r.height / 2 - m.f };
      }

      // Pan stops at the photo's edges: never a blank screen. object-fit: contain letterboxes the photo inside the box.
      _applyZoom(animated) {
        const item = this._items[this._index];
        const { cx, cy } = this._center(item);
        const w = item.naturalWidth || item.offsetWidth;
        const h = item.naturalHeight || item.offsetHeight;
        const size = Math.min(item.offsetWidth / w, item.offsetHeight / h) * this._scale;
        const clamp = (t, c, length, view) =>
          length <= view ? 0 : Math.min(length / 2 - c, Math.max(view - c - length / 2, t));
        this._tx = clamp(this._tx, cx, w * size, window.innerWidth);
        this._ty = clamp(this._ty, cy, h * size, window.innerHeight);
        item.style.transition = animated ? 'transform 0.25s ease' : 'none';
        item.style.transform = `translate(${this._tx}px, ${this._ty}px) scale(${this._scale})`;
        // hide nav arrows while zoomed so user pans instead of navigates
        this.toggleAttribute('data-zoomed', this._scale > 1);
      }

      _onTouchStart(e) {
        // taps on the arrows and the close button are clicks, not swipes or double-taps
        if (e.target.closest('button')) {
          this._gesture = null;
          return;
        }
        const [a, b] = e.touches;
        if (b) {
          if (this._gesture?.type === 'swipe') this._slideTo(0, true); // a second finger turns a swipe into a pinch
          this._gesture = { type: 'pinch', dist: this._dist(a, b) };
          return;
        }
        const time = Date.now();
        this._gesture = { type: null, x: a.clientX, y: a.clientY, lastX: a.clientX, lastY: a.clientY, time, trail: [[a.clientX, time]] };
      }

      _onTouchMove(e) {
        const g = this._gesture;
        if (!g) return;
        const [a, b] = e.touches;
        e.preventDefault();

        if (g.type === 'pinch') {
          if (!b) return;
          const dist = this._dist(a, b);
          const scale = Math.min(4, Math.max(1, this._scale * (dist / g.dist)));
          g.dist = dist;
          this._zoomTo(scale, (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2, false);
          return;
        }

        if (this._scale > 1) {
          this._tx += a.clientX - g.lastX;
          this._ty += a.clientY - g.lastY;
          g.lastX = a.clientX;
          g.lastY = a.clientY;
          this._applyZoom(false);
          return;
        }
        if (g.type === 'idle') return;

        const dx = a.clientX - g.x;
        const dy = a.clientY - g.y;
        if (!g.type && Math.max(Math.abs(dx), Math.abs(dy)) > 8) g.type = Math.abs(dx) > Math.abs(dy) ? 'swipe' : 'scroll';
        if (g.type !== 'swipe') return;
        const now = Date.now();
        g.trail.push([a.clientX, now]);
        while (now - g.trail[0][1] > 100) g.trail.shift(); // only the last 100 ms decides a flick
        // the photo follows the finger; past the first or last photo it resists
        const atEdge = (dx > 0 && this._index === 0) || (dx < 0 && this._index === this._items.length - 1);
        this._slideTo(atEdge ? dx * 0.35 : dx, false);
      }

      _onTouchEnd(e) {
        const g = this._gesture;
        if (!g) return;
        const [a] = e.touches;
        // One finger lifted mid-pinch: the other one may pan, but never counts as a tap or a swipe.
        if (a) {
          this._gesture = { type: 'idle', lastX: a.clientX, lastY: a.clientY };
          return;
        }
        this._gesture = null;
        if (g.type === 'pinch' || g.type === 'idle') {
          if (this._scale < 1.05) this._resetZoom();
          return;
        }

        const touch = e.changedTouches[0];
        const dx = touch.clientX - g.x;
        const dy = touch.clientY - g.y;
        const elapsed = Date.now() - g.time;

        if (g.type === 'swipe') {
          // a flick: finger speed over its last 100 ms, in the swipe's direction
          const now = Date.now();
          const [x0, t0] = g.trail.find(([, t]) => now - t <= 100) || [touch.clientX, now];
          const v = (touch.clientX - x0) / Math.max(now - t0, 1);
          const flick = Math.abs(dx) > window.innerWidth * 0.2 || (Math.abs(v) > 0.4 && v * dx > 0);
          const next = this._index + (dx < 0 ? 1 : -1);
          if (flick && next >= 0 && next < this._items.length) this._goTo(next, true);
          else this._slideTo(0, true);
          return;
        }

        // double-tap → toggle 2.5× zoom at the tapped point
        if (g.type || elapsed > 250 || Math.hypot(dx, dy) > 12) return;
        const now = Date.now();
        const last = this._lastTap;
        if (last && now - last.time < 350 && Math.hypot(touch.clientX - last.x, touch.clientY - last.y) < 40) {
          this._lastTap = null;
          this._zoomTo(this._scale > 1 ? 1 : 2.5, touch.clientX, touch.clientY, true);
          return;
        }
        this._lastTap = { time: now, x: touch.clientX, y: touch.clientY };
      }

      _dist(a, b) {
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      }
    }
  );
}
