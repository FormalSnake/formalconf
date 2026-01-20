/**
 * Template Engine
 *
 * Main engine for rendering templates with theme contexts.
 * Handles single-mode, dual-mode, and partial-mode templates.
 */

import { existsSync } from "fs";
import { join } from "path";
import { readText, writeFile } from "../runtime";
import { GENERATED_DIR, TEMPLATES_DIR, ensureDir } from "../paths";
import { hexToColorVariable, hexToColorVariableOrDefault } from "../theme-v2/color";
import type {
  ThemeJson,
  ThemeColorPalette,
  ThemeMode,
} from "../../types/theme-schema";
import type {
  TemplateContext,
  DualModeTemplateContext,
  TemplateThemeMetadata,
  TemplateFile,
  RenderResult,
} from "./types";
import { renderTemplate, renderDualModeTemplate } from "./parser";
import {
  listInstalledTemplates,
  getTemplateType,
} from "./versioning";
import {
  generateNeovimConfig,
  hasNeovimConfig,
} from "../neovim/generator";

/**
 * Builds theme metadata for template context
 */
function buildThemeMetadata(
  theme: ThemeJson,
  mode: ThemeMode
): TemplateThemeMetadata {
  return {
    title: theme.title,
    author: theme.author ?? "",
    version: theme.version ?? "",
    description: theme.description ?? "",
    source: theme.source ?? "",
    mode,
  };
}

/**
 * Builds a template context from a theme palette
 */
export function buildTemplateContext(
  theme: ThemeJson,
  palette: ThemeColorPalette,
  mode: ThemeMode
): TemplateContext {
  return {
    // 16 ANSI colors
    color0: hexToColorVariable(palette.color0),
    color1: hexToColorVariable(palette.color1),
    color2: hexToColorVariable(palette.color2),
    color3: hexToColorVariable(palette.color3),
    color4: hexToColorVariable(palette.color4),
    color5: hexToColorVariable(palette.color5),
    color6: hexToColorVariable(palette.color6),
    color7: hexToColorVariable(palette.color7),
    color8: hexToColorVariable(palette.color8),
    color9: hexToColorVariable(palette.color9),
    color10: hexToColorVariable(palette.color10),
    color11: hexToColorVariable(palette.color11),
    color12: hexToColorVariable(palette.color12),
    color13: hexToColorVariable(palette.color13),
    color14: hexToColorVariable(palette.color14),
    color15: hexToColorVariable(palette.color15),
    // Special colors
    background: hexToColorVariable(palette.background),
    foreground: hexToColorVariable(palette.foreground),
    cursor: hexToColorVariable(palette.cursor),
    selection_background: hexToColorVariableOrDefault(
      palette.selection_background,
      palette.color0
    ),
    selection_foreground: hexToColorVariableOrDefault(
      palette.selection_foreground,
      palette.foreground
    ),
    accent: hexToColorVariableOrDefault(palette.accent, palette.color4),
    border: hexToColorVariableOrDefault(palette.border, palette.color0),
    // Theme metadata
    theme: buildThemeMetadata(theme, mode),
    // Mode
    mode,
  };
}

/**
 * Builds dual-mode context for apps that support both light and dark
 */
export function buildDualModeContext(
  theme: ThemeJson
): DualModeTemplateContext | null {
  if (!theme.dark || !theme.light) {
    return null;
  }

  return {
    dark: buildTemplateContext(theme, theme.dark, "dark"),
    light: buildTemplateContext(theme, theme.light, "light"),
    theme: buildThemeMetadata(theme, "dark"), // Mode doesn't matter for shared metadata
  };
}

/**
 * Renders a single template file
 */
