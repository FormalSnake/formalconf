import React, { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import { Select, Spinner } from "@inkjs/ui";
import { readdirSync, existsSync } from "fs";
import { Header } from "../components/Header";
import { THEMES_DIR, ensureConfigDir } from "../lib/paths";
import { exec, execLive } from "../lib/shell";

type Screen = "main" | "config" | "packages" | "themes";

function MainMenu({ onSelect }: { onSelect: (screen: Screen) => void }) {
  const { exit } = useApp();

  return (
    <Box flexDirection="column">
      <Text bold>Main Menu</Text>
      <Text color="cyan">{"━".repeat(38)}</Text>
      <Box marginTop={1}>
        <Select
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
      </Box>
    </Box>
  );
}

function ConfigMenu({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { exit } = useApp();

  const handleAction = async (action: string) => {
    if (action === "back") {
      onBack();
      return;
    }

    setLoading(true);
    setMessage("");

    // Exit ink temporarily to run the command with live output
    exit();

    const scriptPath = `${import.meta.dir}/config-manager.ts`;
    await execLive(["bun", "run", scriptPath, action]);

    // Re-render after command completes
    prompt("\nPress Enter to continue...");

    // Restart the app
    renderApp();
  };

  if (loading) {
    return <Spinner label="Processing..." />;
  }

  return (
    <Box flexDirection="column">
      <Text bold color="blue">
        Config Manager
      </Text>
      <Text color="cyan">{"━".repeat(38)}</Text>
      {message && (
        <Text color="green" wrap="wrap">
          {message}
        </Text>
      )}
      <Box marginTop={1}>
        <Select
          options={[
            { label: "Stow all packages", value: "stow-all" },
            { label: "Unstow all packages", value: "unstow-all" },
            { label: "Check status", value: "status" },
            { label: "List packages", value: "list" },
            { label: "Back", value: "back" },
          ]}
          onChange={handleAction}
        />
      </Box>
    </Box>
  );
}

function PackageMenu({ onBack }: { onBack: () => void }) {
  const { exit } = useApp();

  const handleAction = async (action: string) => {
    if (action === "back") {
      onBack();
      return;
    }

    exit();

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

    await execLive(args);

    prompt("\nPress Enter to continue...");

    renderApp();
  };

  return (
    <Box flexDirection="column">
      <Text bold color="blue">
        Package Sync
      </Text>
      <Text color="cyan">{"━".repeat(38)}</Text>
      <Box marginTop={1}>
        <Select
          options={[
            { label: "Sync packages", value: "sync" },
            { label: "Sync with purge", value: "sync-purge" },
            { label: "Upgrade all (with verification)", value: "upgrade" },
            { label: "Upgrade interactive", value: "upgrade-interactive" },
            { label: "Back", value: "back" },
          ]}
          onChange={handleAction}
        />
      </Box>
    </Box>
  );
}

function ThemeMenu({ onBack }: { onBack: () => void }) {
  const [themes, setThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { exit } = useApp();

  useEffect(() => {
    if (!existsSync(THEMES_DIR)) {
      setThemes([]);
      setLoading(false);
      return;
    }
    const entries = readdirSync(THEMES_DIR, { withFileTypes: true });
    const themeNames = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    setThemes(themeNames);
    setLoading(false);
  }, []);

  const handleSelect = async (value: string) => {
    if (value === "back") {
      onBack();
      return;
    }

    exit();

    const scriptPath = `${import.meta.dir}/set-theme.ts`;
    await execLive(["bun", "run", scriptPath, value]);

    prompt("\nPress Enter to continue...");

    renderApp();
  };

  if (loading) {
    return <Spinner label="Loading themes..." />;
  }

  if (themes.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="blue">
          Select Theme
        </Text>
        <Text color="cyan">{"━".repeat(38)}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow">No themes available.</Text>
          <Text>This system is compatible with omarchy themes.</Text>
          <Text dimColor>Add themes to ~/.config/formalconf/themes/</Text>
        </Box>
        <Box marginTop={1}>
          <Select
            options={[{ label: "Back", value: "back" }]}
            onChange={() => onBack()}
          />
        </Box>
      </Box>
    );
  }

  const options = [
    ...themes.map((t) => ({ label: t, value: t })),
    { label: "Back", value: "back" },
  ];

  return (
    <Box flexDirection="column">
      <Text bold color="blue">
        Select Theme
      </Text>
      <Text color="cyan">{"━".repeat(38)}</Text>
      <Box marginTop={1}>
        <Select options={options} onChange={handleSelect} />
      </Box>
    </Box>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>("main");

  useEffect(() => {
    ensureConfigDir();
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Header />
      {screen === "main" && <MainMenu onSelect={setScreen} />}
      {screen === "config" && <ConfigMenu onBack={() => setScreen("main")} />}
      {screen === "packages" && (
        <PackageMenu onBack={() => setScreen("main")} />
      )}
      {screen === "themes" && <ThemeMenu onBack={() => setScreen("main")} />}
    </Box>
  );
}

function renderApp() {
  render(<App />);
}

renderApp();
