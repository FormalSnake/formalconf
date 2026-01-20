/**
 * GTK Theme Integration Types
 *
 * Types for integrating Colloid GTK theme with FormalConf's theme engine.
 */

import type { ThemeMode } from "../../types/theme-schema";

export interface GtkInstallOptions {
  /** Theme name from FormalConf (used for naming the GTK theme) */
  themeName: string;
  /** Light or dark mode */
  mode: ThemeMode;
  /** Colloid variant (default, purple, pink, etc.) - from theme's gtk.variant */
  variant?: string;
  /** Colloid tweaks array (default: ['normal']) - from theme's gtk.tweaks */
  tweaks?: string[];
  /** Install libadwaita theme (default: true) */
  installLibadwaita?: boolean;
}

export interface GtkInstallResult {
  /** Whether the installation succeeded */
  success: boolean;
  /** Name of the installed GTK theme */
  themeName: string;
  /** Error message if failed */
  error?: string;
  /** Whether GTK theming was skipped (e.g., on macOS) */
  skipped?: boolean;
  /** Reason for skipping */
  skipReason?: string;
}

export interface GtkDependencyCheck {
  /** Whether git is available */
  git: boolean;
  /** Whether sassc is available */
  sassc: boolean;
  /** List of missing dependencies */
  missing: string[];
}

/**
 * Colloid color palette structure for SCSS generation
 *
 * The palette generates a complete SCSS file that overrides Colloid's
 * default colors with FormalConf theme colors.
 */
export interface ColloidPalette {
  /** 19-step greyscale from background to foreground */
  grey: string[];
  /** Black color (color0) */
  black: string;
  /** White color (color7) */
  white: string;
  /** Red color variants (from color1) */
  red: { dark: string; light: string };
  /** Green color variants (from color2) */
  green: { dark: string; light: string };
  /** Yellow color variants (from color3) */
  yellow: { dark: string; light: string };
  /** Blue color variants (from color4) */
  blue: { dark: string; light: string };
  /** Purple/magenta color variants (from color5) */
  purple: { dark: string; light: string };
  /** Cyan/teal color variants (from color6) */
  teal: { dark: string; light: string };
  /** Accent color for buttons, links, highlights */
  accent: { dark: string; light: string };
}
