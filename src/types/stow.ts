export interface StowPackage {
  name: string;
  path: string;
  isStowed: boolean;
}

export type StowCommand = "stow" | "unstow" | "restow" | "adopt";

export interface StowResult {
  success: boolean;
  package: string;
  message: string;
}
