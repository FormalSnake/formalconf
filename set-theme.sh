#!/bin/bash

# Check if theme name was provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <theme-name>"
    echo "Available themes:"
    for theme in themes/*/; do
        if [ -d "$theme" ]; then
            echo "  - $(basename "$theme")"
        fi
    done
    exit 1
fi

THEME_NAME="$1"
THEME_DIR="themes/$THEME_NAME"
TARGET_DIR="$HOME/.config/formalconf/current/theme"

# Check if theme exists
if [ ! -d "$THEME_DIR" ]; then
    echo "Error: Theme '$THEME_NAME' not found in themes/ directory"
    echo "Available themes:"
    for theme in themes/*/; do
        if [ -d "$theme" ]; then
            echo "  - $(basename "$theme")"
        fi
    done
    exit 1
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Copy all theme files to target directory
echo "Applying theme: $THEME_NAME"
cp -r "$THEME_DIR"/* "$TARGET_DIR/"

if [ $? -eq 0 ]; then
    echo "✓ Theme '$THEME_NAME' applied successfully"
    echo "  Files copied to: $TARGET_DIR"
else
    echo "✗ Failed to apply theme"
    exit 1
fi