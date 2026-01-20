import { PKG_CONFIG_PATH, getPkgLockPath, ensureConfigDir } from "./paths";
import { readJson, writeFile } from "./runtime";
import type {
  PkgConfig,
  PkgConfigV1,
  PkgConfigV2,
  PkgLock,
  isV2Config,
} from "../types/pkg-config";
import { existsSync } from "fs";

// ============================================================================
// Default Configs
// ============================================================================

const DEFAULT_CONFIG_V1: PkgConfigV1 = {
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

const DEFAULT_CONFIG_V2: PkgConfigV2 = {
  version: 2,
  config: {
    purge: false,
    purgeInteractive: true,
    autoUpdate: true,
  },
  global: {
    packages: [],
  },
  macos: {
    taps: [],
    formulas: [],
    casks: [],
    mas: {},
  },
};

// ============================================================================
// Migration Functions
// ============================================================================

export function migrateV1toV2(v1Config: PkgConfigV1): PkgConfigV2 {
  return {
    version: 2,
    config: {
      purge: v1Config.config.purge,
      purgeInteractive: v1Config.config.purgeInteractive,
      autoUpdate: v1Config.config.autoUpdate,
    },
    global: {
      packages: [], // No global packages in v1
    },
    macos: {
      taps: v1Config.taps,
      formulas: v1Config.packages,
      casks: v1Config.casks,
      mas: v1Config.mas,
    },
  };
}

function isV1Config(config: unknown): config is PkgConfigV1 {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, unknown>;
  return (
    !("version" in c) &&
    "config" in c &&
    "taps" in c &&
    "packages" in c &&
    "casks" in c
  );
}

function configIsV2(config: PkgConfig): config is PkgConfigV2 {
  return "version" in config && config.version === 2;
}

// ============================================================================
// Config Loading/Saving
// ============================================================================

export async function loadPkgConfig(path?: string): Promise<PkgConfigV2> {
  await ensureConfigDir();
  const configPath = path || PKG_CONFIG_PATH;

  if (!existsSync(configPath)) {
    await savePkgConfig(DEFAULT_CONFIG_V2, configPath);
    return DEFAULT_CONFIG_V2;
  }

  const rawConfig = await readJson<PkgConfig>(configPath);

  // Migrate v1 to v2 if needed
  if (isV1Config(rawConfig)) {
    const v2Config = migrateV1toV2(rawConfig);
    // Save migrated config back to disk
    await savePkgConfig(v2Config, configPath);
    return v2Config;
  }

  // Already v2
  if (configIsV2(rawConfig)) {
    return rawConfig;
  }

  // Unknown format, return default
  await savePkgConfig(DEFAULT_CONFIG_V2, configPath);
  return DEFAULT_CONFIG_V2;
}

export async function loadPkgConfigRaw(path?: string): Promise<PkgConfig> {
  await ensureConfigDir();
  const configPath = path || PKG_CONFIG_PATH;

  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG_V2;
  }

  return readJson<PkgConfig>(configPath);
}

export async function savePkgConfig(
  config: PkgConfigV2,
  path?: string
): Promise<void> {
  await ensureConfigDir();
  const configPath = path || PKG_CONFIG_PATH;
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

// Legacy function for backward compatibility
export async function savePkgConfigAny(
  config: PkgConfig,
  path?: string
): Promise<void> {
  await ensureConfigDir();
  const configPath = path || PKG_CONFIG_PATH;
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

// ============================================================================
// Lock File Loading/Saving
// ============================================================================

export async function loadPkgLock(): Promise<PkgLock | null> {
  const lockPath = getPkgLockPath();
  if (!existsSync(lockPath)) {
    return null;
  }
  return readJson<PkgLock>(lockPath);
}

export async function savePkgLock(lock: PkgLock): Promise<void> {
  await ensureConfigDir();
  const lockPath = getPkgLockPath();
  await writeFile(lockPath, JSON.stringify(lock, null, 2));
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getDefaultConfig(): PkgConfigV2 {
  return { ...DEFAULT_CONFIG_V2 };
}
