import type { PackageManagerType } from "../../types/platform";

export interface PackageInfo {
  name: string;
  version: string;
  installedAt?: string;
}

export interface UpgradeInfo {
  name: string;
  currentVersion: string;
  newVersion: string;
}

export interface PackageManagerCallbacks {
  onLog?: (line: string) => void;
  onPrompt?: (question: string, options: string[]) => Promise<string>;
}

export interface PackageManager {
  type: PackageManagerType;
  displayName: string;

  /**
   * Check if this package manager is available on the system
   */
  isAvailable(): Promise<boolean>;

  /**
   * Update package manager indexes/caches
   */
  update(callbacks?: PackageManagerCallbacks): Promise<boolean>;

  /**
   * Install one or more packages
   */
  install(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean>;

  /**
   * Uninstall one or more packages
   */
  uninstall(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean>;

  /**
   * Upgrade specific packages or all packages if none specified
   */
  upgrade(packages?: string[], callbacks?: PackageManagerCallbacks): Promise<boolean>;

  /**
   * List all installed packages
   */
  listInstalled(): Promise<PackageInfo[]>;

  /**
   * List packages that have updates available
   */
  listOutdated(): Promise<UpgradeInfo[]>;

  /**
   * List user-installed packages (leaves, not dependencies)
   * Optional - not all package managers support this
   */
  listLeaves?(): Promise<string[]>;

  /**
   * Clean up caches, orphaned dependencies, etc.
   */
  cleanup(callbacks?: PackageManagerCallbacks): Promise<boolean>;

  /**
   * Add a package repository (tap, PPA, COPR, etc.)
   * Optional - not all package managers have this concept
   */
  addRepository?(repo: string, callbacks?: PackageManagerCallbacks): Promise<boolean>;

  /**
   * Check if specific packages are installed
   */
  isInstalled(packages: string[]): Promise<Map<string, boolean>>;
}

export interface LockedPackageInfo {
  version: string;
  installedAt: string;
  manager: PackageManagerType;
  // Manager-specific data
  tap?: string; // homebrew
  source?: string; // aur, flatpak remote
}
