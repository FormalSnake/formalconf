export interface PkgConfigSettings {
  purge: boolean;
  purgeInteractive: boolean;
  autoUpdate: boolean;
}

export interface PkgConfig {
  config: PkgConfigSettings;
  taps: string[];
  packages: string[];
  casks: string[];
  mas: Record<string, number>;
}

export interface InstalledPackages {
  formulas: string[];
  casks: string[];
  masApps: MasApp[];
}

export interface MasApp {
  id: number;
  name: string;
}

export interface UpgradeablePackage {
  name: string;
  currentVersion?: string;
  newVersion?: string;
  type: "formula" | "cask" | "mas";
}

export interface LockedFormula {
  version: string;
  tap: string;
  installedAt: string;
}

export interface LockedCask {
  version: string;
  installedAt: string;
}

export interface PkgLock {
  version: number;
  lastUpdated: string;
  formulas: Record<string, LockedFormula>;
  casks: Record<string, LockedCask>;
}

export const SYSTEM_APP_IDS: readonly number[] = [
  409183694, // Keynote
  409203825, // Numbers
  409201541, // Pages
  408981434, // iMovie
  682658836, // GarageBand
  424389933, // Final Cut Pro
  424390742, // Compressor
  413897608, // Logic Pro
  1274495053, // TestFlight
  425424353, // The Unarchiver
  497799835, // Xcode
  634148309, // MainStage
  1480068668, // Messenger
  803453959, // Slack
  1295203466, // Microsoft Remote Desktop
  1444383602, // Apple Developer
  640199958, // Developer Documentation
  899247664, // TestFlight (duplicate ID check)
  1176895641, // Spark
  1451685025, // WireGuard
] as const;

export interface OrphanedPackage {
  name: string;
  type: "formula" | "cask";
}

export interface OrphanDetectionResult {
  orphans: OrphanedPackage[];
  configFormulas: number;
  configCasks: number;
  installedLeaves: number;
  installedCasks: number;
}
