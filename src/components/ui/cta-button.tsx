import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight } from "@/components/auth/icons";

type CtaVariant = "solid" | "compact" | "ghost";

const VARIANT_CLASS: Record<CtaVariant, string> = {
  solid: "cta--solid",
  compact: "cta--compact",
  ghost: "cta--ghost",
};

const ARROW_SIZE: Record<CtaVariant, number> = {
  solid: 20,
  compact: 18,
  ghost: 18,
};

export interface CtaButtonProps {
  href: string;
  label: string;
  variant?: CtaVariant;
  /** Show the trailing arrow. Defaults to true for solid/compact, false for ghost. */
  showArrow?: boolean;
  className?: string;
}

/**
 * The brand gradient pill, shared by the hero, the marketing sections and the
 * header so the CTA treatment is defined once. Visuals live in the `.cta*`
 * classes (globals.css).
 */
export function CtaButton({
  href,
  label,
  variant = "solid",
  showArrow = variant !== "ghost",
  className,
}: CtaButtonProps) {
  return (
    <Link href={href} className={cn("cta", VARIANT_CLASS[variant], className)}>
      {label}
      {showArrow && <ArrowRight size={ARROW_SIZE[variant]} />}
    </Link>
  );
}

export default CtaButton;
