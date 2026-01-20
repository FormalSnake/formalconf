/**
 * Template Parser
 *
 * Parses template files and extracts variable references.
 * Template syntax: {{variable}} or {{variable.modifier}}
 */

import type { TemplateContext, DualModeTemplateContext } from "./types";
import type { ColorVariable } from "../theme-v2/color";
import { parseVariableReference, applyModifier } from "./modifiers";

/**
 * Regex to match template variables: {{variable}} or {{variable.modifier}}
 */
const VARIABLE_REGEX = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

/**
 * Color variable names in the context
 */
const COLOR_VARIABLES = [
  "color0",
  "color1",
  "color2",
  "color3",
  "color4",
  "color5",
  "color6",
  "color7",
  "color8",
  "color9",
  "color10",
  "color11",
  "color12",
  "color13",
  "color14",
  "color15",
  "background",
  "foreground",
  "cursor",
  "selection_background",
  "selection_foreground",
  "accent",
  "border",
] as const;

type ColorVariableName = (typeof COLOR_VARIABLES)[number];

function isColorVariable(name: string): name is ColorVariableName {
  return COLOR_VARIABLES.includes(name as ColorVariableName);
}

/**
 * Gets a value from the template context
 */
function getContextValue(
  context: TemplateContext,
  variableName: string,
  modifier?: string
): string | undefined {
  // Handle theme metadata access
  if (variableName.startsWith("theme.")) {
    const key = variableName.slice(6) as keyof TemplateContext["theme"];
    const value = context.theme[key];
    return value !== undefined ? String(value) : undefined;
  }

  // Handle GTK metadata access
  if (variableName.startsWith("gtk.")) {
    const key = variableName.slice(4) as keyof TemplateContext["gtk"];
    const value = context.gtk[key];
    return value !== undefined ? String(value) : undefined;
  }

  // Handle mode
  if (variableName === "mode") {
    return context.mode;
  }

  // Handle color variables
  if (isColorVariable(variableName)) {
    const color = context[variableName] as ColorVariable;
    return applyModifier(color, modifier);
  }

  return undefined;
}

/**
 * Renders a template string with the given context
 */
export function renderTemplate(
  template: string,
  context: TemplateContext
): string {
  return template.replace(VARIABLE_REGEX, (match, variable: string) => {
    const { name, modifier } = parseVariableReference(variable);
    const value = getContextValue(context, name, modifier);

    if (value === undefined) {
      // Return original if variable not found (preserve unknown variables)
      return match;
    }

    return value;
  });
}

/**
 * Renders a dual-mode template with both light and dark contexts
 * Used for apps like Ghostty that support theme = light:X,dark:Y
 */
export function renderDualModeTemplate(
  template: string,
  contexts: DualModeTemplateContext
): string {
  // First pass: render with dark context for {{dark.variable}}
  let result = template.replace(
    /\{\{dark\.([a-zA-Z0-9_.]+)\}\}/g,
    (match, variable: string) => {
      const { name, modifier } = parseVariableReference(variable);
      const value = getContextValue(contexts.dark, name, modifier);
      return value ?? match;
    }
  );

  // Second pass: render with light context for {{light.variable}}
  result = result.replace(
    /\{\{light\.([a-zA-Z0-9_.]+)\}\}/g,
    (match, variable: string) => {
      const { name, modifier } = parseVariableReference(variable);
      const value = getContextValue(contexts.light, name, modifier);
      return value ?? match;
    }
  );

  // Third pass: render theme metadata (shared)
  result = result.replace(
    /\{\{theme\.([a-zA-Z0-9_]+)\}\}/g,
    (match, key: string) => {
      const value = contexts.theme[key as keyof typeof contexts.theme];
      return value !== undefined ? String(value) : match;
    }
  );

  return result;
}

/**
 * Extracts all variable references from a template
 */
export function extractVariables(template: string): string[] {
  const variables = new Set<string>();
  let match: RegExpExecArray | null;

  const regex = new RegExp(VARIABLE_REGEX);
  while ((match = regex.exec(template)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * Validates that all required variables are present in context
 */
export function validateTemplate(
  template: string,
  context: TemplateContext
): { valid: boolean; missingVariables: string[] } {
  const variables = extractVariables(template);
  const missing: string[] = [];

  for (const variable of variables) {
    const { name, modifier } = parseVariableReference(variable);
    const value = getContextValue(context, name, modifier);

    if (value === undefined) {
      missing.push(variable);
    }
  }

  return {
    valid: missing.length === 0,
    missingVariables: missing,
  };
}
