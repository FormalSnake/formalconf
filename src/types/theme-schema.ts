/**
 * JSON Theme Schema Types
 *
 * Defines the structure for JSON-based theme definitions with:
 * - 16 ANSI colors (color0-15)
 * - Special colors (background, foreground, cursor, etc.)
 * - Light and dark palettes
 * - Neovim plugin configuration
 * - GTK theme options (Phase 2)
 */

export interface ThemeColorPalette {
  // 16 ANSI colors (required)
  color0: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  color6: string;
  color7: string;
  color8: string;
  color9: string;
  color10: string;
  color11: string;
  color12: string;
  color13: string;
  color14: string;
  color15: string;
  // Special colors (required)
  background: string;
  foreground: string;
  cursor: string;
  // Optional special colors
  selection_background?: string;
  selection_foreground?: string;
  accent?: string;
  border?: string;
}

export interface ThemeNeovimConfig {
  /** Plugin repository, e.g., "catppuccin/nvim" */
  repo: string;
  /** Colorscheme name, e.g., "catppuccin" */
  colorscheme: string;
  /** Override colorscheme for light mode */
  light_colorscheme?: string;
  /** Plugin options passed to setup() */
  opts?: Record<string, unknown>;
}

export interface ThemeGtkConfig {
  /** Colloid variant (default, purple, pink, etc.) */
  variant?: string;
  /** Colloid tweaks (rimless, black, etc.) */
  tweaks?: string[];
}

export interface ThemeWallpapers {
  /** Dark mode wallpaper URLs (required if wallpapers defined) */
  dark: string[];
  /** Light mode wallpaper URLs (optional, falls back to dark) */
  light?: string[];
}

export interface ThemeJson {
  /** Display name of the theme */
  title: string;
  /** Description of the theme */
  description?: string;
  /** Theme author */
  author?: string;
  /** Theme version */
  version?: string;
  /** Source URL */
  source?: string;
  /** Dark mode color palette */
  dark?: ThemeColorPalette;
  /** Light mode color palette */
  light?: ThemeColorPalette;
  /** Neovim plugin configuration */
  neovim?: ThemeNeovimConfig;
  /** GTK theme configuration (Phase 2) */
  gtk?: ThemeGtkConfig;
  /** Wallpaper/background configuration */
  wallpapers?: ThemeWallpapers;
}

/** Mode identifier for theme variants */
export type ThemeMode = "dark" | "light";

/** Virtual theme entry shown in CLI/TUI for themes with both palettes */
export interface ThemeVariant {
  /** Original JSON theme */
  theme: ThemeJson;
  /** File path to the JSON theme */
  path: string;
  /** Display name with mode suffix, e.g., "catppuccin (dark)" */
  displayName: string;
  /** Selected mode */
  mode: ThemeMode;
  /** The active palette based on mode */
  palette: ThemeColorPalette;
}

/** Result of listing available JSON themes */
export interface ThemeListItem {
  /** Theme file name (without .json) */
  name: string;
  /** Full path to the JSON file */
  path: string;
  /** Parsed theme data */
  theme: ThemeJson;
  /** Available modes (depends on which palettes exist) */
  availableModes: ThemeMode[];
}
