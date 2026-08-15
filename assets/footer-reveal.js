if (!customElements.get('footer-reveal')) {
  customElements.define('footer-reveal', class FooterReveal extends HTMLElement {
    connectedCallback() {
      this.wrapper = this.closest('.footer-reveal-wrapper');
      this.scale = this.querySelector('.footer-reveal__scale');

      if (!this.wrapper || !this.scale || !window.Motion) return;

      const update = () => {
        const footerHeight = this.offsetHeight;
        if (footerHeight === 0) return;

        const distanceRemaining = this.wrapper.getBoundingClientRect().bottom - window.innerHeight;
        const clamped = Math.min(Math.max(distanceRemaining / footerHeight, 0), 1);
        const progress = 1 - clamped;

        this.scale.style.opacity = progress;
        this.scale.style.transform = `scale(${0.9 + progress * 0.1})`;
        this.scale.style.filter = `blur(${6 * (1 - progress)}px)`;
      };

      update();
      this.cancelScroll = window.Motion.scroll(update);
    }

    disconnectedCallback() {
      if (this.cancelScroll) this.cancelScroll();
    }
  });
}
