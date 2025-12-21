import React from "react";
import { Box, Text, useInput } from "ink";
import { Layout } from "./layout/Layout";
import { Panel } from "./layout/Panel";
import { colors } from "../lib/theme";

interface PrerequisiteErrorProps {
  missing: { name: string; install: string }[];
  onExit: () => void;
}

export function PrerequisiteError({ missing, onExit }: PrerequisiteErrorProps) {
  useInput(() => onExit());

  return (
    <Layout breadcrumb={["Error"]}>
      <Panel title="Missing Prerequisites" borderColor={colors.error}>
        <Text color={colors.error}>Required tools are not installed:</Text>
        <Box flexDirection="column" marginTop={1}>
          {missing.map((dep) => (
            <Box key={dep.name}>
              <Text color={colors.warning}>• {dep.name}</Text>
              <Text dimColor> — Install: {dep.install}</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press any key to exit...</Text>
        </Box>
      </Panel>
    </Layout>
  );
}
