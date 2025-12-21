import React from "react";
import { Box, Text } from "ink";
import { Select } from "@inkjs/ui";

interface MenuOption {
  label: string;
  value: string;
}

interface MenuProps {
  title: string;
  options: MenuOption[];
  onSelect: (value: string) => void;
}

export function Menu({ title, options, onSelect }: MenuProps) {
  return (
    <Box flexDirection="column">
      <Text bold color="blue">
        {title}
      </Text>
      <Text color="cyan">{"━".repeat(38)}</Text>
      <Box marginTop={1}>
        <Select options={options} onChange={onSelect} />
      </Box>
    </Box>
  );
}
