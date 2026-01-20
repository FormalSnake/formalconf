# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- FormalConf is a cross-platform dotfiles management system for macOS and Linux. It provides:
  - GNU Stow–based configuration management (configs/)
  - Cross-platform package synchronization driven by pkg-config.json (Homebrew, Pacman, AUR, APT, DNF, Flatpak, Cargo)
  - A JSON-based theme system with template engine for generating app configs
  - An interactive TUI built with React/Ink to orchestrate everything

Prerequisites
- macOS: `brew install stow jq mas`
- Arch Linux: `sudo pacman -S stow jq`
- Debian/Ubuntu: `sudo apt install stow jq`

Common commands
- Launch TUI (recommended):

```bash
bun run formalconf
```

- Configuration management (GNU Stow):
  - List available packages:

```bash
bun run config list
```

  - Check link status of all packages:

```bash
bun run config status
```

  - Link all packages / remove all links:

```bash
bun run config stow-all
bun run config unstow-all
```

  - Link, re-link, or remove a single package (example: fish):

```bash
bun run config stow fish
bun run config restow fish
bun run config unstow fish
```

  - Adopt existing local config into the repo (moves files, then stows):

```bash
bun run config adopt fish
```

- Package synchronization:
  - Sync to match pkg-config.json:

```bash
bun run pkg-sync
```

  - Sync with purge (remove items not listed in config):

```bash
bun run pkg-sync --purge
```

  - Generate/update package lockfile:

```bash
bun run pkg-lock
```

- Theme management:
  - List themes and usage:

```bash
bun run theme
```

  - Apply a theme with variant (example: tokyo-night dark mode):

```bash
bun run theme tokyo-night:dark
```

  - Install/update default templates:

```bash
bun run theme --install-templates
```

  - Check template versions:

```bash
bun run theme --template-status
```

  - Migrate legacy theme to JSON format:

```bash
bun run theme --migrate my-legacy-theme
```

Notes
- pkg-config.json is located at ~/.config/formalconf/pkg-config.json. You can edit it directly:

```bash
${EDITOR:-nano} ~/.config/formalconf/pkg-config.json
```

High-level architecture
- Interactive TUI (src/cli/formalconf.tsx)
  - Entry point that presents menus for three domains: Config Manager, Package Sync, Set Theme
  - Built with React and Ink for a rich terminal UI experience
  - Ensures ~/.config/formalconf exists with required directories
- Configuration management (src/cli/config-manager.ts)
  - Uses GNU Stow to create/remove symlinks from configs/ into the home directory
  - Supports per-package operations (stow, restow, unstow), bulk operations (stow-all, unstow-all), status reporting, and adoption
- Package synchronization (src/cli/pkg-sync.ts)
  - JSON-driven via pkg-config.json with version 2 format supporting cross-platform packages
  - Handles Homebrew (taps, formulas, casks, MAS) on macOS
  - Handles Pacman, AUR on Arch Linux; APT on Debian/Ubuntu; DNF on Fedora
  - Cross-platform support for Flatpak and Cargo
  - Optional purge mode removes items not in config while protecting dependencies
- Theme system (src/cli/set-theme.ts)
  - JSON-based themes with template engine for generating app configs
  - Supports dark/light variants per theme
  - Generates configs for 18+ applications (Ghostty, btop, Neovim, Waybar, Hyprland, etc.)
  - Symlinks generated configs to ~/.config/formalconf/current/theme

Repository structure (essentials only)
- src/cli/: TypeScript entry points for CLI commands
- src/components/: React/Ink UI components
- src/lib/: Shared utilities (shell execution, paths, template engine, theme loading)
- configs/: Per-application packages laid out in GNU Stow format (mirrors $HOME)
- templates/themes/: JSON theme files (catppuccin, tokyo-night, nord, etc.)
- templates/: Default template files for app config generation

Troubleshooting (quick)
- Stow conflicts (file already exists at target):

```bash
bun run config unstow-all && bun run config stow-all
```

- Package sync issues:

```bash
brew update && brew doctor  # macOS
bun run pkg-sync
```

- Type checking:

```bash
bun run typecheck
```

Relevant guidance from CLAUDE.md (applied here)
- Use `bun run formalconf` for the main interface; use `bun run config` for direct GNU Stow ops; `bun run pkg-sync` for packages; `bun run theme` for themes
- The system is symlink-first: dotfile packages use Stow symlinks, themes use template-generated configs
- pkg-config.json is the single source of truth for package state; purge mode enforces exact alignment with config
