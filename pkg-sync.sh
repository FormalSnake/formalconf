#!/bin/sh

# Package Sync - Manages Homebrew packages, casks, and Mac App Store apps
# Usage: ./pkg-sync.sh <json_file>

set -e

# Check if JSON file is provided
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <json_file>"
    echo "  json_file: Path to JSON file containing packages, casks, and MAS apps"
    echo "  Purge mode is configured in the JSON file (config.purge: true/false)"
    exit 1
fi

JSON_FILE="$1"

# Check if JSON file exists
if [ ! -f "$JSON_FILE" ]; then
    echo "Error: JSON file '$JSON_FILE' not found"
    exit 1
fi

# Check if jq is installed
if ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq is required but not installed"
    echo "Install with: brew install jq"
    exit 1
fi

# Check if brew is installed
if ! command -v brew >/dev/null 2>&1; then
    echo "Error: Homebrew is not installed"
    exit 1
fi

# Clear the console
clear

echo "=== Package Sync ==="
echo "Config file: $JSON_FILE"
echo ""

# Update Homebrew if enabled
if [ "$AUTO_UPDATE" = "true" ]; then
    echo "Updating Homebrew..."
    brew update
fi

# Get configuration and lists from JSON
PURGE=$(jq -r '.config.purge // false' "$JSON_FILE")
AUTO_UPDATE=$(jq -r '.config.autoUpdate // true' "$JSON_FILE")
PACKAGES=$(jq -r '.packages[]?' "$JSON_FILE" 2>/dev/null || true)
CASKS=$(jq -r '.casks[]?' "$JSON_FILE" 2>/dev/null || true)
MAS_APPS=$(jq -r '.mas | to_entries[] | "\(.value) \(.key)"' "$JSON_FILE" 2>/dev/null || true)

echo "Configuration:"
echo "  Purge mode: $PURGE"
echo "  Auto-update: $AUTO_UPDATE"
echo ""

# Install packages
if [ -n "$PACKAGES" ]; then
    echo ""
    echo "=== Installing Packages ==="
    for package in $PACKAGES; do
        if brew list --formula | grep -q "^${package}$"; then
            echo "✓ Package '$package' already installed"
        else
            echo "→ Installing package: $package"
            brew install "$package" || echo "! Failed to install $package"
        fi
    done
fi

# Install casks
if [ -n "$CASKS" ]; then
    echo ""
    echo "=== Installing Casks ==="
    for cask in $CASKS; do
        # Extract base name from tap format (e.g., nikitabobko/tap/aerospace -> aerospace)
        CASK_BASE=$(echo "$cask" | awk -F'/' '{print $NF}')
        
        if brew list --cask | grep -q "^${CASK_BASE}$"; then
            echo "✓ Cask '$CASK_BASE' already installed"
        else
            echo "→ Installing cask: $cask"
            brew install --cask "$cask" || echo "! Failed to install $cask"
        fi
    done
fi

# Install MAS apps
if [ -n "$MAS_APPS" ]; then
    echo ""
    echo "=== Installing Mac App Store Apps ==="
    
    # Check if mas is installed
    if ! command -v mas >/dev/null 2>&1; then
        echo "! mas not installed, installing it first..."
        brew install mas
    fi
    
    # Check if signed in to App Store
    if ! mas account >/dev/null 2>&1; then
        echo "! Warning: Not signed in to Mac App Store"
        echo "  Please sign in to the Mac App Store and run again"
    else
        echo "$MAS_APPS" | while read -r line; do
            if [ -n "$line" ]; then
                APP_ID=$(echo "$line" | cut -d' ' -f1)
                APP_NAME=$(echo "$line" | cut -d' ' -f2-)
                
                if mas list | grep -q "^$APP_ID"; then
                    echo "✓ App '$APP_NAME' (ID: $APP_ID) already installed"
                else
                    echo "→ Installing app: $APP_NAME (ID: $APP_ID)"
                    mas install "$APP_ID" || echo "! Failed to install $APP_NAME"
                fi
            fi
        done
    fi
fi

