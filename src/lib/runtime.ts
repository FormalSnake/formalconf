import { spawn as nodeSpawn } from "child_process";
import { readFile as nodeReadFile, writeFile as nodeWriteFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { fileURLToPath } from "url";

// Runtime detection
export const isBun = typeof Bun !== "undefined";

// Shell result type
export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

// Spawn abstraction - uses Bun.spawn or child_process.spawn
export async function exec(command: string[], cwd?: string): Promise<ShellResult> {
  if (isBun) {
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

  // Node fallback
  return new Promise((resolve) => {
    const [cmd, ...args] = command;
    const proc = nodeSpawn(cmd, args, { cwd, shell: false });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => { stdout += data; });
    proc.stderr?.on("data", (data) => { stderr += data; });

    proc.on("close", (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 1,
        success: code === 0,
      });
    });
  });
}

// Live exec with inherited stdio
export async function execLive(command: string[], cwd?: string): Promise<number> {
  if (isBun) {
    const proc = Bun.spawn(command, {
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
      cwd,
    });
    return await proc.exited;
  }

  // Node fallback
  return new Promise((resolve) => {
    const [cmd, ...args] = command;
    const proc = nodeSpawn(cmd, args, {
      cwd,
      stdio: "inherit",
      shell: false,
    });

    proc.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

// Streaming exec - pipes output to callback line by line
export async function execStreaming(
  command: string[],
  onLine: (line: string) => void,
  cwd?: string
): Promise<number> {
  if (isBun) {
    const proc = Bun.spawn(command, {
      stdout: "pipe",
      stderr: "pipe",
      cwd,
    });

    const processStream = async (stream: ReadableStream<Uint8Array>) => {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          onLine(line);
        }
      }

      if (buffer) {
        onLine(buffer);
      }
    };

    await Promise.all([
      processStream(proc.stdout),
      processStream(proc.stderr),
    ]);

    return await proc.exited;
  }

  // Node fallback
  return new Promise((resolve) => {
    const [cmd, ...args] = command;
    const proc = nodeSpawn(cmd, args, { cwd, shell: false });

    const processData = (data: Buffer) => {
      const text = data.toString();
      const lines = text.split("\n");
      for (const line of lines) {
        if (line) onLine(line);
      }
    };

    proc.stdout?.on("data", processData);
    proc.stderr?.on("data", processData);

    proc.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

// Streaming exec with TTY access - for commands that need sudo/Touch ID
export async function execStreamingWithTTY(
  command: string[],
  onLine: (line: string) => void,
  cwd?: string
): Promise<number> {
  if (isBun) {
    const proc = Bun.spawn(command, {
      stdout: "pipe",
      stderr: "pipe",
      stdin: "inherit",
      cwd,
    });

    const processStream = async (stream: ReadableStream<Uint8Array>) => {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          onLine(line);
        }
      }

      if (buffer) {
        onLine(buffer);
      }
    };

    await Promise.all([
      processStream(proc.stdout),
      processStream(proc.stderr),
    ]);

    return await proc.exited;
  }

  // Node fallback
  return new Promise((resolve) => {
    const [cmd, ...args] = command;
    const proc = nodeSpawn(cmd, args, {
      cwd,
      shell: false,
      stdio: ["inherit", "pipe", "pipe"],
    });

    const processData = (data: Buffer) => {
      const text = data.toString();
      const lines = text.split("\n");
      for (const line of lines) {
        if (line) onLine(line);
      }
    };

    proc.stdout?.on("data", processData);
    proc.stderr?.on("data", processData);

    proc.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

// File read abstraction - JSON
export async function readJson<T = unknown>(path: string): Promise<T> {
  if (isBun) {
    return Bun.file(path).json();
  }
  const content = await nodeReadFile(path, "utf-8");
  return JSON.parse(content);
}

// File read abstraction - text
export async function readText(path: string): Promise<string> {
  if (isBun) {
    return Bun.file(path).text();
  }
  return nodeReadFile(path, "utf-8");
}

// File write abstraction
export async function writeFile(path: string, content: string): Promise<void> {
  if (isBun) {
    await Bun.write(path, content);
    return;
  }
  await nodeWriteFile(path, content, "utf-8");
}

// mkdir abstraction
export async function ensureDir(path: string): Promise<void> {
  if (isBun) {
    await Bun.$`mkdir -p ${path}`.quiet();
    return;
  }
  await mkdir(path, { recursive: true });
}

// Get script directory - works in both Bun and Node
export function getScriptDir(importMeta: ImportMeta): string {
  if (isBun && importMeta.dir) {
    return importMeta.dir;
  }
  // Node 20.11+ has import.meta.dirname, fallback to fileURLToPath
  if ((importMeta as any).dirname) {
    return (importMeta as any).dirname;
  }
  return dirname(fileURLToPath(importMeta.url));
}

// Check if command exists
export async function commandExists(cmd: string): Promise<boolean> {
  const result = await exec(["which", cmd]);
  return result.success;
}
