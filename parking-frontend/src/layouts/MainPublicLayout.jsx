import { useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import "../assets/css/landing.css";

export default function MainPublicLayout() {
  const navigate = useNavigate();
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
    <div className="ps-landing" style={{ minHeight: "100dvh" }}>
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
