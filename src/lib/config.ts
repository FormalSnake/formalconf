import { PKG_CONFIG_PATH, PKG_LOCK_PATH, ensureConfigDir } from "./paths";
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

  return Bun.file(configPath).json();
}

export async function savePkgConfig(
  config: PkgConfig,
  path?: string
): Promise<void> {
  await ensureConfigDir();
  const configPath = path || PKG_CONFIG_PATH;
  await Bun.write(configPath, JSON.stringify(config, null, 2));
}

export async function loadPkgLock(): Promise<PkgLock | null> {
  if (!existsSync(PKG_LOCK_PATH)) {
    return null;
  }
  return Bun.file(PKG_LOCK_PATH).json();
}

export async function savePkgLock(lock: PkgLock): Promise<void> {
  await ensureConfigDir();
  await Bun.write(PKG_LOCK_PATH, JSON.stringify(lock, null, 2));
}
