import React, { useState, useEffect } from "react";
import { render, useApp, useInput } from "ink";
import { Spinner } from "@inkjs/ui";
import { Layout } from "../components/layout/Layout";
import { Panel } from "../components/layout/Panel";
import { PrerequisiteError } from "../components/PrerequisiteError";
import { MainMenu, Screen } from "../components/menus/MainMenu";
import { ConfigMenu } from "../components/menus/ConfigMenu";
import { PackageMenu } from "../components/menus/PackageMenu";
import { ThemeMenu } from "../components/menus/ThemeMenu";
import { ensureConfigDir } from "../lib/paths";
import { checkPrerequisites } from "../lib/runtime";

type AppState = "loading" | "error" | "ready";

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

render(<App />);
