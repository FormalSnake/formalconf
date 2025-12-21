import { useState, useEffect, useMemo } from "react";
import { useInput } from "ink";
import { useTerminalSize } from "./useTerminalSize";

export interface UseThemeGridOptions {
  itemCount: number;
  cardHeight?: number;
  layoutOverhead?: number;
  minCardWidth?: number;
  onSelect?: (index: number) => void;
  onBack?: () => void;
  enabled?: boolean;
}

export interface UseThemeGridReturn {
  cardsPerRow: number;
  cardWidth: number;
  visibleRows: number;
  scrollOffset: number;
  selectedIndex: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
  showScrollUp: boolean;
  showScrollDown: boolean;
  gridHeight: number;
  totalRows: number;
}

export function useThemeGrid({
  itemCount,
  cardHeight = 3,
  layoutOverhead = 20,
  minCardWidth = 28,
  onSelect,
  onBack,
  enabled = true,
}: UseThemeGridOptions): UseThemeGridReturn {
  const { columns, rows } = useTerminalSize();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const availableWidth = columns - 6;
  const cardsPerRow = Math.max(1, Math.floor(availableWidth / minCardWidth));
  const cardWidth = Math.floor(availableWidth / cardsPerRow);

  const availableHeight = rows - layoutOverhead;
  const visibleRows = Math.max(1, Math.floor(availableHeight / cardHeight));

  const selectedRow = Math.floor(selectedIndex / cardsPerRow);
  const totalRows = Math.ceil(itemCount / cardsPerRow);

  useEffect(() => {
    if (selectedRow < scrollOffset) {
      setScrollOffset(selectedRow);
    } else if (selectedRow >= scrollOffset + visibleRows) {
      setScrollOffset(selectedRow - visibleRows + 1);
    }
  }, [selectedRow, scrollOffset, visibleRows]);

  useInput((input, key) => {
    if (!enabled) return;

    if (key.escape && onBack) {
      onBack();
      return;
    }

    if (key.rightArrow || input === "l") {
      if (selectedIndex < itemCount - 1) {
        setSelectedIndex((i) => i + 1);
      }
    }
    if (key.leftArrow || input === "h") {
      if (selectedIndex > 0) {
        setSelectedIndex((i) => i - 1);
      }
    }
    if (key.downArrow || input === "j") {
      const nextIndex = selectedIndex + cardsPerRow;
      if (nextIndex < itemCount) {
        setSelectedIndex(nextIndex);
      }
    }
    if (key.upArrow || input === "k") {
      const prevIndex = selectedIndex - cardsPerRow;
      if (prevIndex >= 0) {
        setSelectedIndex(prevIndex);
      }
    }
    if (key.return && onSelect) {
      onSelect(selectedIndex);
    }
  });

  const visibleStartIndex = scrollOffset * cardsPerRow;
  const visibleEndIndex = (scrollOffset + visibleRows) * cardsPerRow;

  return {
    cardsPerRow,
    cardWidth,
    visibleRows,
    scrollOffset,
    selectedIndex,
    visibleStartIndex,
    visibleEndIndex,
    showScrollUp: scrollOffset > 0,
    showScrollDown: scrollOffset + visibleRows < totalRows,
    gridHeight: visibleRows * cardHeight,
    totalRows,
  };
}
