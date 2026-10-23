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
    // Photos, videos or a store reply keep the full card: the slim row would hide them
    const extras = rev.querySelector('.jdgm-rev__pics *, .jdgm-rev__vids *, .jdgm-rev__reply *');
    const thin = !extras && (!body || echoes.includes(body));
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
  // A tap before Judge.me has rendered waits for it; repeat taps are ignored until the reviews arrive
  // (10 s at most). After the append Judge.me focuses the list's first review, which scrolls the page back
  // up: keep the page where it was (the new reviews appear where the button was) and the focus on the button.
  let pressing = false;
  const showMore = (widget, button) => {
    if (pressing) return;
    pressing = true;
    loadJudgeme();
    const y = window.scrollY;
    const hadFocus = document.activeElement === button;
    const count = () => widget.querySelectorAll('.jdgm-rev').length;
    const before = count();
    const listening = new AbortController();
    widget.addEventListener(
      'focusin',
      (e) => {
        if (!e.target.matches('.jdgm-rev')) return;
        window.scrollTo({ top: y, behavior: 'instant' });
        if (hadFocus) button.focus({ preventScroll: true });
      },
      { signal: listening.signal },
    );
    const deadline = Date.now() + 10000;
    let clicked = false;
    const step = () => {
      const next = widget.querySelector('.jdgm-paginate__load-more, .jdgm-paginate__next-page');
      if (!clicked && next && widget.classList.contains('jdgm--done-setup-widget')) {
        next.click();
        clicked = true;
      }
      if ((clicked && count() > before) || Date.now() > deadline) {
        listening.abort();
        pressing = false;
        return;
      }
      setTimeout(step, 100);
    };
    step();
  };

  const syncMoreButton = (widget) => {
    const pager = widget.querySelector('.jdgm-paginate');
    let button = widget.querySelector('.jdgm-more');
    if (pager && !button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'jdgm-more ui-btn ui-btn--ghost ui-btn--sm';
      button.textContent = (window.jdgmSettings && jdgmSettings.widget_load_more_text) || '…';
      button.addEventListener('click', () => showMore(widget, button));
    }
    if (!button) return;
    if (pager && button.previousElementSibling !== pager) pager.after(button);
    button.hidden = !widget.querySelector('.jdgm-paginate__load-more, .jdgm-paginate__next-page');
  };

  // Our additions to Judge.me's review form (the look is in assets/base.css): the comment hint and "optional"
  // mark, the name format, a shorter privacy note, and the word for the stars under the pointer or picked.
  // Once per form.
  const enhanceForm = (form) => {
    if (form.dataset.enhanced) return;
    form.dataset.enhanced = '1';
    const settings = window.jdgmSettings || {};
    const body = form.querySelector('textarea[name=review_body]');
    if (body && settings.widget_body_hint) body.placeholder = settings.widget_body_hint;
    const bodyLabel = body && form.querySelector(`label[for="${body.id}"]`);
    if (bodyLabel && !body.required && settings.widget_optional_text) {
      const mark = document.createElement('span');
      mark.className = 'jdgm-optional';
      mark.textContent = ` ${settings.widget_optional_text}`;
      bodyLabel.append(mark);
    }
    // Shown as "Сергій Н." (owner's choice); the picker itself is hidden in assets/base.css
    const nameFormat = form.querySelector('select[name=reviewer_name_format]');
    if (nameFormat?.querySelector('option[value=last_initial]')) nameFormat.value = 'last_initial';
    // Privacy note: keep only the last sentence, the consent with Judge.me's links
    const note = [...form.querySelectorAll('.jdgm-form__fieldset p')].find((p) => p.querySelector('a'));
    const lead = note?.firstChild;
    if (lead?.nodeType === Node.TEXT_NODE) lead.textContent = lead.textContent.replace(/^[\s\S]*[.!]\s+/, '');

    const rating = form.querySelector('.jdgm-form__rating');
    const words = (settings.widget_star_labels || '').split(',');
    if (!rating || words.length !== 5) return;
    const score = rating.querySelector('input[name=score]');
    const caption = document.createElement('p');
    caption.className = 'jdgm-star-caption';
    rating.after(caption);
    const show = (n) => (caption.textContent = words[n - 1] || '');
    const showPicked = () => show(Number(score?.value));
    rating.addEventListener('mouseover', (e) => {
      const star = e.target.closest('.jdgm-star');
      if (star) show(Number(star.dataset.alt));
    });
    rating.addEventListener('mouseleave', showPicked);
    // Judge.me sets the score in its own click and key handlers: read it after them
    ['click', 'keyup'].forEach((type) => rating.addEventListener(type, () => setTimeout(showPicked)));
  };

  const tidyReviews = () => {
    const widget = document.querySelector('#judgeme_product_reviews');
    if (!widget) return;
    widget.querySelectorAll('.jdgm-form').forEach(enhanceForm);
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
  // grow it. Keep re-aiming until the target has stayed put for a second (8 s at most), unless the shopper
  // scrolls on their own. The stop point is the target's scroll-margin-top in assets/base.css.
  // The target is the widget, or the review form / thank-you note inside the reviews area.
  const scrollToReviews = (onComplete, widget = document.querySelector('#judgeme_product_reviews')) => {
    if (!widget) return;
    widget.scrollIntoView({ behavior: 'smooth' });

    let shopperScrolled = false;
    const listening = new AbortController();
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((type) =>
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
      if (!shopperScrolled && Math.abs(widget.getBoundingClientRect().top - margin) > 2) {
        widget.scrollIntoView();
      }
      if (typeof onComplete === 'function') onComplete();
    };
    setTimeout(follow, 100);
  };

  // On /ru/ Judge.me renders two .jdgm-form; the real one has the submit button.
  const findReviewForm = () =>
    [...document.querySelectorAll('#judgeme_product_reviews .jdgm-form')].find((f) =>
      f.querySelector('input[type=submit]'),
    );

  // Judge.me's own "write a review" link opens its form. The link is in the markup before Judge.me binds it,
  // so click once it is set up. Clicks only within 10 s, so a slow widget never pops the form up long after
  // the tap; then waits up to 3 s for the form to show. Judge.me scrolls the open form to the very top of the
  // window, under the sticky header, so aim it at the header offset again.
  const openReviewForm = (onOpen) => {
    const widget = document.querySelector('#judgeme_product_reviews');
    if (!widget) return;
    let until = Date.now() + 10000;
    let clicked = false;
    const step = () => {
      const form = findReviewForm();
      const wrapper = form && (form.closest('.jdgm-form-wrapper') || form);
      if (wrapper && wrapper.offsetHeight > 0) {
        if (typeof onOpen === 'function') onOpen(form);
        scrollToReviews(undefined, wrapper);
        return;
      }
      const link = widget.querySelector('.jdgm-write-rev-link');
      if (!clicked && link && widget.classList.contains('jdgm--done-setup-widget')) {
        link.click();
        clicked = true;
        until = Date.now() + 3000;
      }
      if (Date.now() < until) setTimeout(step, 100);
    };
    step();
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

  // Fills the open form from the review email. No focus: the phone keyboard would cover the stars.
  const prefillReviewForm = (form, { rating, name, email }) => {
    if (rating) form.querySelector(`.jdgm-form__rating a.jdgm-star[data-alt="${rating}"]`)?.click();
    [
      ['input[name=reviewer_name]', name],
      ['input[name=reviewer_email]', email],
    ].forEach(([selector, value]) => {
      const input = form.querySelector(selector);
      if (!input || !value) return;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // Judge.me focuses a field as its form opens: drop it
    if (form.contains(document.activeElement)) document.activeElement.blur();
  };

  // Shown just above the reviews after a review sent from the email form; outside the widget, which
  // Judge.me re-renders. Returns the note, or nothing when there is no widget or text.
  const showThanks = () => {
    const widget = document.querySelector('#judgeme_product_reviews');
    const text = window.jdgmSettings && jdgmSettings.widget_thanks_text;
    if (!widget || !text) return null;
    const note = document.createElement('p');
    note.className = 'jdgm-thanks';
    note.setAttribute('role', 'status');
    widget.before(note);
    // Filled after insertion so screen readers announce it
    setTimeout(() => (note.textContent = text), 100);
    return note;
  };

  // Review-email links: #judgeme_product_reviews&rating=N&name=…&email=… (the "write on the site" button)
  // or &thanks=1 (after the in-email form). The data rides in the hash so it never reaches the server; the
  // layout/theme.liquid guard takes it out of the address bar early and keeps it in window.jdgmReviewHash.
  // Values that look wrong are dropped. "+" means a space in the name only: emails can contain "+".
  const readReviewHash = (hash) => {
    const params = {};
    hash
      .split('&')
      .slice(1)
      .forEach((pair) => {
        const at = pair.indexOf('=');
        if (at < 0) return;
        const key = pair.slice(0, at);
        const value = pair.slice(at + 1);
        try {
          params[key] = decodeURIComponent(key === 'name' ? value.replace(/\+/g, ' ') : value).trim();
        } catch (e) {
          // a broken %-sequence: leave the value out
        }
      });
    const get = (key) => params[key] || '';
    const rating = /^[1-5]$/.test(get('rating')) ? Number(get('rating')) : 0;
    const name = get('name').length <= 60 ? get('name') : '';
    const email = /^[^@\s]+@[^@\s]+$/.test(get('email')) ? get('email') : '';
    return { thanks: get('thanks') === '1', rating, name, email };
  };

  // Email links land on #judgeme_product_reviews. Take the hash off at once so the browser does not jump
  // before the page settles, and scroll there ourselves. Links from the review email also open the form and
  // leave no hash behind, so a reload does not open the form again (or the thank-you note); a plain anchor
  // only scrolls and gets its hash back.
  const handleHashNavigation = () => {
    const anchor = '#judgeme_product_reviews';
    const { search, pathname } = window.location;
    const hash = window.jdgmReviewHash || window.location.hash;
    if (hash !== anchor && !hash.startsWith(`${anchor}&`)) return;
    history.replaceState(null, '', pathname + search);
    const data = readReviewHash(hash);
    const fromEmail =
      new URLSearchParams(search).get('utm_campaign') === 'review_request' ||
      !!(data.rating || data.name || data.email);
    const openForm = fromEmail && !data.thanks;
    const note = data.thanks ? showThanks() : null;
    scrollToReviews(() => {
      if (!fromEmail && !data.thanks) history.replaceState(null, '', anchor);
      if (openForm) openReviewForm((form) => prefillReviewForm(form, data));
    }, note || undefined);
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
