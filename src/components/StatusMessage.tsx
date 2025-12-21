import React from "react";
import { Text } from "ink";

interface StatusMessageProps {
  type: "success" | "error" | "warning" | "info";
  children: React.ReactNode;
}

const colors = {
  success: "green",
  error: "red",
  warning: "yellow",
  info: "blue",
} as const;

const icons = {
  success: "✓",
  error: "✗",
  warning: "!",
  info: "ℹ",
};

export function StatusMessage({ type, children }: StatusMessageProps) {
  return (
    <Text color={colors[type]}>
      {icons[type]} {children}
    </Text>
  );
}
