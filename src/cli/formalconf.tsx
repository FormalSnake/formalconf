import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import { Spinner } from "@inkjs/ui";
import { VimSelect } from "../components/ui/VimSelect";
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { Layout } from "../components/layout/Layout";
import { Panel } from "../components/layout/Panel";
import { CommandOutput } from "../components/CommandOutput";
import { ThemeCard } from "../components/ThemeCard";
import { ScrollableLog } from "../components/ScrollableLog";
import { PromptInput } from "../components/PromptInput";
import { useTerminalSize } from "../hooks/useTerminalSize";
import { THEMES_DIR, ensureConfigDir } from "../lib/paths";
import { checkPrerequisites } from "../lib/runtime";
import { parseTheme } from "../lib/theme-parser";
import { colors } from "../lib/theme";
import { runConfigManager } from "./config-manager";
import { runPkgSync, runPkgSyncWithCallbacks } from "./pkg-sync";
import type { PkgSyncCallbacks } from "./pkg-sync";
import { runPkgLock } from "./pkg-lock";
import { runSetTheme } from "./set-theme";
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
    const result = await runConfigManager([action]);
    setOutput(result.output);
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

interface PendingPrompt {
  question: string;
  options: string[];
  resolve: (answer: string) => void;
}

function PackageMenu({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<MenuState>("menu");
  const [lines, setLines] = useState<string[]>([]);
  const [output, setOutput] = useState("");
  const [isStreamingOp, setIsStreamingOp] = useState(true);
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(null);
  const [success, setSuccess] = useState(true);
  const isRunningRef = useRef(false);

  useInput((input, key) => {
    if (state === "menu" && (key.escape || key.leftArrow || input === "h")) {
      onBack();
    }
    if (state === "result") {
      setState("menu");
      setLines([]);
    }
  });

  const callbacks: PkgSyncCallbacks = useMemo(() => ({
    onLog: (line: string) => {
      setLines((prev) => [...prev, line]);
    },
    onPrompt: (question: string, options: string[]) => {
      return new Promise<string>((resolve) => {
        setPendingPrompt({ question, options, resolve });
      });
    },
  }), []);

  const handlePromptAnswer = useCallback((answer: string) => {
    if (pendingPrompt) {
      setLines((prev) => [...prev, `> ${answer}`]);
      pendingPrompt.resolve(answer);
      setPendingPrompt(null);
    }
  }, [pendingPrompt]);

  const handleAction = async (action: string) => {
    if (action === "back") {
      onBack();
      return;
    }

    if (isRunningRef.current) return;
    isRunningRef.current = true;

    setState("running");
    setLines([]);
    setOutput("");
    setPendingPrompt(null);

    let result: { output: string; success: boolean };

    switch (action) {
      case "sync":
        setIsStreamingOp(true);
        result = await runPkgSyncWithCallbacks([], callbacks);
        break;
      case "sync-purge":
        setIsStreamingOp(true);
        result = await runPkgSyncWithCallbacks(["--purge"], callbacks);
        break;
      case "upgrade":
        setIsStreamingOp(true);
        result = await runPkgSyncWithCallbacks(["--upgrade-only"], callbacks);
        break;
      case "upgrade-interactive":
        setIsStreamingOp(true);
        result = await runPkgSyncWithCallbacks(["--upgrade-interactive"], callbacks);
        break;
      case "lock-update":
        setIsStreamingOp(false);
        result = await runPkgLock(["update"]);
        setOutput(result.output);
        break;
      case "lock-status":
        setIsStreamingOp(false);
        result = await runPkgLock(["status"]);
        setOutput(result.output);
        break;
      default:
        setIsStreamingOp(false);
        result = { output: "Unknown action", success: false };
        setOutput(result.output);
    }

    setSuccess(result.success);
    setState("result");
    isRunningRef.current = false;
  };

  if (state === "running") {
    if (!isStreamingOp) {
      return (
        <Panel title="Package Sync">
          <Spinner label="Processing..." />
        </Panel>
      );
    }
    return (
      <Panel title="Package Sync">
        <ScrollableLog lines={lines} />
        {pendingPrompt && (
          <PromptInput
            question={pendingPrompt.question}
            options={pendingPrompt.options}
            onAnswer={handlePromptAnswer}
          />
        )}
      </Panel>
    );
  }

  if (state === "result") {
    if (!isStreamingOp) {
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
      <Panel title="Package Sync" borderColor={success ? colors.success : colors.error}>
        <ScrollableLog lines={lines} autoScroll={false} />
        <Box marginTop={1}>
          <Text color={success ? colors.success : colors.error}>
            {success ? "Done" : "Failed"}
          </Text>
        </Box>
        <Text dimColor>Press any key to continue...</Text>
      </Panel>
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

  const CARD_HEIGHT = 3;
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
    const themeName = theme.path.split("/").pop()!;
    const result = await runSetTheme(themeName);
    setOutput(result.output);
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

type AppState = "loading" | "error" | "ready";

function PrerequisiteError({
  missing,
  onExit,
}: {
  missing: { name: string; install: string }[];
  onExit: () => void;
}) {
  useInput(() => onExit());

  return (
    <Layout breadcrumb={["Error"]}>
      <Panel title="Missing Prerequisites" borderColor={colors.error}>
        <Text color={colors.error}>Required tools are not installed:</Text>
        <Box flexDirection="column" marginTop={1}>
          {missing.map((dep) => (
            <Box key={dep.name}>
              <Text color={colors.warning}>• {dep.name}</Text>
              <Text dimColor> — Install: {dep.install}</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press any key to exit...</Text>
        </Box>
      </Panel>
    </Layout>
  );
}

function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [missingDeps, setMissingDeps] = useState<{ name: string; install: string }[]>([]);
  const [screen, setScreen] = useState<Screen>("main");
  const { exit } = useApp();

  useInput((input) => {
    if (input === "q") {
      exit();
    }
  });

  useEffect(() => {
    async function init() {
      ensureConfigDir();
      const result = await checkPrerequisites();
      if (!result.ok) {
        setMissingDeps(result.missing);
        setAppState("error");
      } else {
        setAppState("ready");
      }
    }
    init();
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

  if (appState === "loading") {
    return (
      <Layout breadcrumb={["Loading"]}>
        <Panel title="FormalConf">
          <Spinner label="Checking prerequisites..." />
        </Panel>
      </Layout>
    );
  }

  if (appState === "error") {
    return <PrerequisiteError missing={missingDeps} onExit={exit} />;
  }

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
