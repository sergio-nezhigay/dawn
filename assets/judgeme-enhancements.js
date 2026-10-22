(function () {
  // Judge.me on demand: layout/theme.liquid stops its loader at page load and leaves the src in
  // window.jdgmLazySrc. Re-inject it once, when the reviews widget nears the viewport or is used.
  const loadJudgeme = () => {
    if (!window.jdgmLazySrc || window.jdgmLazyLoaded) return;
    window.jdgmLazyLoaded = true;
    window.jdgm._loaderExecuted = false;
    const script = document.createElement('script');
    script.src = window.jdgmLazySrc;
    document.head.appendChild(script);
  };

  const initLazyLoad = (widget) => {
    if (!window.jdgmLazySrc) return;
    // About one screen ahead: it fills in before the shopper gets there, but not at page load on phones.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          io.disconnect();
          loadJudgeme();
        }
      },
      { rootMargin: '0px 0px 100% 0px' },
    );
    io.observe(widget);
    widget.addEventListener('pointerdown', loadJudgeme, { once: true });
    widget.addEventListener('focusin', loadJudgeme, { once: true });
  };

  // Same "real text" rule as sections/product-reviews-summary.liquid: a body that is empty or only repeats the
  // author or the product title (Judge.me writes the title when the comment is empty) is a stars-only review.
  const norm = (text) => (text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const monthYear = new Intl.DateTimeFormat(document.documentElement.lang || 'uk', { month: 'long', year: 'numeric' });
  const decimal = new Intl.NumberFormat(document.documentElement.lang || 'uk', { maximumFractionDigits: 2 });

  // "грудень 2025" instead of 11/12/25; Judge.me rewrites the date when it renders, so this runs again after it
  const formatDate = (time) => {
    const date = new Date((time.getAttribute('datetime') || '').trim());
    if (isNaN(date)) return;
    const text = monthYear.format(date).replace(/\s(р|г)\.$/, '');
    if (time.textContent !== text) time.textContent = text;
  };

  const tidyReview = (rev, widgetTitle) => {
    const author = norm(rev.querySelector('.jdgm-rev__author')?.textContent);
    const echoes = [author, norm(rev.dataset.productTitle), widgetTitle];
    const titleEl = rev.querySelector('.jdgm-rev__title');
    const body = norm(rev.querySelector('.jdgm-rev__body')?.textContent);
    const thin = !body || echoes.includes(body);
    rev.classList.toggle('jdgm-rev--thin', thin);
    if (titleEl) {
      const title = norm(titleEl.textContent);
      titleEl.hidden = !title || title === body || echoes.includes(title);
    }
    const time = rev.querySelector('.jdgm-rev__timestamp');
    if (time) formatDate(time);
  };

  // One "Показати ще" button instead of page numbers. Judge.me appends the next page itself
  // (layout/theme.liquid sets widget_pagination_type to load_more); the button presses its next-page link.
  // A tap before Judge.me has loaded waits for it (5 s at most); repeat taps meanwhile are ignored.
  let pressing = false;
  const showMore = (widget) => {
    if (pressing) return;
    pressing = true;
    loadJudgeme();
    const deadline = Date.now() + 5000;
    const press = () => {
      const next = widget.querySelector('.jdgm-paginate__load-more, .jdgm-paginate__next-page');
      if (next && window.jdgm && jdgm.isWidgetLoadMore) next.click();
      else if (Date.now() < deadline) {
        setTimeout(press, 100);
        return;
      }
      pressing = false;
    };
    press();
  };

  const syncMoreButton = (widget) => {
    const pager = widget.querySelector('.jdgm-paginate');
    let button = widget.querySelector('.jdgm-more');
    if (pager && !button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'jdgm-more ui-btn ui-btn--ghost ui-btn--sm';
      button.textContent = (window.jdgmSettings && jdgmSettings.widget_load_more_text) || '…';
      button.addEventListener('click', () => showMore(widget));
    }
    if (!button) return;
    if (pager && button.previousElementSibling !== pager) pager.after(button);
    button.hidden = !widget.querySelector('.jdgm-paginate__load-more, .jdgm-paginate__next-page');
  };

  const tidyReviews = () => {
    const widget = document.querySelector('#judgeme_product_reviews');
    if (!widget) return;
    const widgetTitle = norm(widget.dataset.productTitle);
    widget.querySelectorAll('.jdgm-rev').forEach((rev) => tidyReview(rev, widgetTitle));

    const root = widget.querySelector('.jdgm-rev-widg');
    if (root) {
      // Bar chart only above 5 reviews (as in the summary card); the average as a number before the stars
      widget.classList.toggle('jdgm--hist', Number(root.dataset.numberOfReviews) > 5);
      const summary = widget.querySelector('.jdgm-rev-widg__summary');
      const average = Number(root.dataset.averageRating);
      if (summary && average && !summary.querySelector('.jdgm-avg')) {
        summary.insertAdjacentHTML('afterbegin', `<span class="jdgm-avg">${decimal.format(average)}</span>`);
      }
    }
    syncMoreButton(widget);
  };

  let tidyQueued = false;
  const observer = new MutationObserver(() => {
    if (tidyQueued) return;
    tidyQueued = true;
    requestAnimationFrame(() => {
      tidyQueued = false;
      tidyReviews();
    });
  });

  // The rails above the widget load as the page scrolls past them and push it down, and Judge.me can still
  // grow it. Keep re-aiming until the widget has stayed put for a second (8 s at most), unless the shopper
  // scrolls on their own. The stop point is #judgeme_product_reviews' scroll-margin-top in assets/base.css.
  const scrollToReviews = (onComplete) => {
    const widget = document.querySelector('#judgeme_product_reviews');
    if (!widget) return;
    widget.scrollIntoView({ behavior: 'smooth' });

    let shopperScrolled = false;
    const listening = new AbortController();
    ['wheel', 'touchstart', 'keydown'].forEach((type) =>
      window.addEventListener(type, () => (shopperScrolled = true), { passive: true, signal: listening.signal }),
    );
    const deadline = Date.now() + 8000;
    let lastTop = Math.round(widget.getBoundingClientRect().top + window.scrollY);
    let stillSince = Date.now();
    const follow = () => {
      const top = Math.round(widget.getBoundingClientRect().top + window.scrollY);
      if (top !== lastTop) {
        lastTop = top;
        stillSince = Date.now();
        widget.scrollIntoView({ behavior: 'smooth' });
      }
      const done = shopperScrolled || Date.now() > deadline || Date.now() - stillSince > 1000;
      if (!done) {
        setTimeout(follow, 100);
        return;
      }
      listening.abort();
      const margin = parseFloat(getComputedStyle(widget).scrollMarginTop) || 0;
      if (!shopperScrolled &&Math.abs(widget.getBoundingClientRect().top - margin) > 2) {
        widget.scrollIntoView();
      }
      if (typeof onComplete === 'function') onComplete();
    };
    setTimeout(follow, 100);
  };

  // Judge.me's own "write a review" link opens its form; it exists only once the widget has rendered.
  // Waits up to 10 s, so a slow widget never pops the form up long after the tap.
  const openReviewForm = () => {
    const widget = document.querySelector('#judgeme_product_reviews');
    if (!widget) return;
    const tryOpen = () => {
      const link = widget.querySelector('.jdgm-write-rev-link');
      if (link) link.click();
      return !!link;
    };
    if (tryOpen()) return;
    const mo = new MutationObserver(() => tryOpen() && mo.disconnect());
    mo.observe(widget, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 10000);
  };

  // Review links all point at #judgeme_product_reviews and work as plain anchors without JS.
  // The badge goes to the server-rendered summary when the page has one, else to the full widget.
  const handleReviewLinkClick = (e) => {
    const link = e.target.closest(
      '.review-badge a[href="#judgeme_product_reviews"], [data-reviews-show-all], [data-reviews-write]',
    );
    if (!link) return;
    e.preventDefault();
    const summary = document.querySelector('[data-reviews-summary]');
    if (summary && link.closest('.review-badge')) {
      summary.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (link.hasAttribute('data-reviews-show-all')) {
      (window.dataLayer = window.dataLayer || []).push({ event: 'reviews_show_all' });
    }
    loadJudgeme();
    scrollToReviews(link.hasAttribute('data-reviews-write') ? openReviewForm : undefined);
  };

  // Email links land on #judgeme_product_reviews. Take the hash off so the browser does not jump before the
  // page settles, scroll there ourselves, then put it back.
  const handleHashNavigation = () => {
    if (window.location.hash !== '#judgeme_product_reviews') return;
    const hash = window.location.hash;
    history.replaceState(null, '', window.location.pathname + window.location.search);
    scrollToReviews(() => history.replaceState(null, '', hash));
  };

  const init = () => {
    const target = document.querySelector('#judgeme_product_reviews');
    if (target) {
      initLazyLoad(target);
      observer.observe(target, { childList: true, subtree: true });
      tidyReviews();
    }
    document.addEventListener('click', handleReviewLinkClick);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      handleHashNavigation();
      init();
    });
  } else {
    handleHashNavigation();
    init();
  }
})();
