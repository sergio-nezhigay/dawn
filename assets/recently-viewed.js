// Handles rendering recently viewed products from localStorage.
// Used by: sections/recently-viewed.liquid, templates/product.json
// 1. Storage of current product to localStorage is done in the liquid section.
// 2. This custom element fetches the section HTML with handles from localStorage.

class RecentlyViewedProducts extends HTMLElement {
  connectedCallback() {
    // Small delay to allow the tracking script in liquid to update localStorage first
    setTimeout(() => {
      this.renderRecentlyViewed();
    }, 100);
  }

  renderRecentlyViewed() {
    const currentProductHandle = this.dataset.productHandle;
    const localData = localStorage.getItem('recentlyViewedProduct');
    let productData = [];

    if (localData) {
      try {
        productData = JSON.parse(localData) || [];
      } catch (e) {
        console.error('Recently Viewed: Failed to parse localStorage', e);
        productData = [];
      }
    }

    // Filter out current product and get handles in chronological order (most recent first)
    const sortedHandles = productData
      .filter((item) => item.productHandle && item.productHandle !== currentProductHandle)
      .reverse()
      .map((item) => item.productHandle);

    if (sortedHandles.length === 0) {
      this.closest('.recently-viewed-section')?.style.setProperty('display', 'none');
      console.log('Recently Viewed: No handles found to render.');
      return;
    }

    const sectionId = this.dataset.sectionId;
    const searchParams = new URLSearchParams();
    searchParams.set('section_id', sectionId);
    searchParams.set('type', 'product');
    // Use exact handle search
    searchParams.set('q', sortedHandles.map((h) => `handle:"${h}"`).join(' OR '));

    const rootUrl = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

    fetch(`${rootUrl.endsWith('/') ? rootUrl : rootUrl + '/'}search?${searchParams.toString()}`)
      .then((response) => response.text())
      .then((text) => {
        const html = new DOMParser().parseFromString(text, 'text/html');
        const sectionContent = html.querySelector('.recently-viewed-inner');

        if (sectionContent && html.querySelector('.grid__item')) {
          this.closest('.recently-viewed-section')?.style.removeProperty('display');
          // Re-sort elements to match our chronological order if needed
          const grid = sectionContent.querySelector('.grid');
          if (grid && sortedHandles.length > 1) {
            const items = Array.from(grid.querySelectorAll('.grid__item'));
            // Sort items based on our sortedHandles array
            items.sort((a, b) => {
              const handleA = a.dataset.handle || a.querySelector('[data-handle]')?.dataset.handle || '';
              const handleB = b.dataset.handle || b.querySelector('[data-handle]')?.dataset.handle || '';
              const indexA = sortedHandles.indexOf(handleA);
              const indexB = sortedHandles.indexOf(handleB);
              return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
            });
            // Re-append in correct order
            items.forEach((item) => grid.appendChild(item));
          }

          this.innerHTML = sectionContent.innerHTML;
        } else {
          this.closest('.recently-viewed-section')?.style.setProperty('display', 'none');
        }
      })
      .catch((e) => {
        console.error('Recently Viewed: Fetch error', e);
      });
  }
}

customElements.define('recently-viewed-products', RecentlyViewedProducts);
