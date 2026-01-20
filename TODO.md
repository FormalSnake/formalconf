# Theme Engine Refactor TODO

## Phase 1: Core Infrastructure
- [x] Create JSON theme schema types (`src/types/theme-schema.ts`)
- [x] Implement JSON theme loader (`src/lib/theme-v2/loader.ts`)
- [x] Implement schema validator (`src/lib/theme-v2/validator.ts`)
- [x] Add color parsing utilities (`src/lib/theme-v2/color.ts`)
- [x] Add new path constants (`src/lib/paths.ts`)
- [x] Create example catppuccin.json theme

## Phase 2: Template Engine
- [x] Create template context types (`src/lib/template-engine/types.ts`)
- [x] Implement template parser (`src/lib/template-engine/parser.ts`)
- [x] Implement color modifiers (`src/lib/template-engine/modifiers.ts`)
- [x] Implement template engine (`src/lib/template-engine/engine.ts`)
- [x] Add template versioning system (`src/lib/template-engine/versioning.ts`)
- [x] Add `customOverride` flag support (skip update prompts for locked templates)
- [ ] Add `bun run theme templates --lock <name>` CLI command

## Phase 3: Default Templates (install to ~/.config/formalconf/templates/)
- [x] Create alacritty.toml.template (single-mode)
- [x] Create kitty-dark.conf.template + kitty-light.conf.template (partial-mode)
- [x] Create ghostty.conf.template (dual-mode with light:X,dark:Y syntax)
- [x] Create ghostty-dark.theme.template + ghostty-light.theme.template (partial-mode)
- [x] Create btop-dark.theme.template + btop-light.theme.template (single-mode)
- [x] Create waybar-dark.css.template + waybar-light.css.template (partial-mode)
- [x] Create wofi.css.template (single-mode)
- [x] Create walker.css.template (single-mode)
- [x] Create hyprland.conf.template (single-mode)
- [x] Create hyprlock.conf.template (single-mode)
- [x] Create mako.ini.template (single-mode)
- [x] Create swayosd.css.template (single-mode)
- [x] Create templates.json manifest with versions

## Phase 4: Theme Application Integration
- [x] Refactor set-theme.ts to support JSON themes
- [x] Implement template rendering on theme apply
- [x] Add dual-format support (JSON + legacy directories)
- [x] Update theme parser for new format detection
- [x] Show "theme (dark)" and "theme (light)" variants in CLI/TUI
- [x] Add template update prompt (Y/n when newer version available, skip if customOverride)

## Phase 5: Neovim Integration
- [x] Create neovim.lua template generator (`src/lib/neovim/generator.ts`)
- [x] Handle light/dark colorscheme variants
- [x] Support plugin options

## Phase 6: GTK Theme Integration (Phase 2 - deferred, Linux-only)
- [ ] Create GTK manager (`src/lib/gtk/manager.ts`)
- [ ] Add Linux platform check (skip on macOS)
- [ ] Implement Colloid clone/cache logic
- [ ] Create SCSS color override generator
- [ ] Implement GTK build process
- [ ] Add sassc dependency check

## Phase 7: Migration & Polish
- [x] Create theme migration utility (`src/lib/migration/extractor.ts`)
- [x] Update TUI theme menu for variants
- [x] Add `--migrate` CLI option
- [ ] Test all templates with catppuccin colors (dark + light)
- [ ] Documentation updates

## Files Created

### Core Infrastructure (Phase 1)
- `src/types/theme-schema.ts` - JSON theme schema types
- `src/lib/theme-v2/color.ts` - Color parsing utilities
- `src/lib/theme-v2/validator.ts` - Schema validation
- `src/lib/theme-v2/loader.ts` - JSON theme loading
- `src/lib/theme-v2/index.ts` - Module exports
- `templates/themes/catppuccin.json` - Example theme

### Template Engine (Phase 2)
- `src/lib/template-engine/types.ts` - Template context types
- `src/lib/template-engine/modifiers.ts` - Color modifier functions
- `src/lib/template-engine/parser.ts` - Template variable interpolation
- `src/lib/template-engine/versioning.ts` - Template version management
- `src/lib/template-engine/engine.ts` - Main template engine
- `src/lib/template-engine/index.ts` - Module exports

### Default Templates (Phase 3)
- `templates/alacritty.toml.template`
- `templates/kitty-dark.conf.template`
- `templates/kitty-light.conf.template`
- `templates/ghostty.conf.template`
- `templates/ghostty-dark.theme.template`
- `templates/ghostty-light.theme.template`
- `templates/btop-dark.theme.template`
- `templates/btop-light.theme.template`
- `templates/waybar-dark.css.template`
- `templates/waybar-light.css.template`
- `templates/wofi.css.template`
- `templates/walker.css.template`
- `templates/hyprland.conf.template`
- `templates/hyprlock.conf.template`
- `templates/mako.ini.template`
- `templates/swayosd.css.template`
- `templates/templates.json`

### Neovim Integration (Phase 5)
- `src/lib/neovim/generator.ts` - Neovim config generator
- `src/lib/neovim/index.ts` - Module exports

### Migration (Phase 7)
- `src/lib/migration/extractor.ts` - Color extraction from legacy themes
- `src/lib/migration/index.ts` - Module exports

## Files Modified

- `src/lib/paths.ts` - Added TEMPLATES_DIR, GENERATED_DIR, GTK_DIR, COLLOID_DIR
- `src/cli/set-theme.ts` - Full refactor for JSON theme support
- `src/components/menus/ThemeMenu.tsx` - Unified theme list support
- `src/components/ThemeCard.tsx` - Support for both Theme and UnifiedThemeEntry

## Usage Examples

### Apply a JSON theme
```bash
bun run theme catppuccin:dark
bun run theme catppuccin:light --save
```

### Migrate a legacy theme
```bash
bun run theme --migrate my-legacy-theme
```

### Install/manage templates
```bash
bun run theme --install-templates
bun run theme --template-status
```

### Show theme info
```bash
bun run theme --info catppuccin
```
