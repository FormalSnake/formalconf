import React, { useState, useEffect } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import { Select, Spinner } from "@inkjs/ui";
import { readdirSync, existsSync } from "fs";
import { Layout } from "../components/layout/Layout";
import { Panel } from "../components/layout/Panel";
import { CommandOutput } from "../components/CommandOutput";
import { THEMES_DIR, ensureConfigDir } from "../lib/paths";
import { exec } from "../lib/shell";
import { colors } from "../lib/theme";

type MenuState = "menu" | "running" | "result";

type Screen = "main" | "config" | "packages" | "themes";

function MainMenu({ onSelect }: { onSelect: (screen: Screen) => void }) {
  const { exit } = useApp();

  return (
    <Panel title="Main Menu">
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
    </Panel>
  );
}

function ConfigMenu({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<MenuState>("menu");
  const [output, setOutput] = useState("");
  const [success, setSuccess] = useState(true);

  useInput((_, key) => {
    if (state === "menu" && (key.escape || key.leftArrow)) {
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
    </Panel>
  );
}

function PackageMenu({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<MenuState>("menu");
  const [output, setOutput] = useState("");
  const [success, setSuccess] = useState(true);

  useInput((_, key) => {
    if (state === "menu" && (key.escape || key.leftArrow)) {
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
    </Panel>
  );
}

function ThemeMenu({ onBack }: { onBack: () => void }) {
  const [themes, setThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<MenuState>("menu");
  const [output, setOutput] = useState("");
  const [success, setSuccess] = useState(true);

  useInput((_, key) => {
    if (state === "menu" && !loading && (key.escape || key.leftArrow)) {
      onBack();
    }
  });

  useEffect(() => {
    if (!existsSync(THEMES_DIR)) {
      setThemes([]);
      setLoading(false);
      return;
    }
    const entries = readdirSync(THEMES_DIR, { withFileTypes: true });
    const themeNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    setThemes(themeNames);
    setLoading(false);
  }, []);

  const handleSelect = async (value: string) => {
    if (value === "back") {
      onBack();
      return;
    }

    setState("running");
    const scriptPath = `${import.meta.dir}/set-theme.ts`;
    const result = await exec(["bun", "run", scriptPath, value]);
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
          <Select
            options={[{ label: "Back", value: "back" }]}
            onChange={() => onBack()}
          />
        </Box>
      </Panel>
    );
  }

  const options = [
    ...themes.map((t) => ({ label: t, value: t })),
    { label: "Back", value: "back" },
  ];

  return (
    <Panel title="Select Theme">
      <Select options={options} onChange={handleSelect} />
    </Panel>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>("main");

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
