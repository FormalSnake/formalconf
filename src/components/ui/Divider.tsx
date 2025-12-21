import React from "react";
import { Box, Text } from "ink";
import { useTerminalSize } from "../../hooks/useTerminalSize";
import { colors } from "../../lib/theme";

interface DividerProps {
  width?: number | "full";
  char?: string;
  color?: string;
}

export function Divider({
  width = "full",
  char = "─",
  color = colors.border,
}: DividerProps) {
  const { columns } = useTerminalSize();
  const actualWidth = width === "full" ? columns - 4 : width;

  return (
    <Box>
      <Text color={color}>{char.repeat(Math.max(0, actualWidth))}</Text>
    </Box>
  );
}
