import { readFile, writeFile, mkdir, rm } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const ROOT_DIR = join(import.meta.dir, "..");
const DIST_DIR = join(ROOT_DIR, "dist");
const SRC_DIR = join(ROOT_DIR, "src");

async function build() {
  console.log("Building formalconf...\n");

  // Clean dist directory
  if (existsSync(DIST_DIR)) {
    await rm(DIST_DIR, { recursive: true });
  }
  await mkdir(DIST_DIR);

  // Build the main entry point with all dependencies bundled
  console.log("Bundling application...");
  const result = await Bun.build({
    entrypoints: [join(SRC_DIR, "cli", "formalconf.tsx")],
    outdir: DIST_DIR,
    target: "node",
    format: "esm",
    external: ["react", "ink", "@inkjs/ui"],
    minify: false,
  });

  if (!result.success) {
    console.error("Build failed:");
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  // Add shebang to the output file
  console.log("Adding shebang...");
  const outputPath = join(DIST_DIR, "formalconf.js");
  const content = await readFile(outputPath, "utf-8");
  await writeFile(outputPath, `#!/usr/bin/env node\n${content}`);

  // Make the file executable
  await Bun.$`chmod +x ${outputPath}`;

  console.log("\nBuild complete!");
  console.log(`Output: ${outputPath}`);
}

build().catch((err) => {
  console.error("Build error:", err);
  process.exit(1);
});
