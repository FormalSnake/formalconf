import React, { useState, useEffect, useMemo } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import { Spinner } from "@inkjs/ui";
import { VimSelect } from "../components/ui/VimSelect";
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { Layout } from "../components/layout/Layout";
import { Panel } from "../components/layout/Panel";
import { CommandOutput } from "../components/CommandOutput";
import { ThemeCard } from "../components/ThemeCard";
import { useTerminalSize } from "../hooks/useTerminalSize";
import { THEMES_DIR, ensureConfigDir } from "../lib/paths";
import { parseTheme } from "../lib/theme-parser";
import { exec } from "../lib/shell";
import { colors } from "../lib/theme";
import type { Theme } from "../types/theme";

type MenuState = "menu" | "running" | "result";

type Screen = "main" | "config" | "packages" | "themes";

function MainMenu({ onSelect }: { onSelect: (screen: Screen) => void }) {
  const { exit } = useApp();

  return (
    <Panel title="Main Menu">
      <VimSelect
        options={[
          { label: "Config Manager", value: "config" },
          { label: "Package Sync", value: "packages" },
          { label: "Set Theme", value: "themes" },
          { label: "Exit", value: "exit" },
        ]}
        onChange={(value) => {
          if (value === "exit") {
            exit();
            return;
          }
          onSelect(value as Screen);
        }}
      />
    </Panel>
  );
}

