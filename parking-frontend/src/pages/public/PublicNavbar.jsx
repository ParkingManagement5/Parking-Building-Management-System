import { RefreshCw } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import BrandLogo from "../../ui/components/BrandLogo";

function navLinkClasses({ isActive }) {
  return `rounded-xl px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  }`;
}

export default function PublicNavbar() {
  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogo compact size="nav" titleClassName="font-bold" />
        </Link>

        <div className="hidden h-5 w-px bg-border md:block" />

        <div className="hidden items-center gap-2 md:flex">
          <NavLink to="/public-slots" className={navLinkClasses}>
            Public Slots
          </NavLink>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 sm:flex">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ml-1 rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Reload page"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <Link
            to="/login"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Sign In
          </Link>
        </div>
      </div>

      <div className="border-t border-border px-4 py-2 md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-2">
          <NavLink to="/public-slots" className={navLinkClasses}>
            Public Slots
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
