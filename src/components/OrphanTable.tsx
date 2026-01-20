import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { Panel } from "./layout/Panel";
import { colors } from "../lib/theme";
import type { OrphanedPackage, OrphanDetectionResult } from "../types/pkg-config";

interface OrphanTableProps {
  result: OrphanDetectionResult;
  onAction: (action: "add" | "uninstall", pkg: OrphanedPackage) => void;
  onDismiss: () => void;
}

export function OrphanTable({ result, onAction, onDismiss }: OrphanTableProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { orphans } = result;

  useInput((input, key) => {
    if (orphans.length > 0) {
      if (input === "j" || key.downArrow) {
        setSelectedIndex((i) => Math.min(i + 1, orphans.length - 1));
      }
      if (input === "k" || key.upArrow) {
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (input === "a") {
        onAction("add", orphans[selectedIndex]);
      }
      if (input === "x") {
        onAction("uninstall", orphans[selectedIndex]);
      }
    }
    if (key.escape || input === "h" || key.leftArrow) {
      onDismiss();
    }
  });

  const borderColor = orphans.length > 0 ? colors.warning : colors.success;

  return (
    <Panel title="Orphaned Packages" borderColor={borderColor}>
      <Box marginBottom={1}>
        <Text dimColor>
          Config: {result.configFormulas} formulas, {result.configCasks} casks |
          Installed: {result.installedLeaves} leaves, {result.installedCasks}{" "}
          casks
        </Text>
      </Box>

      {orphans.length === 0 ? (
        <Box flexDirection="column">
          <Text color={colors.success}>No orphaned packages found!</Text>
          <Text dimColor>All installed packages are in your config.</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text color={colors.warning}>
            Found {orphans.length} orphaned package
            {orphans.length !== 1 ? "s" : ""}:
          </Text>

          <Box marginTop={1} flexDirection="column">
            <Box>
              <Text bold>{"  "}Name</Text>
              <Text bold>{" ".repeat(28)}Type</Text>
            </Box>
            <Text color={colors.border}>{"─".repeat(50)}</Text>

            {orphans.map((pkg, i) => {
              const isSelected = i === selectedIndex;
              return (
                <Box key={`${pkg.type}-${pkg.name}`}>
                  <Text color={isSelected ? colors.primary : undefined}>
                    {isSelected ? "❯ " : "  "}
                    {(pkg.displayName || pkg.name).padEnd(30)}
                  </Text>
                  <Text
                    color={pkg.type === "formula" ? colors.info : colors.accent}
                  >
                    {pkg.type}
                  </Text>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      <Box marginTop={1}>
        {orphans.length > 0 ? (
          <Text dimColor>j/k navigate | a add to config | x uninstall | esc/h back | q quit</Text>
        ) : (
          <Text dimColor>esc/h back | q quit</Text>
        )}
      </Box>
    </Panel>
  );
}
