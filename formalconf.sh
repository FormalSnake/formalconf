#!/bin/bash

# Colors for better UI
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

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
        echo "1) Deploy configs to system"
        echo "2) Collect configs from system"
        echo "3) Check config status"
        echo "4) Backup current configs"
        echo ""
        echo "0) Back to main menu"
        echo ""
        echo -n "Select an option: "
        read -r choice

        case $choice in
            1)
                echo -e "\n${GREEN}Deploying configs to system...${NC}"
                ./scripts/deploy-configs.sh
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            2)
                echo -e "\n${GREEN}Collecting configs from system...${NC}"
                ./scripts/collect-configs.sh
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            3)
                echo -e "\n${GREEN}Checking config status...${NC}"
                ./scripts/check-status.sh
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            4)
                echo -e "\n${GREEN}Backing up current configs...${NC}"
                ./scripts/backup-configs.sh
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
        echo "1) Export installed packages"
        echo "2) Install packages from list"
        echo "3) Sync Homebrew packages"
        echo "4) Sync npm/bun packages"
        echo "5) Compare package differences"
        echo ""
        echo "0) Back to main menu"
        echo ""
        echo -n "Select an option: "
        read -r choice

        case $choice in
            1)
                echo -e "\n${GREEN}Exporting installed packages...${NC}"
                ./scripts/export-packages.sh
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            2)
                echo -e "\n${GREEN}Installing packages from list...${NC}"
                ./scripts/install-packages.sh
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            3)
                echo -e "\n${GREEN}Syncing Homebrew packages...${NC}"
                ./scripts/sync-homebrew.sh
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            4)
                echo -e "\n${GREEN}Syncing npm/bun packages...${NC}"
                ./scripts/sync-npm.sh
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            5)
                echo -e "\n${GREEN}Comparing package differences...${NC}"
                ./scripts/compare-packages.sh
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
        echo -e "${BOLD}${BLUE}Set Theme${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "1) Apply dark theme"
        echo "2) Apply light theme"
        echo "3) Apply custom theme"
        echo "4) Preview theme"
        echo "5) Reset to default theme"
        echo ""
        echo "0) Back to main menu"
        echo ""
        echo -n "Select an option: "
        read -r choice

        case $choice in
            1)
                echo -e "\n${GREEN}Applying dark theme...${NC}"
                ./scripts/apply-theme.sh dark
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            2)
                echo -e "\n${GREEN}Applying light theme...${NC}"
                ./scripts/apply-theme.sh light
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            3)
                echo -e "\n${GREEN}Available custom themes:${NC}"
                ls -1 themes/ 2>/dev/null | grep -v "^dark$\|^light$" || echo "No custom themes found"
                echo ""
                echo -n "Enter theme name: "
                read -r theme_name
                if [ -n "$theme_name" ]; then
                    ./scripts/apply-theme.sh "$theme_name"
                fi
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            4)
                echo -e "\n${GREEN}Preview theme feature...${NC}"
                ./scripts/preview-theme.sh
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            5)
                echo -e "\n${GREEN}Resetting to default theme...${NC}"
                ./scripts/apply-theme.sh default
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

# Check if scripts directory exists
if [ ! -d "scripts" ]; then
    echo -e "${YELLOW}Creating scripts directory...${NC}"
    mkdir -p scripts
fi

# Start the main menu
main_menu