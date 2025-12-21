import { PKG_CONFIG_PATH, PKG_LOCK_PATH, ensureConfigDir } from "./paths";
import { readJson, writeFile } from "./runtime";
import type { PkgConfig, PkgLock } from "../types/pkg-config";
import { existsSync } from "fs";

const DEFAULT_CONFIG: PkgConfig = {
  config: {
    purge: false,
    purgeInteractive: true,
    autoUpdate: true,
  },
  taps: [],
  packages: [],
  casks: [],
  mas: {},
};

export async function loadPkgConfig(path?: string): Promise<PkgConfig> {
  await ensureConfigDir();
  const configPath = path || PKG_CONFIG_PATH;

  if (!existsSync(configPath)) {
    await savePkgConfig(DEFAULT_CONFIG, configPath);
    return DEFAULT_CONFIG;
  }

  return readJson<PkgConfig>(configPath);
}

export async function savePkgConfig(
  config: PkgConfig,
  path?: string
): Promise<void> {
  await ensureConfigDir();
  const configPath = path || PKG_CONFIG_PATH;
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function loadPkgLock(): Promise<PkgLock | null> {
  if (!existsSync(PKG_LOCK_PATH)) {
    return null;
  }
  return readJson<PkgLock>(PKG_LOCK_PATH);
}

export async function savePkgLock(lock: PkgLock): Promise<void> {
  await ensureConfigDir();
  await writeFile(PKG_LOCK_PATH, JSON.stringify(lock, null, 2));
}
