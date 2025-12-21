import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { colors } from "../../lib/theme";

interface Option {
  label: string;
  value: string;
}

interface VimSelectProps {
  options: Option[];
  onChange: (value: string) => void;
  isDisabled?: boolean;
}

export function VimSelect({ options, onChange, isDisabled = false }: VimSelectProps) {
  const [index, setIndex] = useState(0);

  useInput((input, key) => {
    if (isDisabled) return;

    if (input === "j" || key.downArrow) {
      setIndex((i) => (i < options.length - 1 ? i + 1 : i));
    }
    if (input === "k" || key.upArrow) {
      setIndex((i) => (i > 0 ? i - 1 : i));
    }
    if (input === "l" || key.return) {
      onChange(options[index].value);
    }
  });

  return (
    <Box flexDirection="column">
      {options.map((opt, i) => (
        <Box key={opt.value}>
          <Text color={i === index ? colors.primary : undefined}>
            {i === index ? "❯" : " "} {opt.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
