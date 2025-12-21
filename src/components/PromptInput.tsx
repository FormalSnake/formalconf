import React from "react";
import { Box, Text, useInput } from "ink";
import { colors } from "../lib/theme";

interface PromptInputProps {
  question: string;
  options?: string[];
  onAnswer: (answer: string) => void;
}

export function PromptInput({
  question,
  options = ["y", "n"],
  onAnswer,
}: PromptInputProps) {
  useInput((input) => {
    const lower = input.toLowerCase();
    if (options.includes(lower)) {
      onAnswer(lower);
    }
  });

  return (
    <Box marginTop={1} borderStyle="single" borderColor={colors.accent} paddingX={1}>
      <Text>
        {question}{" "}
        <Text color={colors.accent}>[{options.join("/")}]</Text>
        <Text dimColor>: </Text>
      </Text>
    </Box>
  );
}
