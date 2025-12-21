import { useState, useCallback } from "react";

export type MenuState = "menu" | "running" | "result";

export interface ActionResult {
  output: string;
  success: boolean;
}

export interface UseMenuActionReturn {
  state: MenuState;
  output: string;
  success: boolean;
  isRunning: boolean;
  isResult: boolean;
  execute: (action: () => Promise<ActionResult>) => Promise<void>;
  reset: () => void;
}

export function useMenuAction(): UseMenuActionReturn {
  const [state, setState] = useState<MenuState>("menu");
  const [output, setOutput] = useState("");
  const [success, setSuccess] = useState(true);

  const execute = useCallback(async (action: () => Promise<ActionResult>) => {
    setState("running");
    const result = await action();
    setOutput(result.output);
    setSuccess(result.success);
    setState("result");
  }, []);

  const reset = useCallback(() => {
    setState("menu");
  }, []);

  return {
    state,
    output,
    success,
    isRunning: state === "running",
    isResult: state === "result",
    execute,
    reset,
  };
}
