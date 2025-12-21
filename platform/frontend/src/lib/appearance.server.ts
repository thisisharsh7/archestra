import type {
  OrganizationCustomFont,
  OrganizationTheme,
  OrganizationThemeMode,
} from "@shared";
import { env } from "next-runtime-env";

/**
 * Public appearance data structure matching backend PublicAppearanceSchema
 */
export interface PublicAppearance {
  theme: OrganizationTheme;
  themeMode: OrganizationThemeMode;
  customFont: OrganizationCustomFont;
  logo: string | null;
}

/**
 * Server-side function to fetch public appearance settings.
 *
 * This runs on the server during SSR, allowing us to inject appearance data
 * into the initial HTML response. This prevents theme/logo flickering on first load.
 *
 * **Usage**: Call this in Server Components (layout.tsx, page.tsx) to get appearance
 * data before rendering.
 *
 * @returns Promise resolving to appearance data or null if fetch fails
 */
export async function getPublicAppearance(): Promise<PublicAppearance | null> {
  try {
    // Get backend URL from environment
    // In production, this should be the internal service URL
    const backendUrl =
      env("NEXT_PUBLIC_BACKEND_URL") || "http://localhost:9000";

    const response = await fetch(`${backendUrl}/api/appearance/public`, {
      // Don't cache during development, but cache in production
      cache: process.env.NODE_ENV === "development" ? "no-store" : "default",
      // Fail fast - don't hang the page load
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      console.warn(
        `[getPublicAppearance] Failed to fetch: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data: PublicAppearance | null = await response.json();
    return data;
  } catch (error) {
    // Silently fail - page will use defaults
    console.warn("[getPublicAppearance] Error fetching appearance:", error);
    return null;
  }
}
