/**
 * Kvantum Palette Generation
 *
 * Generates Kvantum INI color configurations from FormalConf theme colors.
 */

import type { ThemeColorPalette, ThemeMode } from "../../types/theme-schema";
import type { KvantumPalette } from "./types";

/**
 * Interpolate between two colors by a factor
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
 * Darken a color by a percentage
 */
function darken(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
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
 * Create Kvantum palette from FormalConf theme palette
 *
 * Maps theme colors to appropriate Kvantum color roles:
 * - window/base: background color
 * - highlight: accent or color4 (blue)
 * - text colors: foreground
 * - link: color4 (blue)
 * - linkVisited: color5 (magenta)
 */
export function createKvantumPalette(
  palette: ThemeColorPalette,
  mode: ThemeMode
): KvantumPalette {
  const isDark = mode === "dark";
  const accent = palette.accent || palette.color4;

  // Create intermediate colors based on background/foreground
  const altBase = isDark
    ? lighten(palette.background, 8)
    : darken(palette.background, 5);

  const button = isDark
    ? lighten(palette.background, 15)
    : darken(palette.background, 10);

  // 3D effect colors
  const light = isDark
    ? lighten(palette.background, 25)
    : palette.foreground;

  const dark = isDark
    ? darken(palette.background, 15)
    : darken(palette.background, 20);

  // Highlight text should contrast with highlight color
  const highlightText = isDark ? palette.background : palette.foreground;

  return {
    window: palette.background,
    base: palette.background,
    altBase,
    button,
    light,
    dark,
    highlight: accent,
    text: palette.foreground,
    windowText: palette.foreground,
    buttonText: palette.foreground,
    highlightText,
    link: palette.color4,
    linkVisited: palette.color5,
  };
}

/**
 * Generate Kvantum INI configuration content
 *
 * Produces a complete .kvconfig file for the FormalConf theme.
 * Inherits widget styling from a base theme while applying custom colors.
 */
export function generateKvantumConfig(
  palette: ThemeColorPalette,
  mode: ThemeMode,
  baseTheme?: string
): string {
  const kv = createKvantumPalette(palette, mode);

  // Default base theme based on mode
  const inheritFrom = baseTheme || (mode === "dark" ? "KvGnomeDark" : "KvGnome");

  // Dimmed text color for inactive states
  const textDimmed = mode === "dark"
    ? `${kv.text}c8`  // 78% opacity
    : `${kv.text}b4`; // 70% opacity

  const textMoreDimmed = mode === "dark"
    ? `${kv.text}8c`  // 55% opacity
    : `${kv.text}78`; // 47% opacity

  return `[%General]
author=FormalConf
comment=Auto-generated theme from FormalConf
inherits=${inheritFrom}

[GeneralColors]
window.color=${kv.window}
inactive.window.color=${kv.window}
base.color=${kv.base}
inactive.base.color=${kv.base}
alt.base.color=${kv.altBase}
inactive.alt.base.color=${kv.altBase}
button.color=${kv.button}
light.color=${kv.light}
mid.light.color=${kv.light}
dark.color=${kv.dark}
mid.color=${kv.altBase}
highlight.color=${kv.highlight}
inactive.highlight.color=${kv.highlight}
text.color=${kv.text}
inactive.text.color=${textDimmed}
window.text.color=${kv.windowText}
inactive.window.text.color=${textMoreDimmed}
button.text.color=${kv.buttonText}
disabled.text.color=${textMoreDimmed}
tooltip.text.color=${kv.text}
highlight.text.color=${kv.highlightText}
link.color=${kv.link}
link.visited.color=${kv.linkVisited}
progress.indicator.text.color=${kv.highlightText}

[Hacks]
transparent_dolphin_view=false
blur_translucent=true
respect_darkness=true

[PanelButtonCommand]
text.normal.color=${kv.text}
text.normal.inactive.color=${textMoreDimmed}
text.focus.color=${kv.text}
text.press.color=${kv.text}
text.toggle.color=${kv.text}
text.toggle.inactive.color=${textMoreDimmed}

[Toolbar]
text.normal.color=${kv.text}
text.focus.color=${kv.text}

[MenuBar]
text.normal.color=${kv.text}

[MenuBarItem]
text.normal.color=${kv.text}
text.focus.color=${kv.highlight}

[MenuItem]
text.normal.color=${kv.text}
text.focus.color=${kv.text}

[ItemView]
text.normal.color=${kv.text}
text.normal.inactive.color=${textDimmed}
text.focus.color=${kv.text}
text.press.color=${kv.text}
text.toggle.color=${kv.text}
text.toggle.inactive.color=${textDimmed}

[Tab]
text.normal.color=${textMoreDimmed}
text.normal.inactive.color=${textMoreDimmed}
text.focus.color=${textDimmed}
text.toggle.color=${kv.text}

[ToolboxTab]
text.normal.color=${textDimmed}
text.normal.inactive.color=${textMoreDimmed}
text.press.color=${kv.text}
text.focus.color=${kv.text}

[HeaderSection]
text.normal.color=${textMoreDimmed}
text.normal.inactive.color=${textMoreDimmed}
text.focus.color=${textDimmed}
text.toggle.color=${kv.text}

[Progressbar]
text.normal.color=${textMoreDimmed}
text.normal.inactive.color=${textMoreDimmed}
text.focus.color=${kv.text}
text.press.color=${kv.text}
text.toggle.color=${kv.text}

[TitleBar]
text.normal.color=${textMoreDimmed}
text.focus.color=${kv.text}

[GroupBox]
text.normal.color=${kv.text}
text.press.color=${kv.text}
text.focus.color=${kv.text}

[Dock]
text.normal.color=${kv.text}

[DockTitle]
text.normal.color=${kv.text}
text.focus.color=${kv.text}

[RadioButton]
text.normal.color=${kv.text}
text.focus.color=${kv.text}

[CheckBox]
text.normal.color=${kv.text}
text.focus.color=${kv.text}

[LineEdit]
text.normal.color=${kv.text}

[IndicatorSpinBox]
text.normal.color=${kv.text}

[Menu]
text.normal.color=${kv.text}
`;
}
