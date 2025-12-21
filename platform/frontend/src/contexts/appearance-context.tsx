"use client";

import type {
  OrganizationCustomFont,
  OrganizationTheme,
  OrganizationThemeMode,
} from "@shared";
import { DEFAULT_THEME_ID } from "@shared";
import {
  createContext,
  useContext,
  type ReactNode,
  useMemo,
  useEffect,
  useState,
} from "react";

const DEFAULT_FONT: OrganizationCustomFont = "lato";
const DEFAULT_THEME_MODE: OrganizationThemeMode = "system";

interface AppearanceContextValue {
  theme: OrganizationTheme;
  themeMode: OrganizationThemeMode;
  customFont: OrganizationCustomFont;
  logo: string | null;
  isServerData: boolean;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

interface AppearanceProviderProps {
  children: ReactNode;
  /**
   * Server-fetched appearance data passed from root layout.
   * Available immediately on first render (no flicker).
   */
  serverTheme?: OrganizationTheme | null;
  serverThemeMode?: OrganizationThemeMode | null;
  serverFont?: OrganizationCustomFont | null;
  serverLogo?: string | null;
}

/**
 * Appearance context provider that makes server-fetched appearance data
 * available to client components immediately (no API call needed).
 *
 * This prevents theme/logo flickering by having the data available from first render.
 */
export function AppearanceProvider({
  children,
  serverTheme,
  serverThemeMode,
  serverFont,
  serverLogo,
}: AppearanceProviderProps) {
  // Use server data as initial state (available immediately)
  const [theme] = useState<OrganizationTheme>(
    serverTheme || (DEFAULT_THEME_ID as OrganizationTheme),
  );
  const [themeMode] = useState<OrganizationThemeMode>(
    serverThemeMode || DEFAULT_THEME_MODE,
  );
  const [customFont] = useState<OrganizationCustomFont>(
    serverFont || DEFAULT_FONT,
  );
  const [logo] = useState<string | null>(serverLogo || null);

  // Track if we're using server-provided data
  const isServerData = !!(serverTheme || serverThemeMode || serverFont || serverLogo);

  const value = useMemo(
    () => ({
      theme,
      themeMode,
      customFont,
      logo,
      isServerData,
    }),
    [theme, themeMode, customFont, logo, isServerData],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

/**
 * Hook to access server-provided appearance data.
 *
 * This hook provides appearance data that's available immediately from server,
 * preventing flickering on first load.
 *
 * **Usage**: Use this instead of fetching appearance via API on client side.
 */
export function useServerAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);

  if (!context) {
    // Fallback to defaults if context not available
    return {
      theme: DEFAULT_THEME_ID as OrganizationTheme,
      themeMode: DEFAULT_THEME_MODE,
      customFont: DEFAULT_FONT,
      logo: null,
      isServerData: false,
    };
  }

  return context;
}
