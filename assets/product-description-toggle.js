/*
 * <product-description-toggle>
 * Shared "show more / show less" disclosure for the product description. Used by
 * both the mobile inline block and the desktop wide-description card in
 * sections/main-product.liquid.
 *
 * On collapse it keeps the reader oriented: if they had scrolled past the
 * description, the description heading is brought back to just below the sticky
 * header. The heading's position in the document does not move as the block
 * shrinks (only content below it does), so one scroll lands it correctly whether
 * the reader was 200px or 12000px further down. The correction is instant, not a
 * smooth glide: the page height is collapsing at the same time, and a running
 * smooth-scroll gets cancelled the moment that shrink clamps the scroll range.
 * A second correction after the height transition mops up any residual drift.
 *
 * The read-more / read-less labels come from data-label-more / data-label-less
 * on the button so no locale strings live in this file.
 */
class ProductDescriptionToggle extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') return;

    this.content =
      this.querySelector('.product__description-content') ||
      this.querySelector('.product__wide-description-body');
    this.button = this.querySelector('.product__description-toggle');
    if (!this.content || !this.button) return;

    this.dataset.ready = 'true';
    this.slop = 24;
    this.transitionFallbackMs = 400;
    this.labelMore = this.button.dataset.labelMore || this.button.textContent.trim();
    this.labelLess = this.button.dataset.labelLess || this.button.textContent.trim();

    this.onClick = this.onClick.bind(this);
    this.button.addEventListener('click', this.onClick);

    // Images have no laid-out height until load, so the fit check waits for it.
    if (document.readyState === 'complete') {
      this.fitCheck();
    } else {
      window.addEventListener('load', () => this.fitCheck(), { once: true });
    }
  }

  disconnectedCallback() {
    if (this.button) this.button.removeEventListener('click', this.onClick);
  }

  get isExpanded() {
    return this.button.getAttribute('aria-expanded') === 'true';
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

  // Drop the clamp entirely when the description already fits, so no button is
  // shown. Skipped while this instance is hidden (the below-990px copy of the
  // wide card): scrollHeight / clientHeight would both be 0.
  fitCheck() {
    if (!this.content.offsetParent) return;
    if (this.content.classList.contains('is-expanded')) return;
    if (this.content.scrollHeight <= this.content.clientHeight + this.slop) {
      this.content.classList.add('is-expanded');
      this.button.hidden = true;
      this.button.setAttribute('aria-expanded', 'true');
    }
  }

  onClick() {
    if (this.isExpanded) {
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
    this.content.style.maxHeight = this.content.scrollHeight + 'px';
    this.content.classList.add('is-expanded');
    this.setState(true);

    // Clear the inline cap once the transition is done so later viewport resizes
    // reflow freely (the .is-expanded rule then holds max-height: none).
    let done = false;
    const clear = (event) => {
      if (event && event.propertyName !== 'max-height') return;
      if (done) return;
      done = true;
      this.content.removeEventListener('transitionend', clear);
      if (this.content.classList.contains('is-expanded')) this.content.style.maxHeight = '';
    };
    this.content.addEventListener('transitionend', clear);
    setTimeout(clear, this.transitionFallbackMs);
  }

  // Bring the description heading to just below the sticky header, but only if
  // the reader had scrolled past it. The anchor's document position is unchanged
  // by the collapse, so `top - offset` is the exact scroll delta needed.
  reorient() {
    const top = this.scrollAnchor.getBoundingClientRect().top;
    if (top < this.anchorOffset) window.scrollBy(0, top - this.anchorOffset);
  }

  collapse() {
    // Lock the current full height, then release to the CSS clamp so the
    // max-height transition has two definite values to animate between.
    this.content.style.maxHeight = this.content.scrollHeight + 'px';
    void this.content.offsetHeight;
    this.content.classList.remove('is-expanded');
    this.content.style.maxHeight = '';
    this.setState(false);

    // Once while the page is still tall (so the target is in range and nothing
    // clamps it), then again after the height transition settles.
    this.reorient();
    let done = false;
    const again = (event) => {
      if (event && event.propertyName !== 'max-height') return;
      if (done) return;
      done = true;
      this.content.removeEventListener('transitionend', again);
      this.reorient();
    };
    this.content.addEventListener('transitionend', again);
    setTimeout(again, this.transitionFallbackMs);
  }
}

customElements.define('product-description-toggle', ProductDescriptionToggle);
