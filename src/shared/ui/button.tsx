import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" };

export function Button({ className, variant = "secondary", size = "md", ...props }: Props) {
  return <button className={cn(
    "focus-ring inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
    variant === "primary" && "border-transparent bg-[var(--accent)] text-white hover:opacity-90",
    variant === "secondary" && "bg-[var(--panel)] text-[var(--text)] hover:bg-[var(--panel-2)]",
    variant === "ghost" && "border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]",
    variant === "danger" && "border-transparent bg-[var(--danger-soft)] text-[var(--danger)] hover:opacity-85",
    className,
  )} {...props} />;
}
