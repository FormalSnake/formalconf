import { existsSync, readdirSync } from "fs";
import { join } from "path";
import type { Theme, ThemeMetadata, ThemeFile } from "../types/theme";

function parseYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");
  let currentSection: Record<string, unknown> | null = null;
  let currentKey = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indentLevel = line.search(/\S/);
    const match = trimmed.match(/^([\w-]+):\s*(.*)$/);

    if (match) {
      const [, key, value] = match;
      if (indentLevel === 0) {
        if (value) {
          result[key] = value.replace(/^["']|["']$/g, "");
        } else {
          currentKey = key;
          currentSection = {};
          result[key] = currentSection;
        }
      } else if (currentSection) {
        currentSection[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  }

  return result;
}

export async function parseThemeMetadata(
  themePath: string
): Promise<ThemeMetadata | undefined> {
  const yamlPath = join(themePath, "theme.yaml");

  if (!existsSync(yamlPath)) {
    return undefined;
  }

  try {
    const content = await Bun.file(yamlPath).text();
    const parsed = parseYaml(content);

    return {
      name: (parsed.name as string) || "",
      author: parsed.author as string | undefined,
      description: parsed.description as string | undefined,
      version: parsed.version as string | undefined,
      source: parsed.source as string | undefined,
      colors: parsed.colors as ThemeMetadata["colors"],
    };
  } catch {
    return undefined;
  }
}

export function parseThemeFiles(themePath: string): ThemeFile[] {
  const entries = readdirSync(themePath, { withFileTypes: true });

  return entries
    .filter(
      (e) =>
        e.isFile() &&
        !e.name.startsWith(".") &&
        e.name !== "theme.yaml" &&
        e.name !== "light.mode"
    )
    .map((e) => ({
      name: e.name,
      path: join(themePath, e.name),
      application: e.name.replace(/\.(conf|theme|lua|toml|css|json|ini)$/, ""),
    }));
}

export async function parseTheme(
  themePath: string,
  themeName: string
): Promise<Theme> {
  const files = parseThemeFiles(themePath);
  const metadata = await parseThemeMetadata(themePath);

  return {
    name: metadata?.name || themeName,
    path: themePath,
    files,
    metadata,
    hasBackgrounds: existsSync(join(themePath, "backgrounds")),
    hasPreview: existsSync(join(themePath, "preview.png")),
    isLightMode: existsSync(join(themePath, "light.mode")),
  };
}
