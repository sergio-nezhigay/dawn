/* Homepage deals: tabs switch the card rail, arrows scroll it (draft: concepts/final.html) */
class HomeDeals extends HTMLElement {
  connectedCallback() {
    this.tabs = [...this.querySelectorAll('[role="tab"]')];
    this.panels = [...this.querySelectorAll('[role="tabpanel"]')];
    this.notes = [...this.querySelectorAll('.home-deals__note [data-note]')];
    this.all = this.querySelector('[data-all]');
    this.prev = this.querySelector('.home-deals__arrow--prev');
    this.next = this.querySelector('.home-deals__arrow--next');

    this.tabs.forEach((tab) => tab.addEventListener('click', () => this.select(tab)));
    this.prev.addEventListener('click', () => this.scroll(-1));
    this.next.addEventListener('click', () => this.scroll(1));
    this.panels.forEach((panel) => panel.addEventListener('scroll', () => this.updateArrows(), { passive: true }));
    this.onResize = () => this.updateArrows();
    window.addEventListener('resize', this.onResize);

    this.select(this.tabs[0]);
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.onResize);
  }

  get rail() {
    return this.panels.find((panel) => !panel.hidden);
  }

  select(tab) {
    this.tabs.forEach((item) => item.setAttribute('aria-selected', item === tab));
    this.panels.forEach((panel) => (panel.hidden = panel.getAttribute('aria-labelledby') !== tab.id));
    this.notes.forEach((note) => (note.hidden = note.dataset.note !== tab.dataset.note));
    this.all.href = tab.dataset.url;
    this.rail.scrollLeft = 0;
    this.updateArrows();
  }

  scroll(direction) {
    this.rail.scrollBy({ left: direction * this.rail.clientWidth, behavior: 'smooth' });
  }

  updateArrows() {
    const rail = this.rail;
    this.prev.disabled = rail.scrollLeft < 4;
    this.next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 4;
  }
}

customElements.define('home-deals', HomeDeals);
