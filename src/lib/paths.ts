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

export async function ensureDir(path: string): Promise<void> {
  await runtimeEnsureDir(path);
}

export async function ensureConfigDir(): Promise<void> {
  await ensureDir(CONFIG_DIR);
  await ensureDir(CONFIGS_DIR);
  await ensureDir(THEMES_DIR);
  await ensureDir(THEME_TARGET_DIR);
  await ensureDir(BACKGROUNDS_TARGET_DIR);
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
