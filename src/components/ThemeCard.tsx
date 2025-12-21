import React from "react";
import { Box, Text } from "ink";
import { colors, borderStyles } from "../lib/theme";
import type { Theme } from "../types/theme";

interface ThemeCardProps {
  theme: Theme;
  isSelected: boolean;
  width: number;
}

export function ThemeCard({ theme, isSelected, width }: ThemeCardProps) {
  const borderColor = isSelected ? colors.accent : colors.border;
  const nameColor = isSelected ? colors.primary : colors.text;

  const indicators: string[] = [];
  if (theme.hasBackgrounds) indicators.push("bg");
  if (theme.isLightMode) indicators.push("light");

  const indicatorText = indicators.length > 0 ? ` [${indicators.join(" ")}]` : "";
  const innerWidth = width - 4; // account for border + padding

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
          {theme.name}
        </Text>
        <Text color={colors.primaryDim}>{indicatorText}</Text>
      </Box>

      {theme.metadata?.author && (
        <Text dimColor wrap="truncate">
          by {theme.metadata.author}
        </Text>
      )}
      {theme.metadata?.description && (
        <Text wrap="truncate" color={colors.text}>
          {theme.metadata.description.slice(0, innerWidth)}
        </Text>
      )}
    </Box>
  );
}
