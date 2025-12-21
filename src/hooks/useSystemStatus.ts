import { useState, useEffect } from "react";
import { existsSync, readlinkSync, readdirSync } from "fs";
import { THEME_TARGET_DIR, CONFIGS_DIR } from "../lib/paths";
import { basename } from "path";

interface SystemStatus {
  currentTheme: string | null;
  configsLinked: boolean;
  loading: boolean;
}

export function useSystemStatus(): SystemStatus {
  const [status, setStatus] = useState<SystemStatus>({
    currentTheme: null,
    configsLinked: false,
    loading: true,
  });

  useEffect(() => {
    let theme: string | null = null;
    try {
      if (existsSync(THEME_TARGET_DIR)) {
        const target = readlinkSync(THEME_TARGET_DIR);
        theme = basename(target);
      }
    } catch {}

    let configsLinked = false;
    try {
      if (existsSync(CONFIGS_DIR)) {
        const entries = readdirSync(CONFIGS_DIR);
        configsLinked = entries.length > 0;
      }
    } catch {}

    setStatus({
      currentTheme: theme,
      configsLinked,
      loading: false,
    });
  }, []);

  return status;
}
