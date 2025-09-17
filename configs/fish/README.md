# Fish Shell Configuration

Standard fish shell configuration migrated from Nix home-manager.

## Structure

```
.config/fish/
├── config.fish           # Main configuration file
├── conf.d/              # Auto-loaded configuration snippets
│   └── aliases.fish     # Shell aliases
├── functions/           # Custom functions
│   ├── gpush.fish      # Git push with AI commit message
│   └── gcommit.fish    # Git commit with AI commit message
├── secrets.fish.template # Template for secret environment variables
└── .gitignore          # Git ignore for sensitive files
```

## Features

- **Aliases**: Common shortcuts for git, system utilities, and nix commands
- **Functions**: Custom functions for enhanced git workflow with AI-generated commit messages
- **Integrations**:
  - FZF for fuzzy finding
  - Zoxide for smart directory navigation
  - Kitty terminal integration
  - Ghostty terminal support
- **Path Management**: Automatic setup of Nix and Python paths
- **Secrets Management**: Template for managing secret environment variables

## Installation

1. Install fish shell:
   ```bash
   brew install fish
   ```

2. Stow the configuration:
   ```bash
   stow -t ~ configs/fish
   ```

3. Set fish as your default shell:
   ```bash
   echo /opt/homebrew/bin/fish | sudo tee -a /etc/shells
   chsh -s /opt/homebrew/bin/fish
   ```

4. Copy and configure secrets:
   ```bash
   cp ~/.config/fish/secrets.fish.template ~/.config/fish/secrets.fish
   # Edit ~/.config/fish/secrets.fish with your actual values
   ```

## Dependencies

- `fzf` - Fuzzy finder
- `zoxide` - Smart directory navigation
- `lumen` - AI commit message generator
- `nh` - Nix helper tool

All dependencies are managed through `pkg-config.json`.