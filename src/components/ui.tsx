import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../utils/cn";
import type { Roommate } from "../lib/types";
import { initials } from "../lib/engine";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-panel shadow-[0_1px_0_rgba(255,255,255,0.02)_inset]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Avatar({
  rm,
  size = "md",
  ring,
}: {
  rm?: Roommate;
  size?: "xs" | "sm" | "md" | "lg";
  ring?: boolean;
}) {
  const dims = {
    xs: "h-5 w-5 text-[10px]",
    sm: "h-6 w-6 text-[11px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  }[size];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        dims,
        rm?.color ?? "bg-zinc-600",
        ring && "ring-2 ring-line",
      )}
      title={rm?.name}
    >
      {rm ? initials(rm.name) : "?"}
    </span>
  );
}

export function Tag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-line bg-panel2 px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  className,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "solid" | "danger" | "soft";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const styles = {
    ghost:
      "border border-line bg-transparent text-muted hover:text-ink hover:bg-panel2",
    soft: "border border-line bg-panel2 text-ink hover:border-accent/60",
    solid: "border border-accent/40 bg-accent/15 text-accent hover:bg-accent/25",
    danger:
      "border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20",
  }[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40",
        styles,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="cm-in relative w-full max-w-md rounded-2xl border border-line bg-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-panel2 hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-accent/60";

/** Shown wherever there's no data yet, with a way to fix it. */
export function Empty({
  icon,
  title,
  body,
  action,
  onAction,
  hint,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-panel2/40 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-panel text-muted">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted">
        {body}
      </p>
      {action && onAction && (
        <Btn variant="solid" className="mt-4" onClick={onAction}>
          {action}
        </Btn>
      )}
      {hint && (
        <p className="mt-3 font-mono text-[10px] text-muted/70">{hint}</p>
      )}
    </div>
  );
}

export function SectionHead({
  icon,
  title,
  sub,
  right,
}: {
  icon?: ReactNode;
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          {icon}
          {title}
        </h2>
        {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
