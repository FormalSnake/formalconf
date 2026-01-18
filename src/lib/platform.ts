import { exec, commandExists } from "./runtime";
import type {
  OperatingSystem,
  LinuxDistro,
  AurHelper,
  PackageManagerType,
  PlatformInfo,
} from "../types/platform";

let cachedPlatformInfo: PlatformInfo | null = null;

export function getOS(): OperatingSystem {
  return process.platform === "darwin" ? "darwin" : "linux";
}

export async function getLinuxDistro(): Promise<LinuxDistro> {
  if (getOS() !== "linux") {
    return "unknown";
  }

  try {
    const result = await exec(["cat", "/etc/os-release"]);
    if (!result.success) {
      return "unknown";
    }

    const lines = result.stdout.split("\n");
    for (const line of lines) {
      if (line.startsWith("ID=")) {
        const id = line.slice(3).replace(/"/g, "").toLowerCase();
        switch (id) {
          case "arch":
          case "manjaro":
          case "endeavouros":
          case "artix":
            return "arch";
          case "debian":
            return "debian";
          case "ubuntu":
          case "linuxmint":
          case "pop":
          case "elementary":
            return "ubuntu";
          case "fedora":
            return "fedora";
          case "rhel":
          case "centos":
          case "rocky":
          case "almalinux":
            return "rhel";
          case "opensuse":
          case "opensuse-leap":
          case "opensuse-tumbleweed":
            return "opensuse";
          default:
            // Check ID_LIKE for derivatives
            const idLikeLine = lines.find((l) => l.startsWith("ID_LIKE="));
            if (idLikeLine) {
              const idLike = idLikeLine.slice(8).replace(/"/g, "").toLowerCase();
              if (idLike.includes("arch")) return "arch";
              if (idLike.includes("debian") || idLike.includes("ubuntu")) return "debian";
              if (idLike.includes("fedora") || idLike.includes("rhel")) return "fedora";
            }
            return "unknown";
        }
      }
    }
  } catch {
    return "unknown";
  }

  return "unknown";
}

export async function detectAurHelper(): Promise<AurHelper> {
  const helpers: AurHelper[] = ["yay", "paru", "trizen"];

  for (const helper of helpers) {
    if (await commandExists(helper)) {
      return helper;
    }
  }

  return "none";
}

export async function detectAvailablePackageManagers(): Promise<PackageManagerType[]> {
  const os = getOS();
  const managers: PackageManagerType[] = [];

  if (os === "darwin") {
    if (await commandExists("brew")) {
      managers.push("homebrew");
    }
    if (await commandExists("mas")) {
      managers.push("mas");
    }
  } else {
    // Linux
    if (await commandExists("pacman")) {
      managers.push("pacman");
      const aurHelper = await detectAurHelper();
      if (aurHelper !== "none") {
        managers.push("aur");
      }
    }
    if (await commandExists("apt")) {
      managers.push("apt");
    }
    if (await commandExists("dnf")) {
      managers.push("dnf");
    }
    if (await commandExists("flatpak")) {
      managers.push("flatpak");
    }
  }

  return managers;
}

export async function getPlatformInfo(): Promise<PlatformInfo> {
  if (cachedPlatformInfo) {
    return cachedPlatformInfo;
  }

  const os = getOS();
  const distro = os === "linux" ? await getLinuxDistro() : null;
  const aurHelper = distro === "arch" ? await detectAurHelper() : null;
  const availableManagers = await detectAvailablePackageManagers();

  cachedPlatformInfo = {
    os,
    distro,
    aurHelper,
    availableManagers,
  };

  return cachedPlatformInfo;
}

export function clearPlatformCache(): void {
  cachedPlatformInfo = null;
}

export function getPlatformDisplayName(info: PlatformInfo): string {
  if (info.os === "darwin") {
    return "macOS";
  }

  switch (info.distro) {
    case "arch":
      return "Arch Linux";
    case "debian":
      return "Debian";
    case "ubuntu":
      return "Ubuntu";
    case "fedora":
      return "Fedora";
    case "rhel":
      return "RHEL/CentOS";
    case "opensuse":
      return "openSUSE";
    default:
      return "Linux";
  }
}
