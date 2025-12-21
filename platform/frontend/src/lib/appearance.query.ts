import type {
  OrganizationCustomFont,
  OrganizationTheme,
  OrganizationThemeMode,
} from "@shared";
import { useQuery } from "@tanstack/react-query";

const THEME_STORAGE_KEY = "archestra-theme";
const FONT_STORAGE_KEY = "archestra-font";
const THEME_MODE_STORAGE_KEY = "theme"; // next-themes uses "theme" as key

/**
 * Public appearance data structure returned by the backend.
 * Matches PublicAppearanceSchema from backend/src/types/organization.ts
 */
interface PublicAppearance {
  theme: OrganizationTheme;
  themeMode: OrganizationThemeMode;
  customFont: OrganizationCustomFont;
  logo: string | null;
}

/**
 * Query key factory for appearance-related queries.
 * Follows TanStack Query best practices for query key organization.
 */
export const appearanceKeys = {
  all: ["appearance"] as const,
  public: () => [...appearanceKeys.all, "public"] as const,
};

/**
 * Hook to fetch public appearance settings from the unauthenticated endpoint.
 *
 * **Usage**: Call this on auth pages to keep localStorage synchronized with backend appearance data.
 *
 * **Important**: This hook updates localStorage but does NOT apply theme to DOM.
 * The blocking script in <head> handles DOM application to prevent flickering.
 *
 * **Flow**:
 * 1. Blocking script applies theme from localStorage immediately (no API call)
 * 2. React hydrates and this hook fetches fresh data from backend
 * 3. If backend data differs from localStorage, update localStorage
 * 4. Next page load uses updated localStorage → no flicker
 *
 * @returns TanStack Query result with appearance data or null
 */
export function usePublicAppearance() {
  return useQuery({
    queryKey: appearanceKeys.public(),
    queryFn: async (): Promise<PublicAppearance | null> => {
      const response = await fetch("/api/appearance/public");

      if (!response.ok) {
        // If fetch fails, return null (blocking script will use cached localStorage)
        console.warn(
          `Failed to fetch public appearance: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const data: PublicAppearance | null = await response.json();

      // Update localStorage if backend data exists and differs from cache
      if (data && typeof window !== "undefined") {
        const cachedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        const cachedFont = localStorage.getItem(FONT_STORAGE_KEY);
        const cachedThemeMode = localStorage.getItem(THEME_MODE_STORAGE_KEY);

        if (data.theme !== cachedTheme) {
          localStorage.setItem(THEME_STORAGE_KEY, data.theme);
        }

        if (data.customFont !== cachedFont) {
          localStorage.setItem(FONT_STORAGE_KEY, data.customFont);
        }

        if (data.themeMode !== cachedThemeMode) {
          localStorage.setItem(THEME_MODE_STORAGE_KEY, data.themeMode);
        }
      }

      return data;
    },
    staleTime: 60000, // Cache for 1 minute to avoid excessive API calls
    retry: false, // Don't retry on auth pages to avoid spamming failed requests
    refetchOnWindowFocus: false, // Don't refetch when user switches tabs
  });
}
