// GA4 counters for the below-grid collection block (sections/collection-description.liquid).
// Publishes custom events through Shopify.analytics; the GA4 custom pixel subscribes to them.
// Kept apart from product-description-toggle.js, which the product page shares.
(function () {
  function publish(name, data) {
    if (window.Shopify && Shopify.analytics && typeof Shopify.analytics.publish === 'function') {
      Shopify.analytics.publish(name, data);
    }
  }

  document.querySelectorAll('.collection-description[data-collection-handle]').forEach(function (root) {
    if (root.dataset.eventsBound) return;
    root.dataset.eventsBound = 'true';
    var handle = root.dataset.collectionHandle;

    root.addEventListener('click', function (event) {
      var toggle = event.target.closest('.js-collapse-toggle');
      if (toggle) {
        // The toggle flips aria-expanded in its own click handler; read it once that has run.
        setTimeout(function () {
          if (toggle.getAttribute('aria-expanded') === 'true') {
            publish('collection_read_more', { handle: handle });
          }
        }, 0);
        return;
      }

      var link = event.target.closest('a[href]');
      if (link && root.contains(link)) {
        publish('collection_bottom_link', { handle: handle, target: link.pathname });
      }
    });
  });
})();
