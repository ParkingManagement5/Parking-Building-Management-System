import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PublicBackLink({
  to = "/",
  label = "Về trang chủ",
  className = "",
}) {
  return (
    <Link
      to={to}
      className={`inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted ${className}`}
    >
      <ArrowLeft size={15} />
      {label}
    </Link>
  );
}
