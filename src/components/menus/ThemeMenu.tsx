import React, { useState, useEffect, useMemo } from "react";
import { Box, Text } from "ink";
import { VimSelect } from "../ui/VimSelect";
import { Panel } from "../layout/Panel";
import { CommandOutput } from "../CommandOutput";
import { LoadingPanel } from "../LoadingPanel";
import { ThemeCard } from "../ThemeCard";
import { useMenuAction } from "../../hooks/useMenuAction";
import { useThemeGrid } from "../../hooks/useThemeGrid";
import { colors } from "../../lib/theme";
import { runSetTheme, listAllThemes } from "../../cli/set-theme";
import type { UnifiedThemeEntry } from "../../cli/set-theme";
import { getDeviceHostname, getDeviceTheme } from "../../lib/theme-config";

interface ThemeMenuProps {
  onBack: () => void;
}

export function ThemeMenu({ onBack }: ThemeMenuProps) {
  const [themes, setThemes] = useState<UnifiedThemeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceTheme, setDeviceThemeName] = useState<string | null>(null);
  const { state, output, success, isRunning, isResult, execute, reset } = useMenuAction();

  const hostname = getDeviceHostname();

  const grid = useThemeGrid({
    itemCount: themes.length,
    onSelect: (index) => applyTheme(themes[index], false),
    onSelectAndSave: (index) => applyTheme(themes[index], true),
    onBack,
    enabled: state === "menu" && !loading && themes.length > 0,
  });

  useEffect(() => {
    async function loadThemes() {
      const loadedThemes = await listAllThemes();
      setThemes(loadedThemes);
      setDeviceThemeName(getDeviceTheme());
      setLoading(false);
    }

    loadThemes();
  }, []);

  const applyTheme = async (theme: UnifiedThemeEntry, saveAsDeviceDefault: boolean) => {
    await execute(() => runSetTheme(theme.identifier, saveAsDeviceDefault));
    if (saveAsDeviceDefault) {
      setDeviceThemeName(theme.identifier);
    }
  };

  const visibleThemes = useMemo(() => {
    return themes.slice(grid.visibleStartIndex, grid.visibleEndIndex);
  }, [themes, grid.visibleStartIndex, grid.visibleEndIndex]);

  if (loading || isRunning) {
    return (
      <LoadingPanel
        title="Select Theme"
        label={loading ? "Loading themes..." : "Applying theme..."}
      />
    );
  }

  if (isResult) {
    return (
      <CommandOutput
        title="Select Theme"
        output={output}
        success={success}
        onDismiss={reset}
      />
    );
  }

  if (themes.length === 0) {
    return (
      <Panel title="Select Theme">
        <Box flexDirection="column">
          <Text color={colors.warning}>No themes available.</Text>
          <Text>Add themes to one of the following locations:</Text>
          <Text dimColor>  JSON themes: ~/.config/formalconf/themes/*.json</Text>
          <Text dimColor>  Legacy themes: ~/.config/formalconf/themes/name/</Text>
        </Box>
        <Box marginTop={1}>
          <VimSelect options={[{ label: "Back", value: "back" }]} onChange={() => onBack()} />
        </Box>
      </Panel>
    );
  }

  return (
    <Panel title="Select Theme">
      {grid.showScrollUp && (
        <Text dimColor>
          {"  "}↑ {grid.scrollOffset} more row{grid.scrollOffset > 1 ? "s" : ""}
        </Text>
      )}
      <Box flexDirection="row" flexWrap="wrap" height={grid.gridHeight} overflow="hidden">
        {visibleThemes.map((theme, index) => (
          <ThemeCard
            key={theme.identifier}
            theme={theme}
            isSelected={grid.visibleStartIndex + index === grid.selectedIndex}
            width={grid.cardWidth}
            isDeviceTheme={theme.identifier === deviceTheme}
          />
        ))}
      </Box>
      {grid.showScrollDown && (
        <Text dimColor>
          {"  "}↓ {grid.totalRows - grid.scrollOffset - grid.visibleRows} more row
          {grid.totalRows - grid.scrollOffset - grid.visibleRows > 1 ? "s" : ""}
        </Text>
      )}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>←→↑↓/hjkl navigate • Enter apply • Shift+Enter save as device default • Esc back</Text>
        <Text dimColor>Device: {hostname}</Text>
      </Box>
    </Panel>
  );
}
