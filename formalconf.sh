#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for better UI
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Define config directory and pkg-config location
CONFIG_DIR="$HOME/.config/formalconf"
PKG_CONFIG_PATH="$CONFIG_DIR/pkg-config.json"

# Ensure config directory exists
mkdir -p "$CONFIG_DIR"

# Create symlink for pkg-config.json if it doesn't exist
if [ ! -f "$PKG_CONFIG_PATH" ] && [ -f "${SCRIPT_DIR}/pkg-config.json" ]; then
    echo -e "${YELLOW}Creating symlink for pkg-config.json in ~/.config/formalconf/${NC}"
    ln -s "${SCRIPT_DIR}/pkg-config.json" "$PKG_CONFIG_PATH"
fi

# Clear screen and show header
show_header() {
    clear
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║        FormalConf Manager            ║${NC}"
    echo -e "${BOLD}${CYAN}╚══════════════════════════════════════╝${NC}"
    echo ""
}

# Config Manager submenu
config_manager_menu() {
    while true; do
        show_header
        echo -e "${BOLD}${BLUE}Config Manager${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "1) Stow all packages"
        echo "2) Unstow all packages"
        echo "3) Check status"
        echo "4) List available packages"
        echo ""
        echo "0) Back to main menu"
        echo ""
        echo -n "Select an option: "
        read -r choice

        case $choice in
            1)
                echo -e "\n${GREEN}Stowing all packages...${NC}\n"
                "${SCRIPT_DIR}/config-manager.sh" stow-all
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            2)
                echo -e "\n${GREEN}Unstowing all packages...${NC}\n"
                "${SCRIPT_DIR}/config-manager.sh" unstow-all
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            3)
                echo -e "\n${GREEN}Checking package status...${NC}\n"
                "${SCRIPT_DIR}/config-manager.sh" status
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            4)
                echo -e "\n${GREEN}Available packages:${NC}\n"
                "${SCRIPT_DIR}/config-manager.sh" list
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            0)
                return
                ;;
            *)
                echo -e "${RED}Invalid option. Press Enter to continue...${NC}"
                read -r
                ;;
        esac
    done
}

# Package Sync submenu
package_sync_menu() {
    while true; do
        show_header
        echo -e "${BOLD}${BLUE}Package Sync${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "1) Sync packages (install from pkg-config.json)"
        echo "2) Sync with purge (remove unlisted packages)"
        echo "3) Upgrade all packages"
        echo "4) Upgrade packages (interactive)"
        echo "5) Edit pkg-config.json"
        echo "6) View current configuration"
        echo ""
        echo "0) Back to main menu"
        echo ""
        echo -n "Select an option: "
        read -r choice

        case $choice in
            1)
                if [ ! -f "$PKG_CONFIG_PATH" ]; then
                    echo -e "\n${RED}pkg-config.json not found at $PKG_CONFIG_PATH!${NC}"
                    echo -e "${YELLOW}Please create pkg-config.json first.${NC}"
                else
                    echo -e "\n${GREEN}Syncing packages from pkg-config.json...${NC}\n"
                    "${SCRIPT_DIR}/pkg-sync.sh" "$PKG_CONFIG_PATH"
                fi
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            2)
                if [ ! -f "$PKG_CONFIG_PATH" ]; then
                    echo -e "\n${RED}pkg-config.json not found at $PKG_CONFIG_PATH!${NC}"
                    echo -e "${YELLOW}Please create pkg-config.json first.${NC}"
                else
                    # Create temporary JSON with purge enabled
                    echo -e "\n${YELLOW}Creating temporary config with purge enabled...${NC}"
                    jq '.config.purge = true' "$PKG_CONFIG_PATH" > "$CONFIG_DIR/pkg-config-purge.json"
                    echo -e "\n${GREEN}Syncing with purge enabled...${NC}\n"
                    "${SCRIPT_DIR}/pkg-sync.sh" "$CONFIG_DIR/pkg-config-purge.json"
                    rm -f "$CONFIG_DIR/pkg-config-purge.json"
                fi
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            3)
                echo -e "\n${GREEN}Upgrading all packages...${NC}\n"
                "${SCRIPT_DIR}/pkg-sync.sh" --upgrade-only
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            4)
                echo -e "\n${GREEN}Starting interactive package upgrade...${NC}\n"
                "${SCRIPT_DIR}/pkg-sync.sh" --upgrade-interactive
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            5)
                echo -e "\n${GREEN}Opening pkg-config.json for editing...${NC}\n"
                ${EDITOR:-nano} "$PKG_CONFIG_PATH"
                ;;
            6)
                if [ ! -f "$PKG_CONFIG_PATH" ]; then
                    echo -e "\n${RED}pkg-config.json not found at $PKG_CONFIG_PATH!${NC}"
                else
                    echo -e "\n${GREEN}Current configuration:${NC}\n"
                    cat "$PKG_CONFIG_PATH"
                fi
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            0)
                return
                ;;
            *)
                echo -e "${RED}Invalid option. Press Enter to continue...${NC}"
                read -r
                ;;
        esac
    done
}

# Set Theme submenu
set_theme_menu() {
    while true; do
        show_header
        echo -e "${BOLD}${BLUE}Select Theme${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""

        # Get available themes
        themes=($(ls -d "${SCRIPT_DIR}/themes"/*/ 2>/dev/null | xargs -n 1 basename))

        if [ ${#themes[@]} -eq 0 ]; then
            echo -e "${RED}No themes found in themes/ directory${NC}"
            echo ""
            echo "0) Back to main menu"
            echo ""
            echo -n "Select an option: "
            read -r choice

            if [ "$choice" = "0" ]; then
                return
            fi
        else
            # Display themes with numbers
            for i in "${!themes[@]}"; do
                echo "$((i+1))) ${themes[$i]}"
            done

            echo ""
            echo "0) Back to main menu"
            echo ""
            echo -n "Select a theme: "
            read -r choice

            if [ "$choice" = "0" ]; then
                return
            elif [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#themes[@]}" ]; then
                selected_theme="${themes[$((choice-1))]}"
                echo -e "\n${GREEN}Applying theme: $selected_theme${NC}\n"
                "${SCRIPT_DIR}/set-theme.sh" "$selected_theme"
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
            else
                echo -e "${RED}Invalid option. Press Enter to continue...${NC}"
                read -r
            fi
        fi
    done
}

# Main menu
main_menu() {
    while true; do
        show_header
        echo -e "${BOLD}Main Menu${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "1) Config Manager"
        echo "2) Package Sync"
        echo "3) Set Theme"
        echo ""
        echo "0) Exit"
        echo ""
        echo -n "Select an option: "
        read -r choice

        case $choice in
            1)
                config_manager_menu
                ;;
            2)
                package_sync_menu
                ;;
            3)
                set_theme_menu
                ;;
            0)
                echo -e "${GREEN}Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option. Press Enter to continue...${NC}"
                read -r
                ;;
        esac
    done
}

# Start the main menu
main_menu