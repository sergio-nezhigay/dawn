/*
  Collection "Show 36 more" (sections/main-collection-product-grid.liquid).
  <load-more-products data-dir="next|prev" data-url="..."> fetches that page through the Section Rendering API,
  adds its cards to #product-grid (skipping any already shown) and swaps itself and the page links for the fetched
  ones. The address bar follows with replaceState, so no extra history entries or page views.
  Back after a reload: the clicked card's page goes into the URL and the card is scrolled into view again.
*/
const LOAD_MORE_RETURN_KEY = 'collection-load-more:return';

function loadMoreCardKey(item) {
  const card = item.querySelector('.product-card[data-handle]');
  return card ? card.dataset.handle : null;
}

if (!customElements.get('load-more-products')) {
  customElements.define(
    'load-more-products',
    class LoadMoreProducts extends HTMLElement {
      connectedCallback() {
        this.button = this.querySelector('.load-more__button');
        if (this.button) this.button.addEventListener('click', () => this.load());
      }

      async load() {
        const grid = document.getElementById('product-grid');
        if (!grid || !this.dataset.url) return;
        const isPrev = this.dataset.dir === 'prev';
        const url = new URL(this.dataset.url, window.location.origin);
        url.searchParams.set('section_id', grid.dataset.id);

        this.button.disabled = true;
        this.button.classList.add('loading');
        this.button.setAttribute('aria-busy', 'true');

        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(response.status);
          const html = new DOMParser().parseFromString(await response.text(), 'text/html');

          const seen = new Set(Array.from(grid.children, loadMoreCardKey).filter(Boolean));
          const items = Array.from(html.querySelectorAll('#product-grid > li')).filter((item) => {
            const key = loadMoreCardKey(item);
            return !key || !seen.has(key);
          });
          items.forEach((item) => item.classList.add('scroll-trigger--cancel'));

          if (isPrev) {
            // Keep the first card already on screen where it is while the earlier page goes in above it
            const anchor = grid.firstElementChild;
            const top = anchor ? anchor.getBoundingClientRect().top : 0;
            grid.prepend(...items);
            this.swapWith(html.querySelector('load-more-products[data-dir="prev"]'));
            if (anchor) window.scrollBy(0, anchor.getBoundingClientRect().top - top);
          } else {
            grid.append(...items);
            const links = document.querySelector('#ProductGridContainer .pagination-wrapper');
            const newLinks = html.querySelector('.pagination-wrapper');
            if (links && newLinks) links.replaceWith(newLinks);
            history.replaceState(history.state, '', this.dataset.url);
            this.swapWith(html.querySelector('load-more-products[data-dir="next"]'));
          }
        } catch (error) {
          this.button.disabled = false;
          this.button.classList.remove('loading');
          this.button.removeAttribute('aria-busy');
        }
      }

      swapWith(fresh) {
        if (fresh) {
          this.replaceWith(fresh);
          const button = fresh.querySelector('.load-more__button');
          if (button) button.focus({ preventScroll: true });
        } else {
          this.remove();
        }
      }
    }
  );

  // Opening a card: put that card's page in the URL and remember the card, for Back without the bfcache
  document.addEventListener('click', (event) => {
    const link = event.target.closest('#product-grid a[href]');
    const item = link && link.closest('li[data-page]');
    if (!item) return;
    const url = new URL(window.location.href);
    if (item.dataset.page === '1') {
      url.searchParams.delete('page');
    } else {
      url.searchParams.set('page', item.dataset.page);
    }
    history.replaceState(history.state, '', url);
    try {
      sessionStorage.setItem(
        LOAD_MORE_RETURN_KEY,
        JSON.stringify({ path: url.pathname + url.search, key: loadMoreCardKey(item) })
      );
    } catch (error) {}
  });

  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (!navigation || navigation.type !== 'back_forward') return;
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(LOAD_MORE_RETURN_KEY));
      sessionStorage.removeItem(LOAD_MORE_RETURN_KEY);
    } catch (error) {}
    if (!saved || !saved.key || saved.path !== window.location.pathname + window.location.search) return;
    const card = document.querySelector(`#product-grid .product-card[data-handle="${CSS.escape(saved.key)}"]`);
    if (card) requestAnimationFrame(() => card.closest('li').scrollIntoView({ block: 'center' }));
  });
}
