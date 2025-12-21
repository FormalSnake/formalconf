import React from "react";
import { Box, Text } from "ink";

export function Header() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="cyan">
        ╔══════════════════════════════════════╗
      </Text>
      <Text bold color="cyan">
        ║        FormalConf Manager            ║
      </Text>
      <Text bold color="cyan">
        ╚══════════════════════════════════════╝
      </Text>
    </Box>
  );
}
