#!/bin/sh

# Package Sync - Manages Homebrew packages, casks, and Mac App Store apps
# Usage: ./pkg-sync.sh <json_file> [--upgrade-only] [--upgrade-interactive]

set -e

# Parse arguments
UPGRADE_ONLY=false
UPGRADE_INTERACTIVE=false
JSON_FILE=""

for arg in "$@"; do
    case $arg in
        --upgrade-only)
            UPGRADE_ONLY=true
            ;;
        --upgrade-interactive)
            UPGRADE_INTERACTIVE=true
            ;;
        *)
            if [ -z "$JSON_FILE" ]; then
                JSON_FILE="$arg"
            fi
            ;;
    esac
done

# Check if JSON file is provided (not needed for upgrade modes)
if [ "$UPGRADE_ONLY" = "false" ] && [ "$UPGRADE_INTERACTIVE" = "false" ] && [ -z "$JSON_FILE" ]; then
    echo "Usage: $0 <json_file> [--upgrade-only] [--upgrade-interactive]"
    echo "  json_file: Path to JSON file containing packages, casks, and MAS apps"
    echo "  --upgrade-only: Upgrade all existing packages automatically"
    echo "  --upgrade-interactive: Choose which packages to upgrade"
    echo "  Purge mode is configured in the JSON file (config.purge: true/false)"
    exit 1
fi

# Check if JSON file exists (only if not upgrade modes)
if [ "$UPGRADE_ONLY" = "false" ] && [ "$UPGRADE_INTERACTIVE" = "false" ] && [ ! -f "$JSON_FILE" ]; then
    echo "Error: JSON file '$JSON_FILE' not found"
    exit 1
fi

# Check if jq is installed (only if not upgrade modes)
if [ "$UPGRADE_ONLY" = "false" ] && [ "$UPGRADE_INTERACTIVE" = "false" ] && ! command -v jq >/dev/null 2>&1; then
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

if [ "$UPGRADE_ONLY" = "true" ]; then
    echo "=== Package Upgrade ==="
    echo "Upgrading all installed packages..."
    echo ""

    # Update Homebrew first
    echo "Updating Homebrew..."
    brew update
    echo ""

    # Upgrade all packages
    echo "=== Upgrading Homebrew Packages ==="
    brew upgrade --formula
    echo ""

    echo "=== Upgrading Homebrew Casks ==="
    brew upgrade --cask --greedy
    echo ""

    # Upgrade MAS apps if mas is installed
    if command -v mas >/dev/null 2>&1; then
        echo "=== Upgrading Mac App Store Apps ==="
        if mas account >/dev/null 2>&1; then
            mas upgrade
        else
            echo "! Warning: Not signed in to Mac App Store"
            echo "  Please sign in to upgrade MAS apps"
        fi
    else
        echo "! mas not installed, skipping Mac App Store upgrades"
    fi

    echo ""
    echo "=== Cleaning up ==="
    brew cleanup
    echo ""
    echo "=== Upgrade Complete ==="
    exit 0
fi

