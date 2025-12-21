import { PKG_CONFIG_PATH, CONFIG_DIR } from "./paths";
import type { PkgConfig } from "../types/pkg-config";
import { existsSync } from "fs";
import { join } from "path";

export async function loadPkgConfig(path?: string): Promise<PkgConfig> {
  const configPath = path || PKG_CONFIG_PATH;

  if (!existsSync(configPath)) {
    const symlinkPath = join(CONFIG_DIR, "pkg-config.json");
    if (existsSync(symlinkPath)) {
      return Bun.file(symlinkPath).json();
    }
    throw new Error(`pkg-config.json not found at ${configPath}`);
  }

  return Bun.file(configPath).json();
}

export async function savePkgConfig(
  config: PkgConfig,
  path?: string
): Promise<void> {
  const configPath = path || PKG_CONFIG_PATH;
  await Bun.write(configPath, JSON.stringify(config, null, 2));
}
