import * as React from "react";

/**
 * Custom Fore Genomics line-art icon set.
 *
 * Hand-drawn on a 24x24 grid, single-color via `currentColor`, rounded caps —
 * matching the iconography on foregenomics.com (DNA magnifier, pill + bulb,
 * genetic counselor, etc.) instead of a generic icon library. Each icon
 * inherits its size and color from the parent, like any icon font.
 */
export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "stroke"> {
  size?: number;
  strokeWidth?: number;
}

function Icon({
  size = 24,
  strokeWidth = 1.6,
  children,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ---- Brand mark: DNA double helix ---- */
export const HelixMark = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3c0 4.2 8 5 8 9s-8 4.8-8 9" />
    <path d="M16 3c0 4.2-8 5-8 9s8 4.8 8 9" />
    <path d="M9.2 6h5.6M8.6 9.5h6.8M8.6 14.5h6.8M9.2 18h5.6" />
  </Icon>
);

/* ---- Pillar 1: Early detection (DNA under magnifier) ---- */
export const DnaSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10.5" cy="10.5" r="6.6" />
    <path d="M20.5 20.5 16 16" />
    <path d="M8.4 7.6c0 2.4 4.2 2.5 4.2 5.8M12.6 7.6c0 2.4-4.2 2.5-4.2 5.8" />
    <path d="M8.8 9.1h3.4M8.8 12.1h3.4" />
  </Icon>
);

/* ---- Pillar 2: Medication insights (bottle + spark) ---- */
export const PillInsight = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6" y="9.5" width="9" height="10.5" rx="2.2" />
    <path d="M6 9.5V8a1.6 1.6 0 0 1 1.6-1.6h5.8A1.6 1.6 0 0 1 15 8v1.5" />
    <path d="M10.5 13v4M8.5 15h4" />
    <path d="M18 3.5l.7 1.7 1.8.7-1.8.7-.7 1.7-.7-1.7-1.8-.7 1.8-.7z" />
  </Icon>
);

/* ---- Pillar 3: Genetic counselor (headset support) ---- */
export const Counselor = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="9.4" r="3.2" />
    <path d="M5.6 20.5a6.4 6.4 0 0 1 12.8 0" />
    <path d="M7 9.6a5 5 0 0 1 10 0" />
    <path d="M6.6 9.6v1.6M17.4 9.6v1.6" />
  </Icon>
);

/* ---- Trust / security ---- */
export const ShieldCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s7-3.5 7-9V5.8l-7-2.8-7 2.8V12c0 5.5 7 9 7 9z" />
    <path d="m9 11.6 2.1 2.1L15.2 9.6" />
  </Icon>
);

export const Mail = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.6" />
    <path d="m3.6 7.2 8.4 6 8.4-6" />
  </Icon>
);

export const Lock = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4.5" y="10.5" width="15" height="9.6" rx="2.6" />
    <path d="M8 10.5v-3a4 4 0 0 1 8 0v3" />
    <path d="M12 14.4v2.2" />
  </Icon>
);

export const Key = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="4.6" />
    <path d="m11.3 11.3 8.2 8.2M16.5 16.5l1.8-1.8M14.3 14.3l1.6-1.6" />
  </Icon>
);

export const Eye = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 12S6 5.6 12 5.6 21.5 12 21.5 12 18 18.4 12 18.4 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const EyeOff = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.6 6.8A9.3 9.3 0 0 1 12 6.6c6 0 9.5 5.4 9.5 5.4a16.4 16.4 0 0 1-3.1 3.5M6.3 7.9A16.2 16.2 0 0 0 2.5 12S6 17.4 12 17.4a9 9 0 0 0 4-.9" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m3 3 18 18" />
  </Icon>
);

export const ArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const ArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);

export const AlertCircle = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.8v5M12 16h.02" />
  </Icon>
);

export const CheckCircle = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 2.6 2.6L16 9.4" />
  </Icon>
);

export const Check = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12.5l4.5 4.5 10.5-10.5" />
  </Icon>
);

/** Spinner — pair with the `fg-spin` class for rotation. */
export const Spinner = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </Icon>
);

/** Google brand mark — multi-color; ignore stroke props. */
export const GoogleMark = ({ size = 18, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);
