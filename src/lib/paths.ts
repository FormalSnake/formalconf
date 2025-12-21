import { homedir } from "os";
import { join, dirname } from "path";

export const HOME_DIR = homedir();
export const CONFIG_DIR = join(HOME_DIR, ".config", "formalconf");
export const THEME_TARGET_DIR = join(CONFIG_DIR, "current", "theme");

const scriptPath = import.meta.dir;
export const SRC_DIR = scriptPath;
export const ROOT_DIR = join(scriptPath, "..", "..");
export const CONFIGS_DIR = join(ROOT_DIR, "configs");
export const THEMES_DIR = join(CONFIG_DIR, "themes");
export const PKG_CONFIG_PATH = join(CONFIG_DIR, "pkg-config.json");

export async function ensureDir(path: string): Promise<void> {
  await Bun.$`mkdir -p ${path}`.quiet();
}

export async function ensureConfigDir(): Promise<void> {
  await ensureDir(CONFIG_DIR);
  await ensureDir(THEMES_DIR);
  await ensureDir(THEME_TARGET_DIR);
}
