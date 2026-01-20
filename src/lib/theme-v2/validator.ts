/**
 * Theme Schema Validator
 *
 * Validates JSON theme files against the ThemeJson schema.
 */

import type {
  ThemeJson,
  ThemeColorPalette,
  ThemeNeovimConfig,
} from "../../types/theme-schema";
import { isValidHex } from "./color";

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const REQUIRED_PALETTE_COLORS = [
  "color0",
  "color1",
  "color2",
  "color3",
  "color4",
  "color5",
  "color6",
  "color7",
  "color8",
  "color9",
  "color10",
  "color11",
  "color12",
  "color13",
  "color14",
  "color15",
  "background",
  "foreground",
  "cursor",
] as const;

const OPTIONAL_PALETTE_COLORS = [
  "selection_background",
  "selection_foreground",
  "accent",
  "border",
] as const;

function validateColor(value: unknown, path: string): ValidationError | null {
  if (typeof value !== "string") {
    return { path, message: "must be a string" };
  }
  if (!isValidHex(value)) {
    return { path, message: `invalid hex color: ${value}` };
  }
  return null;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function validateUrlArray(
  arr: unknown,
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(arr)) {
    errors.push({ path, message: "must be an array" });
    return errors;
  }

  if (arr.length === 0) {
    errors.push({ path, message: "must have at least one URL" });
    return errors;
  }

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (typeof item !== "string") {
      errors.push({ path: `${path}[${i}]`, message: "must be a string" });
    } else if (!isValidUrl(item)) {
      errors.push({ path: `${path}[${i}]`, message: "must be a valid http/https URL" });
    }
  }

  return errors;
}

function validateWallpapers(
  config: unknown,
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof config !== "object" || config === null) {
    errors.push({ path, message: "must be an object" });
    return errors;
  }

  const obj = config as Record<string, unknown>;

  // dark is required
  if (!("dark" in obj)) {
    errors.push({ path: `${path}.dark`, message: "is required" });
  } else {
    errors.push(...validateUrlArray(obj.dark, `${path}.dark`));
  }

  // light is optional
  if ("light" in obj) {
    errors.push(...validateUrlArray(obj.light, `${path}.light`));
  }

  return errors;
}

function validatePalette(
  palette: unknown,
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof palette !== "object" || palette === null) {
    errors.push({ path, message: "must be an object" });
    return errors;
  }

  const obj = palette as Record<string, unknown>;

  // Check required colors
  for (const color of REQUIRED_PALETTE_COLORS) {
    if (!(color in obj)) {
      errors.push({ path: `${path}.${color}`, message: "is required" });
    } else {
      const error = validateColor(obj[color], `${path}.${color}`);
      if (error) errors.push(error);
    }
  }

  // Validate optional colors if present
  for (const color of OPTIONAL_PALETTE_COLORS) {
    if (color in obj) {
      const error = validateColor(obj[color], `${path}.${color}`);
      if (error) errors.push(error);
    }
  }

  return errors;
}

function validateNeovimConfig(
  config: unknown,
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof config !== "object" || config === null) {
    errors.push({ path, message: "must be an object" });
    return errors;
  }

  const obj = config as Record<string, unknown>;

  if (!("repo" in obj) || typeof obj.repo !== "string") {
    errors.push({ path: `${path}.repo`, message: "is required and must be a string" });
  }

  if (!("colorscheme" in obj) || typeof obj.colorscheme !== "string") {
    errors.push({
      path: `${path}.colorscheme`,
      message: "is required and must be a string",
    });
  }

  if ("light_colorscheme" in obj && typeof obj.light_colorscheme !== "string") {
    errors.push({
      path: `${path}.light_colorscheme`,
      message: "must be a string",
    });
  }

  if ("opts" in obj && (typeof obj.opts !== "object" || obj.opts === null)) {
    errors.push({ path: `${path}.opts`, message: "must be an object" });
  }

  return errors;
}

function validateGtkConfig(
  config: unknown,
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof config !== "object" || config === null) {
    errors.push({ path, message: "must be an object" });
    return errors;
  }

  const obj = config as Record<string, unknown>;

  if ("variant" in obj && typeof obj.variant !== "string") {
    errors.push({ path: `${path}.variant`, message: "must be a string" });
  }

  if ("tweaks" in obj) {
    if (!Array.isArray(obj.tweaks)) {
      errors.push({ path: `${path}.tweaks`, message: "must be an array" });
    } else {
      for (let i = 0; i < obj.tweaks.length; i++) {
        if (typeof obj.tweaks[i] !== "string") {
          errors.push({
            path: `${path}.tweaks[${i}]`,
            message: "must be a string",
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validates a parsed JSON object against the ThemeJson schema
 */
export function validateThemeJson(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errors: [{ path: "", message: "theme must be an object" }],
    };
  }

  const obj = data as Record<string, unknown>;

  // Required: title
  if (!("title" in obj) || typeof obj.title !== "string") {
    errors.push({ path: "title", message: "is required and must be a string" });
  }

  // Optional string fields
  const optionalStrings = ["description", "author", "version", "source"];
  for (const field of optionalStrings) {
    if (field in obj && typeof obj[field] !== "string") {
      errors.push({ path: field, message: "must be a string" });
    }
  }

  // At least one palette required
  if (!("dark" in obj) && !("light" in obj)) {
    errors.push({
      path: "",
      message: "at least one of 'dark' or 'light' palette is required",
    });
  }

  // Validate palettes
  if ("dark" in obj) {
    errors.push(...validatePalette(obj.dark, "dark"));
  }
  if ("light" in obj) {
    errors.push(...validatePalette(obj.light, "light"));
  }

  // Validate neovim config
  if ("neovim" in obj) {
    errors.push(...validateNeovimConfig(obj.neovim, "neovim"));
  }

  // Validate gtk config
  if ("gtk" in obj) {
    errors.push(...validateGtkConfig(obj.gtk, "gtk"));
  }

  // Validate wallpapers config
  if ("wallpapers" in obj) {
    errors.push(...validateWallpapers(obj.wallpapers, "wallpapers"));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Type guard to check if data is a valid ThemeJson
 */
export function isValidThemeJson(data: unknown): data is ThemeJson {
  return validateThemeJson(data).valid;
}

/**
 * Formats validation errors as a human-readable string
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map((e) => (e.path ? `${e.path}: ${e.message}` : e.message))
    .join("\n");
}
