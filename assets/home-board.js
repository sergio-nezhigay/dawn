// Board hero: light up the trace from the chip to the hovered or focused pad (pointer devices only).
// Delegated on document so pads re-rendered by the theme editor keep working.
if (window.matchMedia('(hover: hover)').matches) {
  const toggleTrace = (event, on) => {
    const pad = event.target.closest('.home-board__pad');
    if (!pad || pad.contains(event.relatedTarget)) return;
    const trace = pad.parentElement.querySelector(`.home-board__traces g[data-index="${pad.dataset.index}"]`);
    if (trace) trace.classList.toggle('is-on', on);
  };
  ['mouseover', 'focusin'].forEach((type) => document.addEventListener(type, (event) => toggleTrace(event, true)));
  ['mouseout', 'focusout'].forEach((type) => document.addEventListener(type, (event) => toggleTrace(event, false)));
}