# Purge unlisted packages/casks if configured
if [ "$PURGE" = "true" ]; then
    echo ""
    echo "=== Purging Unlisted Items ==="
    
    # Get currently installed items
    INSTALLED_PACKAGES=$(brew list --formula)
    INSTALLED_CASKS=$(brew list --cask)
    INSTALLED_MAS=$(mas list 2>/dev/null | awk '{print $1}' || true)
    
    # Purge unlisted packages
    if [ -n "$INSTALLED_PACKAGES" ]; then
        echo ""
        echo "Checking packages..."
        for installed in $INSTALLED_PACKAGES; do
            if [ -n "$PACKAGES" ]; then
                # Check if installed package matches any config entry
                FOUND=false
                for config_pkg in $PACKAGES; do
                    # Extract base name from tap format (e.g., owner/tap/name -> name)
                    CONFIG_BASE=$(echo "$config_pkg" | awk -F'/' '{print $NF}')
                    
                    if [ "$installed" = "$config_pkg" ] || [ "$installed" = "$CONFIG_BASE" ]; then
                        FOUND=true
                        break
                    fi
                done
                
                if [ "$FOUND" = "false" ]; then
                    # Check if package is a dependency
                    DEPENDENTS=$(brew uses --installed "$installed" 2>/dev/null | head -5)
                    if [ -n "$DEPENDENTS" ]; then
                        echo "⚠ Skipping $installed (required by: $(echo $DEPENDENTS | tr '\n' ' '))"
                    else
                        echo "→ Removing unlisted package: $installed"
                        brew uninstall --formula "$installed" 2>&1 | grep -v "Refusing to uninstall" || true
                    fi
                fi
            else
                # Check if package is a dependency
                DEPENDENTS=$(brew uses --installed "$installed" 2>/dev/null | head -5)
                if [ -n "$DEPENDENTS" ]; then
                    echo "⚠ Skipping $installed (required by: $(echo $DEPENDENTS | tr '\n' ' '))"
                else
                    echo "→ Removing package (none in config): $installed"
                    brew uninstall --formula "$installed" 2>&1 | grep -v "Refusing to uninstall" || true
                fi
            fi
        done
    fi
    
    # Purge unlisted casks
    if [ -n "$INSTALLED_CASKS" ]; then
        echo ""
        echo "Checking casks..."
        for installed in $INSTALLED_CASKS; do
            if [ -n "$CASKS" ]; then
                # Check if installed cask matches any config entry
                FOUND=false
                for config_cask in $CASKS; do
                    # Extract base name from tap format (e.g., owner/tap/name -> name)
                    CONFIG_BASE=$(echo "$config_cask" | awk -F'/' '{print $NF}')
                    
                    # Check various matching patterns:
                    # 1. Exact match with config entry
                    # 2. Match with extracted base name
                    # 3. Match without -app suffix (installed has -app, config doesn't)
                    # 4. Match with -app suffix (config has -app, installed doesn't)
                    INSTALLED_BASE=$(echo "$installed" | sed 's/-app$//')
                    CONFIG_BASE_NOAPP=$(echo "$CONFIG_BASE" | sed 's/-app$//')
                    
                    if [ "$installed" = "$config_cask" ] || \
                       [ "$installed" = "$CONFIG_BASE" ] || \
                       [ "$INSTALLED_BASE" = "$CONFIG_BASE_NOAPP" ]; then
                        FOUND=true
                        break
                    fi
                done
                
                if [ "$FOUND" = "false" ]; then
                    echo "→ Removing unlisted cask: $installed"
                    brew uninstall --cask "$installed" || echo "! Failed to remove $installed"
                fi
            else
                echo "→ Removing cask (none in config): $installed"
                brew uninstall --cask "$installed" || echo "! Failed to remove $installed"
            fi
        done
    fi
    
    # Purge unlisted MAS apps
    if [ -n "$INSTALLED_MAS" ] && command -v mas >/dev/null 2>&1; then
        echo ""
        echo "Checking Mac App Store apps..."
        
        # Define system apps to skip (Apple's built-in apps)
        SYSTEM_APP_IDS="409183694 409203825 409201541 408981434 682658836 425424353 424389933 424390742 413897608 1274495053"
        # Keynote: 409183694, Numbers: 409203825, Pages: 409201541, iMovie: 408981434
        # GarageBand: 682658836, Motion: 434290957, Final Cut Pro: 424389933
        # MainStage: 634148309, Logic Pro: 634148309, Compressor: 424390742
        
        CONFIGURED_MAS_IDS=$(echo "$MAS_APPS" | cut -d' ' -f1)
        for installed_id in $INSTALLED_MAS; do
            # Skip system apps
            if echo "$SYSTEM_APP_IDS" | grep -q "$installed_id"; then
                APP_NAME=$(mas list | grep "^$installed_id" | cut -d' ' -f2-)
                echo "⚠ Skipping system app: $APP_NAME (ID: $installed_id)"
                continue
            fi
            
            if [ -n "$CONFIGURED_MAS_IDS" ]; then
                if ! echo "$CONFIGURED_MAS_IDS" | grep -q "^${installed_id}$"; then
                    APP_NAME=$(mas list | grep "^$installed_id" | cut -d' ' -f2-)
                    echo "→ Removing unlisted MAS app: $APP_NAME (ID: $installed_id)"
                    mas uninstall "$installed_id" || echo "! Failed to remove MAS app $installed_id"
                fi
            else
                APP_NAME=$(mas list | grep "^$installed_id" | cut -d' ' -f2-)
                echo "→ Removing MAS app (none in config): $APP_NAME (ID: $installed_id)"
                mas uninstall "$installed_id" || echo "! Failed to remove MAS app $installed_id"
            fi
        done
    fi
    
    # Clean up orphaned dependencies
    echo ""
    echo "Cleaning up..."
    echo "→ Removing orphaned dependencies..."
    brew autoremove --verbose 2>/dev/null || true
    echo "→ Cleaning cache..."
    brew cleanup
fi

echo ""
echo "=== Sync Complete ==="
exit 0