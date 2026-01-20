import React from "react";
import { Box, Text } from "ink";
import { colors, borderStyles } from "../lib/theme";
import type { Theme } from "../types/theme";
import type { UnifiedThemeEntry } from "../cli/set-theme";

interface ThemeCardProps {
  theme: Theme | UnifiedThemeEntry;
  isSelected: boolean;
  width: number;
  isDeviceTheme?: boolean;
}

function isLegacyTheme(theme: Theme | UnifiedThemeEntry): theme is Theme {
  return "files" in theme;
}

export function ThemeCard({ theme, isSelected, width, isDeviceTheme }: ThemeCardProps) {
  const borderColor = isSelected ? colors.accent : colors.border;
  const nameColor = isSelected ? colors.primary : colors.text;

  const indicators: string[] = [];
  if (isDeviceTheme) indicators.push("device");

  if (isLegacyTheme(theme)) {
    // Legacy theme indicators
    if (theme.hasBackgrounds) indicators.push("bg");
    if (theme.isLightMode) indicators.push("light");
  } else {
    // Unified theme entry indicators
    if (theme.type === "json") indicators.push("json");
    if (theme.hasBackgrounds) indicators.push("bg");
    if (theme.isLightMode) indicators.push("light");
  }

  const indicatorText = indicators.length > 0 ? ` [${indicators.join(" ")}]` : "";

  const displayName = isLegacyTheme(theme) ? theme.name : theme.displayName;
  const author = isLegacyTheme(theme) ? theme.metadata?.author : theme.author;
  const description = isLegacyTheme(theme) ? theme.metadata?.description : theme.description;

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle={borderStyles.panel}
      borderColor={borderColor}
      paddingX={1}
    >
      <Box>
        <Text color={isSelected ? colors.accent : colors.primaryDim}>
          {isSelected ? "● " : "  "}
        </Text>
        <Text color={nameColor} bold wrap="truncate">
          {displayName}
        </Text>
        <Text color={colors.primaryDim}>{indicatorText}</Text>
      </Box>
      {author && (
        <Box paddingLeft={2}>
          <Text color={colors.primaryDim} wrap="truncate">by {author}</Text>
        </Box>
      )}
      {description && (
        <Box paddingLeft={2}>
          <Text color={colors.primaryDim} dimColor wrap="truncate">{description}</Text>
        </Box>
      )}
    </Box>
  );
}
