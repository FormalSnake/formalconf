import { hostname } from "os";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { THEME_CONFIG_PATH, ensureConfigDir } from "./paths";

export interface DeviceThemeMapping {
  theme: string;
  setAt: string;
}

export interface ThemeConfig {
  version: number;
  defaultTheme: string | null;
  devices: Record<string, DeviceThemeMapping>;
}

const DEFAULT_CONFIG: ThemeConfig = {
  version: 1,
  defaultTheme: null,
  devices: {},
};

export function getDeviceHostname(): string {
  return hostname();
}

export function loadThemeConfig(): ThemeConfig {
  if (!existsSync(THEME_CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG, devices: {} };
  }

  try {
    const content = readFileSync(THEME_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(content) as ThemeConfig;
    return {
      version: parsed.version ?? 1,
      defaultTheme: parsed.defaultTheme ?? null,
      devices: parsed.devices ?? {},
    };
  } catch {
    return { ...DEFAULT_CONFIG, devices: {} };
  }
}

export async function saveThemeConfig(config: ThemeConfig): Promise<void> {
  await ensureConfigDir();
  writeFileSync(THEME_CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}

export function getDeviceTheme(): string | null {
  const config = loadThemeConfig();
  const device = getDeviceHostname();
  const mapping = config.devices[device];

  if (mapping) {
    return mapping.theme;
  }

  return config.defaultTheme;
}

export async function setDeviceTheme(themeName: string): Promise<void> {
  const config = loadThemeConfig();
  const device = getDeviceHostname();

  config.devices[device] = {
    theme: themeName,
    setAt: new Date().toISOString(),
  };

  await saveThemeConfig(config);
}

export async function setDefaultTheme(themeName: string | null): Promise<void> {
  const config = loadThemeConfig();
  config.defaultTheme = themeName;
  await saveThemeConfig(config);
}

export async function clearDeviceTheme(): Promise<void> {
  const config = loadThemeConfig();
  const device = getDeviceHostname();

  delete config.devices[device];
  await saveThemeConfig(config);
}

export function listDeviceMappings(): { device: string; theme: string; setAt: string; isCurrent: boolean }[] {
  const config = loadThemeConfig();
  const currentDevice = getDeviceHostname();

  return Object.entries(config.devices).map(([device, mapping]) => ({
    device,
    theme: mapping.theme,
    setAt: mapping.setAt,
    isCurrent: device === currentDevice,
  }));
}

export function getDefaultTheme(): string | null {
  const config = loadThemeConfig();
  return config.defaultTheme;
}
