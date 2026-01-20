import type { PackageManagerType, AurHelper } from "./platform";

// ============================================================================
// V1 Config Types (legacy, for migration)
// ============================================================================

export interface PkgConfigSettingsV1 {
  purge: boolean;
  purgeInteractive: boolean;
  autoUpdate: boolean;
}

export interface PkgConfigV1 {
  config: PkgConfigSettingsV1;
  taps: string[];
  packages: string[];
  casks: string[];
  mas: Record<string, number>;
}

// ============================================================================
// V2 Config Types (cross-platform)
// ============================================================================

export interface PkgConfigSettingsV2 {
  purge: boolean;
  purgeInteractive: boolean;
  autoUpdate: boolean;
  preferredAurHelper?: AurHelper;
}

export interface GlobalPackages {
  packages: string[];
  cargo?: string[];
}

export interface MacOSPackages {
  taps?: string[];
  formulas?: string[];
  casks?: string[];
  mas?: Record<string, number>;
  cargo?: string[];
}

export interface LinuxPackages {
  packages?: string[];
  flatpak?: string[];
  cargo?: string[];
}

export interface ArchPackages {
  packages?: string[];
  aur?: string[];
}

export interface DebianPackages {
  packages?: string[];
  ppas?: string[];
}

export interface FedoraPackages {
  packages?: string[];
  copr?: string[];
}

export interface PkgConfigV2 {
  version: 2;
  config: PkgConfigSettingsV2;
  global: GlobalPackages;
  macos?: MacOSPackages;
  linux?: LinuxPackages;
  arch?: ArchPackages;
  debian?: DebianPackages;
  fedora?: FedoraPackages;
}

// Union type for both versions
export type PkgConfig = PkgConfigV1 | PkgConfigV2;

// Type guard to check if config is v2
export function isV2Config(config: PkgConfig): config is PkgConfigV2 {
  return "version" in config && config.version === 2;
}

// Legacy alias for backward compatibility
export type PkgConfigSettings = PkgConfigSettingsV1 | PkgConfigSettingsV2;

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

// ============================================================================
// V1 Lock Types (legacy)
// ============================================================================

export interface LockedFormula {
  version: string;
  tap: string;
  installedAt: string;
}

export interface LockedCask {
  version: string;
  installedAt: string;
}

export interface PkgLockV1 {
  version: 1;
  lastUpdated: string;
  formulas: Record<string, LockedFormula>;
  casks: Record<string, LockedCask>;
}

// ============================================================================
// V2 Lock Types (cross-platform)
// ============================================================================

export interface LockedPackageV2 {
  version: string;
  installedAt: string;
  manager: PackageManagerType | "homebrew-casks";
  // Manager-specific metadata
  tap?: string; // homebrew
  source?: string; // flatpak remote, AUR
}

export interface PkgLockV2 {
  version: 2;
  lastUpdated: string;
  packages: Record<string, LockedPackageV2>;
}

// Union type for both versions
export type PkgLock = PkgLockV1 | PkgLockV2;

// Type guard
export function isV2Lock(lock: PkgLock): lock is PkgLockV2 {
  return lock.version === 2;
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

export type OrphanPackageType = "formula" | "cask" | "pacman" | "aur" | "apt" | "dnf" | "flatpak";

export interface OrphanedPackage {
  name: string;
  type: OrphanPackageType;
  manager: PackageManagerType | "homebrew-casks";
}

export interface OrphanDetectionResult {
  orphans: OrphanedPackage[];
  configPackages: number;
  installedPackages: number;
  // Legacy fields for backwards compatibility
  configFormulas?: number;
  configCasks?: number;
  installedLeaves?: number;
  installedCasks?: number;
}
