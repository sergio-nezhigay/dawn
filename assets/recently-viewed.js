// Handles rendering recently viewed products from localStorage.
// Used by: sections/recently-viewed.liquid, templates/product.json
// 1. Liquid saves product to localStorage. 2. This renders list (excl. current).

class RecentlyViewedProducts extends HTMLElement {
  connectedCallback() {
    this.observer = new IntersectionObserver(
      (entries, observer) => {
        if (!entries[0].isIntersecting) return;
        observer.unobserve(this);
        this.renderRecentlyViewed();
      },
      { rootMargin: '0px 0px 400px 0px' }
    );
    this.observer.observe(this);
  }

  renderRecentlyViewed() {
    const currentProductTitle = this.dataset.productTitle;
    const productData = JSON.parse(localStorage.getItem('recentlyViewedProduct')) || [];
    const recentlyViewedHtml = [];

    productData
      .filter((item) => item.productTitle !== currentProductTitle)
      .reverse()
      .forEach((item) => {
        recentlyViewedHtml.push(`
          <li class="bg-blue-200">
            <a href="${item.productUrl}">
              <img src='${item.productImg}' loading="lazy" alt="${item.productImageAltText}"/>
            </a>
            <h3>${item.productTitle}</h3>
            <p>${item.productPrice}</p>
          </li>
        `);
      });

    if (recentlyViewedHtml.length > 0) {
      this.innerHTML = `
        <div id="recently-viewed-section">
          <h2>Recently Viewed Products new with Class</h2>
          <ul class="recently-viewed-grid flex gap-4 bg-red-500">
            ${recentlyViewedHtml.join('')}
          </ul>
        </div>
      `;
    }
  }
}

customElements.define('recently-viewed-products', RecentlyViewedProducts);
