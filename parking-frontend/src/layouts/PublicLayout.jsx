import { useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { usePublicTheme } from "../utils/publicTheme";
import "../assets/css/landing.css";

export default function PublicLayout() {
  const navigate = useNavigate();
  const { dark, toggle, className: themeClass } = usePublicTheme();
  const navRef = useRef(null);

  useEffect(() => {
    const sentinel = document.createElement("div");
    sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none;";
    document.body.prepend(sentinel);
    const observer = new IntersectionObserver(([entry]) => {
      navRef.current?.classList.toggle("scrolled", !entry.isIntersecting);
    }, { threshold: 0 });
    observer.observe(sentinel);
    return () => { observer.disconnect(); sentinel.remove(); };
  }, []);

  return (
    <div className={`ps-landing ${themeClass}`} style={{ minHeight: "100dvh" }}>
      <nav className="nav" ref={navRef} style={{ position: "sticky", top: 0 }}>
        <div className="container nav-inner">
          <a href="/" className="nav-logo" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
            <span className="nav-logo-mark">P</span>
            <span className="nav-logo-text">ParkSmart</span>
          </a>
          <div className="nav-links">
            <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Trang chu</a>
            <a href="/parking-info" onClick={(e) => { e.preventDefault(); navigate("/parking-info"); }}>Bai do xe</a>
            <a href="/public-slots" onClick={(e) => { e.preventDefault(); navigate("/public-slots"); }}>Slot trong</a>
          </div>
          <div className="nav-actions">
            <button className="theme-toggle-btn" onClick={toggle} title={dark ? "Light mode" : "Dark mode"}>
              {dark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
            </button>
            <button className="btn btn-ghost" onClick={() => navigate("/login")}>Dang nhap</button>
            <button className="btn btn-accent" onClick={() => navigate("/register")}>Dang ky</button>
          </div>
        </div>
      </nav>
      <main style={{ paddingTop: 20 }}>
        <Outlet />
      </main>
    </div>
  );
}
