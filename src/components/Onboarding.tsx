import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { Layout } from "./layout/Layout";
import { Panel } from "./layout/Panel";
import { VimSelect } from "./ui/VimSelect";
import { colors } from "../lib/theme";
import {
  installExampleConfig,
  installExampleTheme,
  installReadmes,
  installPkgConfig,
} from "../lib/templates";

type Step = "welcome" | "configs" | "themes" | "packages" | "complete";

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [createdItems, setCreatedItems] = useState<string[]>([]);

  const addCreatedItem = (item: string) => {
    setCreatedItems((prev) => [...prev, item]);
  };

  switch (step) {
    case "welcome":
      return (
        <WelcomeStep onNext={() => setStep("configs")} />
      );
    case "configs":
      return (
        <ConfigsStep
          onNext={() => setStep("themes")}
          onCreate={async () => {
            await installExampleConfig();
            addCreatedItem("Example config package");
          }}
        />
      );
    case "themes":
      return (
        <ThemesStep
          onNext={() => setStep("packages")}
          onCreate={async () => {
            await installExampleTheme();
            addCreatedItem("Example theme");
          }}
        />
      );
    case "packages":
      return (
        <PackagesStep onNext={async () => {
          await installPkgConfig();
          setStep("complete");
        }} />
      );
    case "complete":
      return (
        <CompleteStep createdItems={createdItems} onComplete={async () => {
          await installReadmes();
          onComplete();
        }} />
      );
  }
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  useInput((_, key) => {
    if (key.return) onNext();
  });

  return (
    <Layout breadcrumb={["Setup"]} showFooter={false}>
      <Panel title="Welcome to FormalConf">
        <Box flexDirection="column" gap={1}>
          <Text>
            FormalConf helps you manage your dotfiles and system configuration.
          </Text>
          <Text dimColor>
            This setup will walk you through the basics and optionally create
            example files to get you started.
          </Text>
          <Box marginTop={1}>
            <Text color={colors.primary}>Press Enter to continue...</Text>
          </Box>
        </Box>
      </Panel>
    </Layout>
  );
}

function ConfigsStep({
  onNext,
  onCreate,
}: {
  onNext: () => void;
  onCreate: () => Promise<void>;
}) {
  const [isCreating, setIsCreating] = useState(false);

  const handleSelect = async (value: string) => {
    if (value === "create") {
      setIsCreating(true);
      await onCreate();
    }
    onNext();
  };

  return (
    <Layout breadcrumb={["Setup", "Config Packages"]} showFooter={false}>
      <Panel title="Config Packages">
        <Box flexDirection="column" gap={1}>
          <Text>
            Config packages are directories containing your dotfiles.
          </Text>
          <Text dimColor>
            FormalConf uses GNU Stow to create symlinks from your home directory.
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>Example structure:</Text>
            <Text>  my-config/</Text>
            <Text>    .config/</Text>
            <Text>      app/config.toml</Text>
          </Box>
          <Box marginTop={1}>
            <VimSelect
              options={[
                { label: "Create example config package", value: "create" },
                { label: "Skip", value: "skip" },
              ]}
              onChange={handleSelect}
              isDisabled={isCreating}
            />
          </Box>
        </Box>
      </Panel>
    </Layout>
  );
}

function ThemesStep({
  onNext,
  onCreate,
}: {
  onNext: () => void;
  onCreate: () => Promise<void>;
}) {
  const [isCreating, setIsCreating] = useState(false);

  const handleSelect = async (value: string) => {
    if (value === "create") {
      setIsCreating(true);
      await onCreate();
    }
    onNext();
  };

  return (
    <Layout breadcrumb={["Setup", "Themes"]} showFooter={false}>
      <Panel title="Themes">
        <Box flexDirection="column" gap={1}>
          <Text>
            Themes contain application configs for colors and styling.
          </Text>
          <Text dimColor>
            When applied, theme files are symlinked to a central location
            your apps can source from.
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>Theme structure:</Text>
            <Text>  my-theme/</Text>
            <Text>    theme.yaml</Text>
            <Text>    neovim.lua</Text>
            <Text>    backgrounds/</Text>
          </Box>
          <Box marginTop={1}>
            <VimSelect
              options={[
                { label: "Create example theme", value: "create" },
                { label: "Skip", value: "skip" },
              ]}
              onChange={handleSelect}
              isDisabled={isCreating}
            />
          </Box>
        </Box>
      </Panel>
    </Layout>
  );
}

function PackagesStep({ onNext }: { onNext: () => Promise<void> }) {
  const [isCreating, setIsCreating] = useState(false);

  useInput(async (_, key) => {
    if (key.return && !isCreating) {
      setIsCreating(true);
      await onNext();
    }
  });

  return (
    <Layout breadcrumb={["Setup", "Package Sync"]} showFooter={false}>
      <Panel title="Package Sync">
        <Box flexDirection="column" gap={1}>
          <Text>
            FormalConf can sync your Homebrew packages from a config file.
          </Text>
          <Text dimColor>
            Edit ~/.config/formalconf/pkg-config.json to define your packages,
            then run Package Sync from the main menu.
          </Text>
          <Box marginTop={1}>
            <Text color={colors.primary}>Press Enter to continue...</Text>
          </Box>
        </Box>
      </Panel>
    </Layout>
  );
}

function CompleteStep({
  createdItems,
  onComplete,
}: {
  createdItems: string[];
  onComplete: () => Promise<void>;
}) {
  const [isFinishing, setIsFinishing] = useState(false);

  useInput(async (_, key) => {
    if (key.return && !isFinishing) {
      setIsFinishing(true);
      await onComplete();
    }
  });

  return (
    <Layout breadcrumb={["Setup", "Complete"]} showFooter={false}>
      <Panel title="Setup Complete">
        <Box flexDirection="column" gap={1}>
          <Text color={colors.success}>You're all set!</Text>
          {createdItems.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>Created:</Text>
              {createdItems.map((item, i) => (
                <Text key={i}>  - {item}</Text>
              ))}
            </Box>
          )}
          <Box marginTop={1}>
            <Text dimColor>
              README files have been added to help you get started.
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color={colors.primary}>Press Enter to start...</Text>
          </Box>
        </Box>
      </Panel>
    </Layout>
  );
}
