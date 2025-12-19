/**
 * Landing Page Interactivity
 * Handles scroll animations, navbar effects, and smooth scrolling
 */

// =============================================
// INTERSECTION OBSERVER FOR SCROLL REVEAL
// =============================================

const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
    }
  });
}, observerOptions);

// Observe all elements with .reveal class
document.querySelectorAll('.reveal').forEach(el => {
  observer.observe(el);
});

// =============================================
// NAVBAR SCROLL EFFECT
// =============================================

let lastScroll = 0;
const nav = document.querySelector('.landing-nav');

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;

  if (currentScroll > 100) {
    nav?.classList.add('scrolled');
  } else {
    nav?.classList.remove('scrolled');
  }

  lastScroll = currentScroll;
});

// =============================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// =============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e: Event) {
    e.preventDefault();

    const target = document.querySelector((this as HTMLAnchorElement).getAttribute('href') || '');
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// =============================================
// ANALYTICS TRACKING (Optional)
// =============================================

// Track CTA clicks
document.querySelectorAll('.btn-primary, .nav-cta').forEach(button => {
  button.addEventListener('click', () => {
    // Track with Google Analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'cta_click', {
        'event_category': 'engagement',
        'event_label': (button as HTMLElement).textContent?.trim() || 'Launch Editor'
      });
    }
  });
});

// Track section views
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && typeof gtag !== 'undefined') {
      const sectionId = entry.target.id;
      if (sectionId) {
        gtag('event', 'section_view', {
          'event_category': 'engagement',
          'event_label': sectionId
        });
      }
    }
  });
}, { threshold: 0.5 });

// Observe main sections
document.querySelectorAll('section[id]').forEach(section => {
  sectionObserver.observe(section);
});

// =============================================
// FEATURE CARD HOVER EFFECTS (Optional)
// =============================================

document.querySelectorAll('.feature-card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    // Could add additional effects here if needed
  });
});

// =============================================
// CONSOLE MESSAGE
// =============================================

console.log('%c🎬 Smart WebVideoFlow', 'font-size: 20px; font-weight: bold; color: #69d2ff;');
console.log('%cEdit videos like you edit text - AI-powered, browser-based, 100% private', 'font-size: 12px; color: #8a9ba8;');
console.log('%cGitHub: https://github.com/apssouza22/web-video-edit', 'font-size: 12px; color: #69d2ff;');
