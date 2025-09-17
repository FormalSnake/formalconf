#!/usr/bin/env fish

# Fish configuration file
# Migrated from Nix-generated configuration

# Disable greeting
set -g fish_greeting ""

# Interactive shell initialization
if status is-interactive
    # FZF integration
    if type -q fzf
        fzf --fish | source
    end

    # Zoxide integration
    if type -q zoxide
        zoxide init fish | source
    end

    # Set TERM for Ghostty
    if test "$TERM_PROGRAM" = ghostty
        set -gx TERM xterm-256color
        set -gx SNACKS_GHOSTTY true
    end

    # Load brew environment on macOS
    if test -f /opt/homebrew/bin/brew
        eval (/opt/homebrew/bin/brew shellenv)
    end

    # Paths
    # Nix paths
    fish_add_path /etc/profiles/per-user/kyandesutter/bin
    fish_add_path /run/current-system/sw/bin
    fish_add_path /nix/var/nix/profiles/default/bin
    fish_add_path ~/.nix-profile/bin

    # Python paths
    fish_add_path ~/Library/Python/3.9/bin

    # Load secrets
    if test -f ~/.config/fish/secrets.fish
        source ~/.config/fish/secrets.fish
    end
end

