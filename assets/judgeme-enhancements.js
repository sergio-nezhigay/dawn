(function () {
  const hideRedundantReviews = () => {
    const reviews = document.querySelectorAll('.jdgm-rev');
    reviews.forEach((rev) => {
      const authorEl = rev.querySelector('.jdgm-rev__author');
      const titleEl = rev.querySelector('.jdgm-rev__title');
      const bodyEl = rev.querySelector('.jdgm-rev__body');

      if (!authorEl) return;

      const author = authorEl.textContent.trim().toLowerCase();

      // Hide title if it matches author
      if (titleEl) {
        const title = titleEl.textContent.trim().toLowerCase();
        if (title === author) {
          titleEl.style.setProperty('display', 'none', 'important');
        }
      }

      // Hide body if it matches author
      if (bodyEl) {
        const body = bodyEl.textContent.trim().toLowerCase();
        if (body === author) {
          bodyEl.style.setProperty('display', 'none', 'important');
        }
      }
    });
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        hideRedundantReviews();
      }
    });
  });

  const scrollToReviews = (onComplete) => {
    const reviewsSection = document.querySelector('#judgeme_product_reviews');
    if (!reviewsSection) return;

    const getOffset = () => {
      const headerHeight =
        parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 80;
      return headerHeight + 20;
    };

    const doScroll = () => {
      const duration = 1500;
      const startY = window.pageYOffset;
      const startTime = performance.now();
      const offset = getOffset();
      const targetY = reviewsSection.getBoundingClientRect().top + window.pageYOffset - offset;

      const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        window.scrollTo(0, startY + (targetY - startY) * easeInOutCubic(progress));
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else if (typeof onComplete === 'function') {
          onComplete();
        }
      };

      requestAnimationFrame(animate);
    };

    // Phase 1: trigger lazy recs and wait for their fetches to complete
    document.querySelectorAll('product-recommendations:not(.product-recommendations--loaded)').forEach((el) => {
      if (el.loadRecommendations && el.dataset.productId) {
        el.loadRecommendations(el.dataset.productId);
      }
    });

    const recsDeadline = Date.now() + 3000;
    const waitForRecs = () => {
      const pending = document.querySelectorAll('product-recommendations:not(.product-recommendations--loaded)');
      if (pending.length === 0 || Date.now() >= recsDeadline) {
        // Phase 2: recs loaded (or timed out) — wait for layout to stabilise
        let lastTop = -1;
        let stableCount = 0;
        const stabilityDeadline = Date.now() + 1000;
        const waitForStable = () => {
          const top = Math.round(reviewsSection.getBoundingClientRect().top + window.pageYOffset);
          stableCount = top === lastTop ? stableCount + 1 : 0;
          lastTop = top;
          if (stableCount >= 3 || Date.now() >= stabilityDeadline) {
            doScroll();
          } else {
            setTimeout(waitForStable, 100);
          }
        };
        waitForStable();
      } else {
        setTimeout(waitForRecs, 100);
      }
    };

    waitForRecs();
  };

  const interceptBadgeScroll = () => {
    document
      .querySelectorAll('.jdgm-prev-badge__text, .jdgm-prev-badge a[href*="judgeme_product_reviews"]')
      .forEach((el) => {
        el.addEventListener(
          'click',
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollToReviews();
          },
          true,
        );
      });
  };

  const initBadgeScroll = () => {
    const badge = document.querySelector('.jdgm-prev-badge__text');
    if (badge) {
      interceptBadgeScroll();
    } else {
      setTimeout(initBadgeScroll, 500);
    }
  };

  const handleHashNavigation = () => {
    if (window.location.hash === '#judgeme_product_reviews') {
      // Store hash and remove it immediately to prevent browser scroll
      const originalHash = window.location.hash;
      history.replaceState(null, null, window.location.pathname + window.location.search);

      let attempts = 0;
      const maxAttempts = 50; // Max 5 seconds (50 * 100ms)

      // Wait for reviews section to have actual content
      const waitForReviews = () => {
        const reviewsSection = document.querySelector('#judgeme_product_reviews');

        // Check if section exists AND has content (not just empty container)
        const hasContent =
          reviewsSection &&
          (reviewsSection.querySelector('.jdgm-widget') ||
            reviewsSection.querySelector('.jdgm-rev') ||
            reviewsSection.innerHTML.trim().length > 100);

        if (hasContent) {
          // Content is ready, start smooth scroll; restore hash only after animation completes
          requestAnimationFrame(() => {
            scrollToReviews(() => {
              history.replaceState(null, null, originalHash);
            });
          });
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(waitForReviews, 100);
        } else {
          // Timeout - scroll anyway if section exists
          if (reviewsSection) {
            requestAnimationFrame(() => {
              scrollToReviews(() => {
                history.replaceState(null, null, originalHash);
              });
            });
          }
        }
      };

      // Small delay to let page render critical content
      setTimeout(waitForReviews, 300);
    }
  };

  const init = () => {
    const target = document.querySelector('#judgeme_product_reviews');
    if (target) {
      observer.observe(target, { childList: true, subtree: true });
      hideRedundantReviews();
    } else {
      // Retry if the widget container isn't in the DOM yet
      setTimeout(init, 500);
    }
    initBadgeScroll();
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
