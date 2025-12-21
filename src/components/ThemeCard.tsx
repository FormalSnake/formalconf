import React from "react";
import { Box, Text } from "ink";
import { colors, borderStyles } from "../lib/theme";
import type { Theme } from "../types/theme";

interface ThemeCardProps {
  theme: Theme;
  isSelected: boolean;
  width?: number;
}

export function ThemeCard({ theme, isSelected, width = 24 }: ThemeCardProps) {
  const borderColor = isSelected ? colors.accent : colors.border;
  const nameColor = isSelected ? colors.primary : colors.text;

  const indicators: string[] = [];
  if (theme.hasBackgrounds) indicators.push("Wallpapers");
  if (theme.isLightMode) indicators.push("Light");

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle={borderStyles.panel}
      borderColor={borderColor}
      paddingX={1}
    >
      <Box>
        {isSelected && (
          <Text color={colors.accent} bold>
            {"● "}
          </Text>
        )}
        <Text color={nameColor} bold wrap="truncate">
          {theme.name}
        </Text>
      </Box>

      {theme.metadata?.author && (
        <Text dimColor wrap="truncate">
          by {theme.metadata.author}
        </Text>
      )}

      {indicators.length > 0 && (
        <Text color={colors.primaryDim}>{indicators.join("  ")}</Text>
      )}
    </Box>
  );
}
