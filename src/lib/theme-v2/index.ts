/**
 * Theme V2 Module
 *
 * JSON-based theme system with:
 * - Light/dark palettes
 * - Template variable generation
 * - Schema validation
 */

export * from "./color";
export * from "./validator";
export * from "./loader";

export type {
  ThemeJson,
  ThemeColorPalette,
  ThemeNeovimConfig,
  ThemeGtkConfig,
  ThemeMode,
  ThemeVariant,
  ThemeListItem,
} from "../../types/theme-schema";
