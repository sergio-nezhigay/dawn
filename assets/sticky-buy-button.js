if (!customElements.get('sticky-buy-button')) {
  customElements.define('sticky-buy-button', class StickyBuyButton extends HTMLElement {
    constructor() {
      super();
      this.sectionId = this.dataset.sectionId;
      this.formSubmitButton = document.querySelector(`#ProductSubmitButton-${this.sectionId}`);
      if (!this.formSubmitButton) return;

      this.stickySubmit = this.querySelector('[data-sticky-submit]');
      this.variantInput = this.querySelector('[data-sticky-variant]');
      this.priceContainer = this.querySelector('[data-sticky-price]');
      this.imageContainer = this.querySelector('[data-sticky-image]');

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
            this.classList.add('is-visible');
          } else {
            this.classList.remove('is-visible');
          }
        });
      }, {
        rootMargin: '0px',
        threshold: 0
      });

      this.observer.observe(this.formSubmitButton);
    }

    connectedCallback() {
      if (window.subscribe && window.PUB_SUB_EVENTS) {
        this.variantChangeUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, this.handleVariantChange.bind(this));
      }
    }

    disconnectedCallback() {
      if (this.observer) {
        this.observer.disconnect();
      }
      if (this.variantChangeUnsubscriber) {
        this.variantChangeUnsubscriber();
      }
    }

    handleVariantChange(event) {
      if (event.data.sectionId !== this.sectionId) return;

      const variant = event.data.variant;
      const html = event.data.html;

      if (!variant) return;

      if (this.variantInput) {
        this.variantInput.value = variant.id;
      }

      if (variant.featured_image && this.imageContainer) {
        this.imageContainer.src = variant.featured_image.src;
        this.imageContainer.alt = variant.featured_image.alt || '';
      }

      if (this.stickySubmit) {
        const textInside = this.stickySubmit.querySelector('.text-inside');
        if (variant.available) {
          this.stickySubmit.removeAttribute('disabled');
          if (textInside) textInside.textContent = window.variantStrings?.addToCart || 'Купити';
        } else {
          this.stickySubmit.setAttribute('disabled', 'disabled');
          if (textInside) textInside.textContent = window.variantStrings?.soldOut || 'Немає в наявності';
        }
      }

      if (this.priceContainer && html) {
        const newPrice = html.querySelector(`#price-${this.sectionId}`);
        if (newPrice) {
          this.priceContainer.innerHTML = newPrice.innerHTML;
        }
      }
    }
  });
}
