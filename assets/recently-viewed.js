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
    const title = this.dataset.sectionTitle || 'Recently viewed';

    productData
      .filter((item) => item.productTitle !== currentProductTitle)
      .reverse()
      .forEach((item) => {
        recentlyViewedHtml.push(`
          <li class="grid__item group animate--hover-3d-lift">
            <div class="card-wrapper product-card-wrapper underline-links-hover ">
                <a href="${item.productUrl}" class="full-unstyled-link card--card p-[10px]" >
                                <div>
                                    <div class="overflow-hidden aspect-square flex items-center">
                                        <img src="${item.productImg}" loading="lazy" alt="${item.productImageAltText}" class="transition-transform duration-300 ease-in-out group-hover:scale-103" />
                                    </div>

                                    <div class="card__content !p-0">
                                        <div class="card__information !px-0">
                                            <h3 class="card__heading h5">
                                                ${item.productTitle}
                                            </h3>
                                            <div class="card-information">
                                                <div class="price">
                                                    <span class="price-item price-item--regular">${item.productPrice} ₴
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </a>
            </div>
          </li>
        `);
      });

    if (recentlyViewedHtml.length > 0) {
      this.innerHTML = `
        <div class="pt-20">
          <h2 class="related-products__heading inline-richtext h2">${title}</h2>
          <ul class="grid product-grid grid--2-col-tablet-down grid--6-col-desktop" role="list">
            ${recentlyViewedHtml.join('')}
          </ul>
        </div>
      `;
    }
  }
}

customElements.define('recently-viewed-products', RecentlyViewedProducts);
