# FormalConf

A comprehensive dotfiles management system for macOS that combines configuration management, package synchronization, and theme switching in one unified interface.

![FormalConf Manager](https://img.shields.io/badge/Platform-macOS-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **📦 Configuration Management**: Automated dotfile linking using GNU Stow
- **🔄 Package Synchronization**: Intelligent Homebrew package management with purge capabilities
- **🎨 Theme System**: Easy switching between visual themes across all applications
- **🖥️ Interactive TUI**: Beautiful terminal interface for easy management
- **⚡ Smart Adoption**: Import existing configurations seamlessly

## 🚀 Quick Start

1. **Clone and Navigate**
   ```bash
   git clone <your-repo-url> ~/.dotfiles
   cd ~/.dotfiles
   ```

2. **Install Dependencies**
   ```bash
   brew install stow jq mas
   ```

3. **Launch FormalConf**
   ```bash
   ./formalconf.sh
   ```

## 📁 Project Structure

```
formalconf/
├── formalconf.sh           # Main TUI interface
├── config-manager.sh       # Dotfile management with GNU Stow
├── pkg-sync.sh            # Package synchronization engine
├── set-theme.sh           # Theme switching utility
├── pkg-config.json        # Package configuration
├── configs/               # Dotfile packages
│   ├── aerospace/         # Window manager config
│   ├── btop/             # System monitor config
│   ├── fish/             # Shell configuration
│   ├── ghostty/          # Terminal emulator config
│   ├── neovim/           # Editor configuration
│   └── tmux/             # Terminal multiplexer config
└── themes/               # Visual themes
    ├── tokyo-night/      # Dark theme
    └── matte-black/      # Black theme
```

## 🔧 Usage

### Interactive Mode

Launch the main interface:
```bash
./formalconf.sh
```

Navigate through the menu options:
- **Config Manager**: Manage dotfile linking
- **Package Sync**: Install/update packages
- **Set Theme**: Switch visual themes

### Command Line Usage

#### Configuration Management
```bash
# Link all configurations
./config-manager.sh stow-all

# Link specific package
./config-manager.sh stow neovim

# Remove all links
./config-manager.sh unstow-all

# Check status
./config-manager.sh status

# List available packages
./config-manager.sh list

# Adopt existing configs
./config-manager.sh adopt fish
```

#### Package Synchronization
```bash
# Sync packages from config
./pkg-sync.sh pkg-config.json

# Sync with purge (remove unlisted)
jq '.config.purge = true' pkg-config.json > temp.json && ./pkg-sync.sh temp.json
```

#### Theme Management
```bash
# Apply theme
./set-theme.sh tokyo-night

# List available themes
./set-theme.sh
```

## ⚙️ Configuration

### Package Configuration (`pkg-config.json`)

Define your system packages in JSON format:

```json
{
  "config": {
    "purge": true,           // Remove unlisted packages
    "autoUpdate": true       // Update Homebrew before sync
  },
  "taps": [                  // Homebrew taps
    "oven-sh/bun",
    "nikitabobko/tap"
  ],
  "packages": [              // CLI tools
    "neovim",
    "tmux",
    "fish"
  ],
  "casks": [                 // GUI applications
    "ghostty",
    "raycast",
    "aerospace"
  ],
  "mas": {                   // Mac App Store apps
    "Xcode": 497799835,
    "WhatsApp": 310633997
  }
}
```

### Adding New Configurations

1. **Create Package Directory**
   ```bash
   mkdir -p configs/myapp/.config/myapp
   ```

2. **Add Configuration Files**
   ```bash
   # Place your config files maintaining home directory structure
   configs/myapp/.config/myapp/config.toml
   ```

3. **Link Configuration**
   ```bash
   ./config-manager.sh stow myapp
   ```

### Creating Themes

1. **Create Theme Directory**
   ```bash
   mkdir themes/my-theme
   ```

2. **Add Theme Files**
   ```bash
   # Add configuration files for each app
   themes/my-theme/ghostty.conf
   themes/my-theme/btop.theme
   themes/my-theme/neovim.lua
   ```

3. **Apply Theme**
   ```bash
   ./set-theme.sh my-theme
   ```

## 🛠️ Customization

### Supported Applications

Current configurations include:
- **Aerospace**: Tiling window manager
- **Btop**: System resource monitor
- **FastFetch**: System information tool
- **Fish**: Friendly shell
- **Ghostty**: Fast terminal emulator
- **Git**: Version control system
- **Neovim**: Modern Vim-based editor
- **Tmux**: Terminal multiplexer

### Adding New Applications

1. **Create the package structure** in `configs/`
2. **Add theme variants** in `themes/*/`
3. **Update package lists** in `pkg-config.json`

### Configuration Adoption

Use the adoption feature to import existing configurations:

```bash
# This will move your existing config into the repo
./config-manager.sh adopt fish
```

## 🔍 Advanced Features

### Package Management

- **Smart Dependencies**: Skips removing packages required by others
- **System App Protection**: Prevents removal of essential macOS apps
- **Failure Handling**: Continues operation even if individual packages fail
- **Cleanup**: Automatically removes orphaned dependencies

### Theme System

- **Symlink-based**: Instant theme switching without file copying
- **Application-specific**: Each app can have its own theme configuration
- **Extensible**: Easy to add new applications and themes

### Status Monitoring

Get detailed information about your system state:
- Configuration link status
- Package installation status
- Theme application status

## 🚨 Troubleshooting

### Common Issues

**Stow conflicts:**
```bash
# Remove conflicting files first
./config-manager.sh unstow-all
# Then restow
./config-manager.sh stow-all
```

**Package sync failures:**
```bash
# Update Homebrew
brew update && brew doctor
# Retry sync
./pkg-sync.sh pkg-config.json
```

**Theme not applying:**
```bash
# Check if theme directory exists
ls themes/
# Verify theme files
ls themes/your-theme/
```

### Dependencies

Required tools:
- **GNU Stow**: Configuration management
- **jq**: JSON processing
- **Homebrew**: Package management
- **mas**: Mac App Store CLI

## 📝 License

MIT License - feel free to fork and customize for your own needs.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Add your configurations/themes
4. Submit a pull request

---

*Built with ❤️ for macOS power users who love automation and consistency.*