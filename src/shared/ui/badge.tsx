import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "blue" | "good" | "warn" | "danger"; className?: string }) {
  return <span className={cn(
    "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold",
    tone === "neutral" && "bg-[var(--panel-2)] text-[var(--muted)]",
    tone === "blue" && "bg-[var(--accent-soft)] text-[var(--accent)]",
    tone === "good" && "bg-[var(--good-soft)] text-[var(--good)]",
    tone === "warn" && "bg-[var(--warn-soft)] text-[var(--warn)]",
    tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger)]",
    className,
  )}>{children}</span>;
}
