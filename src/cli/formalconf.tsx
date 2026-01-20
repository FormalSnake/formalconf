import { parseArgs } from "node:util";
import React, { useState, useEffect } from "react";
import { render, useApp, useInput } from "ink";
import { Spinner } from "@inkjs/ui";
import { Layout } from "../components/layout/Layout";
import { Panel } from "../components/layout/Panel";
import { PrerequisiteError } from "../components/PrerequisiteError";
import { Onboarding } from "../components/Onboarding";
import { MainMenu, Screen } from "../components/menus/MainMenu";
import { ConfigMenu } from "../components/menus/ConfigMenu";
import { PackageMenu } from "../components/menus/PackageMenu";
import { ThemeMenu } from "../components/menus/ThemeMenu";
import { ensureConfigDir, isFirstRun } from "../lib/paths";
import { checkPrerequisites } from "../lib/runtime";

function printHelp() {
  console.log(`
FormalConf - Dotfiles Management TUI

Usage:
  formalconf                    Launch interactive TUI
  formalconf theme <name>       Apply a theme (e.g., nord:dark)
  formalconf config <cmd>       Config management (stow, unstow, status, list)
  formalconf pkg-sync [flags]   Sync packages from pkg-config.json

Options:
  -h, --help                    Show this help message

Examples:
  formalconf theme nord:dark
  formalconf config stow nvim
  formalconf pkg-sync --purge
`);
}

type AppState = "loading" | "error" | "onboarding" | "ready";

const BREADCRUMBS: Record<Screen, string[]> = {
  main: ["Main"],
  config: ["Main", "Config Manager"],
  packages: ["Main", "Package Sync"],
  themes: ["Main", "Themes"],
};

function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [missingDeps, setMissingDeps] = useState<{ name: string; install: string }[]>([]);
  const [screen, setScreen] = useState<Screen>("main");
  const { exit } = useApp();

  useInput((input) => {
    if (input === "q") exit();
  });

  useEffect(() => {
    async function init() {
      await ensureConfigDir();
      const result = await checkPrerequisites();
      if (!result.ok) {
        setMissingDeps(result.missing);
        setAppState("error");
        return;
      }

      const firstRun = await isFirstRun();
      if (firstRun) {
        setAppState("onboarding");
        return;
      }

      setAppState("ready");
    }
    init();
  }, []);

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

  if (appState === "onboarding") {
    return <Onboarding onComplete={() => setAppState("ready")} />;
  }

  const goBack = () => setScreen("main");

  return (
    <Layout breadcrumb={BREADCRUMBS[screen]}>
      {screen === "main" && <MainMenu onSelect={setScreen} />}
      {screen === "config" && <ConfigMenu onBack={goBack} />}
      {screen === "packages" && <PackageMenu onBack={goBack} />}
      {screen === "themes" && <ThemeMenu onBack={goBack} />}
    </Layout>
  );
}

async function main() {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    strict: false,
  });

  const [subcommand] = positionals;

  if (values.help && !subcommand) {
    printHelp();
    process.exit(0);
  }

  if (subcommand) {
    // Map subcommand to script name for isMainModule checks
    const scriptMap: Record<string, string> = {
      theme: "set-theme",
      config: "config-manager",
      "pkg-sync": "pkg-sync",
    };

    const scriptName = scriptMap[subcommand];
    if (!scriptName) {
      console.error(`Unknown subcommand: ${subcommand}`);
      printHelp();
      process.exit(1);
    }

    // Update argv so subcommand script sees its args at slice(2)
    process.argv = [process.argv[0], scriptName, ...process.argv.slice(3)];

    switch (subcommand) {
      case "theme": {
        const { main } = await import("./set-theme");
        await main();
        break;
      }
      case "config": {
        const { main } = await import("./config-manager");
        await main();
        break;
      }
      case "pkg-sync": {
        const { main } = await import("./pkg-sync");
        await main();
        break;
      }
    }
    return;
  }

  // No subcommand - launch TUI
  render(<App />);
}

main();
