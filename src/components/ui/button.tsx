import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background,color,box-shadow,transform] duration-200 select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset,0_8px_30px_-8px_rgba(124,92,255,0.7)] hover:from-violet-500 hover:to-violet-400 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset,0_10px_40px_-8px_rgba(124,92,255,0.9)] active:translate-y-px",
  secondary:
    "border border-silver-300/20 bg-white/[0.04] text-silver-100 hover:border-cyan-400/50 hover:bg-white/[0.07] hover:text-white",
  ghost: "text-silver-200 hover:text-white hover:bg-white/[0.05]",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[0.95rem]",
};

const disabledStyle =
  "cursor-not-allowed border border-silver-300/15 bg-white/[0.03] text-silver-400 shadow-none";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type LinkButtonProps = CommonProps & {
  href: string;
} & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className">;

/** A link styled as a button. Use for navigation. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

type ActionButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "disabled"> & {
    /**
     * When set, the button renders disabled and this text explains why,
     * both visibly (as a tooltip/description) and to assistive tech.
     */
    disabledReason?: string;
  };

/** A real <button>. Pass `disabledReason` instead of a fake handler. */
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  disabledReason,
  type = "button",
  ...rest
}: ActionButtonProps) {
  const isDisabled = Boolean(disabledReason);
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      title={disabledReason}
      className={cn(
        base,
        sizes[size],
        isDisabled ? disabledStyle : variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
