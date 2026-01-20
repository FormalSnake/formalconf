<div align="center">

# ⚙️ FormalConf

### A macOS and Linux dotfiles management TUI built with React & Ink

[![Ink](https://img.shields.io/badge/Ink-5.0.1-00C7B7?style=for-the-badge&logo=react&logoColor=white)](https://github.com/vadimdemedes/ink)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-Runtime-F9F1E1?style=for-the-badge&logo=bun&logoColor=black)](https://bun.sh/)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Development](#development) • [Tech Stack](#tech-stack) • [Contributing](#contributing)

**Reference:** [My dotfiles](https://github.com/FormalSnake/dotfiles) - A complete working setup with configs, themes, and templates

</div>

---

## Features

### **Configuration Management**
- **GNU Stow integration** for symlink-based dotfile management
- **Stow, unstow, restow** operations for individual or all configs
- **Status checking** to verify symlink integrity
- Maintains clean home directory structure

### **Package Synchronization**
- **Homebrew formulas & casks** sync from a single JSON config (macOS)
- **Mac App Store apps** via `mas` CLI integration (macOS)
- **Pacman/AUR** support for Arch Linux
- **APT** support for Debian/Ubuntu
- **DNF** support for Fedora
- **Flatpak** for Linux (cross-distro)
- **Cargo** for Rust packages (cross-platform)
- **Purge mode** to remove unlisted packages
- **Lockfile support** for reproducible package installations
- Smart dependency detection prevents removal of system-critical apps

### **Theme System**
- **JSON-based themes** with template engine for config generation
- Application-specific theme configs (Ghostty, Btop, Neovim, Waybar, Hyprland, etc.)
- Theme discovery with metadata parsing (author, colors, light/dark mode)
- Background support as part of themes
- **15 bundled themes**: catppuccin, ethereal, everforest, flexoki, gruvbox, hackerman, kanagawa, matte-black, nord, orng, osaka-jade, ristretto, rose-pine, tokyo-night, vesper
- **Hook support** for custom scripts on theme change (wallpaper, notifications, etc.)

### **Interactive TUI**
- **Beautiful React-based interface** powered by Ink
- **Vim-style navigation** (hjkl, Enter, Esc)
- Breadcrumb navigation showing current context
- Real-time status indicators for theme and config state
- Responsive grid-based theme selector

---

## Installation

### Prerequisites

The following tools must be installed on your system:

| Tool | Purpose | Install |
|------|---------|---------|
| **Bun** | JavaScript runtime | [bun.sh](https://bun.sh/) |
| **GNU Stow** | Symlink manager | `brew install stow` |
| **Homebrew** | Package manager | [brew.sh](https://brew.sh/) |
| **mas** | Mac App Store CLI | `brew install mas` |
| **jq** | JSON processor | `brew install jq` |

### Quick Start

```bash
# Run directly with bunx (recommended)
bunx formalconf

# Or with npx
npx formalconf
```

[![npm](https://img.shields.io/npm/v/formalconf?style=flat-square&logo=npm)](https://www.npmjs.com/package/formalconf)

---

## Usage

### Configuration Directory

FormalConf expects your configuration files in `~/.config/formalconf/`:

```
~/.config/formalconf/
├── configs/           # Stow packages (aerospace, btop, fish, ghostty, git, hypr, neovim, tmux, waybar...)
├── themes/            # JSON theme files
├── templates/         # Template files for app configs
├── generated/         # Auto-generated theme configs
├── current/           # Symlinked current theme
│   ├── theme/         # Generated theme files
│   └── backgrounds/   # Theme wallpapers
├── hooks/             # Event hook scripts
│   └── theme-change/  # Scripts run after theme changes
├── pkg-config.json    # Package sync configuration
├── pkg-lock.json      # Package version lockfile
└── theme-config.json  # Device/default theme mapping
```

### Dotfile Configs

Place your dotfile packages in `~/.config/formalconf/configs/`. Each subdirectory is a "stow package" that mirrors your home directory structure:

```
configs/
└── nvim/
    └── .config/
        └── nvim/
            └── init.lua
```

When stowed, this creates: `~/.config/nvim/init.lua`

### Package Config

Define your packages in `pkg-config.json` (version 2 format with cross-platform support):

```json
{
  "version": 2,
  "config": {
    "purge": false,
    "purgeInteractive": true,
    "autoUpdate": true
  },
  "global": {
    "packages": ["bat", "btop", "neovim", "ripgrep", "tmux", "yazi"],
    "cargo": ["lumen"]
  },
  "macos": {
    "taps": ["oven-sh/bun"],
    "formulas": ["gh", "node", "rust"],
    "casks": ["ghostty", "raycast"],
    "mas": { "Xcode": 497799835 }
  },
  "archlinux": {
    "pacman": ["hyprland", "waybar", "ghostty"],
    "aur": ["hyprlauncher"]
  }
}
```

### Theme Format

FormalConf uses JSON-based themes with a template engine for generating application configs. Place theme files in `~/.config/formalconf/themes/`:

```json
{
  "title": "Catppuccin",
  "description": "Soothing pastel theme for the high-spirited",
  "author": "Catppuccin Org",
  "version": "1.0.0",
  "source": "https://github.com/catppuccin/catppuccin",
  "dark": {
    "color0": "#45475a",
    "color1": "#f38ba8",
    "background": "#1e1e2e",
    "foreground": "#cdd6f4",
    "cursor": "#f5e0dc",
    "selection_background": "#45475a",
    "accent": "#cba6f7",
    "border": "#313244"
  },
  "light": { /* same structure with light colors */ },
  "neovim": {
    "repo": "catppuccin/nvim",
    "colorscheme": "catppuccin-mocha",
    "light_colorscheme": "catppuccin-latte"
  }
}
```

### Templates

FormalConf ships with default templates for popular applications, but you can create your own or customize existing ones. Templates live in `~/.config/formalconf/templates/` and use a simple variable syntax:

```toml
# Example: ~/.config/formalconf/templates/alacritty.toml.template
[colors.primary]
background = "{{background}}"
foreground = "{{foreground}}"

[colors.cursor]
cursor = "{{cursor}}"

[colors.normal]
black = "{{color0}}"
red = "{{color1}}"
green = "{{color2}}"
# ... etc
```

**Template variables** are replaced with colors from the active theme's JSON. Available variables include:
- `{{background}}`, `{{foreground}}`, `{{cursor}}`, `{{accent}}`, `{{border}}`
- `{{color0}}` through `{{color15}}` (terminal palette)
- `{{selection_background}}`, `{{selection_foreground}}`

**Color modifiers** can transform colors: `{{background|lighten:10}}`, `{{accent|darken:20}}`, `{{color1|alpha:0.8}}`

**Conditionals** allow optional sections based on theme properties:

```lua
-- Example: ~/.config/formalconf/templates/neovim.lua.template
return {
  {
    "{{dark.neovim.repo}}",
    name = "formalconf-colorscheme",
    priority = 1000,
  },
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "{{dark.neovim.colorscheme}}",
    },
  },
{{#if dark.neovim.light_colorscheme}}
  {
    "f-person/auto-dark-mode.nvim",
    opts = {
      set_dark_mode = function()
        vim.cmd("colorscheme {{dark.neovim.colorscheme}}")
      end,
      set_light_mode = function()
        vim.cmd("colorscheme {{dark.neovim.light_colorscheme}}")
      end,
    },
  },
{{/if}}
}
```

The `{{#if property}}...{{/if}}` block is only included when the property exists in the theme JSON.

**Template modes:**
- **Single-mode** (`app.conf.template`) - One template for both variants
- **Partial-mode** (`app-dark.conf.template` + `app-light.conf.template`) - Separate templates per variant

Run `bun run theme --install-templates` to install the default templates, then modify them as needed. Your customizations are preserved across updates.

### Theme Hooks

Run custom scripts when a theme is applied. Useful for setting wallpapers, sending notifications, or triggering other theme-dependent actions.

**Setup:**
```bash
mkdir -p ~/.config/formalconf/hooks/theme-change
```

**Example hook** (`~/.config/formalconf/hooks/theme-change/wallpaper.sh`):
```bash
#!/usr/bin/env bash
BACKGROUNDS_DIR="$HOME/.config/formalconf/current/backgrounds"
mapfile -t FILES < <(find -L "$BACKGROUNDS_DIR" -maxdepth 1 -type f 2>/dev/null)
[[ ${#FILES[@]} -eq 0 ]] && exit 0
RANDOM_IDX=$((RANDOM % ${#FILES[@]}))
WALLPAPER="${FILES[$RANDOM_IDX]}"

case "$(uname -s)" in
  Darwin) osascript -e "tell application \"Finder\" to set desktop picture to POSIX file \"$WALLPAPER\"" ;;
  Linux) swww img "$WALLPAPER" --transition-type center --transition-duration 0.8 ;;
esac
```

Make executable: `chmod +x ~/.config/formalconf/hooks/theme-change/set-wallpaper.sh`

**Environment variables passed to hooks:**

| Variable | Description | Example |
|----------|-------------|---------|
| `FORMALCONF_THEME` | Theme name | `nord` |
| `FORMALCONF_THEME_DIR` | Full theme directory path | `~/.config/formalconf/themes/nord` |

Scripts run in alphabetical order. Failed hooks don't prevent theme application.

---

## Development

### Commands

```bash
bun run formalconf              # Launch interactive TUI
bun run config <cmd>            # Config management (stow, unstow, status, list, stow-all, unstow-all)
bun run pkg-sync                # Sync packages from pkg-config.json
bun run pkg-sync --purge        # Sync and remove unlisted packages
bun run pkg-lock                # Generate/update package lockfile
bun run theme <name>:<variant>  # Apply a theme (e.g., catppuccin:dark, tokyo-night:light)
bun run theme --install-templates  # Install/update default templates
bun run theme --template-status    # Check template versions
bun run theme --migrate <name>     # Migrate legacy theme to JSON format
bun run template update --all   # Update all templates (persists mode metadata)
bun run template list           # List installed templates with their type
bun run template check          # Check for available template updates
bun run template lock <name>    # Lock a template from updates
bun run template unlock <name>  # Unlock a template for updates
bun run typecheck               # Run TypeScript type checking
```

### Project Structure

```
src/
├── cli/              # Entry points (run directly with bun)
│   ├── formalconf.tsx    # Main TUI app
│   ├── config-manager.ts # Stow operations
│   ├── pkg-sync.ts       # Homebrew/MAS sync
│   └── set-theme.ts      # Theme switching
├── components/       # Ink React components
│   ├── layout/           # Layout primitives (Panel, Breadcrumb, Footer)
│   └── ui/               # UI elements (StatusIndicator, Divider)
├── hooks/            # React hooks (useTerminalSize, useSystemStatus)
├── lib/              # Shared utilities
│   ├── paths.ts          # Path constants (CONFIG_DIR, THEMES_DIR)
│   ├── shell.ts          # Command execution helpers
│   ├── config.ts         # Config loading
│   └── theme.ts          # Theme colors
└── types/            # TypeScript type definitions
```

---

## Architecture

FormalConf combines three systems into a unified TUI:

1. **Configuration Manager** - Wraps GNU Stow for symlink-based dotfile management
2. **Package Sync** - Orchestrates cross-platform package synchronization (Homebrew, Pacman, APT, DNF, Flatpak, Cargo)
3. **Theme Switcher** - Manages JSON themes via template engine

### Key Concepts

- **Stow Packages** - Each config directory mirrors your home directory structure
- **Session Isolation** - Package configs are separate from dotfile configs
- **Theme Metadata** - Themes include author, description, and color information
- **Lockfiles** - Enable reproducible package installations across machines

---

## Tech Stack

<div align="center">

| Category | Technologies |
|----------|-------------|
| **Runtime** | Bun |
| **UI Framework** | Ink, React |
| **Language** | TypeScript |
| **Config Management** | GNU Stow |
| **Package Management** | Homebrew, mas, Pacman, AUR, APT, DNF, Flatpak, Cargo |
| **Theme Format** | JSON + Templates |

</div>

---

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Run `bun run typecheck` before committing
- Keep commits focused and descriptive
- Follow existing code patterns

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Symlink management powered by [GNU Stow](https://www.gnu.org/software/stow/)
- Terminal UI built with [Ink](https://github.com/vadimdemedes/ink)

---

<div align="center">

**Made with ❤️ by [formalsnake.dev](https://formalsnake.dev)**

⭐ Star this repo if you find it useful!

</div>
