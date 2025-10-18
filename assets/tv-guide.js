/**
 * TV Guide Interactive Features
 * Handles port selector, FAQ toggles, smooth scroll, and scroll animations
 */

class TVGuide {
  constructor() {
    this.init();
  }

  init() {
    this.initPortSelector();
    this.initFAQ();
    this.initSmoothScroll();
    this.initScrollAnimations();
  }

  /**
   * Port Selector Interactive Feature
   */
  initPortSelector() {
    const selectorButtons = document.querySelectorAll('.tv-guide-selector-btn');

    selectorButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const portType = button.dataset.port;
        this.showPortResult(portType, e.target);
      });
    });
  }

  showPortResult(portType, clickedButton) {
    // Hide all result boxes
    document.querySelectorAll('.tv-guide-result-box').forEach(box => {
      box.classList.remove('show');
    });

    // Remove selected class from all buttons
    document.querySelectorAll('.tv-guide-selector-btn').forEach(btn => {
      btn.classList.remove('selected');
    });

    // Show selected result
    const resultBox = document.getElementById(`tv-guide-result-${portType}`);
    if (resultBox) {
      resultBox.classList.add('show');
    }

    // Highlight selected button
    if (clickedButton) {
      clickedButton.classList.add('selected');
    }
  }

  /**
   * FAQ Accordion Toggle
   */
  initFAQ() {
    const faqItems = document.querySelectorAll('.tv-guide-faq-item');

    faqItems.forEach(item => {
      item.addEventListener('click', () => {
        this.toggleFAQ(item);
      });
    });
  }

  toggleFAQ(element) {
    const wasActive = element.classList.contains('active');

    // Optional: Close all other FAQs (accordion behavior)
    // document.querySelectorAll('.tv-guide-faq-item').forEach(item => {
    //   item.classList.remove('active');
    // });

    // Toggle current FAQ
    element.classList.toggle('active');

    // Update icon
    const icon = element.querySelector('.tv-guide-faq-question span');
    if (icon) {
      icon.textContent = element.classList.contains('active') ? '−' : '+';
    }
  }

  /**
   * Smooth Scroll for Navigation Links
   */
  initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');

        // Skip if href is just "#"
        if (href === '#') return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();

          // Get header height from CSS variable
          const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;

          // Add extra spacing for better visual separation
          const offset = headerHeight + 20;

          // Calculate target position
          const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

          // Smooth scroll to position
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  /**
   * Scroll-triggered Fade-in Animations
   */
  initScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);

    // Observe all sections
    document.querySelectorAll('.tv-guide-section, .tv-guide-content').forEach(section => {
      section.style.opacity = '0';
      section.style.transform = 'translateY(20px)';
      section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(section);
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TVGuide();
  });
} else {
  new TVGuide();
}
