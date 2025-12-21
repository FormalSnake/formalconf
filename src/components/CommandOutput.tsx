import React from "react";
import { Box, Text, useInput } from "ink";

interface CommandOutputProps {
  output: string;
  success?: boolean;
  onDismiss: () => void;
}

export function CommandOutput({ output, success = true, onDismiss }: CommandOutputProps) {
  useInput(() => {
    onDismiss();
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      {output && (
        <Box flexDirection="column" marginBottom={1}>
          <Text>{output}</Text>
        </Box>
      )}
      <Text color={success ? "green" : "red"}>
        {success ? "✓ Done" : "✗ Failed"}
      </Text>
      <Text dimColor>Press any key to continue...</Text>
    </Box>
  );
}
