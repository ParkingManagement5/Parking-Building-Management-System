import { LayoutGrid } from "lucide-react";

export function BrandLogoIcon({ className = "", iconSize = 16 }) {
  return (
    <span
      className={`flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/15 ${className}`}
    >
      <LayoutGrid size={iconSize} strokeWidth={2.1} />
    </span>
  );
}

export default function BrandLogo({
  compact = false,
  size = "default",
  showSubtitle = true,
  titleClassName = "",
  subtitleClassName = "",
  iconClassName = "",
}) {
  const config =
    size === "hero"
      ? {
          wrap: "gap-3.5",
          icon: "size-11",
          iconSize: 19,
          title: "text-[2rem] leading-none",
          subtitle: "mt-1 text-[11px]",
        }
      : size === "nav"
        ? {
            wrap: "gap-2.5",
            icon: "size-8",
            iconSize: 15,
            title: "text-base",
            subtitle: "text-[10px]",
          }
        : size === "sidebar"
          ? {
              wrap: "gap-2",
              icon: "size-7",
              iconSize: 14,
              title: "text-sm",
              subtitle: "text-[10px]",
            }
          : {
              wrap: "gap-3",
              icon: "size-10",
              iconSize: 18,
              title: "text-3xl leading-none",
              subtitle: "mt-1 text-[11px]",
            };

  if (compact) {
    return (
      <div className={`flex items-center ${config.wrap}`}>
        <BrandLogoIcon className={`${config.icon} ${iconClassName}`} iconSize={config.iconSize} />
        <span className={`font-semibold tracking-[-0.02em] text-foreground ${config.title} ${titleClassName}`}>ParkSmart</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${config.wrap}`}>
      <BrandLogoIcon className={`${config.icon} ${iconClassName}`} iconSize={config.iconSize} />
      <div>
        <span className={`block font-bold tracking-[-0.04em] text-foreground ${config.title} ${titleClassName}`}>
          ParkSmart
        </span>
        {showSubtitle ? (
          <span className={`block font-semibold uppercase tracking-[0.18em] text-muted-foreground ${config.subtitle} ${subtitleClassName}`}>
            Parking Building Management System
          </span>
        ) : null}
      </div>
    </div>
  );
}
