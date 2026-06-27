document.addEventListener('DOMContentLoaded', () => {

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== Scroll Reveal (IntersectionObserver) =====
  const revealElements = document.querySelectorAll('.reveal-up');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  revealElements.forEach((el) => revealObserver.observe(el));

  // ===== Nav scroll state =====
  const nav = document.getElementById('nav');
  if (nav) {
    const navSentinel = document.createElement('div');
    navSentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none;';
    document.body.prepend(navSentinel);
    const navObserver = new IntersectionObserver(([entry]) => {
      nav.classList.toggle('scrolled', !entry.isIntersecting);
    }, { threshold: 0 });
    navObserver.observe(navSentinel);
  }

  // ===== Smooth scroll =====
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ===== Counter animation =====
  const counterEls = document.querySelectorAll('[data-count], .pill-num');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      counterObserver.unobserve(el);

      const dataCount = el.dataset.count;
      if (dataCount) {
        const target = parseInt(dataCount);
        animateNum(el, 0, target, 2000, false);
        return;
      }

      const text = el.textContent;
      const numMatch = text.match(/[\d.]+/);
      if (numMatch) {
        const target = parseFloat(numMatch[0]);
        const suffix = text.replace(numMatch[0], '');
        const isFloat = text.includes('.');
        animateNum(el, 0, target, 1500, isFloat, suffix);
      }
    });
  }, { threshold: 0.5 });
  counterEls.forEach((el) => counterObserver.observe(el));

  function animateNum(el, from, to, duration, isFloat, suffix) {
    suffix = suffix || '';
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      if (to >= 10000) {
        el.textContent = Math.floor(current).toLocaleString() + suffix;
      } else if (isFloat) {
        el.textContent = current.toFixed(1) + suffix;
      } else {
        el.textContent = Math.floor(current) + suffix;
      }
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ===== Card tilt =====
  if (!reducedMotion) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -3;
        const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 3;
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });
  }

  // ===== Spotlight effect on bento cards =====
  if (!reducedMotion) {
    document.querySelectorAll('.bento-cell:not(.bento-accent)').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.background = `radial-gradient(500px circle at ${x}px ${y}px, rgba(0,230,118,0.03), transparent 50%), var(--bg-elevated)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.background = '';
      });
    });
  }

  // ===== Image parallax on scroll =====
  if (!reducedMotion) {
    const parallaxImgs = document.querySelectorAll('.hero-img-wrapper, .showcase-inner');
    const parallaxObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.dataset.parallax = 'true';
        } else {
          delete entry.target.dataset.parallax;
        }
      });
    }, { threshold: 0 });
    parallaxImgs.forEach((el) => parallaxObserver.observe(el));

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        document.querySelectorAll('[data-parallax="true"]').forEach((el) => {
          const rect = el.getBoundingClientRect();
          const viewH = window.innerHeight;
          const progress = (rect.top + rect.height / 2) / viewH;
          const offset = (progress - 0.5) * 20;
          const img = el.querySelector('img');
          if (img) img.style.transform = `translateY(${offset}px) scale(1.05)`;
        });
        ticking = false;
      });
    };

    const scrollObserverForParallax = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        document.addEventListener('scroll', onScroll, { passive: true });
      }
    }, { threshold: 0 });
    const firstParallax = parallaxImgs[0];
    if (firstParallax) scrollObserverForParallax.observe(firstParallax);
  }

  // ===== Mobile nav toggle =====
  const mobileBtn = document.getElementById('navMobileBtn');
  const navLinks = document.getElementById('navLinks');
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('show');
      mobileBtn.classList.toggle('active');
    });
  }
});
