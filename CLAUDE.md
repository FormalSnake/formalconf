# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
bun run formalconf        # Launch interactive TUI
bun run config <cmd>      # Config management (stow, unstow, status, list, stow-all, unstow-all)
bun run pkg-sync          # Sync packages from ~/.config/formalconf/pkg-config.json
bun run pkg-sync --purge  # Sync and remove unlisted packages
bun run theme <name>      # Apply a theme
bun run typecheck         # Run TypeScript type checking
```

## Architecture

### Overview
FormalConf is a dotfiles management TUI for macOS built with Ink (React for CLI). It combines GNU Stow-based config management, Homebrew package sync, and symlink-based theme switching.

### Source Structure
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
│   ├── paths.ts          # Path constants (CONFIG_DIR, THEMES_DIR, HOOKS_DIR)
│   ├── shell.ts          # Command execution helpers
│   ├── hooks.ts          # Hook execution for theme-change events
│   ├── config.ts         # Config loading
│   └── theme.ts          # Theme colors
└── types/            # TypeScript type definitions
```

### Key Patterns
- **User config location**: `~/.config/formalconf/` (configs, themes, hooks, pkg-config.json)
- **CLI scripts**: Each CLI entry point in `src/cli/` can run standalone or be invoked from the TUI
- **Shell execution**: Use `exec()` from `src/lib/shell.ts` for commands, `execLive()` for streaming output
- **Path constants**: Import from `src/lib/paths.ts` - never hardcode paths
- **Hooks**: User scripts in `~/.config/formalconf/hooks/<event>/` run after events (e.g., theme-change)

### Dependencies
- Ink + React for TUI
- GNU Stow for symlink management
- Homebrew + mas for package management
- jq for JSON processing (external)