function ConfigMenu({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<MenuState>("menu");
  const [output, setOutput] = useState("");
  const [success, setSuccess] = useState(true);

  useInput((input, key) => {
    if (state === "menu" && (key.escape || key.leftArrow || input === "h")) {
      onBack();
    }
  });

  const handleAction = async (action: string) => {
    if (action === "back") {
      onBack();
      return;
    }

    setState("running");
    const scriptPath = `${import.meta.dir}/config-manager.ts`;
    const result = await exec(["bun", "run", scriptPath, action]);
    setOutput(result.stdout || result.stderr);
    setSuccess(result.success);
    setState("result");
  };

  if (state === "running") {
    return (
      <Panel title="Config Manager">
        <Spinner label="Processing..." />
      </Panel>
    );
  }

  if (state === "result") {
    return (
      <CommandOutput
        title="Config Manager"
        output={output}
        success={success}
        onDismiss={() => setState("menu")}
      />
    );
  }

  return (
    <Panel title="Config Manager">
      <VimSelect
        options={[
          { label: "Stow all packages", value: "stow-all" },
          { label: "Unstow all packages", value: "unstow-all" },
          { label: "Check status", value: "status" },
          { label: "List packages", value: "list" },
          { label: "Back", value: "back" },
        ]}
        onChange={handleAction}
      />
    </Panel>
  );
}

function PackageMenu({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<MenuState>("menu");
  const [output, setOutput] = useState("");
  const [success, setSuccess] = useState(true);

  useInput((input, key) => {
    if (state === "menu" && (key.escape || key.leftArrow || input === "h")) {
      onBack();
    }
  });

  const handleAction = async (action: string) => {
    if (action === "back") {
      onBack();
      return;
    }

    setState("running");

    const scriptPath = `${import.meta.dir}/pkg-sync.ts`;
    let args: string[] = ["bun", "run", scriptPath];

    switch (action) {
      case "sync":
        break;
      case "sync-purge":
        args.push("--purge");
        break;
      case "upgrade":
        args.push("--upgrade-only");
        break;
      case "upgrade-interactive":
        args.push("--upgrade-interactive");
        break;
      case "lock-update":
        args = ["bun", "run", `${import.meta.dir}/pkg-lock.ts`, "update"];
        break;
      case "lock-status":
        args = ["bun", "run", `${import.meta.dir}/pkg-lock.ts`, "status"];
        break;
    }

    const result = await exec(args);
    setOutput(result.stdout || result.stderr);
    setSuccess(result.success);
    setState("result");
  };

  if (state === "running") {
    return (
      <Panel title="Package Sync">
        <Spinner label="Syncing packages..." />
      </Panel>
    );
  }

  if (state === "result") {
    return (
      <CommandOutput
        title="Package Sync"
        output={output}
        success={success}
        onDismiss={() => setState("menu")}
      />
    );
  }

  return (
    <Panel title="Package Sync">
      <VimSelect
        options={[
          { label: "Sync packages", value: "sync" },
          { label: "Sync with purge", value: "sync-purge" },
          { label: "Upgrade all (with verification)", value: "upgrade" },
          { label: "Upgrade interactive", value: "upgrade-interactive" },
          { label: "Update lockfile", value: "lock-update" },
          { label: "Lockfile status", value: "lock-status" },
          { label: "Back", value: "back" },
        ]}
        onChange={handleAction}
      />
    </Panel>
  );
}

function ThemeMenu({ onBack }: { onBack: () => void }) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [state, setState] = useState<MenuState>("menu");
  const [output, setOutput] = useState("");
  const [success, setSuccess] = useState(true);
  const { columns, rows } = useTerminalSize();

  const CARD_HEIGHT = 5;
  const LAYOUT_OVERHEAD = 20; // header + breadcrumb + panel + footer + padding
  const cardWidth = useMemo(() => {
    const availableWidth = columns - 6; // panel borders + padding
    const cardsPerRow = Math.max(1, Math.floor(availableWidth / 28));
    return Math.floor(availableWidth / cardsPerRow);
  }, [columns]);

  const cardsPerRow = useMemo(() => {
    const availableWidth = columns - 6;
    return Math.max(1, Math.floor(availableWidth / 28));
  }, [columns]);

  const visibleRows = useMemo(() => {
    const availableHeight = rows - LAYOUT_OVERHEAD;
    return Math.max(1, Math.floor(availableHeight / CARD_HEIGHT));
  }, [rows]);

  const selectedRow = Math.floor(selectedIndex / cardsPerRow);
  const totalRows = Math.ceil(themes.length / cardsPerRow);

  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    if (selectedRow < scrollOffset) {
      setScrollOffset(selectedRow);
    } else if (selectedRow >= scrollOffset + visibleRows) {
      setScrollOffset(selectedRow - visibleRows + 1);
    }
  }, [selectedRow, scrollOffset, visibleRows]);

  const visibleThemes = useMemo(() => {
    const startIdx = scrollOffset * cardsPerRow;
    const endIdx = (scrollOffset + visibleRows) * cardsPerRow;
    return themes.slice(startIdx, endIdx);
  }, [themes, scrollOffset, visibleRows, cardsPerRow]);

  const visibleStartIndex = scrollOffset * cardsPerRow;

  useInput((input, key) => {
    if (state !== "menu" || loading) return;

    if (key.escape) {
      onBack();
      return;
    }

    if (key.rightArrow || input === "l") {
      if (selectedIndex < themes.length - 1) {
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
      if (nextIndex < themes.length) {
        setSelectedIndex(nextIndex);
      }
    }
    if (key.upArrow || input === "k") {
      const prevIndex = selectedIndex - cardsPerRow;
      if (prevIndex >= 0) {
        setSelectedIndex(prevIndex);
      }
    }
    if (key.return) {
      applyTheme(themes[selectedIndex]);
    }
  });

  useEffect(() => {
    async function loadThemes() {
      if (!existsSync(THEMES_DIR)) {
        setThemes([]);
        setLoading(false);
        return;
      }

      const entries = readdirSync(THEMES_DIR, { withFileTypes: true });
      const loadedThemes: Theme[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const themePath = join(THEMES_DIR, entry.name);
          const theme = await parseTheme(themePath, entry.name);
          loadedThemes.push(theme);
        }
      }

      setThemes(loadedThemes);
      setLoading(false);
    }

    loadThemes();
  }, []);

  const applyTheme = async (theme: Theme) => {
    setState("running");
    const scriptPath = `${import.meta.dir}/set-theme.ts`;
    const result = await exec(["bun", "run", scriptPath, theme.path.split("/").pop()!]);
    setOutput(result.stdout || result.stderr);
    setSuccess(result.success);
    setState("result");
  };

  if (loading || state === "running") {
    return (
      <Panel title="Select Theme">
        <Spinner label={loading ? "Loading themes..." : "Applying theme..."} />
      </Panel>
    );
  }

  if (state === "result") {
    return (
      <CommandOutput
        title="Select Theme"
        output={output}
        success={success}
        onDismiss={() => setState("menu")}
      />
    );
  }

  if (themes.length === 0) {
    return (
      <Panel title="Select Theme">
        <Box flexDirection="column">
          <Text color={colors.warning}>No themes available.</Text>
          <Text>This system is compatible with omarchy themes.</Text>
          <Text dimColor>Add themes to ~/.config/formalconf/themes/</Text>
        </Box>
        <Box marginTop={1}>
          <VimSelect
            options={[{ label: "Back", value: "back" }]}
            onChange={() => onBack()}
          />
        </Box>
      </Panel>
    );
  }

  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset + visibleRows < totalRows;
  const gridHeight = visibleRows * CARD_HEIGHT;

  return (
    <Panel title="Select Theme">
      {showScrollUp && (
        <Text dimColor>  ↑ {scrollOffset} more row{scrollOffset > 1 ? "s" : ""}</Text>
      )}
      <Box flexDirection="row" flexWrap="wrap" height={gridHeight} overflow="hidden">
        {visibleThemes.map((theme, index) => (
          <ThemeCard
            key={theme.path}
            theme={theme}
            isSelected={visibleStartIndex + index === selectedIndex}
            width={cardWidth}
          />
        ))}
      </Box>
      {showScrollDown && (
        <Text dimColor>  ↓ {totalRows - scrollOffset - visibleRows} more row{totalRows - scrollOffset - visibleRows > 1 ? "s" : ""}</Text>
      )}
      <Box marginTop={1}>
        <Text dimColor>←→↑↓/hjkl navigate • Enter select • Esc back</Text>
      </Box>
    </Panel>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>("main");
  const { exit } = useApp();

  useInput((input) => {
    if (input === "q") {
      exit();
    }
  });

  useEffect(() => {
    ensureConfigDir();
  }, []);

  const getBreadcrumb = (): string[] => {
    switch (screen) {
      case "config":
        return ["Main", "Config Manager"];
      case "packages":
        return ["Main", "Package Sync"];
      case "themes":
        return ["Main", "Themes"];
      default:
        return ["Main"];
    }
  };

  return (
    <Layout breadcrumb={getBreadcrumb()}>
      {screen === "main" && <MainMenu onSelect={setScreen} />}
      {screen === "config" && <ConfigMenu onBack={() => setScreen("main")} />}
      {screen === "packages" && <PackageMenu onBack={() => setScreen("main")} />}
      {screen === "themes" && <ThemeMenu onBack={() => setScreen("main")} />}
    </Layout>
  );
}

render(<App />);
