/**
 * QT Theme Integration Types
 *
 * Types for integrating Kvantum QT theme engine with FormalConf's theme system.
 */

export interface QtInstallResult {
  /** Whether the installation succeeded */
  success: boolean;
  /** Name of the installed Kvantum theme */
  themeName: string;
  /** Error message if failed */
  error?: string;
  /** Whether QT theming was skipped (e.g., on macOS) */
  skipped?: boolean;
  /** Reason for skipping */
  skipReason?: string;
}

export interface QtDependencyCheck {
  /** Whether kvantummanager is available */
  kvantum: boolean;
  /** Whether qt5ct is available */
  qt5ct: boolean;
  /** Whether qt6ct is available */
  qt6ct: boolean;
  /** List of missing dependencies */
  missing: string[];
}

/**
 * Kvantum color palette structure for INI generation
 *
 * Maps FormalConf theme colors to Kvantum's color roles.
 */
export interface KvantumPalette {
  /** Window background color */
  window: string;
  /** Base/content area background color */
  base: string;
  /** Alternate base color (slightly different from base) */
  altBase: string;
  /** Button background color */
  button: string;
  /** Light color (for 3D effects) */
  light: string;
  /** Dark color (for 3D effects) */
  dark: string;
  /** Highlight/accent color */
  highlight: string;
  /** Text color */
  text: string;
  /** Window text color */
  windowText: string;
  /** Button text color */
  buttonText: string;
  /** Highlighted text color */
  highlightText: string;
  /** Link color */
  link: string;
  /** Visited link color */
  linkVisited: string;
}
