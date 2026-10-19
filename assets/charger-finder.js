// Charger adapters collection (sections/charger-adapter-finder.liquid): keeps the brand buttons in step with the
// filters (the sidebar filters re-render the grid by AJAX and only change the URL), and opens the plug-size guide
// with the model helper from the "Not sure which one fits?" card in the grid (snippets/charger-help-card.liquid).
const syncChargerChips = () => {
  document.querySelectorAll('[data-charger-finder]').forEach((finder) => {
    const active = new URLSearchParams(window.location.search).getAll(finder.dataset.brandParam);
    finder.querySelectorAll('.charger-finder__chip').forEach((chip) => {
      const on = chip.dataset.brand ? active.includes(chip.dataset.brand) : active.length === 0;
      chip.classList.toggle('is-active', on);
      if (on) chip.setAttribute('aria-current', 'true');
      else chip.removeAttribute('aria-current');
    });
    // Phones show the buttons as one sideways-scrolling row: bring the chosen brand into view
    const row = finder.querySelector('.charger-finder__chips');
    const current = row?.querySelector('.is-active');
    if (current && row.scrollWidth > row.clientWidth) row.scrollLeft = current.parentElement.offsetLeft - 24;
  });
};

const openChargerHelp = (focusModel) => {
  const guide = document.getElementById('adapter-help');
  if (!guide) return false;
  guide.open = true;
  const target = focusModel ? guide.querySelector('[data-fit]') : guide;
  target.scrollIntoView({ behavior: 'smooth', block: focusModel ? 'center' : 'start' });
  if (focusModel) guide.querySelector('input[name="model"]').focus({ preventScroll: true });
  return true;
};

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-charger-help]');
  if (link && openChargerHelp(true)) event.preventDefault();
});

window.addEventListener('popstate', syncChargerChips);
const grid = document.getElementById('ProductGridContainer');
if (grid) new MutationObserver(syncChargerChips).observe(grid, { childList: true });
if (window.location.hash === '#adapter-help') openChargerHelp(false);
syncChargerChips();
