/**
 * Template Engine Module
 *
 * Provides template rendering for theme configuration files.
 * Supports:
 * - Single-mode templates (rendered with selected palette)
 * - Dual-mode templates (embed both light and dark)
 * - Partial-mode templates (separate files for each mode)
 * - Template versioning and update management
 */

// Types
export type {
  TemplateContext,
  DualModeTemplateContext,
  TemplateThemeMetadata,
  TemplateMetadata,
  TemplatesManifest,
  BundledTemplatesManifest,
  TemplateFile,
  RenderResult,
  TemplateUpdateInfo,
  TemplateType,
} from "./types";

// Parser
export {
  renderTemplate,
  renderDualModeTemplate,
  extractVariables,
  validateTemplate,
} from "./parser";

// Modifiers
export {
  applyModifier,
  parseVariableReference,
  isValidModifier,
  VALID_MODIFIERS,
} from "./modifiers";

// Versioning
export {
  loadTemplatesManifest,
  saveTemplatesManifest,
  loadBundledManifest,
  checkTemplateUpdates,
  installTemplate,
  installAllTemplates,
  lockTemplate,
  unlockTemplate,
  listInstalledTemplates,
  listBundledTemplates,
  getTemplateType,
  getPartialMode,
  getOutputFilename,
  compareVersions,
} from "./versioning";

// Engine
export {
  buildTemplateContext,
  buildDualModeContext,
  renderTemplateFile,
  renderAllTemplates,
  writeRenderedTemplates,
  generateThemeConfigs,
  renderTemplateString,
} from "./engine";
