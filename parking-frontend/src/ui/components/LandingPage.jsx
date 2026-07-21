import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildingApi } from "../../api/manager/buildingApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { unwrapApiData } from "../../utils/api";
import { usePublicTheme } from "../../utils/publicTheme";
import "leaflet/dist/leaflet.css";
import "../../assets/css/landing.css";

function getBuildingId(building) {
  return building?.buildingId ?? building?.id;
}

function normalizeBuilding(building) {
  return {
    ...building,
    id: getBuildingId(building),
    latitude: Number(building.latitude),
    longitude: Number(building.longitude),
  };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function spreadNearbyBuildings(buildings) {
  const thresholdKm = 0.09;
  const groups = [];

  buildings.forEach((building) => {
    const matchedGroup = groups.find((group) =>
      haversineKm(group.anchor.latitude, group.anchor.longitude, building.latitude, building.longitude) <= thresholdKm
    );

    if (matchedGroup) {
      matchedGroup.items.push(building);
    } else {
      groups.push({ anchor: building, items: [building] });
    }
  });

  return groups.flatMap((group) => {
    if (group.items.length === 1) {
      return group.items.map((building) => ({
        ...building,
        markerLat: building.latitude,
        markerLon: building.longitude,
        nearbyCount: 1,
      }));
    }

    const radius = 0.00026;
    return group.items.map((building, index) => {
      const angle = (Math.PI * 2 * index) / group.items.length;
      return {
        ...building,
        markerLat: building.latitude + Math.sin(angle) * radius,
        markerLon: building.longitude + Math.cos(angle) * radius,
        nearbyCount: group.items.length,
      };
    });
  });
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { dark, toggle, className: themeClass } = usePublicTheme();
  const navRef = useRef(null);
  const navLinksRef = useRef(null);
  const mobileBtnRef = useRef(null);
  const heroMapRef = useRef(null);
  const heroLeafletRef = useRef(null);
  const heroMarkersRef = useRef([]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveStats, setLiveStats] = useState({ buildingCount: 0, available: 0, occupied: 0, total: 0 });
  const [statsError, setStatsError] = useState("");
  const [heroBuildings, setHeroBuildings] = useState([]);
  const [heroMapReady, setHeroMapReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [bRes, statsRes] = await Promise.all([buildingApi.getAll(), parkingSlotApi.getPublicStats()]);
        const buildings = unwrapApiData(bRes.data, []);
        setHeroBuildings(
          spreadNearbyBuildings(
            buildings
              .filter((building) => building.latitude != null && building.longitude != null)
              .map(normalizeBuilding)
          )
        );

        const stats = unwrapApiData(statsRes.data, {});
        setLiveStats({
          buildingCount: stats.buildingCount ?? 0,
          total: stats.total ?? 0,
          available: stats.available ?? 0,
          occupied: stats.occupied ?? 0,
        });
        setStatsError("");
      } catch (err) {
        setStatsError(err.response?.data?.message || "Khong tai duoc thong ke bai do song.");
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    import("leaflet").then((leafletModule) => {
      const leaflet = leafletModule.default || leafletModule;

      if (!heroMapRef.current || heroLeafletRef.current) return;

      const map = leaflet.map(heroMapRef.current, {
        center: [10.7769, 106.7009],
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
      });

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        })
        .addTo(map);

      heroLeafletRef.current = { map, leaflet };
      setHeroMapReady(true);
      window.setTimeout(() => map.invalidateSize(), 0);
    });

    return () => {
      heroMarkersRef.current.forEach((marker) => marker.remove());
      heroMarkersRef.current = [];
      setHeroMapReady(false);
      if (heroLeafletRef.current?.map) {
        heroLeafletRef.current.map.remove();
        heroLeafletRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!heroMapReady || !heroLeafletRef.current) return;

    const { map, leaflet } = heroLeafletRef.current;
    heroMarkersRef.current.forEach((marker) => marker.remove());
    heroMarkersRef.current = [];

    if (!heroBuildings.length) {
      map.setView([10.7769, 106.7009], 11);
      return;
    }

    const bounds = [];

    heroBuildings.forEach((building) => {
      const icon = leaflet.divIcon({
        className: "landing-map-marker",
        html: `
          <div class="landing-map-marker__pin"></div>
          <div class="landing-map-marker__label">
            <span>${building.name || "Parking"}</span>
            ${building.nearbyCount > 1 ? `<b>+${building.nearbyCount - 1}</b>` : ""}
          </div>
        `,
        iconSize: [116, 52],
        iconAnchor: [18, 44],
      });

      const marker = leaflet
        .marker([building.markerLat, building.markerLon], { icon })
        .addTo(map)
        .bindTooltip(building.address || building.name || "Parking", {
          direction: "top",
          offset: [0, -22],
          opacity: 0.95,
        });

      heroMarkersRef.current.push(marker);
      bounds.push([building.latitude, building.longitude]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    } else {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12 });
    }
    window.setTimeout(() => map.invalidateSize(), 0);
  }, [heroBuildings, heroMapReady]);

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
      const parallaxImgs = document.querySelectorAll(".showcase-inner");
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

    };
  }, []);

  const handleLogin = useCallback(() => navigate("/login"), [navigate]);
  const handleRegister = useCallback(() => navigate("/register"), [navigate]);
  const handleDashboard = useCallback(() => navigate("/login"), [navigate]);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className={`ps-landing ${themeClass}`}>
      {/* NAV */}
      <nav className="nav" id="nav" ref={navRef}>
        <div className="container nav-inner">
          <a href="#" className="nav-logo" onClick={(e) => e.preventDefault()}>
            <span className="nav-logo-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></span>
            <span className="nav-logo-text">ParkSmart</span>
          </a>
          <div className="nav-links" id="navLinks" ref={navLinksRef}>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate("/public-slots"); }}>Bản đồ slot</a>
          </div>
          <div className="nav-actions">
            <button className="theme-toggle-btn" onClick={toggle} title={dark ? "Light mode" : "Dark mode"}>
              {dark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
            </button>
            <button className="btn btn-ghost" onClick={handleLogin}>
              Đăng nhập
            </button>
            <button className="btn btn-accent" onClick={handleRegister}>
              Đăng ký
            </button>
          </div>
          <button
            className={`nav-mobile-btn ${mobileMenuOpen ? "active" : ""}`}
            id="navMobileBtn"
            ref={mobileBtnRef}
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
        <div className={`nav-mobile-panel ${mobileMenuOpen ? "show" : ""}`}>
          <div className="container nav-mobile-panel-inner">
            <a
              href="#"
              className="nav-mobile-link"
              onClick={(e) => {
                e.preventDefault();
                closeMobileMenu();
                navigate("/public-slots");
              }}
            >
              Bản đồ slot
            </a>
            <button
              className="nav-mobile-action nav-mobile-action-secondary"
              type="button"
              onClick={() => {
                closeMobileMenu();
                handleLogin();
              }}
            >
              Đăng nhập
            </button>
            <button
              className="nav-mobile-action nav-mobile-action-primary"
              type="button"
              onClick={() => {
                closeMobileMenu();
                handleRegister();
              }}
            >
              Đăng ký
            </button>
          </div>
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
              Quản lý bãi đỗ xe,
              <br />
              <span className="hero-title-accent">không còn đau đầu.</span>
            </h1>
            <p className="hero-sub reveal-up delay-1">
              Theo dõi trạng thái, tự động nhận diện biển số, thanh toán online. Tất cả trong một nền tảng duy nhất.
            </p>
            <div className="hero-ctas reveal-up delay-2">
              <button className="btn btn-accent btn-lg" onClick={handleDashboard}>
                Đăng nhập
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
              <button className="btn btn-outline btn-lg" onClick={() => navigate("/public-slots")}>
                Xem slot trống
              </button>
            </div>
            <div className="hero-metrics reveal-up delay-3">
              <div className="hero-metric">
                <span className="hero-metric-num" data-count={liveStats.buildingCount ?? 0}>
                  {liveStats.buildingCount ?? 0}
                </span>
                <span className="hero-metric-suffix"></span>
                <span className="hero-metric-label">Bãi đỗ</span>
              </div>
              <div className="hero-metric-divider"></div>
              <div className="hero-metric">
                <span className="hero-metric-num" data-count={liveStats.available ?? 0}>
                  {liveStats.available ?? 0}
                </span>
                <span className="hero-metric-suffix"></span>
                <span className="hero-metric-label">Slot trống</span>
              </div>
              <div className="hero-metric-divider"></div>
              <div className="hero-metric">
                <span className="hero-metric-num" data-count={liveStats.occupied ?? 0}>
                  {liveStats.occupied ?? 0}
                </span>
                <span className="hero-metric-suffix"></span>
                <span className="hero-metric-label">Xe đang đỗ</span>
              </div>
            </div>
            {statsError ? <p className="mt-3 text-xs text-amber-200">{statsError}</p> : null}
          </div>
          <div className="hero-visual reveal-up delay-2">
            <div className="hero-img-wrapper hero-map-wrapper">
              <div ref={heroMapRef} className="hero-map-canvas" />
              <div className="hero-map-overlay"></div>
            </div>
            <div className="hero-pills-row">
              <div className="hero-float-pill hero-pill-static reveal-up delay-3">
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
                  <span className="pill-num">{liveStats.available || 0}</span>
                  <span className="pill-label">chỗ trống</span>
                </div>
              </div>
              <div className="hero-float-pill hero-pill-static reveal-up delay-4">
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
                  <span className="pill-num">{liveStats.occupied || 0}</span>
                  <span className="pill-label">xe đang đỗ</span>
                </div>
              </div>
            </div>
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
            Mọi thứ bạn cần để vận hành hiệu quả
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
                <h3>Quản lý chỗ đỗ realtime</h3>
                <p>
                  Theo dõi trạng thái từng vị trí đỗ xe theo thời gian thực với bản đồ trực quan.
                </p>
              </div>
              <div className="bento-img-box">
                <img
                  src="https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=480&q=80&auto=format"
                  alt="Bản đồ bãi đỗ xe"
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
              <h3>Nhận diện biển số AI</h3>
              <p>Tự động đọc biển số xe bằng AI, giảm thao tác thủ công.</p>
              <div className="bento-img-small">
                <img
                  src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=320&q=80&auto=format"
                  alt="Camera nhận diện biển số"
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
              <h3>Thanh toán online</h3>
              <p>VNPay, MoMo, ZaloPay tích hợp sẵn.</p>
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
              <h3>Báo cáo thông minh</h3>
              <p>Dashboard trực quan với biểu đồ doanh thu và hiệu suất.</p>
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
                <h3>Thông báo và cảnh báo</h3>
                <p>
                  Cảnh báo tức thì khi bãi sắp đầy, xe quá hạn, hoặc phát sinh sự cố.
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
          <h2 className="section-title reveal-up">Đơn giản chỉ với 3 bước</h2>
          <div className="steps-track reveal-up delay-1">
            <div className="step-card">
              <div className="step-num">01</div>
              <h3>Đăng ký tài khoản</h3>
              <p>Tạo tài khoản miễn phí trong 2 phút, không cần thẻ tín dụng.</p>
              <div className="step-img">
                <img
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80&auto=format"
                  alt="Đăng ký tài khoản"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="step-card">
              <div className="step-num">02</div>
              <h3>Cài đặt bãi đỗ xe</h3>
              <p>Nhập sơ đồ bãi, số tầng, số chỗ. Hệ thống tự tạo bản đồ.</p>
              <div className="step-img">
                <img
                  src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400&q=80&auto=format"
                  alt="Cài đặt bãi đỗ xe"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="step-card">
              <div className="step-num">03</div>
              <h3>Bắt đầu vận hành</h3>
              <p>Mọi thứ tự động. Xe vào, xe ra, thanh toán, báo cáo.</p>
              <div className="step-img">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80&auto=format"
                  alt="Dashboard vận hành"
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
              alt="Bãi đỗ xe hiện đại"
              loading="lazy"
              className="showcase-img"
            />
            <div className="showcase-overlay">
              <div className="showcase-stat">
                <span className="showcase-stat-num">500+</span>
                <span className="showcase-stat-label">
                  Bãi đỗ xe đang sử dụng ParkSmart trên toàn quốc
                </span>
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
          <h2>Sẵn sàng nâng cấp bãi đỗ xe của bạn?</h2>
          <p>Dùng thử miễn phí 14 ngày, không cần thẻ tín dụng.</p>
          <button className="btn btn-accent btn-lg" onClick={handleRegister}>
            Bắt đầu ngay
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
              <span className="nav-logo-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></span>
              <span className="nav-logo-text">ParkSmart</span>
            </a>
            <p>Giải pháp quản lý bãi đỗ xe thông minh hàng đầu Việt Nam.</p>
          </div>
          <div className="footer-col">
            <h4>Sản phẩm</h4>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate("/public-slots"); }}>Bản đồ slot</a>
          </div>
          <div className="footer-col">
            <h4>Tài khoản</h4>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate("/login"); }}>Đăng nhập</a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate("/register"); }}>Đăng ký</a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate("/forgot-password"); }}>Quên mật khẩu</a>
          </div>
          <div className="footer-col">
            <h4>Liên hệ</h4>
            <a href="#">parking@fpt.edu.vn</a>
            <a href="#">0900 000 010</a>
            <a href="#">FPT University HCM</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <p>2026 ParkSmart. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
