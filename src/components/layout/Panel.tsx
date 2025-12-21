import React from "react";
import { Box, Text } from "ink";
import { colors, borderStyles } from "../../lib/theme";

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  width?: number | string;
  flexGrow?: number;
  borderColor?: string;
}

export function Panel({
  title,
  children,
  width,
  flexGrow,
  borderColor = colors.border,
}: PanelProps) {
  return (
    <Box
      flexDirection="column"
      width={width}
      flexGrow={flexGrow}
      borderStyle={borderStyles.panel}
      borderColor={borderColor}
      paddingX={1}
    >
      {title && (
        <Box marginBottom={1}>
          <Text bold color={colors.primary}>
            {title}
          </Text>
        </Box>
      )}
      {children}
    </Box>
  );
}
