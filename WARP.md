# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- FormalConf is a macOS-focused dotfiles management system. It provides:
  - GNU Stow–based configuration management (configs/)
  - Homebrew/package synchronization driven by pkg-config.json
  - A symlink-based theme system (themes/) applied to ~/.config/formalconf/current/theme
  - An interactive TUI to orchestrate everything

Prerequisites (macOS)
- Install required tools:

```bash
brew install stow jq mas
```

Common commands
- Launch TUI (recommended):

```bash
./formalconf.sh
```

- Configuration management (GNU Stow):
  - List available packages:

```bash
./config-manager.sh list
```

  - Check link status of all packages:

```bash
./config-manager.sh status
```

  - Link all packages / remove all links:

```bash
./config-manager.sh stow-all
./config-manager.sh unstow-all
```

  - Link, re-link, or remove a single package (example: fish):

```bash
./config-manager.sh stow fish
./config-manager.sh restow fish
./config-manager.sh unstow fish
```

  - Adopt existing local config into the repo (moves files, then stows):

```bash
./config-manager.sh adopt fish
```

- Package synchronization (Homebrew + casks + Mac App Store):
  - Sync to match pkg-config.json:

```bash
./pkg-sync.sh pkg-config.json
```

  - Sync with purge (remove items not listed in config):

```bash
jq '.config.purge = true' ~/.config/formalconf/pkg-config.json > ~/.config/formalconf/pkg-config-purge.json && \
  ./pkg-sync.sh ~/.config/formalconf/pkg-config-purge.json && \
  rm ~/.config/formalconf/pkg-config-purge.json
```

  - Upgrade flows (no JSON needed):

```bash
# Upgrade everything automatically
./pkg-sync.sh --upgrade-only

# Upgrade interactively (choose packages/casks/MAS apps)
./pkg-sync.sh --upgrade-interactive
```

- Theme management:
  - List themes and usage:

```bash
./set-theme.sh
```

  - Apply a theme (example: tokyo-night):

```bash
./set-theme.sh tokyo-night
```

Notes
- pkg-config.json is automatically symlinked to ~/.config/formalconf/pkg-config.json on first run of ./formalconf.sh (if not already present). You can edit it directly:

```bash
${EDITOR:-nano} ~/.config/formalconf/pkg-config.json
```

High-level architecture
- Interactive TUI (formalconf.sh)
  - Entry point that presents menus for three domains: Config Manager, Package Sync, Set Theme
  - Ensures ~/.config/formalconf exists and links pkg-config.json for convenient editing and reuse
- Configuration management (config-manager.sh)
  - Uses GNU Stow to create/remove symlinks from configs/ into the home directory
  - Supports per-package operations (stow, restow, unstow), bulk operations (stow-all, unstow-all), status reporting, and adoption (migrates existing files into repo, then stows)
- Package synchronization (pkg-sync.sh)
  - JSON-driven via pkg-config.json with config, taps, packages (formulae), casks, and mas sections
  - Modes: full sync (install), upgrade-only, upgrade-interactive; optional purge mode removes items not in config while protecting dependencies and system apps
  - Handles taps, formulae, casks, and MAS apps in one unified flow; performs brew update when configured
- Theme system (set-theme.sh)
  - Applies themes by symlinking all files from themes/<theme>/ into ~/.config/formalconf/current/theme
  - Each app (e.g., Ghostty, btop, Neovim) reads from that current/theme directory, enabling instant switching without copying files

Repository structure (essentials only)
- configs/: Per-application packages laid out in GNU Stow format (mirrors $HOME). Example packages include fish, neovim, tmux, ghostty, btop, aerospace, git
- themes/: Theme variants (e.g., tokyo-night, matte-black, catppuccin, everforest) containing app-specific theme files (ghostty.conf, btop.theme, neovim.lua, etc.)
- pkg-config.json: Declarative definition of taps, packages, casks, and MAS apps; includes config flags purge and autoUpdate
- Core scripts: formalconf.sh, config-manager.sh, pkg-sync.sh, set-theme.sh

Troubleshooting (quick)
- Stow conflicts (file already exists at target):

```bash
./config-manager.sh unstow-all && ./config-manager.sh stow-all
```

- Package sync issues:

```bash
brew update && brew doctor
./pkg-sync.sh ~/.config/formalconf/pkg-config.json
```

Relevant guidance from CLAUDE.md (applied here)
- Use ./formalconf.sh for the main interface; use ./config-manager.sh for direct GNU Stow ops; ./pkg-sync.sh for Homebrew/casks/MAS; ./set-theme.sh for themes
- The system is symlink-first: both dotfile packages and themes rely on symlinks for instant switching
- pkg-config.json is the single source of truth for package state; purge mode enforces exact alignment with config
