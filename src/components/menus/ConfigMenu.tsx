import React from "react";
import { VimSelect } from "../ui/VimSelect";
import { Panel } from "../layout/Panel";
import { CommandOutput } from "../CommandOutput";
import { LoadingPanel } from "../LoadingPanel";
import { useMenuAction } from "../../hooks/useMenuAction";
import { useBackNavigation } from "../../hooks/useBackNavigation";
import { runConfigManager } from "../../cli/config-manager";

interface ConfigMenuProps {
  onBack: () => void;
}

export function ConfigMenu({ onBack }: ConfigMenuProps) {
  const { state, output, success, isRunning, isResult, execute, reset } = useMenuAction();

  useBackNavigation({ enabled: state === "menu", onBack });

  const handleAction = async (action: string) => {
    if (action === "back") {
      onBack();
      return;
    }
    await execute(() => runConfigManager([action]));
  };

  if (isRunning) {
    return <LoadingPanel title="Config Manager" />;
  }

  if (isResult) {
    return (
      <CommandOutput
        title="Config Manager"
        output={output}
        success={success}
        onDismiss={reset}
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
