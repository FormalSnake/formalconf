import React from "react";
import { Box, Text, useInput } from "ink";
import { Panel } from "./layout/Panel";
import { colors } from "../lib/theme";

interface CommandOutputProps {
  title?: string;
  output: string;
  success?: boolean;
  onDismiss: () => void;
}

export function CommandOutput({
  title,
  output,
  success = true,
  onDismiss,
}: CommandOutputProps) {
  useInput(() => {
    onDismiss();
  });

  return (
    <Panel
      title={title}
      borderColor={success ? colors.success : colors.error}
    >
      {output && (
        <Box flexDirection="column" marginBottom={1}>
          <Text>{output}</Text>
        </Box>
      )}
      <Text color={success ? colors.success : colors.error}>
        {success ? "Done" : "Failed"}
      </Text>
      <Text dimColor>Press any key to continue...</Text>
    </Panel>
  );
}
