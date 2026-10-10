/* Homepage card rail: arrows scroll the visible .home-rail__list and disable at the ends (draft: concepts/final.html) */
/* Loaded by every section that has a rail, so the class is defined once */
if (!customElements.get('home-rail')) {
  class HomeRail extends HTMLElement {
    connectedCallback() {
      this.panels = [...this.querySelectorAll('.home-rail__list')];
      this.prev = this.querySelector('.home-rail__arrow--prev');
      this.next = this.querySelector('.home-rail__arrow--next');

      this.prev.addEventListener('click', () => this.scroll(-1));
      this.next.addEventListener('click', () => this.scroll(1));
      this.panels.forEach((panel) => panel.addEventListener('scroll', () => this.updateArrows(), { passive: true }));
      this.onResize = () => this.updateArrows();
      window.addEventListener('resize', this.onResize);
      this.updateArrows();
    }

    disconnectedCallback() {
      window.removeEventListener('resize', this.onResize);
    }

    get rail() {
      return this.panels.find((panel) => !panel.hidden);
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

  customElements.define('home-rail', HomeRail);
}
