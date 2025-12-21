import type {
  OrganizationCustomFont,
  OrganizationTheme,
  OrganizationThemeMode,
} from "@shared";
import { DEFAULT_THEME_ID } from "@shared";
import { fontFamilyMap } from "@/config/themes";

const THEME_STORAGE_KEY = "archestra-theme";
const FONT_STORAGE_KEY = "archestra-font";
const THEME_MODE_STORAGE_KEY = "theme"; // next-themes uses "theme" as key
const DEFAULT_FONT = "lato";
const DEFAULT_THEME_MODE = "system";

interface ThemeBlockingScriptProps {
  /**
   * Server-fetched appearance data to use as source of truth.
   * When provided, these values take precedence over localStorage.
   * This ensures correct theme/font/mode on first load (no flicker).
   */
  serverTheme?: OrganizationTheme | null;
  serverFont?: OrganizationCustomFont | null;
  serverThemeMode?: OrganizationThemeMode | null;
}

/**
 * Blocking script that applies theme BEFORE React hydration to prevent flickering.
 * This is a Server Component that returns an inline script tag.
 *
 * The script runs synchronously in the browser before any React code loads.
 *
 * **Priority order**:
 * 1. Server-provided theme/font/mode (from props) - used on first load
 * 2. localStorage values - used on subsequent loads
 * 3. Defaults - fallback when neither available
 *
 * **Critical**: Must be placed in <head> before any React components.
 */
export function ThemeBlockingScript({
  serverTheme,
  serverFont,
  serverThemeMode,
}: ThemeBlockingScriptProps = {}) {
  // Generate font family map as JS object literal for inline script
  const fontMapJs = JSON.stringify(fontFamilyMap);

  // Pass server values to script (null becomes JS null)
  const serverThemeJs = serverTheme ? `'${serverTheme}'` : "null";
  const serverFontJs = serverFont ? `'${serverFont}'` : "null";
  const serverThemeModeJs = serverThemeMode ? `'${serverThemeMode}'` : "null";

  return (
    <script
      // This script must run before React hydration
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  try {
    var root = document.documentElement;
    var fontMap = ${fontMapJs};

    // Priority: server data > localStorage > defaults
    var serverTheme = ${serverThemeJs};
    var serverFont = ${serverFontJs};
    var serverThemeMode = ${serverThemeModeJs};

    var themeId = serverTheme || localStorage.getItem('${THEME_STORAGE_KEY}') || '${DEFAULT_THEME_ID}';
    var fontId = serverFont || localStorage.getItem('${FONT_STORAGE_KEY}') || '${DEFAULT_FONT}';
    var themeMode = serverThemeMode || localStorage.getItem('${THEME_MODE_STORAGE_KEY}') || '${DEFAULT_THEME_MODE}';

    // Update localStorage with server values if provided (for next page load)
    if (serverTheme) {
      localStorage.setItem('${THEME_STORAGE_KEY}', serverTheme);
    }
    if (serverFont) {
      localStorage.setItem('${FONT_STORAGE_KEY}', serverFont);
    }
    if (serverThemeMode) {
      localStorage.setItem('${THEME_MODE_STORAGE_KEY}', serverThemeMode);
    }

    // Remove existing theme classes (in case any were set by SSR)
    var classes = Array.from(root.classList).filter(function(cls) {
      return cls.startsWith('theme-');
    });
    for (var i = 0; i < classes.length; i++) {
      root.classList.remove(classes[i]);
    }

    // Apply theme class (cosmic-night, catppuccin, etc.)
    root.classList.add('theme-' + themeId);

    // Apply theme mode (light/dark)
    root.classList.remove('light', 'dark');
    if (themeMode === 'system') {
      // Use system preference
      var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(themeMode);
    }

    // Apply font
    var fontFamily = fontMap[fontId];
    if (fontFamily) {
      root.style.setProperty('--font-sans', fontFamily);
    }
  } catch (e) {
    // Silently fail - React will apply defaults on hydration
    // Don't log to avoid noise in production
  }
})();
        `.trim(),
      }}
    />
  );
}
