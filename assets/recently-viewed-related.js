class RecentlyViewedRelatedProducts extends HTMLElement {
  connectedCallback() {
    setTimeout(() => this.render(), 100);
  }

  render() {
    const currentHandle = this.dataset.productHandle;
    let products = [];
    try { products = JSON.parse(localStorage.getItem('recentlyViewedProduct') || '[]'); } catch (e) {}

    const sortedHandles = products
      .filter(function(p) { return p.productHandle && p.productHandle !== currentHandle; })
      .reverse()
      .map(function(p) { return p.productHandle; });

    if (!sortedHandles.length) {
      this.closest('.recently-viewed-related-section')?.style.setProperty('display', 'none');
      return;
    }

    const params = new URLSearchParams({
      section_id: this.dataset.sectionId,
      type: 'product',
      q: sortedHandles.map(function(h) { return 'handle:"' + h + '"'; }).join(' OR ')
    });
    const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

    fetch(root.replace(/\/$/, '') + '/search?' + params.toString())
      .then(function(r) { return r.text(); })
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const items = Array.from(doc.querySelectorAll('.grid__item'));

        if (!items.length) {
          this.closest('.recently-viewed-related-section')?.style.setProperty('display', 'none');
          return;
        }

        items.sort(function(a, b) {
          const hA = (a.querySelector('[data-handle]') || {}).dataset?.handle || '';
          const hB = (b.querySelector('[data-handle]') || {}).dataset?.handle || '';
          return sortedHandles.indexOf(hA) - sortedHandles.indexOf(hB);
        });

        const grid = this.querySelector('.grid');
        items.forEach(function(item) { grid.appendChild(item); });
        this.closest('.recently-viewed-related-section')?.style.removeProperty('display');
      })
      .catch(function(e) { console.error('RecentlyViewedRelated:', e); });
  }
}

customElements.define('recently-viewed-related-products', RecentlyViewedRelatedProducts);
