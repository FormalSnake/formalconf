#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIGS_DIR="${SCRIPT_DIR}/configs"
HOME_DIR="${HOME}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  stow <package>     - Link dotfiles for a specific package"
    echo "  unstow <package>   - Remove dotfile links for a specific package"
    echo "  restow <package>   - Relink dotfiles for a specific package"
    echo "  adopt <package>    - Adopt existing dotfiles into the repo"
    echo "  list              - List available packages"
    echo "  status            - Show status of all packages"
    echo "  stow-all          - Link all packages"
    echo "  unstow-all        - Remove all package links"
    echo ""
    echo "Available packages:"
    for dir in "${CONFIGS_DIR}"/*/; do
        if [ -d "$dir" ]; then
            echo "  - $(basename "$dir")"
        fi
    done
}

check_stow() {
    if ! command -v stow &> /dev/null; then
        echo -e "${RED}Error: GNU Stow is not installed${NC}"
        echo "Install it with: brew install stow"
        exit 1
    fi
}

stow_package() {
    local package="$1"
    local package_dir="${CONFIGS_DIR}/${package}"
    
    if [ ! -d "$package_dir" ]; then
        echo -e "${RED}Error: Package '${package}' not found${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}Stowing ${package}...${NC}"
    cd "${CONFIGS_DIR}"
    stow -v --target="${HOME_DIR}" "${package}"
    echo -e "${GREEN}✓ ${package} stowed successfully${NC}"
}

unstow_package() {
    local package="$1"
    local package_dir="${CONFIGS_DIR}/${package}"
    
    if [ ! -d "$package_dir" ]; then
        echo -e "${RED}Error: Package '${package}' not found${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}Unstowing ${package}...${NC}"
    cd "${CONFIGS_DIR}"
    stow -v --delete --target="${HOME_DIR}" "${package}"
    echo -e "${GREEN}✓ ${package} unstowed successfully${NC}"
}

restow_package() {
    local package="$1"
    local package_dir="${CONFIGS_DIR}/${package}"
    
    if [ ! -d "$package_dir" ]; then
        echo -e "${RED}Error: Package '${package}' not found${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}Restowing ${package}...${NC}"
    cd "${CONFIGS_DIR}"
    stow -v --restow --target="${HOME_DIR}" "${package}"
    echo -e "${GREEN}✓ ${package} restowed successfully${NC}"
}

adopt_package() {
    local package="$1"
    local package_dir="${CONFIGS_DIR}/${package}"
    
    if [ ! -d "$package_dir" ]; then
        echo -e "${RED}Error: Package '${package}' not found${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Warning: This will move existing files into the repository${NC}"
    echo -n "Continue? (y/N): "
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Aborted"
        exit 0
    fi
    
    echo -e "${BLUE}Adopting ${package}...${NC}"
    cd "${CONFIGS_DIR}"
    stow -v --adopt --target="${HOME_DIR}" "${package}"
    echo -e "${GREEN}✓ ${package} adopted successfully${NC}"
    echo -e "${YELLOW}Note: Check git status to review adopted files${NC}"
}

list_packages() {
    echo -e "${BLUE}Available packages:${NC}"
    for dir in "${CONFIGS_DIR}"/*/; do
        if [ -d "$dir" ]; then
            local package=$(basename "$dir")
            echo "  • ${package}"
        fi
    done
}

show_status() {
    echo -e "${BLUE}Package status:${NC}"
    echo ""
    
    for dir in "${CONFIGS_DIR}"/*/; do
        if [ -d "$dir" ]; then
            local package=$(basename "$dir")
            echo -n "  ${package}: "
            
            local stowed=true
            while IFS= read -r -d '' file; do
                local relative_path="${file#${dir}}"
                local target_path="${HOME_DIR}/${relative_path}"
                
                if [ -f "$file" ] || [ -d "$file" ]; then
                    if [ ! -L "$target_path" ]; then
                        stowed=false
                        break
                    fi
                    
                    local link_target=$(readlink "$target_path" 2>/dev/null || true)
                    local expected_target="${CONFIGS_DIR}/${package}/${relative_path}"
                    
                    if [ "$link_target" != "$expected_target" ]; then
                        stowed=false
                        break
                    fi
                fi
            done < <(find "$dir" -mindepth 1 \( -type f -o -type d \) -print0 2>/dev/null)
            
            if [ "$stowed" = true ]; then
                echo -e "${GREEN}✓ stowed${NC}"
            else
                echo -e "${YELLOW}✗ not stowed${NC}"
            fi
        fi
    done
}

stow_all() {
    echo -e "${BLUE}Stowing all packages...${NC}"
    for dir in "${CONFIGS_DIR}"/*/; do
        if [ -d "$dir" ]; then
            local package=$(basename "$dir")
            stow_package "$package"
        fi
    done
}

unstow_all() {
    echo -e "${BLUE}Unstowing all packages...${NC}"
    for dir in "${CONFIGS_DIR}"/*/; do
        if [ -d "$dir" ]; then
            local package=$(basename "$dir")
            unstow_package "$package"
        fi
    done
}

check_stow

case "${1:-}" in
    stow)
        if [ -z "${2:-}" ]; then
            echo -e "${RED}Error: Package name required${NC}"
            print_usage
            exit 1
        fi
        stow_package "$2"
        ;;
    unstow)
        if [ -z "${2:-}" ]; then
            echo -e "${RED}Error: Package name required${NC}"
            print_usage
            exit 1
        fi
        unstow_package "$2"
        ;;
    restow)
        if [ -z "${2:-}" ]; then
            echo -e "${RED}Error: Package name required${NC}"
            print_usage
            exit 1
        fi
        restow_package "$2"
        ;;
    adopt)
        if [ -z "${2:-}" ]; then
            echo -e "${RED}Error: Package name required${NC}"
            print_usage
            exit 1
        fi
        adopt_package "$2"
        ;;
    list)
        list_packages
        ;;
    status)
        show_status
        ;;
    stow-all)
        stow_all
        ;;
    unstow-all)
        unstow_all
        ;;
    *)
        print_usage
        exit 0
        ;;
esac