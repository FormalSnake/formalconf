import React, { useState, useEffect } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import { Spinner } from "@inkjs/ui";
import { VimSelect } from "../components/ui/VimSelect";
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { Layout } from "../components/layout/Layout";
import { Panel } from "../components/layout/Panel";
import { CommandOutput } from "../components/CommandOutput";
import { ThemeCard } from "../components/ThemeCard";
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

  useInput((input, key) => {
    if (state !== "menu" || loading) return;

    if (key.escape || key.leftArrow || input === "h") {
      onBack();
      return;
    }

    if ((key.downArrow || input === "j") && selectedIndex < themes.length - 1) {
      setSelectedIndex((i) => i + 1);
    }
    if ((key.upArrow || input === "k") && selectedIndex > 0) {
      setSelectedIndex((i) => i - 1);
    }
    if (key.return || input === "l") {
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

  return (
    <Panel title="Select Theme">
      <Box flexDirection="column" gap={1}>
        {themes.map((theme, index) => (
          <ThemeCard
            key={theme.path}
            theme={theme}
            isSelected={index === selectedIndex}
          />
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑↓/jk navigate • Enter/l select • Esc/h back</Text>
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
