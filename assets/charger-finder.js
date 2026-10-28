// Charger adapters collection (sections/charger-adapter-finder.liquid): opens the plug-size guide with the model
// helper from the "Not sure which one fits?" strip in the grid (snippets/help-card.liquid). The brand buttons are the
// shared quick filter row (assets/quick-filters.js).

const openChargerHelp = (focusModel) => {
  const guide = document.getElementById('adapter-help');
  if (!guide) return false;
  guide.open = true;
  const target = focusModel ? guide.querySelector('[data-fit]') : guide;
  target.scrollIntoView({ behavior: 'smooth', block: focusModel ? 'center' : 'start' });
  if (focusModel) guide.querySelector('input[name="model"]').focus({ preventScroll: true });
  return true;
};

// "More filters" pills: wide screens open that filter in the sidebar; phones and tablets open the filter drawer
// (Dawn menu-drawer in snippets/facets.liquid) and then the filter's own panel
const openFilter = (param) => {
  if (window.matchMedia('(min-width: 990px)').matches) {
    const details = document.querySelector(`#FacetFiltersForm details[id^="Details-${param}-"]`);
    if (!details) return false;
    details.open = true;
    details.scrollIntoView({ behavior: 'smooth', block: 'center' });
    details.querySelector('summary').focus({ preventScroll: true, focusVisible: false });
    return true;
  }
  const drawer = document.querySelector('menu-drawer.mobile-facets__wrapper');
  const panel = drawer?.querySelector(`details[id^="Details-Mobile-${param}-"]`);
  if (!panel) return false;
  const main = drawer.querySelector('details');
  if (!main.open) main.querySelector('summary').click();
  setTimeout(() => {
    if (!panel.open) panel.querySelector('summary').click();
    panel.querySelector('.mobile-facets__submenu')?.scrollTo(0, 0);
  }, 150);
  return true;
};

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-charger-help]');
  if (link && openChargerHelp(true)) event.preventDefault();
  const pill = event.target.closest('[data-open-filter]');
  if (pill && openFilter(pill.dataset.openFilter)) event.preventDefault();
});

if (window.location.hash === '#adapter-help') openChargerHelp(false);
