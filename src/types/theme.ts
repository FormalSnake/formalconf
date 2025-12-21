export interface Theme {
  name: string;
  path: string;
  files: ThemeFile[];
}

export interface ThemeFile {
  name: string;
  path: string;
  application: string;
}
