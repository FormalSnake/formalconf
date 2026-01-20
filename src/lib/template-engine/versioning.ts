/**
 * Template Versioning System
 *
 * Manages template versions, installation, and update checking.
 * Templates are installed to ~/.config/formalconf/templates/ with a manifest.
 */

import { existsSync, readdirSync } from "fs";
import { join, basename } from "path";
import { readText, writeFile } from "../runtime";
import {
  TEMPLATES_DIR,
  TEMPLATES_MANIFEST_PATH,
  BUNDLED_TEMPLATES_DIR,
  BUNDLED_MANIFEST_PATH,
  ensureDir,
} from "../paths";
import type {
  TemplatesManifest,
  BundledTemplatesManifest,
  TemplateMetadata,
  TemplateUpdateInfo,
  TemplateFile,
  TemplateType,
} from "./types";
import type { ThemeMode } from "../../types/theme-schema";

/**
 * Default empty manifest
 */
const DEFAULT_MANIFEST: TemplatesManifest = {
  version: 1,
  templates: {},
};

/**
 * Loads the user's installed templates manifest
 */
export async function loadTemplatesManifest(): Promise<TemplatesManifest> {
  if (!existsSync(TEMPLATES_MANIFEST_PATH)) {
    return { ...DEFAULT_MANIFEST };
  }

  try {
    const content = await readText(TEMPLATES_MANIFEST_PATH);
    return JSON.parse(content) as TemplatesManifest;
  } catch {
    return { ...DEFAULT_MANIFEST };
  }
}

/**
 * Saves the user's templates manifest
 */
