import { join } from "path";
import { existsSync } from "fs";
import { CONFIGS_DIR, THEMES_DIR, PKG_CONFIG_PATH, ensureDir } from "./paths";
import { writeFile } from "./runtime";

// Example config package
const EXAMPLE_CONFIG_README = `# Example Stow Config Package

This is an example dotfiles package for use with GNU Stow.

## Structure
Files are organized to mirror your home directory:
- \`.config/example-app/config.toml\` -> \`~/.config/example-app/config.toml\`
- \`.example-app-rc\` -> \`~/.example-app-rc\`

## Usage
1. Place your dotfiles in this directory structure
2. Run \`formalconf\` and use Config Manager -> Stow
3. Symlinks will be created from your home directory

## Creating Your Own
1. Copy this directory and rename it (e.g., \`git\`, \`zsh\`, \`nvim\`)
2. Add your dotfiles mirroring your home directory structure
3. Stow the package to create symlinks
`;

const EXAMPLE_CONFIG_TOML = `# Example configuration file
# This will be symlinked to ~/.config/example-app/config.toml

[settings]
theme = "default"
auto_save = true

[keybindings]
quit = "q"
save = "ctrl+s"
`;

const EXAMPLE_RC = `# Example rc file
# This will be symlinked to ~/.example-app-rc
export EXAMPLE_VAR="hello"
`;

// Example theme
const EXAMPLE_THEME_YAML = `name: Example Theme
author: Your Name
description: A template theme for FormalConf
version: 1.0.0

colors:
  primary: "#5eead4"
  secondary: "#2dd4bf"
  background: "#1a1a2e"
  foreground: "#e4e4e7"
  accent: "#06b6d4"
`;

const EXAMPLE_NEOVIM_LUA = `-- Neovim colorscheme configuration
-- This file is symlinked when the theme is applied
return {
  {
    "your-colorscheme/nvim",
    name = "example-theme",
    priority = 1000,
  },
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "example-theme",
    },
  },
}
`;

const EXAMPLE_GHOSTTY_CONF = `# Ghostty terminal theme
# Add your terminal colors here
theme = example-theme
`;

const THEME_README = `# Example Theme

This is a template theme for FormalConf.

## Structure
- \`theme.yaml\` - Theme metadata and color definitions
- \`neovim.lua\` - Neovim colorscheme config
- \`ghostty.conf\` - Ghostty terminal theme
- \`backgrounds/\` - Wallpaper images (optional)

## Creating Your Own Theme
1. Copy this directory and rename it
2. Update \`theme.yaml\` with your theme info
3. Add config files for your applications
4. Files are symlinked to ~/.config/formalconf/current/theme/
`;

const BACKGROUNDS_README = `# Backgrounds

Place wallpaper images here:
- Supported formats: PNG, JPG
- These will be available at ~/.config/formalconf/current/backgrounds/
`;

// Directory READMEs
const CONFIGS_README = `# Configs Directory

This directory contains your stow packages - collections of dotfiles
that are symlinked to your home directory.

## Creating a Config Package

1. Create a new directory: \`mkdir my-app\`
2. Add files mirroring your home directory structure
3. Use FormalConf to stow the package

## Example Structure
\`\`\`
my-app/
  .config/
    my-app/
      config.toml    -> ~/.config/my-app/config.toml
  .my-app-rc         -> ~/.my-app-rc
\`\`\`

## Commands
- Stow: Creates symlinks from home directory to these files
- Unstow: Removes the symlinks
- Status: Shows which packages are stowed
`;

const THEMES_README = `# Themes Directory

Themes contain application-specific config files that define colors and styling.

## Theme Structure
\`\`\`
my-theme/
  theme.yaml         # Theme metadata (required)
  neovim.lua         # Neovim colorscheme
  ghostty.conf       # Terminal theme
  backgrounds/       # Wallpaper images
\`\`\`

## Applying Themes
Select a theme in FormalConf to symlink its files to:
\`~/.config/formalconf/current/theme/\`

Your applications should source files from this location.
`;

export async function installExampleConfig(): Promise<void> {
  const dest = join(CONFIGS_DIR, "example-config");
  if (existsSync(dest)) return;

  await ensureDir(dest);
  await ensureDir(join(dest, ".config", "example-app"));

  await writeFile(join(dest, "README.md"), EXAMPLE_CONFIG_README);
  await writeFile(join(dest, ".config", "example-app", "config.toml"), EXAMPLE_CONFIG_TOML);
  await writeFile(join(dest, ".example-app-rc"), EXAMPLE_RC);
}

export async function installExampleTheme(): Promise<void> {
  const dest = join(THEMES_DIR, "example-theme");
  if (existsSync(dest)) return;

  await ensureDir(dest);
  await ensureDir(join(dest, "backgrounds"));

  await writeFile(join(dest, "theme.yaml"), EXAMPLE_THEME_YAML);
  await writeFile(join(dest, "neovim.lua"), EXAMPLE_NEOVIM_LUA);
  await writeFile(join(dest, "ghostty.conf"), EXAMPLE_GHOSTTY_CONF);
  await writeFile(join(dest, "backgrounds", "README.md"), BACKGROUNDS_README);
  await writeFile(join(dest, "README.md"), THEME_README);
}

export async function installReadmes(): Promise<void> {
  const configsReadme = join(CONFIGS_DIR, "README.md");
  const themesReadme = join(THEMES_DIR, "README.md");

  if (!existsSync(configsReadme)) {
    await writeFile(configsReadme, CONFIGS_README);
  }
  if (!existsSync(themesReadme)) {
    await writeFile(themesReadme, THEMES_README);
  }
}

const DEFAULT_PKG_CONFIG = {
  config: {
    purge: false,
    purgeInteractive: true,
    autoUpdate: true,
  },
  taps: [],
  packages: [],
  casks: [],
  mas: {},
};

export async function installPkgConfig(): Promise<void> {
  if (existsSync(PKG_CONFIG_PATH)) return;
  await writeFile(PKG_CONFIG_PATH, JSON.stringify(DEFAULT_PKG_CONFIG, null, 2));
}
