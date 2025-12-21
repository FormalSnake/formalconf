import React from "react";
import { Box, Text } from "ink";
import { useTerminalSize } from "../hooks/useTerminalSize";
import { useSystemStatus } from "../hooks/useSystemStatus";
import { StatusIndicator } from "./ui/StatusIndicator";
import { colors, borderStyles } from "../lib/theme";
import pkg from "../../package.json";

export function Header() {
  const { columns } = useTerminalSize();
  const { currentTheme, configsLinked, loading } = useSystemStatus();

  return (
    <Box
      flexDirection="column"
      width={columns - 2}
      borderStyle={borderStyles.header}
      borderColor={colors.primary}
      paddingX={2}
      marginBottom={1}
    >
      <Box justifyContent="space-between" width="100%">
        <Box>
          <Text bold color={colors.primary}>
            FormalConf
          </Text>
          <Text dimColor> - Dotfiles Manager</Text>
        </Box>
        <Text dimColor>v{pkg.version}</Text>
      </Box>

      {!loading && (
        <Box marginTop={1} gap={4}>
          <StatusIndicator
            label="Theme"
            value={currentTheme}
            status={currentTheme ? "success" : "neutral"}
          />
          <StatusIndicator
            label="Configs"
            value={configsLinked ? "Linked" : "Not linked"}
            status={configsLinked ? "success" : "warning"}
          />
        </Box>
      )}
    </Box>
  );
}
