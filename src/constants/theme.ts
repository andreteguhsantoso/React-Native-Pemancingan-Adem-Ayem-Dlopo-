import { Platform } from 'react-native';

export const Palette = {
  ink: '#082F33',
  inkSoft: '#16484B',
  paper: '#F5F0E3',
  surface: '#FFFDF7',
  orange: '#E4512E',
  orangeDark: '#C83E20',
  gold: '#F2C14E',
  mint: '#CBE6D8',
  sky: '#A9D7DB',
  white: '#FFFFFF',
  muted: '#687A78',
  line: '#DFE5DD',
  success: '#267B57',
} as const;

export const Colors = {
  light: {
    text: Palette.ink,
    background: Palette.paper,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.mint,
    textSecondary: Palette.muted,
  },
  dark: {
    text: Palette.ink,
    background: Palette.paper,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.mint,
    textSecondary: Palette.muted,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Avenir Next',
    serif: 'Georgia',
    rounded: 'Avenir Next',
    mono: 'Menlo',
    display: 'Avenir Next Condensed',
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
    display: 'sans-serif-condensed',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
    display: 'sans-serif',
  },
  web: {
    sans: '"Trebuchet MS", sans-serif',
    serif: 'Georgia, serif',
    rounded: '"Trebuchet MS", sans-serif',
    mono: 'monospace',
    display: '"Arial Narrow", "Trebuchet MS", sans-serif',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 10,
  medium: 18,
  large: 26,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 58, android: 72, web: 72 }) ?? 0;
export const MaxContentWidth = 520;
