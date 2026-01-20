import React from "react";
import { Box, Text } from "ink";
import { colors, borderStyles } from "../lib/theme";
import type { Theme } from "../types/theme";

interface ThemeCardProps {
  theme: Theme;
  isSelected: boolean;
  width: number;
  isDeviceTheme?: boolean;
}

export function ThemeCard({ theme, isSelected, width, isDeviceTheme }: ThemeCardProps) {
  const borderColor = isSelected ? colors.accent : colors.border;
  const nameColor = isSelected ? colors.primary : colors.text;

  const indicators: string[] = [];
  if (isDeviceTheme) indicators.push("device");
  if (theme.hasBackgrounds) indicators.push("bg");
  if (theme.isLightMode) indicators.push("light");

  const indicatorText = indicators.length > 0 ? ` [${indicators.join(" ")}]` : "";

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
    </Box>
  );
}
