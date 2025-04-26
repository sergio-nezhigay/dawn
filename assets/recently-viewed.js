// Handles rendering recently viewed products from localStorage.
// Used by: sections/recently-viewed.liquid, templates/product.json
// 1. Liquid saves product to localStorage. 2. This renders list (excl. current).

class RecentlyViewedProducts extends HTMLElement {
  connectedCallback() {
    this.renderRecentlyViewed();
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
          <li class="grid__item">
            <a href="${item.productUrl}" class="product-card-wrapper card-wrapper underline-links-hover">
                <div>
                      <div style="filter: brightness(0.5);">
                        <img src="${item.productImg}" loading="lazy" alt="${item.productImageAltText}" />
                      </div>

                      <div class="card__content !p-0">
                        <div class="card__information !px-0">
                            <h3 class="card__heading h5">
                                ${item.productTitle}
                            </h3>
                            <div class="card-information">
                                <div class="price">
                                    <span class="price-item price-item--regular">${item.productPrice}
                                    </span>
                                </div>
                            </div>
                        </div>
                      </div>
                </div>
            </a>
          </li>
        `);
      });

    if (recentlyViewedHtml.length > 0) {
      this.innerHTML = `
        <div>
          <h2 class="related-products__heading h2">Recently viewed2</h2>
          <ul class="grid product-grid grid--2-col-tablet-down grid--4-col-desktop" role="list">
            ${recentlyViewedHtml.join('')}
          </ul>
        </div>
      `;
    }
  }
}

customElements.define('recently-viewed-products', RecentlyViewedProducts);
