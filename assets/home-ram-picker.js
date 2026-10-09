// RAM picker: a type and a size select one SODIMM collection; links and button labels come from Liquid as JSON.
// Delegated on document so pickers re-rendered by the theme editor keep working.
document.addEventListener('click', (event) => {
  const seg = event.target.closest('.home-ram__seg');
  if (!seg) return;
  const picker = seg.closest('[data-ram-picker]');
  picker
    .querySelectorAll(`.home-ram__seg[data-group="${seg.dataset.group}"]`)
    .forEach((button) => button.setAttribute('aria-pressed', button === seg));

  const value = (group) => picker.querySelector(`.home-ram__seg[data-group="${group}"][aria-pressed="true"]`).dataset.value;
  const links = JSON.parse(picker.querySelector('[data-ram-links]').textContent);
  const [url, label] = links[`sodimm-${value('type')}-${value('size')}gb`];
  const go = picker.querySelector('[data-ram-go]');
  go.href = url;
  go.textContent = label;
});
