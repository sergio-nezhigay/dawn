// Quick filter buttons (snippets/quick-filters.liquid). Taps go through <facet-remove> and facets.js, which
// re-renders #ProductGridContainer by AJAX. A row inside the grid comes back with it; a row in another section
// (the adapters finder) is refetched here so its links, active state and disabled buttons match the new filters.
// The snippet can load this file more than once on a page: run once.
if (!window.quickFiltersReady) {
  window.quickFiltersReady = true;

  // Phones show each group as one sideways-scrolling row: bring the chosen button into view
  const showActiveQuickFilters = () => {
    document.querySelectorAll('.quick-filters__chips').forEach((row) => {
      const current = row.querySelector('.is-active');
      if (current && row.scrollWidth > row.clientWidth) row.scrollLeft = current.closest('li').offsetLeft - 24;
    });
  };

  // Quick taps can overlap: only the latest refetch may replace the rows
  let latestRefresh = 0;
  const refreshOuterQuickFilters = async () => {
    const refresh = ++latestRefresh;
    const rows = [...document.querySelectorAll('[data-quick-filters]')].filter(
      (row) => !row.closest('#ProductGridContainer')
    );
    await Promise.all(
      rows.map(async (row) => {
        const url = new URL(window.location.href);
        url.searchParams.set('section_id', row.dataset.sectionId);
        const html = new DOMParser().parseFromString(await (await fetch(url)).text(), 'text/html');
        const fresh = html.querySelector(`[data-quick-filters][data-section-id="${row.dataset.sectionId}"]`);
        if (fresh && refresh === latestRefresh) row.replaceWith(fresh);
      })
    );
    showActiveQuickFilters();
  };

  const grid = document.getElementById('ProductGridContainer');
  if (grid) new MutationObserver(refreshOuterQuickFilters).observe(grid, { childList: true });
  showActiveQuickFilters();
}
