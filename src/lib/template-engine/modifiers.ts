/**
 * Template Color Modifiers
 *
 * Handles extracting specific color format from ColorVariable based on modifier.
 * Modifiers: .strip, .rgb, .rgba, .decimal, .r, .g, .b, .red, .green, .blue
 */

import type { ColorVariable } from "../theme-v2/color";

/**
 * Valid modifier names for color variables
 */
export const VALID_MODIFIERS = [
  "hex",
  "strip",
  "rgb",
  "rgba",
  "decimal",
  "r",
  "g",
  "b",
  "red",
  "green",
  "blue",
] as const;

export type ColorModifier = (typeof VALID_MODIFIERS)[number];

/**
 * Checks if a string is a valid color modifier
 */
export function isValidModifier(modifier: string): modifier is ColorModifier {
  return VALID_MODIFIERS.includes(modifier as ColorModifier);
}

/**
 * Gets a color value with the specified modifier applied
 *
 * @param color - The color variable
 * @param modifier - The modifier to apply (or undefined for default hex)
 * @returns The formatted color value as a string
 */
export function applyModifier(
  color: ColorVariable,
  modifier?: string
): string {
  if (!modifier) {
    return color.hex;
  }

  switch (modifier) {
    case "hex":
      return color.hex;
    case "strip":
      return color.strip;
    case "rgb":
      return color.rgb;
    case "rgba":
      return color.rgba;
    case "decimal":
      return color.decimal;
    case "r":
      return String(color.r);
    case "g":
      return String(color.g);
    case "b":
      return String(color.b);
    case "red":
      return color.red.toFixed(6);
    case "green":
      return color.green.toFixed(6);
    case "blue":
      return color.blue.toFixed(6);
    default:
      // Unknown modifier, return hex as fallback
      return color.hex;
  }
}

/**
 * Parses a variable reference like "color0.strip" or "background"
 *
 * @param variable - The variable string from template
 * @returns Object with variable name and optional modifier
 */
export function parseVariableReference(variable: string): {
  name: string;
  modifier?: string;
} {
  const parts = variable.split(".");

  // Handle theme.xxx metadata access
  if (parts[0] === "theme" && parts.length === 2) {
    return { name: variable };
  }

  // Handle color.modifier pattern
  if (parts.length === 2 && isValidModifier(parts[1])) {
    return { name: parts[0], modifier: parts[1] };
  }

  // Just the variable name
  return { name: variable };
}
