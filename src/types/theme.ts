export interface ThemeColors {
  primary?: string;
  secondary?: string;
  background?: string;
  foreground?: string;
  accent?: string;
}

export interface ThemeMetadata {
  name: string;
  author?: string;
  description?: string;
  version?: string;
  source?: string;
  colors?: ThemeColors;
}

export interface ThemeFile {
  name: string;
  path: string;
  application: string;
}

export interface Theme {
  name: string;
  path: string;
  files: ThemeFile[];
  metadata?: ThemeMetadata;
  hasBackgrounds: boolean;
  hasPreview: boolean;
  isLightMode: boolean;
}
