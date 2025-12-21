#!/bin/bash

# Get the script's directory (where formalconf is)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if theme name was provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <theme-name>"
    echo "Available themes:"
    for theme in "$SCRIPT_DIR"/themes/*/; do
        if [ -d "$theme" ]; then
            echo "  - $(basename "$theme")"
        fi
    done
    exit 1
fi

THEME_NAME="$1"
THEME_DIR="$SCRIPT_DIR/themes/$THEME_NAME"
TARGET_DIR="$HOME/.config/formalconf/current/theme"

# Check if theme exists
if [ ! -d "$THEME_DIR" ]; then
    echo "Error: Theme '$THEME_NAME' not found in themes/ directory"
    echo "Available themes:"
    for theme in "$SCRIPT_DIR"/themes/*/; do
        if [ -d "$theme" ]; then
            echo "  - $(basename "$theme")"
        fi
    done
    exit 1
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Remove existing theme files/symlinks
rm -rf "$TARGET_DIR"/*

# Create symlinks for all theme files
echo "Applying theme: $THEME_NAME"
for file in "$THEME_DIR"/*; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        ln -sf "$file" "$TARGET_DIR/$filename"
    fi
done

if [ $? -eq 0 ]; then
    echo "✓ Theme '$THEME_NAME' applied successfully"
    echo "  Symlinks created in: $TARGET_DIR"
else
    echo "✗ Failed to apply theme"
    exit 1
fi