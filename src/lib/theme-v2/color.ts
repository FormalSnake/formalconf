/**
 * Color Parsing Utilities
 *
 * Provides functions to parse hex colors and convert them to various formats:
 * - RGB components (0-255 and 0.0-1.0)
 * - CSS rgb() and rgba() strings
 * - Stripped hex (without #)
 */

export interface ColorComponents {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface ColorVariable {
  /** Original hex value with #, e.g., "#FF00FF" */
  hex: string;
  /** Hex without #, e.g., "FF00FF" */
  strip: string;
  /** CSS rgb() format, e.g., "rgb(255,0,255)" */
  rgb: string;
  /** CSS rgba() format, e.g., "rgba(255,0,255,1)" */
  rgba: string;
  /** Red component 0-255 */
  r: number;
  /** Green component 0-255 */
  g: number;
  /** Blue component 0-255 */
  b: number;
  /** Red component 0.0-1.0 */
  red: number;
  /** Green component 0.0-1.0 */
  green: number;
  /** Blue component 0.0-1.0 */
  blue: number;
}

/**
 * Validates a hex color string
 */
export function isValidHex(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

/**
 * Normalizes a hex color to 6-digit uppercase format with #
 */
export function normalizeHex(hex: string): string {
  if (!hex.startsWith("#")) {
    hex = `#${hex}`;
  }

  // Expand 3-digit hex to 6-digit
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    hex = `#${r}${r}${g}${g}${b}${b}`;
  }

  return hex.toUpperCase();
}

/**
 * Parses a hex color string to RGB components
 */
export function hexToRgb(hex: string): ColorComponents {
  const normalized = normalizeHex(hex);

  if (!isValidHex(normalized)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  return { r, g, b };
}

/**
 * Converts a hex color to a full ColorVariable object with all format variants
 */
export function hexToColorVariable(hex: string): ColorVariable {
  const normalized = normalizeHex(hex);
  const { r, g, b } = hexToRgb(normalized);

  return {
    hex: normalized,
    strip: normalized.slice(1),
    rgb: `rgb(${r},${g},${b})`,
    rgba: `rgba(${r},${g},${b},1)`,
    r,
    g,
    b,
    red: r / 255,
    green: g / 255,
    blue: b / 255,
  };
}

/**
 * Creates a ColorVariable with a fallback for missing values
 */
export function hexToColorVariableOrDefault(
  hex: string | undefined,
  fallback: string
): ColorVariable {
  return hexToColorVariable(hex ?? fallback);
}

/**
 * Gets a specific modifier value from a color
 */
export function getColorModifier(
  color: ColorVariable,
  modifier: string
): string | number {
  switch (modifier) {
    case "hex":
      return color.hex;
    case "strip":
      return color.strip;
    case "rgb":
      return color.rgb;
    case "rgba":
      return color.rgba;
    case "r":
      return color.r;
    case "g":
      return color.g;
    case "b":
      return color.b;
    case "red":
      return color.red;
    case "green":
      return color.green;
    case "blue":
      return color.blue;
    default:
      return color.hex;
  }
}
