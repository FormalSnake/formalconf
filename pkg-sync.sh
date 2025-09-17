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
        if brew list --cask | grep -q "^${cask}$"; then
            echo "✓ Cask '$cask' already installed"
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
                if ! echo "$PACKAGES" | grep -q "^${installed}$"; then
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
                if ! echo "$CASKS" | grep -q "^${installed}$"; then
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
        CONFIGURED_MAS_IDS=$(echo "$MAS_APPS" | cut -d' ' -f1)
        for installed_id in $INSTALLED_MAS; do
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