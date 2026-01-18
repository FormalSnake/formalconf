export type OperatingSystem = "darwin" | "linux";

export type LinuxDistro =
  | "arch"
  | "debian"
  | "ubuntu"
  | "fedora"
  | "rhel"
  | "opensuse"
  | "unknown";

export type AurHelper = "yay" | "paru" | "trizen" | "none";

export type PackageManagerType =
  | "homebrew"
  | "mas"
  | "pacman"
  | "aur"
  | "apt"
  | "dnf"
  | "flatpak";

export interface PlatformInfo {
  os: OperatingSystem;
  distro: LinuxDistro | null;
  aurHelper: AurHelper | null;
  availableManagers: PackageManagerType[];
}