export async function saveTemplatesManifest(
  manifest: TemplatesManifest
): Promise<void> {
  await ensureDir(TEMPLATES_DIR);
  await writeFile(TEMPLATES_MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

/**
 * Loads the bundled templates manifest
 */
export async function loadBundledManifest(): Promise<BundledTemplatesManifest> {
  if (!existsSync(BUNDLED_MANIFEST_PATH)) {
    return { version: 1, templates: {} };
  }

  try {
    const content = await readText(BUNDLED_MANIFEST_PATH);
    return JSON.parse(content) as BundledTemplatesManifest;
  } catch {
    return { version: 1, templates: {} };
  }
}

/**
 * Compares semver versions (simplified, assumes x.y.z format)
 */
export function compareVersions(a: string, b: string): number {
  const [aMajor = 0, aMinor = 0, aPatch = 0] = a.split(".").map(Number);
  const [bMajor = 0, bMinor = 0, bPatch = 0] = b.split(".").map(Number);

  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

/**
 * Checks for available template updates
 */
export async function checkTemplateUpdates(): Promise<TemplateUpdateInfo[]> {
  const installed = await loadTemplatesManifest();
  const bundled = await loadBundledManifest();
  const updates: TemplateUpdateInfo[] = [];

  for (const [name, bundledMeta] of Object.entries(bundled.templates)) {
    const installedMeta = installed.templates[name];

    if (!installedMeta) {
      // New template, not installed yet
      updates.push({
        name,
        installedVersion: "0.0.0",
        bundledVersion: bundledMeta.version,
        customOverride: false,
        updateAvailable: true,
      });
    } else if (compareVersions(bundledMeta.version, installedMeta.version) > 0) {
      // Newer version available
      updates.push({
        name,
        installedVersion: installedMeta.version,
        bundledVersion: bundledMeta.version,
        customOverride: installedMeta.customOverride,
        updateAvailable: !installedMeta.customOverride,
      });
    }
  }

  return updates;
}

/**
 * Installs a template from bundled to user directory
 */
export async function installTemplate(templateName: string): Promise<void> {
  const bundled = await loadBundledManifest();
  const bundledMeta = bundled.templates[templateName];

  if (!bundledMeta) {
    throw new Error(`Template '${templateName}' not found in bundled templates`);
  }

  const sourcePath = join(BUNDLED_TEMPLATES_DIR, templateName);
  if (!existsSync(sourcePath)) {
    throw new Error(`Template file not found: ${sourcePath}`);
  }

  await ensureDir(TEMPLATES_DIR);

  const content = await readText(sourcePath);
  const destPath = join(TEMPLATES_DIR, templateName);
  await writeFile(destPath, content);

  // Update manifest
  const manifest = await loadTemplatesManifest();
  manifest.templates[templateName] = {
    version: bundledMeta.version,
    installedAt: new Date().toISOString(),
    customOverride: false,
  };
  await saveTemplatesManifest(manifest);
}

/**
 * Installs all bundled templates
 */
export async function installAllTemplates(): Promise<void> {
  const bundled = await loadBundledManifest();

  for (const name of Object.keys(bundled.templates)) {
    await installTemplate(name);
  }
}

/**
 * Sets customOverride flag for a template (locks it from updates)
 */
export async function lockTemplate(templateName: string): Promise<void> {
  const manifest = await loadTemplatesManifest();

  if (!manifest.templates[templateName]) {
    throw new Error(`Template '${templateName}' is not installed`);
  }

  manifest.templates[templateName].customOverride = true;
  await saveTemplatesManifest(manifest);
}

/**
 * Removes customOverride flag for a template (allows updates)
 */
export async function unlockTemplate(templateName: string): Promise<void> {
  const manifest = await loadTemplatesManifest();

  if (!manifest.templates[templateName]) {
    throw new Error(`Template '${templateName}' is not installed`);
  }

  manifest.templates[templateName].customOverride = false;
  await saveTemplatesManifest(manifest);
}

/**
 * Determines template type from filename
 */
export function getTemplateType(filename: string): TemplateType {
  // Dual-mode templates contain both light and dark
  const dualModeTemplates = ["ghostty.conf.template", "neovim.lua.template", "lynk.css.template"];
  if (dualModeTemplates.includes(filename)) {
    return "dual";
  }

  // Partial-mode templates have -dark or -light suffix
  if (filename.includes("-dark.") || filename.includes("-light.")) {
    return "partial";
  }

  // Default to single-mode
  return "single";
}

/**
 * Extracts partial mode from filename
 */
export function getPartialMode(filename: string): ThemeMode | undefined {
  if (filename.includes("-dark.")) return "dark";
  if (filename.includes("-light.")) return "light";
  return undefined;
}

/**
 * Gets the output filename from a template filename
 */
export function getOutputFilename(templateName: string): string {
  // Remove .template extension
  let output = templateName.replace(/\.template$/, "");

  // Kitty: separate theme files for auto-switching
  if (templateName.startsWith("kitty-dark")) {
    return "dark-theme.auto.conf";
  }
  if (templateName.startsWith("kitty-light")) {
    return "light-theme.auto.conf";
  }

  // Waybar: separate style files for light/dark
  if (templateName.startsWith("waybar-dark")) {
    return "style-dark.css";
  }
  if (templateName.startsWith("waybar-light")) {
    return "style-light.css";
  }

  // Ghostty theme files: output as formalconf-dark/formalconf-light
  if (templateName === "ghostty-dark.theme.template") {
    return "formalconf-dark";
  }
  if (templateName === "ghostty-light.theme.template") {
    return "formalconf-light";
  }

  // Btop: separate theme files
  if (templateName.startsWith("btop-dark")) {
    return "formalconf-dark.theme";
  }
  if (templateName.startsWith("btop-light")) {
    return "formalconf-light.theme";
  }

  return output;
}

/**
 * Lists all installed template files
 */
export async function listInstalledTemplates(): Promise<TemplateFile[]> {
  if (!existsSync(TEMPLATES_DIR)) {
    return [];
  }

  const entries = readdirSync(TEMPLATES_DIR, { withFileTypes: true });
  const templates: TemplateFile[] = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".template")) {
      templates.push({
        name: entry.name,
        path: join(TEMPLATES_DIR, entry.name),
        outputName: getOutputFilename(entry.name),
        type: getTemplateType(entry.name),
        partialMode: getPartialMode(entry.name),
      });
    }
  }

  return templates;
}

/**
 * Lists all bundled template files
 */
export async function listBundledTemplates(): Promise<TemplateFile[]> {
  if (!existsSync(BUNDLED_TEMPLATES_DIR)) {
    return [];
  }

  const entries = readdirSync(BUNDLED_TEMPLATES_DIR, { withFileTypes: true });
  const templates: TemplateFile[] = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".template")) {
      templates.push({
        name: entry.name,
        path: join(BUNDLED_TEMPLATES_DIR, entry.name),
        outputName: getOutputFilename(entry.name),
        type: getTemplateType(entry.name),
        partialMode: getPartialMode(entry.name),
      });
    }
  }

  return templates;
}
