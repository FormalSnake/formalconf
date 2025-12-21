import { useInput } from "ink";

export interface UseBackNavigationOptions {
  enabled?: boolean;
  onBack: () => void;
}

export function useBackNavigation({
  enabled = true,
  onBack,
}: UseBackNavigationOptions): void {
  useInput((input, key) => {
    if (enabled && (key.escape || key.leftArrow || input === "h")) {
      onBack();
    }
  });
}
