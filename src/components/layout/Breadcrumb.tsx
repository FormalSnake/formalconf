import React from "react";
import { Box, Text } from "ink";
import { colors } from "../../lib/theme";

interface BreadcrumbProps {
  path: string[];
}

export function Breadcrumb({ path }: BreadcrumbProps) {
  return (
    <Box>
      {path.map((segment, index) => (
        <React.Fragment key={index}>
          {index > 0 && <Text color={colors.textDim}> {">"} </Text>}
          <Text
            color={index === path.length - 1 ? colors.primary : colors.textDim}
            bold={index === path.length - 1}
          >
            {segment}
          </Text>
        </React.Fragment>
      ))}
    </Box>
  );
}
