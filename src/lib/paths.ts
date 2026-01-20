import { homedir } from "os";
import { join } from "path";
import { readdir } from "fs/promises";
import { getScriptDir, ensureDir as runtimeEnsureDir } from "./runtime";

export const HOME_DIR = homedir();
export const CONFIG_DIR = join(HOME_DIR, ".config", "formalconf");
export const THEME_TARGET_DIR = join(CONFIG_DIR, "current", "theme");
export const BACKGROUNDS_TARGET_DIR = join(CONFIG_DIR, "current", "backgrounds");

const scriptPath = getScriptDir(import.meta);
export const SRC_DIR = scriptPath;
export const ROOT_DIR = join(scriptPath, "..", "..");
export const CONFIGS_DIR = join(CONFIG_DIR, "configs");
export const THEMES_DIR = join(CONFIG_DIR, "themes");
export const HOOKS_DIR = join(CONFIG_DIR, "hooks");
export const PKG_CONFIG_PATH = join(CONFIG_DIR, "pkg-config.json");
export const PKG_LOCK_PATH = join(CONFIG_DIR, "pkg-lock.json");
export const THEME_CONFIG_PATH = join(CONFIG_DIR, "theme-config.json");

// Theme V2: Template-based system
export const TEMPLATES_DIR = join(CONFIG_DIR, "templates");
export const TEMPLATES_MANIFEST_PATH = join(TEMPLATES_DIR, "templates.json");
export const GENERATED_DIR = join(CONFIG_DIR, "generated");
export const BUNDLED_TEMPLATES_DIR = join(ROOT_DIR, "templates");
export const BUNDLED_MANIFEST_PATH = join(BUNDLED_TEMPLATES_DIR, "templates.json");

// GTK Theme Support (Phase 2 - Linux only)
export const GTK_DIR = join(CONFIG_DIR, "gtk");
export const COLLOID_DIR = join(GTK_DIR, "colloid-gtk-theme");

export async function ensureDir(path: string): Promise<void> {
  await runtimeEnsureDir(path);
}

export async function ensureConfigDir(): Promise<void> {
  await ensureDir(CONFIG_DIR);
  await ensureDir(CONFIGS_DIR);
  await ensureDir(THEMES_DIR);
  await ensureDir(THEME_TARGET_DIR);
  await ensureDir(BACKGROUNDS_TARGET_DIR);
  await ensureDir(TEMPLATES_DIR);
  await ensureDir(GENERATED_DIR);
}

async function dirHasContents(path: string): Promise<boolean> {
  try {
    const entries = await readdir(path);
    return entries.length > 0;
  } catch {
    return false;
  }
}

export async function isFirstRun(): Promise<boolean> {
  const configsExist = await dirHasContents(CONFIGS_DIR);
  const themesExist = await dirHasContents(THEMES_DIR);
  return !configsExist && !themesExist;
}
