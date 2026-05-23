if (!customElements.get('product-modal')) {
  customElements.define(
    'product-modal',
    class ProductModal extends ModalDialog {
      constructor() {
        super();
        this._mediaItems = [];
        this._currentIndex = 0;
        this._currentScale = 1;
        this._translateX = 0;
        this._translateY = 0;
        this._touchStartX = 0;
        this._touchStartY = 0;
        this._lastTouchX = 0;
        this._lastTouchY = 0;
        this._touchStartTime = 0;
        this._touchStartDist = 0;
        this._touchStartScale = 1;
        this._pinching = false;
        this._lastTapTime = 0;
        this._isFullscreen = false;
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);
        this._onPrevClick = (e) => { e.stopPropagation(); this._navigate(-1); };
        this._onNextClick = (e) => { e.stopPropagation(); this._navigate(1); };
        this._stopPointerUp = (e) => e.stopPropagation();
      }

      hide() {
        super.hide();
        if (this._isFullscreen) this._teardown();
      }

      show(opener) {
        super.show(opener);
        this._isFullscreen =
          this.dataset.mobileStyle === 'fullscreen' && window.innerWidth < 750;
        if (this._isFullscreen) {
          this._setupFullscreen(opener);
        } else {
          this._showActiveMedia(opener);
        }
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

      // kept for compatibility with external callers
      showActiveMedia() {
        if (this.openedBy) this._showActiveMedia(this.openedBy);
      }

      _setupFullscreen(opener) {
        const openedId = opener.getAttribute('data-media-id');
        this._mediaItems = Array.from(this.querySelectorAll('[data-media-id]'));
        const idx = this._mediaItems.findIndex(
          (el) => el.getAttribute('data-media-id') === openedId
        );
        this._currentIndex = idx >= 0 ? idx : 0;
        this._currentScale = 1;
        this._translateX = 0;
        this._translateY = 0;

        this._updateSlide(false);
        this._updateCounter();

        // Touch listeners on dialog — it always covers the full viewport regardless
        // of where the content strip is translated to. Listening on the content element
        // itself breaks for images 2+ because translateX moves it out of the hit area.
        const dialog = this.querySelector('.product-media-modal__dialog');
        dialog.addEventListener('touchstart', this._onTouchStart, { passive: true });
        dialog.addEventListener('touchmove', this._onTouchMove, { passive: false });
        dialog.addEventListener('touchend', this._onTouchEnd, { passive: true });
        dialog.addEventListener('pointerup', this._stopPointerUp);

        this.querySelector('.product-media-modal__prev')?.addEventListener('click', this._onPrevClick);
        this.querySelector('.product-media-modal__next')?.addEventListener('click', this._onNextClick);
      }

      _teardown() {
        const dialog = this.querySelector('.product-media-modal__dialog');
        if (dialog) {
          dialog.removeEventListener('touchstart', this._onTouchStart);
          dialog.removeEventListener('touchmove', this._onTouchMove);
          dialog.removeEventListener('touchend', this._onTouchEnd);
          dialog.removeEventListener('pointerup', this._stopPointerUp);
        }
        this.querySelector('.product-media-modal__prev')?.removeEventListener('click', this._onPrevClick);
        this.querySelector('.product-media-modal__next')?.removeEventListener('click', this._onNextClick);

        const content = this.querySelector('[role="document"]');
        if (content) content.style.cssText = '';
        this._mediaItems.forEach((el) => (el.style.transform = ''));
        this._isFullscreen = false;
      }

      _navigate(dir) {
        const next = this._currentIndex + dir;
        if (next < 0 || next >= this._mediaItems.length) return;
        this._currentIndex = next;
        this._currentScale = 1;
        this._translateX = 0;
        this._translateY = 0;
        this._updateSlide(true);
        this._updateCounter();
      }

      _updateSlide(animated) {
        const content = this.querySelector('[role="document"]');
        if (!content) return;
        content.style.transition = animated ? 'transform 0.28s ease' : 'none';
        content.style.transform = `translateX(${-this._currentIndex * window.innerWidth}px)`;
        this._mediaItems.forEach((el) => (el.style.transform = ''));
        this._setNavVisibility(true);
      }

      _updateCounter() {
        const indexEl = this.querySelector('.product-media-modal__index');
        if (indexEl) indexEl.textContent = this._currentIndex + 1;
      }

      _onTouchStart(e) {
        if (e.touches.length === 2) {
          this._touchStartDist = this._pinchDist(e);
          this._touchStartScale = this._currentScale;
          this._pinching = true;
          return;
        }
        this._pinching = false;
        this._touchStartX = e.touches[0].clientX;
        this._touchStartY = e.touches[0].clientY;
        this._lastTouchX = e.touches[0].clientX;
        this._lastTouchY = e.touches[0].clientY;
        this._touchStartTime = Date.now();
      }

      _onTouchMove(e) {
        if (e.touches.length === 2 && this._pinching) {
          e.preventDefault();
          const dist = this._pinchDist(e);
          this._currentScale = Math.min(
            4,
            Math.max(1, this._touchStartScale * (dist / this._touchStartDist))
          );
          this._applyZoom();
          return;
        }
        if (e.touches.length === 1 && this._currentScale > 1) {
          e.preventDefault();
          this._translateX += e.touches[0].clientX - this._lastTouchX;
          this._translateY += e.touches[0].clientY - this._lastTouchY;
          this._lastTouchX = e.touches[0].clientX;
          this._lastTouchY = e.touches[0].clientY;
          this._applyZoom();
        }
      }

      _onTouchEnd(e) {
        this._pinching = false;
        if (this._currentScale > 1) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this._touchStartX;
        const deltaY = touch.clientY - this._touchStartY;
        const elapsed = Date.now() - this._touchStartTime;

        // double-tap → toggle 2.5× zoom
        if (elapsed < 250 && Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12) {
          const now = Date.now();
          if (now - this._lastTapTime < 350) {
            this._currentScale = this._currentScale > 1 ? 1 : 2.5;
            this._translateX = 0;
            this._translateY = 0;
            this._applyZoom();
            this._lastTapTime = 0;
            return;
          }
          this._lastTapTime = now;
        }

        // horizontal swipe
        if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          this._navigate(deltaX < 0 ? 1 : -1);
        }
      }

      _applyZoom() {
        const item = this._mediaItems[this._currentIndex];
        if (!item) return;
        item.style.transition = 'transform 0.08s';
        item.style.transformOrigin = 'center center';
        item.style.transform = `scale(${this._currentScale}) translate(${
          this._translateX / this._currentScale
        }px, ${this._translateY / this._currentScale}px)`;
        // hide nav arrows while zoomed so user pans instead of navigates
        this._setNavVisibility(this._currentScale <= 1);
      }

      _setNavVisibility(visible) {
        const prev = this.querySelector('.product-media-modal__prev');
        const next = this.querySelector('.product-media-modal__next');
        const opacity = visible ? '' : '0';
        const pointerEvents = visible ? '' : 'none';
        if (prev) { prev.style.opacity = opacity; prev.style.pointerEvents = pointerEvents; }
        if (next) { next.style.opacity = opacity; next.style.pointerEvents = pointerEvents; }
      }

      _pinchDist(e) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
      }
    }
  );
}
