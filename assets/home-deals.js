/* Homepage deals: tabs switch the card rail (rail and arrows come from home-rail.js) */
class HomeDeals extends customElements.get('home-rail') {
  connectedCallback() {
    super.connectedCallback();
    this.tabs = [...this.querySelectorAll('[role="tab"]')];
    this.notes = [...this.querySelectorAll('.home-deals__note [data-note]')];
    this.all = this.querySelector('[data-all]');

    this.tabs.forEach((tab) => tab.addEventListener('click', () => this.select(tab)));
    this.select(this.tabs[0]);
  }

  select(tab) {
    this.tabs.forEach((item) => item.setAttribute('aria-selected', item === tab));
    this.panels.forEach((panel) => (panel.hidden = panel.getAttribute('aria-labelledby') !== tab.id));
    this.notes.forEach((note) => (note.hidden = note.dataset.note !== tab.dataset.note));
    this.all.href = tab.dataset.url;
    this.rail.scrollLeft = 0;
    this.updateArrows();
  }
}

customElements.define('home-deals', HomeDeals);
