import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../assets/css/landing.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const navRef = useRef(null);
  const navLinksRef = useRef(null);
  const mobileBtnRef = useRef(null);

  // Scroll reveal, nav scroll state, counter animations, tilt, spotlight, parallax
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ===== Scroll Reveal (IntersectionObserver) =====
    const revealElements = document.querySelectorAll(".reveal-up");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    );
    revealElements.forEach((el) => revealObserver.observe(el));

    // ===== Nav scroll state =====
    let navSentinel = null;
    let navObserver = null;
    const nav = navRef.current;
    if (nav) {
      navSentinel = document.createElement("div");
      navSentinel.style.cssText =
        "position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none;";
      document.body.prepend(navSentinel);
      navObserver = new IntersectionObserver(
        ([entry]) => {
          nav.classList.toggle("scrolled", !entry.isIntersecting);
        },
        { threshold: 0 }
      );
      navObserver.observe(navSentinel);
    }

    // ===== Smooth scroll for anchor links =====
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    const handleAnchorClick = (e) => {
      const href = e.currentTarget.getAttribute("href");
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    anchorLinks.forEach((link) => {
      link.addEventListener("click", handleAnchorClick);
    });

    // ===== Counter animation =====
    function animateNum(el, from, to, duration, isFloat, suffix) {
      suffix = suffix || "";
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

    const counterEls = document.querySelectorAll("[data-count], .pill-num");
    const counterObserver = new IntersectionObserver(
      (entries) => {
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
            const suffix = text.replace(numMatch[0], "");
            const isFloat = text.includes(".");
            animateNum(el, 0, target, 1500, isFloat, suffix);
          }
        });
      },
      { threshold: 0.5 }
    );
    counterEls.forEach((el) => counterObserver.observe(el));

    // ===== Card tilt =====
    const tiltCards = document.querySelectorAll("[data-tilt]");
    const tiltMoveHandlers = [];
    const tiltLeaveHandlers = [];
    if (!reducedMotion) {
      tiltCards.forEach((card) => {
        const onMove = (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -3;
          const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 3;
          card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        };
        const onLeave = () => {
          card.style.transform = "";
        };
        card.addEventListener("pointermove", onMove);
        card.addEventListener("pointerleave", onLeave);
        tiltMoveHandlers.push({ card, handler: onMove });
        tiltLeaveHandlers.push({ card, handler: onLeave });
      });
    }

    // ===== Spotlight effect on bento cards =====
    const bentoCells = document.querySelectorAll(".bento-cell:not(.bento-accent)");
    const spotlightMoveHandlers = [];
    const spotlightLeaveHandlers = [];
    if (!reducedMotion) {
      bentoCells.forEach((card) => {
        const onMove = (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.background = `radial-gradient(500px circle at ${x}px ${y}px, rgba(0,230,118,0.03), transparent 50%), var(--bg-elevated)`;
        };
        const onLeave = () => {
          card.style.background = "";
        };
        card.addEventListener("pointermove", onMove);
        card.addEventListener("pointerleave", onLeave);
        spotlightMoveHandlers.push({ card, handler: onMove });
        spotlightLeaveHandlers.push({ card, handler: onLeave });
      });
    }

    // ===== Image parallax on scroll =====
    let parallaxObserver = null;
    let scrollObserverForParallax = null;
    let onScroll = null;
    if (!reducedMotion) {
      const parallaxImgs = document.querySelectorAll(".hero-img-wrapper, .showcase-inner");
      parallaxObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.dataset.parallax = "true";
            } else {
              delete entry.target.dataset.parallax;
            }
          });
        },
        { threshold: 0 }
      );
      parallaxImgs.forEach((el) => parallaxObserver.observe(el));

      let ticking = false;
      onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          document.querySelectorAll('[data-parallax="true"]').forEach((el) => {
            const rect = el.getBoundingClientRect();
            const viewH = window.innerHeight;
            const progress = (rect.top + rect.height / 2) / viewH;
            const offset = (progress - 0.5) * 20;
            const img = el.querySelector("img");
            if (img) img.style.transform = `translateY(${offset}px) scale(1.05)`;
          });
          ticking = false;
        });
      };

      scrollObserverForParallax = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            document.addEventListener("scroll", onScroll, { passive: true });
          }
        },
        { threshold: 0 }
      );
      const firstParallax = parallaxImgs[0];
      if (firstParallax) scrollObserverForParallax.observe(firstParallax);
    }

    // ===== Mobile nav toggle =====
    const mobileBtn = mobileBtnRef.current;
    const navLinksEl = navLinksRef.current;
    const handleMobileToggle = () => {
      if (navLinksEl) navLinksEl.classList.toggle("show");
      if (mobileBtn) mobileBtn.classList.toggle("active");
    };
    if (mobileBtn) {
      mobileBtn.addEventListener("click", handleMobileToggle);
    }

    // ===== Cleanup =====
    return () => {
      revealObserver.disconnect();
      counterObserver.disconnect();

      if (navObserver) navObserver.disconnect();
      if (navSentinel && navSentinel.parentNode) navSentinel.parentNode.removeChild(navSentinel);

      anchorLinks.forEach((link) => {
        link.removeEventListener("click", handleAnchorClick);
      });

      tiltMoveHandlers.forEach(({ card, handler }) => card.removeEventListener("pointermove", handler));
      tiltLeaveHandlers.forEach(({ card, handler }) => card.removeEventListener("pointerleave", handler));
      spotlightMoveHandlers.forEach(({ card, handler }) => card.removeEventListener("pointermove", handler));
      spotlightLeaveHandlers.forEach(({ card, handler }) => card.removeEventListener("pointerleave", handler));

      if (parallaxObserver) parallaxObserver.disconnect();
      if (scrollObserverForParallax) scrollObserverForParallax.disconnect();
      if (onScroll) document.removeEventListener("scroll", onScroll);

      if (mobileBtn) mobileBtn.removeEventListener("click", handleMobileToggle);
    };
  }, []);

  const handleLogin = useCallback(() => navigate("/login"), [navigate]);
  const handleRegister = useCallback(() => navigate("/register"), [navigate]);
  const handleDashboard = useCallback(() => navigate("/login"), [navigate]);

  return (
    <div className="ps-landing">
      {/* NAV */}
      <nav className="nav" id="nav" ref={navRef}>
        <div className="container nav-inner">
          <a href="#" className="nav-logo" onClick={(e) => e.preventDefault()}>
            <span className="nav-logo-mark">P</span>
            <span className="nav-logo-text">ParkSmart</span>
          </a>
          <div className="nav-links" id="navLinks" ref={navLinksRef}>
            <a href="#features">Tinh nang</a>
            <a href="#how-it-works">Cach hoat dong</a>
            <a href="#pricing">Bang gia</a>
            <a href="#testimonials">Danh gia</a>
          </div>
          <div className="nav-actions">
            <button className="btn btn-ghost" onClick={handleLogin}>
              Dang nhap
            </button>
            <button className="btn btn-accent" onClick={handleRegister}>
              Bat dau mien phi
            </button>
          </div>
          <button
            className="nav-mobile-btn"
            id="navMobileBtn"
            ref={mobileBtnRef}
            aria-label="Menu"
          >
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="hero">
        <div className="hero-bg-image">
          <img
            src="https://images.unsplash.com/photo-1534996858221-380b92700493?w=1920&q=80&auto=format"
            alt=""
            loading="eager"
          />
        </div>
        <div className="hero-glow glow-1"></div>
        <div className="hero-glow glow-2"></div>
        <div className="container hero-grid">
          <div className="hero-content">
            <h1 className="hero-title reveal-up">
              Quan ly bai do xe,
              <br />
              <span className="hero-title-accent">khong con dau dau.</span>
            </h1>
            <p className="hero-sub reveal-up delay-1">
              Theo doi trang thai, tu dong nhan dien bien so, thanh toan online. Tat ca trong mot
              nen tang duy nhat.
            </p>
            <div className="hero-ctas reveal-up delay-2">
              <button className="btn btn-accent btn-lg" onClick={handleDashboard}>
                Vao Dashboard
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
              <a href="#how-it-works" className="btn btn-outline btn-lg">
                Tim hieu them
              </a>
            </div>
            <div className="hero-metrics reveal-up delay-3">
              <div className="hero-metric">
                <span className="hero-metric-num" data-count="500">
                  0
                </span>
                <span className="hero-metric-suffix">+</span>
                <span className="hero-metric-label">Bai do xe</span>
              </div>
              <div className="hero-metric-divider"></div>
              <div className="hero-metric">
                <span className="hero-metric-num" data-count="50000">
                  0
                </span>
                <span className="hero-metric-suffix">+</span>
                <span className="hero-metric-label">Xe moi ngay</span>
              </div>
              <div className="hero-metric-divider"></div>
              <div className="hero-metric">
                <span className="hero-metric-num" data-count="99">
                  0
                </span>
                <span className="hero-metric-suffix">.8%</span>
                <span className="hero-metric-label">Uptime</span>
              </div>
            </div>
          </div>
          <div className="hero-visual reveal-up delay-2">
            <div className="hero-img-wrapper">
              <img
                src="https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=640&q=80&auto=format"
                alt="He thong bai do xe thong minh"
                className="hero-img"
                loading="eager"
              />
              <div className="hero-img-overlay"></div>
            </div>
            <div className="hero-float-pill pill-1 reveal-up delay-3">
              <span className="pill-icon green">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </span>
              <div>
                <span className="pill-num">128</span>
                <span className="pill-label">cho trong</span>
              </div>
            </div>
            <div className="hero-float-pill pill-2 reveal-up delay-4">
              <span className="pill-icon orange">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </span>
              <div>
                <span className="pill-num">12.5M</span>
                <span className="pill-label">doanh thu hom nay</span>
              </div>
            </div>
            <div className="hero-float-pill pill-3 reveal-up delay-4">
              <span className="pill-icon blue">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </span>
              <div>
                <span className="pill-num">214</span>
                <span className="pill-label">xe dang do</span>
              </div>
            </div>
          </div>
        </div>
        <div className="container trusted-strip reveal-up delay-3">
          <span className="trusted-label">Duoc tin dung boi</span>
          <div className="trusted-logos">
            <span className="trust-logo">VinGroup</span>
            <span className="trust-logo">Sun Group</span>
            <span className="trust-logo">Novaland</span>
            <span className="trust-logo">FLC</span>
            <span className="trust-logo">Masterise</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="section-bg">
          <img
            src="https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80&auto=format"
            alt=""
            loading="lazy"
          />
        </div>
        <div className="container">
          <h2 className="section-title reveal-up">
            Moi thu ban can de van hanh hieu qua
          </h2>
          <div className="bento reveal-up delay-1">
            <div className="bento-cell bento-wide bento-has-img" data-tilt="">
              <div className="bento-text">
                <div className="bento-icon">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                </div>
                <h3>Quan ly cho do realtime</h3>
                <p>
                  Theo doi trang thai tung vi tri do xe theo thoi gian thuc voi ban do truc quan.
                </p>
              </div>
              <div className="bento-img-box">
                <img
                  src="https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=480&q=80&auto=format"
                  alt="Ban do bai do xe"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="bento-cell" data-tilt="">
              <div className="bento-icon green">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3>Nhan dien bien so AI</h3>
              <p>Tu dong doc bien so xe bang AI, giam thao tac thu cong.</p>
              <div className="bento-img-small">
                <img
                  src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=320&q=80&auto=format"
                  alt="Camera nhan dien bien so"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="bento-cell bento-accent" data-tilt="">
              <div className="bento-icon white">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M21 12V7H5a2 2 0 010-4h14v4" />
                  <path d="M3 5v14a2 2 0 002 2h16v-5" />
                  <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
                </svg>
              </div>
              <h3>Thanh toan online</h3>
              <p>VNPay, MoMo, ZaloPay tich hop san.</p>
            </div>
            <div className="bento-cell" data-tilt="">
              <div className="bento-icon orange">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h3>Bao cao thong minh</h3>
              <p>Dashboard truc quan voi bieu do doanh thu va hieu suat.</p>
            </div>
            <div className="bento-cell bento-wide bento-has-img" data-tilt="">
              <div className="bento-text">
                <div className="bento-icon pink">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                </div>
                <h3>Thong bao va canh bao</h3>
                <p>
                  Canh bao tuc thi khi bai sap day, xe qua han, hoac phat sinh su co.
                </p>
              </div>
              <div className="bento-img-box">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=480&q=80&auto=format"
                  alt="Dashboard analytics"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-bg">
          <img
            src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=1920&q=80&auto=format"
            alt=""
            loading="lazy"
          />
        </div>
        <div className="container">
          <h2 className="section-title reveal-up">Don gian chi voi 3 buoc</h2>
          <div className="steps-track reveal-up delay-1">
            <div className="step-card">
              <div className="step-num">01</div>
              <h3>Dang ky tai khoan</h3>
              <p>Tao tai khoan mien phi trong 2 phut, khong can the tin dung.</p>
              <div className="step-img">
                <img
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80&auto=format"
                  alt="Dang ky tai khoan"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="step-card">
              <div className="step-num">02</div>
              <h3>Cai dat bai do xe</h3>
              <p>Nhap so do bai, so tang, so cho. He thong tu tao ban do.</p>
              <div className="step-img">
                <img
                  src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400&q=80&auto=format"
                  alt="Cai dat bai do xe"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="step-card">
              <div className="step-num">03</div>
              <h3>Bat dau van hanh</h3>
              <p>Moi thu tu dong. Xe vao, xe ra, thanh toan, bao cao.</p>
              <div className="step-img">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80&auto=format"
                  alt="Dashboard van hanh"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SHOWCASE IMAGE SECTION */}
      <section className="showcase">
        <div className="container">
          <div className="showcase-inner reveal-up">
            <img
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&q=80&auto=format"
              alt="Bai do xe hien dai"
              loading="lazy"
              className="showcase-img"
            />
            <div className="showcase-overlay">
              <div className="showcase-stat">
                <span className="showcase-stat-num">500+</span>
                <span className="showcase-stat-label">
                  Bai do xe dang su dung ParkSmart tren toan quoc
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="container">
          <h2 className="section-title reveal-up">Bang gia minh bach</h2>
          <p className="section-sub reveal-up delay-1">
            Bat dau mien phi, nang cap khi can.
          </p>
          <div className="pricing-grid reveal-up delay-2">
            <div className="price-card">
              <div className="price-head">
                <h3>Starter</h3>
                <p>Cho bai nho duoi 50 cho</p>
              </div>
              <div className="price-amount">
                <span className="price-currency">990K</span>
                <span className="price-period">/thang</span>
              </div>
              <ul className="price-list">
                <li className="yes">Toi da 50 cho do</li>
                <li className="yes">Dashboard co ban</li>
                <li className="yes">Bao cao hang tuan</li>
                <li className="no">Nhan dien bien so AI</li>
                <li className="no">API tich hop</li>
              </ul>
              <button className="btn btn-outline btn-full" onClick={handleRegister}>
                Bat dau mien phi
              </button>
            </div>
            <div className="price-card popular">
              <div className="price-popular-tag">Pho bien nhat</div>
              <div className="price-head">
                <h3>Professional</h3>
                <p>Cho bai trung binh 50-200 cho</p>
              </div>
              <div className="price-amount">
                <span className="price-currency">2.5M</span>
                <span className="price-period">/thang</span>
              </div>
              <ul className="price-list">
                <li className="yes">Toi da 200 cho do</li>
                <li className="yes">Dashboard nang cao</li>
                <li className="yes">Bao cao realtime</li>
                <li className="yes">Nhan dien bien so AI</li>
                <li className="no">API tich hop</li>
              </ul>
              <button className="btn btn-accent btn-full" onClick={handleRegister}>
                Chon goi nay
              </button>
            </div>
            <div className="price-card">
              <div className="price-head">
                <h3>Enterprise</h3>
                <p>Cho chuoi bai do xe lon</p>
              </div>
              <div className="price-amount">
                <span className="price-currency">Lien he</span>
                <span className="price-period"></span>
              </div>
              <ul className="price-list">
                <li className="yes">Khong gioi han cho do</li>
                <li className="yes">Dashboard tuy chinh</li>
                <li className="yes">Bao cao realtime</li>
                <li className="yes">Nhan dien bien so AI</li>
                <li className="yes">API tich hop day du</li>
              </ul>
              <button className="btn btn-outline btn-full" onClick={handleRegister}>
                Lien he tu van
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials" id="testimonials">
        <div className="container">
          <h2 className="section-title reveal-up">Khach hang noi gi</h2>
          <div className="testimonials-grid reveal-up delay-1">
            <div className="testi-card">
              <p>
                &ldquo;ParkSmart giup chung toi tang 40% hieu suat van hanh trong 3 thang dau
                tien.&rdquo;
              </p>
              <div className="testi-author">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80&auto=format"
                  alt="Nguyen Thanh"
                  className="testi-avatar-img"
                  loading="lazy"
                />
                <div>
                  <strong>Nguyen Thanh</strong>
                  <span>Quan ly bai xe Times City</span>
                </div>
              </div>
            </div>
            <div className="testi-card">
              <p>
                &ldquo;Giao dien de su dung, nhan vien chi can 30 phut de lam quen. Thanh toan
                online rat tien.&rdquo;
              </p>
              <div className="testi-author">
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&q=80&auto=format"
                  alt="Le Hoang"
                  className="testi-avatar-img"
                  loading="lazy"
                />
                <div>
                  <strong>Le Hoang</strong>
                  <span>CEO ParkingVN</span>
                </div>
              </div>
            </div>
            <div className="testi-card">
              <p>
                &ldquo;Tu khi dung ParkSmart, so luong khieu nai cua khach giam 70%. He thong on
                dinh, support tot.&rdquo;
              </p>
              <div className="testi-author">
                <img
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80&auto=format"
                  alt="Pham Trang"
                  className="testi-avatar-img"
                  loading="lazy"
                />
                <div>
                  <strong>Pham Trang</strong>
                  <span>Giam doc Van hanh, Vinhomes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-bg">
          <img
            src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=80&auto=format"
            alt=""
            loading="lazy"
          />
        </div>
        <div className="container cta-inner reveal-up">
          <h2>San sang nang cap bai do xe cua ban?</h2>
          <p>Dung thu mien phi 14 ngay, khong can the tin dung.</p>
          <button className="btn btn-accent btn-lg" onClick={handleRegister}>
            Bat dau ngay
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer" id="contact">
        <div className="container footer-grid">
          <div className="footer-brand">
            <a href="#" className="nav-logo" onClick={(e) => e.preventDefault()}>
              <span className="nav-logo-mark">P</span>
              <span className="nav-logo-text">ParkSmart</span>
            </a>
            <p>Giai phap quan ly bai do xe thong minh hang dau Viet Nam.</p>
          </div>
          <div className="footer-col">
            <h4>San pham</h4>
            <a href="#features">Tinh nang</a>
            <a href="#pricing">Bang gia</a>
            <a href="#">API Docs</a>
          </div>
          <div className="footer-col">
            <h4>Ho tro</h4>
            <a href="#">Huong dan</a>
            <a href="#">FAQ</a>
            <a href="#">Lien he</a>
          </div>
          <div className="footer-col">
            <h4>Lien he</h4>
            <a href="#">contact@parksmart.vn</a>
            <a href="#">0909 123 456</a>
            <a href="#">Ha Noi, Viet Nam</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <p>2026 ParkSmart. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
