import { join } from "path";
import { existsSync, readdirSync, statSync } from "fs";
import { exec } from "./runtime";
import { HOOKS_DIR } from "./paths";

export interface HookResult {
  script: string;
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface HookSummary {
  executed: number;
  succeeded: number;
  failed: number;
  results: HookResult[];
}

/**
 * Execute all scripts in hooks/<hookType>/ directory
 * Scripts run in alphabetical order with context passed via environment variables
 */
export async function runHooks(
  hookType: string,
  env: Record<string, string> = {}
): Promise<HookSummary> {
  const hookDir = join(HOOKS_DIR, hookType);

  // Return early if hook directory doesn't exist
  if (!existsSync(hookDir)) {
    return { executed: 0, succeeded: 0, failed: 0, results: [] };
  }

  // Get all files in the hook directory, sorted alphabetically
  const entries = readdirSync(hookDir)
    .filter((name) => !name.startsWith(".")) // Skip hidden files
    .sort();

  const results: HookResult[] = [];

  for (const entry of entries) {
    const scriptPath = join(hookDir, entry);

    // Skip directories
    const stat = statSync(scriptPath);
    if (stat.isDirectory()) {
      continue;
    }

    // Execute the script
    const result = await exec([scriptPath], undefined, env);

    results.push({
      script: entry,
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    });
  }

  const succeeded = results.filter((r) => r.success).length;

  return {
    executed: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
}
