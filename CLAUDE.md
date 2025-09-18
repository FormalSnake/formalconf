# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Scripts
- `./formalconf.sh` - Launch interactive TUI for all management tasks
- `./config-manager.sh <command>` - Direct dotfile management with GNU Stow
- `./pkg-sync.sh pkg-config.json` - Synchronize packages from configuration
- `./set-theme.sh <theme-name>` - Apply visual theme across applications

### Common Development Tasks
- **Test config changes**: `./config-manager.sh status` - Check link status
- **Apply all configs**: `./config-manager.sh stow-all` - Link all dotfiles
- **Remove all configs**: `./config-manager.sh unstow-all` - Remove all links
- **List available packages**: `./config-manager.sh list`
- **Import existing config**: `./config-manager.sh adopt <package-name>`
- **List themes**: `./set-theme.sh` (no arguments)
- **Package sync with purge**: Modify `pkg-config.json` config.purge to true

## Architecture

### System Overview
FormalConf is a comprehensive dotfiles management system for macOS that combines:
- **GNU Stow-based configuration management** for symlink-based dotfile deployment
- **Homebrew package synchronization** with intelligent dependency handling
- **Symlink-based theme system** for instant visual theme switching

### Core Components

#### Configuration Management (`config-manager.sh`)
- Uses GNU Stow for dotfile symlink management
- Packages stored in `configs/` directory with home directory structure
- Supports adoption of existing configurations into the repo
- Each package in `configs/` maintains the target home directory structure

#### Package Synchronization (`pkg-sync.sh`)
- Driven by `pkg-config.json` configuration file
- Supports Homebrew packages, casks, and Mac App Store apps via `mas`
- Intelligent purge mode that preserves system dependencies
- Handles taps, packages, casks, and MAS apps in unified workflow

#### Theme System (`set-theme.sh`)
- Themes stored in `themes/` directory with per-application config files
- Uses symlinks to `~/.config/formalconf/current/theme/` for instant switching
- Each theme contains app-specific configuration files (e.g., `ghostty.conf`, `btop.theme`)
- Applications read from the symlinked theme directory

#### Interactive TUI (`formalconf.sh`)
- Main user interface with colored menu system
- Provides access to all core functionality
- Submenu navigation for different management areas

### Directory Structure
```
configs/               # Dotfile packages (GNU Stow format)
├── aerospace/         # Window manager config
├── fish/             # Shell configuration
├── neovim/           # Editor configuration
└── ...

themes/               # Visual themes
├── tokyo-night/      # Theme variant
├── matte-black/      # Theme variant
└── ...

pkg-config.json       # Package definitions (brew, cask, mas)
```

### Key Design Patterns
- **Symlink-based management**: Both dotfiles and themes use symlinks for instant switching
- **JSON-driven package management**: Declarative package configuration with purge capabilities
- **GNU Stow integration**: Standard dotfile management with proper conflict handling
- **Modular architecture**: Each script handles a specific concern with clear interfaces

### Dependencies
- GNU Stow (configuration management)
- jq (JSON processing)
- Homebrew (package management)
- mas (Mac App Store CLI)