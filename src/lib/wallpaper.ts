/**
 * Wallpaper Download Utilities
 *
 * Handles downloading and managing theme wallpapers.
 */

import { existsSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import { BACKGROUNDS_TARGET_DIR, ensureDir } from "./paths";
import type { ThemeWallpapers } from "../types/theme-schema";

export interface WallpaperResult {
  success: boolean;
  path?: string;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Clears all files from the backgrounds directory
 */
export function clearBackgroundsDir(): void {
  if (!existsSync(BACKGROUNDS_TARGET_DIR)) {
    return;
  }

  const entries = readdirSync(BACKGROUNDS_TARGET_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() || entry.isSymbolicLink()) {
      unlinkSync(join(BACKGROUNDS_TARGET_DIR, entry.name));
    }
  }
}

/**
 * Extracts file extension from URL or content-type
 */
function getExtension(url: string, contentType: string): string {
  // Try to get extension from URL
  const urlPath = new URL(url).pathname;
  const urlExt = urlPath.split(".").pop()?.toLowerCase();
  if (urlExt && ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(urlExt)) {
    return urlExt;
  }

  // Fall back to content-type
  const typeMap: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/bmp": "bmp",
  };

  return typeMap[contentType] || "png";
}

/**
 * Downloads a wallpaper from a URL
 */
export async function downloadWallpaper(
  url: string,
  filename: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<WallpaperResult> {
  // Validate URL protocol
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return { success: false, error: "URL must use http or https protocol" };
    }
  } catch {
    return { success: false, error: "Invalid URL" };
  }

  // Ensure backgrounds directory exists
  await ensureDir(BACKGROUNDS_TARGET_DIR);

  // Fetch with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      };
    }

    // Validate content-type
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return {
        success: false,
        error: `Invalid content type: ${contentType} (expected image/*)`,
      };
    }

    // Check content-length if available
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large: ${Math.round(parseInt(contentLength, 10) / 1024 / 1024)}MB (max 50MB)`,
      };
    }

    // Get the response body
    const arrayBuffer = await response.arrayBuffer();

    // Validate actual size
    if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large: ${Math.round(arrayBuffer.byteLength / 1024 / 1024)}MB (max 50MB)`,
      };
    }

    // Determine extension and write file
    const ext = getExtension(url, contentType);
    const outputPath = join(BACKGROUNDS_TARGET_DIR, `${filename}.${ext}`);

    await Bun.write(outputPath, arrayBuffer);

    return { success: true, path: outputPath };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: `Download timed out after ${timeoutMs / 1000}s` };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Downloads wallpapers for a theme based on the current mode
 */
export async function downloadThemeWallpapers(
  wallpapers: ThemeWallpapers,
  mode: "dark" | "light"
): Promise<{ paths: string[]; errors: string[] }> {
  // Clear existing backgrounds
  clearBackgroundsDir();

  // Determine which URLs to use
  // For light mode: use light URLs if available, else fall back to dark
  // For dark mode: always use dark URLs
  const urls = mode === "light" && wallpapers.light && wallpapers.light.length > 0
    ? wallpapers.light
    : wallpapers.dark;

  const paths: string[] = [];
  const errors: string[] = [];

  // Download all wallpapers
  for (let i = 0; i < urls.length; i++) {
    const filename = urls.length === 1 ? "wallpaper" : `wallpaper-${i + 1}`;
    const result = await downloadWallpaper(urls[i], filename);

    if (result.success && result.path) {
      paths.push(result.path);
    } else if (result.error) {
      errors.push(`[${i + 1}] ${result.error}`);
    }
  }

  return { paths, errors };
}
