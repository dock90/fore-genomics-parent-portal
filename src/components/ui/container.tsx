import type { ElementType, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type ContainerProps<T extends ElementType> = {
  /** Element to render as (e.g. "section", "footer"). Defaults to "div". */
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

/**
 * Centered, max-width page container with responsive gutters.
 * Styling lives in the `.site-container` class (globals.css) so the
 * width/padding rhythm is defined in exactly one place.
 */
export function Container<T extends ElementType = "div">({
  as,
  className,
  ...props
}: ContainerProps<T>) {
  const Component = (as ?? "div") as ElementType;
  return <Component className={cn("site-container", className)} {...props} />;
}

export default Container;