export async function renderTemplateFile(
  templateFile: TemplateFile,
  theme: ThemeJson,
  mode: ThemeMode
): Promise<RenderResult> {
  const templateContent = await readText(templateFile.path);
  let content: string;

  if (templateFile.type === "dual") {
    // Dual-mode template - needs both palettes
    const dualContext = buildDualModeContext(theme);
    if (!dualContext) {
      // Fall back: use available palette for both modes
      // This ensures {{dark.xxx}} and {{light.xxx}} variables are replaced
      const palette = theme[mode] ?? theme.dark ?? theme.light;
      if (!palette) {
        throw new Error(`Theme '${theme.title}' does not have any palette`);
      }
      const context = buildTemplateContext(theme, palette, mode);
      const fallbackDualContext: DualModeTemplateContext = {
        dark: context,
        light: context,
        theme: buildThemeMetadata(theme, mode),
      };
      content = renderDualModeTemplate(templateContent, fallbackDualContext);
    } else {
      content = renderDualModeTemplate(templateContent, dualContext);
    }
  } else {
    // Single-mode or partial-mode template
    const effectiveMode = templateFile.partialMode ?? mode;
    const palette = theme[effectiveMode];
    if (!palette) {
      throw new Error(`Theme '${theme.title}' does not have a ${effectiveMode} palette`);
    }
    const context = buildTemplateContext(theme, palette, effectiveMode);
    content = renderTemplate(templateContent, context);
  }

  return {
    template: templateFile,
    content,
    outputPath: join(GENERATED_DIR, templateFile.outputName),
  };
}

/**
 * Renders all installed templates for a theme
 */
export async function renderAllTemplates(
  theme: ThemeJson,
  mode: ThemeMode
): Promise<RenderResult[]> {
  const templates = await listInstalledTemplates();
  const results: RenderResult[] = [];

  for (const template of templates) {
    // Skip partial templates that don't match the selected mode
    // (they'll be rendered separately if needed)
    if (template.type === "partial" && template.partialMode !== mode) {
      // For partial templates, we still render both if the theme has both palettes
      if (theme[template.partialMode!]) {
        const result = await renderTemplateFile(template, theme, mode);
        results.push(result);
      }
      continue;
    }

    try {
      const result = await renderTemplateFile(template, theme, mode);
      results.push(result);
    } catch (err) {
      // Skip templates that can't be rendered (missing palette, etc.)
      console.error(`Warning: Could not render ${template.name}: ${err}`);
    }
  }

  return results;
}

/**
 * Writes rendered templates to the generated directory
 */
export async function writeRenderedTemplates(
  results: RenderResult[]
): Promise<void> {
  await ensureDir(GENERATED_DIR);

  for (const result of results) {
    await writeFile(result.outputPath, result.content);
  }
}

/**
 * Generates Neovim configuration if theme has neovim config
 */
export async function generateNeovimConfigFile(
  theme: ThemeJson,
  mode: ThemeMode
): Promise<RenderResult | null> {
  if (!hasNeovimConfig(theme)) {
    return null;
  }

  const content = generateNeovimConfig(theme, mode);
  const outputPath = join(GENERATED_DIR, "neovim.lua");

  await writeFile(outputPath, content);

  return {
    template: {
      name: "neovim.lua",
      path: "",
      outputName: "neovim.lua",
      type: "single",
    },
    content,
    outputPath,
  };
}

/**
 * Full pipeline: render all templates and write to generated directory
 */
export async function generateThemeConfigs(
  theme: ThemeJson,
  mode: ThemeMode
): Promise<RenderResult[]> {
  const results = await renderAllTemplates(theme, mode);
  await writeRenderedTemplates(results);

  // Generate Neovim config if available
  const neovimResult = await generateNeovimConfigFile(theme, mode);
  if (neovimResult) {
    results.push(neovimResult);
  }

  return results;
}

/**
 * Renders a template string directly (for testing/preview)
 */
export function renderTemplateString(
  template: string,
  theme: ThemeJson,
  mode: ThemeMode
): string {
  const palette = theme[mode];
  if (!palette) {
    throw new Error(`Theme '${theme.title}' does not have a ${mode} palette`);
  }
  const context = buildTemplateContext(theme, palette, mode);
  return renderTemplate(template, context);
}
