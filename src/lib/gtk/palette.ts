/**
 * GTK Palette Generation
 *
 * Generates SCSS color palette files for Colloid GTK theme
 * from FormalConf theme colors.
 */

import type { ThemeColorPalette, ThemeMode } from "../../types/theme-schema";
import type { ColloidPalette } from "./types";

/**
 * Parse hex color to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Interpolate between two colors
 */
function interpolateColor(
  color1: string,
  color2: string,
  factor: number
): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * factor,
    c1.g + (c2.g - c1.g) * factor,
    c1.b + (c2.b - c1.b) * factor
  );
}

/**
 * Generate a 19-step greyscale gradient from background to foreground
 *
 * Colloid uses grey-050 through grey-900 (19 steps total)
 * We interpolate from the theme's background to foreground color.
 */
export function interpolateGreyscale(bg: string, fg: string): string[] {
  const steps = 19;
  const colors: string[] = [];

  for (let i = 0; i < steps; i++) {
    const factor = i / (steps - 1);
    colors.push(interpolateColor(bg, fg, factor));
  }

  return colors;
}

/**
 * Lighten a color by a percentage
 */
function lighten(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor
  );
}

/**
 * Darken a color by a percentage
 */
function darken(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
}

/**
 * Create Colloid palette structure from FormalConf palette
 */
export function createColloidPalette(
  palette: ThemeColorPalette,
  mode: ThemeMode
): ColloidPalette {
  const isDark = mode === "dark";

  // Greyscale must always go from lightest (grey-050) to darkest (grey-950)
  // This matches Colloid's expected structure where SCSS picks appropriate
  // greys based on light/dark variant
  // In dark mode: foreground is light, background is dark
  // In light mode: background is light, foreground is dark
  const orderedGrey = isDark
    ? interpolateGreyscale(palette.foreground, palette.background)
    : interpolateGreyscale(palette.background, palette.foreground);

  // Get accent color (fallback to color4/blue if not defined)
  const accentBase = palette.accent || palette.color4;

  return {
    grey: orderedGrey,
    black: palette.color0,
    white: palette.color7,
    red: {
      dark: darken(palette.color1, 10),
      light: lighten(palette.color1, 10),
    },
    green: {
      dark: darken(palette.color2, 10),
      light: lighten(palette.color2, 10),
    },
    yellow: {
      dark: darken(palette.color3, 10),
      light: lighten(palette.color3, 10),
    },
    blue: {
      dark: darken(palette.color4, 10),
      light: lighten(palette.color4, 10),
    },
    purple: {
      dark: darken(palette.color5, 10),
      light: lighten(palette.color5, 10),
    },
    teal: {
      dark: darken(palette.color6, 10),
      light: lighten(palette.color6, 10),
    },
    accent: {
      dark: darken(accentBase, 10),
      light: lighten(accentBase, 10),
    },
  };
}

/**
 * Generate complete SCSS palette file content for Colloid
 *
 * This replaces Colloid's src/sass/_color-palette-default.scss
 */
export function generateColloidScss(
  palette: ThemeColorPalette,
  mode: ThemeMode
): string {
  const colloid = createColloidPalette(palette, mode);

  // Derive missing colors by interpolation
  const orange = interpolateColor(palette.color1, palette.color3, 0.5); // red + yellow
  const pink = interpolateColor(palette.color1, palette.color5, 0.4); // red + purple

  // Grey scale variable names in Colloid
  const greyNames = [
    "050",
    "100",
    "150",
    "200",
    "250",
    "300",
    "350",
    "400",
    "450",
    "500",
    "550",
    "600",
    "650",
    "700",
    "750",
    "800",
    "850",
    "900",
    "950",
  ];

  let scss = `// FormalConf Generated Color Palette
// Auto-generated - do not edit manually

// Red
$red-light: ${colloid.red.light};
$red-dark: ${colloid.red.dark};

// Pink
$pink-light: ${lighten(pink, 10)};
$pink-dark: ${darken(pink, 10)};

// Purple
$purple-light: ${colloid.purple.light};
$purple-dark: ${colloid.purple.dark};

// Blue
$blue-light: ${colloid.blue.light};
$blue-dark: ${colloid.blue.dark};

// Teal
$teal-light: ${colloid.teal.light};
$teal-dark: ${colloid.teal.dark};

// Green
$green-light: ${colloid.green.light};
$green-dark: ${colloid.green.dark};

// Yellow
$yellow-light: ${colloid.yellow.light};
$yellow-dark: ${colloid.yellow.dark};

// Orange
$orange-light: ${lighten(orange, 10)};
$orange-dark: ${darken(orange, 10)};

// Grey
`;

  // Generate greyscale variables
  for (let i = 0; i < greyNames.length; i++) {
    scss += `$grey-${greyNames[i]}: ${colloid.grey[i]};\n`;
  }

  scss += `
// White
$white: ${colloid.white};

// Black
$black: ${colloid.black};

// Button (window controls)
$button-close: ${palette.color1};
$button-max: ${palette.color2};
$button-min: ${palette.color3};

// Link
$links: ${palette.accent || palette.color4};

// Theme (accent color)
$default-light: ${colloid.accent.light};
$default-dark: ${colloid.accent.dark};
`;

  return scss;
}
