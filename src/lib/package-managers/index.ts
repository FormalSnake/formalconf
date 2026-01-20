import type { PackageManagerType } from "../../types/platform";
import type { PackageManager } from "./types";
import { HomebrewFormulas, HomebrewCasks } from "./homebrew";
import { MacAppStore } from "./mas";
import { Pacman } from "./pacman";
import { AurPackageManager } from "./aur";
import { Apt } from "./apt";
import { Dnf } from "./dnf";
import { Flatpak } from "./flatpak";
import { Cargo } from "./cargo";
import { getPlatformInfo } from "../platform";

export type { PackageManager, PackageInfo, UpgradeInfo, PackageManagerCallbacks, LockedPackageInfo } from "./types";
export { HomebrewFormulas, HomebrewCasks } from "./homebrew";
export { MacAppStore } from "./mas";
export { Pacman } from "./pacman";
export { AurPackageManager } from "./aur";
export { Apt } from "./apt";
export { Dnf } from "./dnf";
export { Flatpak } from "./flatpak";
export { Cargo } from "./cargo";

// Extended type to differentiate homebrew sub-types
export type ExtendedPackageManagerType = PackageManagerType | "homebrew-casks";

const managerInstances: Map<ExtendedPackageManagerType, PackageManager> = new Map();

export function getPackageManager(type: ExtendedPackageManagerType): PackageManager {
  const existing = managerInstances.get(type);
  if (existing) return existing;

  let manager: PackageManager;

  switch (type) {
    case "homebrew":
      manager = new HomebrewFormulas();
      break;
    case "homebrew-casks":
      manager = new HomebrewCasks();
      break;
    case "mas":
      manager = new MacAppStore();
      break;
    case "pacman":
      manager = new Pacman();
      break;
    case "aur":
      manager = new AurPackageManager();
      break;
    case "apt":
      manager = new Apt();
      break;
    case "dnf":
      manager = new Dnf();
      break;
    case "flatpak":
      manager = new Flatpak();
      break;
    case "cargo":
      manager = new Cargo();
      break;
    default:
      throw new Error(`Unknown package manager type: ${type}`);
  }

  managerInstances.set(type, manager);
  return manager;
}

export async function getAvailableManagers(): Promise<PackageManager[]> {
  const platformInfo = await getPlatformInfo();
  const managers: PackageManager[] = [];

  for (const type of platformInfo.availableManagers) {
    const manager = getPackageManager(type);
    if (await manager.isAvailable()) {
      managers.push(manager);

      // Add casks as separate manager if homebrew is available
      if (type === "homebrew") {
        const casks = getPackageManager("homebrew-casks");
        if (await casks.isAvailable()) {
          managers.push(casks);
        }
      }
    }
  }

  return managers;
}

export function getManagerDisplayName(type: ExtendedPackageManagerType): string {
  switch (type) {
    case "homebrew":
      return "Homebrew Formulas";
    case "homebrew-casks":
      return "Homebrew Casks";
    case "mas":
      return "Mac App Store";
    case "pacman":
      return "Pacman";
    case "aur":
      return "AUR";
    case "apt":
      return "APT";
    case "dnf":
      return "DNF";
    case "flatpak":
      return "Flatpak";
    case "cargo":
      return "Cargo";
    default:
      return type;
  }
}

export function clearManagerCache(): void {
  managerInstances.clear();
}
