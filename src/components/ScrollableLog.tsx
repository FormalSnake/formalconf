import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { useTerminalSize } from "../hooks/useTerminalSize";

interface ScrollableLogProps {
  lines: string[];
  maxHeight?: number;
  autoScroll?: boolean;
  showScrollHint?: boolean;
}

export function ScrollableLog({
  lines,
  maxHeight,
  autoScroll = true,
  showScrollHint = true,
}: ScrollableLogProps) {
  const { rows } = useTerminalSize();
  const visibleLines = maxHeight || Math.max(5, rows - 12);

  const [scrollOffset, setScrollOffset] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(autoScroll);

  const totalLines = lines.length;
  const maxOffset = Math.max(0, totalLines - visibleLines);

  useEffect(() => {
    if (isAutoScrolling) {
      setScrollOffset(maxOffset);
    }
  }, [totalLines, maxOffset, isAutoScrolling]);

  useInput((input, key) => {
    if (key.downArrow || input === "j") {
      setIsAutoScrolling(false);
      setScrollOffset((prev) => Math.min(prev + 1, maxOffset));
    }
    if (key.upArrow || input === "k") {
      setIsAutoScrolling(false);
      setScrollOffset((prev) => Math.max(prev - 1, 0));
    }
    if (input === "G") {
      setIsAutoScrolling(true);
      setScrollOffset(maxOffset);
    }
    if (input === "g") {
      setIsAutoScrolling(false);
      setScrollOffset(0);
    }
  });

  const visibleContent = useMemo(() => {
    return lines.slice(scrollOffset, scrollOffset + visibleLines);
  }, [lines, scrollOffset, visibleLines]);

  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset < maxOffset;

  return (
    <Box flexDirection="column">
      {showScrollHint && showScrollUp && (
        <Text dimColor>  ↑ {scrollOffset} more line{scrollOffset !== 1 ? "s" : ""}</Text>
      )}
      <Box flexDirection="column" height={visibleLines} overflow="hidden">
        {visibleContent.map((line, i) => (
          <Text key={scrollOffset + i}>{line}</Text>
        ))}
      </Box>
      {showScrollHint && showScrollDown && (
        <Text dimColor>  ↓ {maxOffset - scrollOffset} more line{maxOffset - scrollOffset !== 1 ? "s" : ""}</Text>
      )}
      {showScrollHint && totalLines > visibleLines && (
        <Text dimColor>
          j/k scroll • g top • G bottom {isAutoScrolling ? "(auto-scroll)" : ""}
        </Text>
      )}
    </Box>
  );
}
