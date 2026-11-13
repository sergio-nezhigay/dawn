/*
 * <product-description-toggle>
 * Shared "show more / show less" disclosure for the product description (mobile
 * inline block, desktop inline block in the buy column, desktop wide card in
 * sections/main-product.liquid) and the collection description
 * (sections/collection-description.liquid). Opening and closing are instant: no
 * height animation, so the button never slides away from the reader's finger.
 *
 * Two separate states:
 * - "fits": the whole text shows without a clamp, so no button. Measured on
 *   connect, again whenever the text or its width changes (ResizeObserver, fonts,
 *   window load), until the reader first clicks. The button stays unpainted
 *   (CSS gate on [data-measured]) until the first measurement, so short texts
 *   never flash it.
 * - "open": the reader's own choice, set only by clicking.
 *
 * On close it keeps the reader oriented: if they had scrolled past the
 * description, the heading is brought back to just below the sticky header. The
 * heading's position in the document does not move as the block shrinks (only
 * content below it does), so one instant scroll lands it correctly.
 *
 * The read-more / read-less labels come from data-label-more / data-label-less
 * on the button so no locale strings live in this file.
 */
class ProductDescriptionToggle extends HTMLElement {
  connectedCallback() {
    if (!this.content) {
      this.content =
        this.querySelector('.product__description-content') ||
        this.querySelector('.product__wide-description-body') ||
        this.querySelector('.js-collapse-content');
      this.button = this.querySelector('.product__description-toggle') || this.querySelector('.js-collapse-toggle');
      if (!this.content || !this.button) return;

      // Progressive enhancement: the collection clamp only exists with this class.
      this.content.classList.add('is-collapsible');
      // Show the button only if expanding would reveal at least this much more,
      // relative to the clamped height (scales with whichever clamp is in effect).
      this.revealThreshold = 0.5;
      this.labelMore = this.button.dataset.labelMore || this.button.textContent.trim();
      this.labelLess = this.button.dataset.labelLess || this.button.textContent.trim();
      this.onClick = this.onClick.bind(this);
      this.scheduleFitCheck = this.scheduleFitCheck.bind(this);
      this.onLoad = () => this.fitCheck(true);
    }
    if (!this.content || !this.button) return;

    this.button.addEventListener('click', this.onClick);
    if (this.userToggled) return;

    this.fitCheck(document.readyState === 'complete');
    // A clamped box keeps its size when the text inside it changes (font swap,
    // images), so watch the children as well as the box itself.
    this.resizeObserver = new ResizeObserver(this.scheduleFitCheck);
    for (const el of [this.content, ...this.content.children]) this.resizeObserver.observe(el);
    if (document.fonts) document.fonts.ready.then(this.scheduleFitCheck);
    if (document.readyState !== 'complete') window.addEventListener('load', this.onLoad, { once: true });
  }

  disconnectedCallback() {
    if (!this.button) return;
    this.button.removeEventListener('click', this.onClick);
    this.stopWatching();
  }

  stopWatching() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.resizeObserver = null;
    cancelAnimationFrame(this.fitFrame);
    window.removeEventListener('load', this.onLoad);
  }

  // Heading sits just before the element; prefer it as the scroll target so the
  // description heading is visible after a collapse. Falls back to the element.
  get scrollAnchor() {
    const prev = this.previousElementSibling;
    if (prev && prev.tagName === 'H2') return prev;
    return this;
  }

  // Distance from the viewport top the anchor should clear on a collapse. Read
  // from the anchor's own scroll-margin-top so CSS stays the single source.
  get anchorOffset() {
    const parsed = parseFloat(getComputedStyle(this.scrollAnchor).scrollMarginTop);
    return Number.isFinite(parsed) ? parsed : 160;
  }

  scheduleFitCheck() {
    cancelAnimationFrame(this.fitFrame);
    this.fitFrame = requestAnimationFrame(() => this.fitCheck(document.readyState === 'complete'));
  }

  // Decide "fits" against the clamp. Measures with the clamp on and sets the
  // final state in the same task, so nothing paints in between and an unchanged
  // decision leaves every size as it was (no ResizeObserver loop). Skipped while
  // hidden (the below-990px copy of the wide card): sizes would all be 0.
  // Before window load, a short text with images still loading stays clamped and
  // unmeasured: un-clamping now could jump back once the images arrive.
  fitCheck(final) {
    if (this.userToggled || !this.content.offsetParent) return;
    const content = this.content;
    content.classList.remove('is-expanded');
    const fits = content.scrollHeight <= content.clientHeight * (1 + this.revealThreshold);
    if (fits && !final && [...content.querySelectorAll('img')].some((img) => !img.complete)) return;

    content.classList.toggle('is-expanded', fits);
    this.button.hidden = fits;
    this.setState(fits);
    this.dataset.measured = 'true';
  }

  onClick() {
    if (!this.userToggled) {
      this.userToggled = true;
      this.stopWatching();
    }
    if (this.button.getAttribute('aria-expanded') === 'true') {
      this.collapse();
    } else {
      this.expand();
    }
  }

  setState(expanded) {
    this.button.setAttribute('aria-expanded', String(expanded));
    this.button.textContent = expanded ? this.labelLess : this.labelMore;
  }

  expand() {
    this.content.classList.add('is-expanded');
    this.setState(true);
  }

  // Bring the description heading to just below the sticky header, but only if
  // the reader had scrolled past it. The anchor's document position is unchanged
  // by the collapse, so `top - offset` is the exact scroll delta needed.
  reorient() {
    const top = this.scrollAnchor.getBoundingClientRect().top;
    if (top < this.anchorOffset) window.scrollBy(0, top - this.anchorOffset);
  }

  collapse() {
    this.content.classList.remove('is-expanded');
    this.setState(false);
    this.reorient();
  }
}

customElements.define('product-description-toggle', ProductDescriptionToggle);
