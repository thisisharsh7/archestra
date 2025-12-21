import { describe, expect, test } from "@/test";
import { createFastifyInstance } from "@/server";
import appearanceRoutes from "./appearance";

describe("GET /api/appearance/public", () => {
  test("should return public appearance when organization exists", async ({
    makeOrganization,
  }) => {
    await makeOrganization({
      theme: "catppuccin",
      customFont: "inter",
      logo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    });

    const app = createFastifyInstance();
    await app.register(appearanceRoutes);
    const response = await app.inject({
      method: "GET",
      url: "/api/appearance/public",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toEqual({
      theme: "catppuccin",
      themeMode: "system",
      customFont: "inter",
      logo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    });

    await app.close();
  });

  test("should return null when no organization exists", async () => {
    const app = createFastifyInstance();
    await app.register(appearanceRoutes);
    const response = await app.inject({
      method: "GET",
      url: "/api/appearance/public",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toBeNull();

    await app.close();
  });

  test("should not require authentication", async ({ makeOrganization }) => {
    await makeOrganization();

    const app = createFastifyInstance();
    await app.register(appearanceRoutes);
    const response = await app.inject({
      method: "GET",
      url: "/api/appearance/public",
      // Explicitly no auth headers provided
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toBeDefined();

    await app.close();
  });

  test("should return only public fields (no sensitive data)", async ({
    makeOrganization,
  }) => {
    await makeOrganization({
      name: "Secret Corp",
      slug: "secret-corp",
      theme: "cyberpunk",
      customFont: "roboto",
    });

    const app = createFastifyInstance();
    await app.register(appearanceRoutes);
    const response = await app.inject({
      method: "GET",
      url: "/api/appearance/public",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // Should only have these fields
    expect(Object.keys(body).sort()).toEqual([
      "customFont",
      "logo",
      "theme",
      "themeMode",
    ]);

    // Should NOT include sensitive fields
    expect(body).not.toHaveProperty("name");
    expect(body).not.toHaveProperty("slug");
    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("createdAt");

    await app.close();
  });

  test("should handle default theme and font", async ({
    makeOrganization,
  }) => {
    // Organization with defaults (modern-minimal theme, lato font)
    await makeOrganization();

    const app = createFastifyInstance();
    await app.register(appearanceRoutes);
    const response = await app.inject({
      method: "GET",
      url: "/api/appearance/public",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.theme).toBe("modern-minimal"); // Default theme
    expect(body.themeMode).toBe("system"); // Default theme mode
    expect(body.customFont).toBe("lato"); // Default font
    expect(body.logo).toBeNull(); // No logo by default

    await app.close();
  });
});
