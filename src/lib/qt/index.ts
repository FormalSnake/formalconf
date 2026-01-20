/**
 * QT Theme Integration Module
 *
 * Provides integration with Kvantum QT theme engine for Linux systems.
 * On macOS, all operations are no-ops.
 */

export {
  applyQtTheme,
  checkQtDependencies,
  getQtSetupReminder,
  getAndMarkSetupReminder,
} from "./kvantum";
export { generateKvantumConfig, createKvantumPalette } from "./palette";
export type {
  QtInstallResult,
  QtDependencyCheck,
  KvantumPalette,
} from "./types";
