import React from "react";
import { Box, Text } from "ink";
import { colors } from "../../lib/theme";

interface StatusIndicatorProps {
  label: string;
  value: string | null;
  status?: "success" | "warning" | "error" | "neutral";
}

export function StatusIndicator({
  label,
  value,
  status = "neutral",
}: StatusIndicatorProps) {
  const statusColors = {
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    neutral: colors.textDim,
  };

  const icon = {
    success: "●",
    warning: "●",
    error: "●",
    neutral: "○",
  };

  return (
    <Box gap={1}>
      <Text dimColor>{label}:</Text>
      <Text color={statusColors[status]}>
        {icon[status]} {value || "None"}
      </Text>
    </Box>
  );
}
