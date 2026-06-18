import { Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../utils/theme";
import BrandLogo from "./BrandLogo";

export default function MainPublicNavbar() {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();

  const goToSection = (sectionId) => {
    if (window.location.pathname === "/") {
      window.location.hash = sectionId;
      return;
    }

    window.location.assign(`/#${sectionId}`);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
        <button type="button" onClick={() => navigate("/")} className="flex shrink-0 items-center gap-2">
          <BrandLogo compact size="nav" titleClassName="font-bold" />
        </button>

        <div className="hidden flex-1 items-center gap-6 md:flex">
          <button type="button" onClick={() => goToSection("features")} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </button>
          <button type="button" onClick={() => goToSection("pricing")} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </button>
          <button type="button" onClick={() => navigate("/parking-info")} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Parking Info
          </button>
          <button type="button" onClick={() => navigate("/public-slots")} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Public Slots
          </button>
        </div>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-lg border border-border bg-background p-2 transition-colors hover:bg-muted"
            title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolvedTheme === "dark" ? (
              <Sun size={16} className="text-muted-foreground" />
            ) : (
              <Moon size={16} className="text-muted-foreground" />
            )}
          </button>
          <button type="button" onClick={() => navigate("/login")} className="px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            Sign in
          </button>
          <button type="button" onClick={() => navigate("/register")} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Register
          </button>
        </div>
      </div>
    </nav>
  );
}
