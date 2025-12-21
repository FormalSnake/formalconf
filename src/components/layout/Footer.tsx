import React from "react";
import { Box, Text } from "ink";
import { useTerminalSize } from "../../hooks/useTerminalSize";
import { colors, borderStyles } from "../../lib/theme";

interface Shortcut {
  key: string;
  label: string;
}

interface FooterProps {
  shortcuts?: Shortcut[];
}

const defaultShortcuts: Shortcut[] = [
  { key: "↑↓", label: "Navigate" },
  { key: "Enter", label: "Select" },
  { key: "ESC", label: "Back" },
  { key: "q", label: "Quit" },
];

export function Footer({ shortcuts = defaultShortcuts }: FooterProps) {
  const { columns } = useTerminalSize();

  return (
    <Box
      width={columns - 2}
      borderStyle={borderStyles.footer}
      borderColor={colors.border}
      paddingX={2}
      marginTop={1}
      justifyContent="center"
      gap={2}
    >
      {shortcuts.map((shortcut, index) => (
        <Box key={index} gap={1}>
          <Text color={colors.primary} bold>
            {shortcut.key}
          </Text>
          <Text dimColor>{shortcut.label}</Text>
        </Box>
      ))}
    </Box>
  );
}
