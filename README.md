<div align="center">

# ⚙️ FormalConf

### A macOS dotfiles management TUI built with React & Ink

[![Ink](https://img.shields.io/badge/Ink-5.0.1-00C7B7?style=for-the-badge&logo=react&logoColor=white)](https://github.com/vadimdemedes/ink)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-Runtime-F9F1E1?style=for-the-badge&logo=bun&logoColor=black)](https://bun.sh/)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Development](#development) • [Tech Stack](#tech-stack) • [Contributing](#contributing)

</div>

---

## Features

### **Configuration Management**
- **GNU Stow integration** for symlink-based dotfile management
- **Stow, unstow, restow** operations for individual or all configs
- **Status checking** to verify symlink integrity
- Maintains clean home directory structure

### **Package Synchronization**
- **Homebrew formulas & casks** sync from a single JSON config
- **Mac App Store apps** via `mas` CLI integration
- **Purge mode** to remove unlisted packages
- **Lockfile support** for reproducible package installations
- Smart dependency detection prevents removal of system-critical apps

### **Theme System**
- **Omarchy-compatible themes** with symlink-based switching
- Application-specific theme configs (Ghostty, Btop, Neovim, etc.)
- Theme discovery with metadata parsing (author, colors, light/dark mode)
- Background support as part of themes

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
├── configs/           # Your dotfile packages (stow directories)
│   ├── nvim/          # Example: Neovim config
│   ├── tmux/          # Example: tmux config
│   └── ...
├── themes/            # Omarchy-compatible themes
├── pkg-config.json    # Package sync configuration
└── pkg-lock.json      # Package version lockfile
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

Define your packages in `pkg-config.json`:

```json
{
  "config": {
    "purge": false,
    "autoUpdate": true
  },
  "taps": ["oven-sh/bun"],
  "packages": ["neovim", "tmux", "ripgrep"],
  "casks": ["ghostty", "raycast"],
  "mas": {
    "Xcode": 497799835
  }
}
```

### Theme Compatibility

FormalConf supports [Omarchy themes](https://learn.omacom.io/2/the-omarchy-manual/52/themes). Place themes in `~/.config/formalconf/themes/` following the Omarchy theme structure.

---

## Development

### Commands

```bash
bun run formalconf        # Launch interactive TUI
bun run config <cmd>      # Config management (stow, unstow, status, list, stow-all, unstow-all)
bun run pkg-sync          # Sync packages from pkg-config.json
bun run pkg-sync --purge  # Sync and remove unlisted packages
bun run theme <name>      # Apply a theme
bun run typecheck         # Run TypeScript type checking
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
2. **Package Sync** - Orchestrates Homebrew and Mac App Store package synchronization
3. **Theme Switcher** - Manages Omarchy-compatible themes via symlinks

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
| **Package Management** | Homebrew, mas |
| **Theme Format** | Omarchy-compatible |

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
- Theme format compatible with [Omarchy](https://learn.omacom.io/2/the-omarchy-manual/52/themes)

---

<div align="center">

**Made with ❤️ by [formalsnake.dev](https://formalsnake.dev)**

⭐ Star this repo if you find it useful!

</div>