if [ "$UPGRADE_INTERACTIVE" = "true" ]; then
    echo "=== Interactive Package Upgrade ==="
    echo "Choose which packages to upgrade..."
    echo ""

    # Update Homebrew first
    echo "Updating Homebrew..."
    brew update
    echo ""

    # Interactive formula upgrade
    echo "=== Homebrew Packages ==="
    OUTDATED_FORMULAS=$(brew outdated --formula --quiet)
    if [ -n "$OUTDATED_FORMULAS" ]; then
        echo "Outdated packages:"
        echo "$OUTDATED_FORMULAS" | while read -r package; do
            if [ -n "$package" ]; then
                printf "Upgrade %s? (y/n/q): " "$package"
                read -r answer
                case $answer in
                    y|Y|yes|YES)
                        echo "→ Upgrading $package..."
                        brew upgrade "$package"
                        ;;
                    q|Q|quit|QUIT)
                        echo "Stopping package upgrades..."
                        break
                        ;;
                    *)
                        echo "Skipping $package"
                        ;;
                esac
                echo ""
            fi
        done
    else
        echo "✓ All packages are up to date"
    fi
    echo ""

    # Interactive cask upgrade
    echo "=== Homebrew Casks ==="
    OUTDATED_CASKS=$(brew outdated --cask --quiet)
    if [ -n "$OUTDATED_CASKS" ]; then
        echo "Outdated casks:"
        echo "$OUTDATED_CASKS" | while read -r cask; do
            if [ -n "$cask" ]; then
                printf "Upgrade %s? (y/n/q): " "$cask"
                read -r answer
                case $answer in
                    y|Y|yes|YES)
                        echo "→ Upgrading $cask..."
                        brew upgrade --cask "$cask"
                        ;;
                    q|Q|quit|QUIT)
                        echo "Stopping cask upgrades..."
                        break
                        ;;
                    *)
                        echo "Skipping $cask"
                        ;;
                esac
                echo ""
            fi
        done
    else
        echo "✓ All casks are up to date"
    fi
    echo ""

    # Interactive MAS upgrade
    if command -v mas >/dev/null 2>&1; then
        echo "=== Mac App Store Apps ==="
        if mas account >/dev/null 2>&1; then
            OUTDATED_MAS=$(mas outdated)
            if [ -n "$OUTDATED_MAS" ]; then
                echo "Outdated MAS apps:"
                echo "$OUTDATED_MAS" | while read -r line; do
                    if [ -n "$line" ]; then
                        APP_ID=$(echo "$line" | awk '{print $1}')
                        APP_NAME=$(echo "$line" | cut -d' ' -f2-)
                        printf "Upgrade %s? (y/n/q): " "$APP_NAME"
                        read -r answer
                        case $answer in
                            y|Y|yes|YES)
                                echo "→ Upgrading $APP_NAME..."
                                mas upgrade "$APP_ID"
                                ;;
                            q|Q|quit|QUIT)
                                echo "Stopping MAS upgrades..."
                                break
                                ;;
                            *)
                                echo "Skipping $APP_NAME"
                                ;;
                        esac
                        echo ""
                    fi
                done
            else
                echo "✓ All MAS apps are up to date"
            fi
        else
            echo "! Warning: Not signed in to Mac App Store"
            echo "  Please sign in to upgrade MAS apps"
        fi
    else
        echo "! mas not installed, skipping Mac App Store upgrades"
    fi

    echo ""
    echo "=== Cleaning up ==="
    brew cleanup
    echo ""
    echo "=== Interactive Upgrade Complete ==="
    exit 0
fi

echo "=== Package Sync ==="
echo "Config file: $JSON_FILE"
echo ""

# Get configuration and lists from JSON
PURGE=$(jq -r '.config.purge // false' "$JSON_FILE")
AUTO_UPDATE=$(jq -r '.config.autoUpdate // true' "$JSON_FILE")
TAPS=$(jq -r '.taps[]?' "$JSON_FILE" 2>/dev/null || true)
PACKAGES=$(jq -r '.packages[]?' "$JSON_FILE" 2>/dev/null || true)
CASKS=$(jq -r '.casks[]?' "$JSON_FILE" 2>/dev/null || true)
MAS_APPS=$(jq -r '.mas | to_entries[] | "\(.value) \(.key)"' "$JSON_FILE" 2>/dev/null || true)

# Update Homebrew if enabled
if [ "$AUTO_UPDATE" = "true" ]; then
    echo "Updating Homebrew..."
    brew update
fi

echo "Configuration:"
echo "  Purge mode: $PURGE"
echo "  Auto-update: $AUTO_UPDATE"
echo ""

# Install taps
if [ -n "$TAPS" ]; then
    echo ""
    echo "=== Installing Taps ==="
    for tap in $TAPS; do
        if brew tap | grep -q "^${tap}$"; then
            echo "✓ Tap '$tap' already added"
        else
            echo "→ Adding tap: $tap"
            brew tap "$tap" || echo "! Failed to add tap $tap"
        fi
    done
fi

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