import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { VimSelect } from "../ui/VimSelect";
import { Panel } from "../layout/Panel";
import { CommandOutput } from "../CommandOutput";
import { LoadingPanel } from "../LoadingPanel";
import { ScrollableLog } from "../ScrollableLog";
import { PromptInput } from "../PromptInput";
import { OrphanTable } from "../OrphanTable";
import { runPkgSyncWithCallbacks } from "../../cli/pkg-sync";
import type { PkgSyncCallbacks } from "../../cli/pkg-sync";
import { runPkgLock } from "../../cli/pkg-lock";
import {
  detectOrphanedPackages,
  addToConfig,
  uninstallPackage,
} from "../../lib/orphan-detector";
import { getPlatformInfo, getPlatformDisplayName } from "../../lib/platform";
import { getAvailableManagers } from "../../lib/package-managers";
import { colors } from "../../lib/theme";
import type { MenuState } from "../../hooks/useMenuAction";
import type { OrphanDetectionResult, OrphanedPackage } from "../../types/pkg-config";
import type { PlatformInfo } from "../../types/platform";

interface PendingPrompt {
  question: string;
  options: string[];
  resolve: (answer: string) => void;
}

interface PackageMenuProps {
  onBack: () => void;
}

export function PackageMenu({ onBack }: PackageMenuProps) {
  const [state, setState] = useState<MenuState>("menu");
  const [lines, setLines] = useState<string[]>([]);
  const [output, setOutput] = useState("");
  const [isStreamingOp, setIsStreamingOp] = useState(true);
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(null);
  const [success, setSuccess] = useState(true);
  const [orphanResult, setOrphanResult] = useState<OrphanDetectionResult | null>(null);
  const [isOrphanView, setIsOrphanView] = useState(false);
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
  const [availableManagerNames, setAvailableManagerNames] = useState<string[]>([]);
  const isRunningRef = useRef(false);

  useEffect(() => {
    async function loadPlatformInfo() {
      const info = await getPlatformInfo();
      setPlatformInfo(info);

      const managers = await getAvailableManagers();
      setAvailableManagerNames(managers.map((m) => m.displayName));
    }
    loadPlatformInfo();
  }, []);

  useInput((input, key) => {
    if (state === "menu" && (key.escape || key.leftArrow || input === "h")) {
      onBack();
    }
    if (state === "result" && !isOrphanView) {
      setState("menu");
      setLines([]);
    }
  });

  const callbacks: PkgSyncCallbacks = useMemo(
    () => ({
      onLog: (line: string) => {
        setLines((prev) => [...prev, line]);
      },
      onPrompt: (question: string, options: string[]) => {
        return new Promise<string>((resolve) => {
          setPendingPrompt({ question, options, resolve });
        });
      },
    }),
    []
  );

  const handlePromptAnswer = useCallback(
    (answer: string) => {
      if (pendingPrompt) {
        setLines((prev) => [...prev, `> ${answer}`]);
        pendingPrompt.resolve(answer);
        setPendingPrompt(null);
      }
    },
    [pendingPrompt]
  );

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
      case "orphans":
        setIsStreamingOp(false);
        setIsOrphanView(true);
        const orphanData = await detectOrphanedPackages();
        setOrphanResult(orphanData);
        result = { output: "", success: true };
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
      return <LoadingPanel title="Package Sync" />;
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
    if (isOrphanView && orphanResult) {
      const handleOrphanAction = async (
        action: "add" | "uninstall",
        pkg: OrphanedPackage
      ) => {
        if (action === "add") {
          await addToConfig(pkg);
        } else {
          await uninstallPackage(pkg);
        }
        const updated = await detectOrphanedPackages();
        setOrphanResult(updated);
      };

      return (
        <OrphanTable
          result={orphanResult}
          onAction={handleOrphanAction}
          onDismiss={() => {
            setIsOrphanView(false);
            setState("menu");
          }}
        />
      );
    }

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

  const platformDisplay = platformInfo
    ? getPlatformDisplayName(platformInfo)
    : "Detecting...";

  const managersDisplay = availableManagerNames.length > 0
    ? availableManagerNames.join(", ")
    : "Detecting...";

  return (
    <Panel title="Package Sync">
      <Box marginBottom={1} flexDirection="column">
        <Text>
          <Text dimColor>Platform: </Text>
          <Text color={colors.info}>{platformDisplay}</Text>
        </Text>
        <Text>
          <Text dimColor>Managers: </Text>
          <Text color={colors.info}>{managersDisplay}</Text>
        </Text>
      </Box>
      <VimSelect
        options={[
          { label: "Sync packages", value: "sync" },
          { label: "Sync with purge", value: "sync-purge" },
          { label: "Upgrade all (with verification)", value: "upgrade" },
          { label: "Upgrade interactive", value: "upgrade-interactive" },
          { label: "Update lockfile", value: "lock-update" },
          { label: "Lockfile status", value: "lock-status" },
          { label: "Find orphaned packages", value: "orphans" },
          { label: "Back", value: "back" },
        ]}
        onChange={handleAction}
      />
    </Panel>
  );
}
