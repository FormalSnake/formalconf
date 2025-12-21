import React from "react";
import { useApp } from "ink";
import { VimSelect } from "../ui/VimSelect";
import { Panel } from "../layout/Panel";

export type Screen = "main" | "config" | "packages" | "themes";

interface MainMenuProps {
  onSelect: (screen: Screen) => void;
}

export function MainMenu({ onSelect }: MainMenuProps) {
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
