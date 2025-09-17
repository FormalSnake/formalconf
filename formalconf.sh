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
        echo "1) Deploy configs"
        echo "2) Collect configs"
        echo "3) Backup configs"
        echo "4) Restore configs"
        echo "5) Check status"
        echo ""
        echo "0) Back to main menu"
        echo ""
        echo -n "Select an option: "
        read -r choice

        case $choice in
            1)
                echo -e "\n${GREEN}Deploying configs...${NC}\n"
                ./config-manager.sh deploy
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            2)
                echo -e "\n${GREEN}Collecting configs...${NC}\n"
                ./config-manager.sh collect
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            3)
                echo -e "\n${GREEN}Backing up configs...${NC}\n"
                ./config-manager.sh backup
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            4)
                echo -e "\n${GREEN}Restoring configs...${NC}\n"
                ./config-manager.sh restore
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            5)
                echo -e "\n${GREEN}Checking status...${NC}\n"
                ./config-manager.sh status
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
        echo "1) Export packages"
        echo "2) Install packages"
        echo "3) Update packages"
        echo "4) Check differences"
        echo ""
        echo "0) Back to main menu"
        echo ""
        echo -n "Select an option: "
        read -r choice

        case $choice in
            1)
                echo -e "\n${GREEN}Exporting packages...${NC}\n"
                ./pkg-sync.sh export
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            2)
                echo -e "\n${GREEN}Installing packages...${NC}\n"
                ./pkg-sync.sh install
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            3)
                echo -e "\n${GREEN}Updating packages...${NC}\n"
                ./pkg-sync.sh update
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            4)
                echo -e "\n${GREEN}Checking differences...${NC}\n"
                ./pkg-sync.sh diff
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
        themes=($(ls -d themes/*/ 2>/dev/null | xargs -n 1 basename))

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
                ./set-theme.sh "$selected_theme"
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