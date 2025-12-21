export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export async function exec(command: string[], cwd?: string): Promise<ShellResult> {
  const proc = Bun.spawn(command, {
    stdout: "pipe",
    stderr: "pipe",
    cwd,
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode,
    success: exitCode === 0,
  };
}

export async function execLive(command: string[], cwd?: string): Promise<number> {
  const proc = Bun.spawn(command, {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    cwd,
  });
  return await proc.exited;
}

export async function commandExists(cmd: string): Promise<boolean> {
  const result = await exec(["which", cmd]);
  return result.success;
}
