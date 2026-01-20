/**
 * GTK Theme Integration Module
 *
 * Provides integration with Colloid GTK theme for Linux systems.
 * On macOS, all operations are no-ops.
 */

export { applyGtkTheme, checkGtkDependencies, ensureColloidRepo } from "./colloid";
export { generateColloidScss, createColloidPalette } from "./palette";
export type {
  GtkInstallOptions,
  GtkInstallResult,
  GtkDependencyCheck,
  ColloidPalette,
} from "./types";
