/**
 * Template Engine Types
 *
 * Defines the context structure for template rendering and template metadata.
 */

import type { ColorVariable } from "../theme-v2/color";
import type { ThemeMode, ThemeJson } from "../../types/theme-schema";

/**
 * Theme metadata accessible in templates via {{theme.xxx}}
 */
export interface TemplateThemeMetadata {
  title: string;
  author: string;
  version: string;
  description: string;
  source: string;
  mode: ThemeMode;
}

/**
 * GTK theme metadata accessible in templates via {{gtk.xxx}}
 */
export interface TemplateGtkMetadata {
  /** GTK theme name, e.g., "formalconf-catppuccin-Dark" */
  theme: string;
}

/**
 * Full template context with all color variables and metadata
 */
export interface TemplateContext {
  // 16 ANSI colors
  color0: ColorVariable;
  color1: ColorVariable;
  color2: ColorVariable;
  color3: ColorVariable;
  color4: ColorVariable;
  color5: ColorVariable;
  color6: ColorVariable;
  color7: ColorVariable;
  color8: ColorVariable;
  color9: ColorVariable;
  color10: ColorVariable;
  color11: ColorVariable;
  color12: ColorVariable;
  color13: ColorVariable;
  color14: ColorVariable;
  color15: ColorVariable;
  // Special colors
  background: ColorVariable;
  foreground: ColorVariable;
  cursor: ColorVariable;
  selection_background: ColorVariable;
  selection_foreground: ColorVariable;
  accent: ColorVariable;
  border: ColorVariable;
  // Theme metadata
  theme: TemplateThemeMetadata;
  // GTK theme metadata (Linux)
  gtk: TemplateGtkMetadata;
  // Current mode
  mode: ThemeMode;
}

/**
 * Dual-mode template context for apps that support both light and dark
 */
export interface DualModeTemplateContext {
  dark: TemplateContext;
  light: TemplateContext;
  theme: TemplateThemeMetadata;
}

/**
 * Template mode type indicator
 */
export type TemplateType = "single" | "dual" | "partial";

/**
 * Template metadata stored in the manifest
 */
export interface TemplateMetadata {
  /** Template version for update tracking */
  version: string;
  /** When the template was installed */
  installedAt: string;
  /** If true, user has customized - skip update prompts */
  customOverride: boolean;
}

/**
 * User's installed templates manifest
 */
export interface TemplatesManifest {
  /** Manifest schema version */
  version: number;
  /** Map of template filename to metadata */
  templates: Record<string, TemplateMetadata>;
}

/**
 * Bundled template metadata (single source of truth for template behavior)
 */
export interface BundledTemplateMetadata {
  /** Template version for update tracking */
  version: string;
  /** Custom output filename (default: strip .template extension) */
  output?: string;
  /** Additional copy destinations (supports ~ expansion) */
  targets?: string[];
  /** Override auto-detection of template mode */
  mode?: TemplateType;
}

/**
 * Bundled templates manifest (simpler, no customOverride)
 */
export interface BundledTemplatesManifest {
  /** Manifest schema version */
  version: number;
  /** Map of template filename to metadata */
  templates: Record<string, BundledTemplateMetadata>;
}

/**
 * Template file info for rendering
 */
export interface TemplateFile {
  /** Template filename, e.g., "alacritty.toml.template" */
  name: string;
  /** Full path to template file */
  path: string;
  /** Output filename after rendering, e.g., "alacritty.toml" */
  outputName: string;
  /** Template type (single, dual, partial) */
  type: TemplateType;
  /** Mode for partial templates (dark or light suffix) */
  partialMode?: ThemeMode;
  /** Additional copy destinations (supports ~ expansion) */
  targets?: string[];
}

/**
 * Result of template rendering
 */
export interface RenderResult {
  /** Template that was rendered */
  template: TemplateFile;
  /** Rendered content */
  content: string;
  /** Output file path */
  outputPath: string;
}

/**
 * Template update check result
 */
export interface TemplateUpdateInfo {
  /** Template filename */
  name: string;
  /** Currently installed version */
  installedVersion: string;
  /** Available bundled version */
  bundledVersion: string;
  /** Whether user has locked this template */
  customOverride: boolean;
  /** Whether an update is available */
  updateAvailable: boolean;
}
