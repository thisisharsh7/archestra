import { describe, expect, test } from "@/test";
import OrganizationModel from "./organization";

describe("OrganizationModel.getPublicAppearance", () => {
  test("should return public appearance fields when organization exists", async ({
    makeOrganization,
  }) => {
    await makeOrganization({
      theme: "catppuccin",
      customFont: "inter",
      logo: "data:image/png;base64,abc123",
    });

    const appearance = await OrganizationModel.getPublicAppearance();

    expect(appearance).toEqual({
      theme: "catppuccin",
      customFont: "inter",
      logo: "data:image/png;base64,abc123",
    });
  });

  test("should return null when no organization exists", async () => {
    const appearance = await OrganizationModel.getPublicAppearance();
    expect(appearance).toBeNull();
  });

  test("should not include sensitive fields", async ({
    makeOrganization,
  }) => {
    await makeOrganization({
      name: "Secret Corp",
      slug: "secret-corp",
      theme: "cyberpunk",
      customFont: "roboto",
    });

    const appearance = await OrganizationModel.getPublicAppearance();

    // Should only have public fields
    expect(appearance).toBeDefined();
    expect(appearance).not.toBeNull();
    if (appearance) {
      expect(Object.keys(appearance).sort()).toEqual([
        "customFont",
        "logo",
        "theme",
      ]);

      // Should NOT include sensitive fields
      expect(appearance).not.toHaveProperty("name");
      expect(appearance).not.toHaveProperty("slug");
      expect(appearance).not.toHaveProperty("id");
      expect(appearance).not.toHaveProperty("createdAt");
      expect(appearance).not.toHaveProperty("onboardingComplete");
    }
  });

  test("should return default values when organization uses defaults", async ({
    makeOrganization,
  }) => {
    // Make organization with default theme/font
    await makeOrganization();

    const appearance = await OrganizationModel.getPublicAppearance();

    expect(appearance).toBeDefined();
    expect(appearance).not.toBeNull();
    if (appearance) {
      expect(appearance.theme).toBe("modern-minimal"); // Default theme
      expect(appearance.customFont).toBe("lato"); // Default font
      expect(appearance.logo).toBeNull(); // No logo by default
    }
  });

  test("should return null logo when not set", async ({
    makeOrganization,
  }) => {
    await makeOrganization({
      theme: "catppuccin",
      customFont: "inter",
      // logo not provided
    });

    const appearance = await OrganizationModel.getPublicAppearance();

    expect(appearance).not.toBeNull();
    if (appearance) {
      expect(appearance.logo).toBeNull();
    }
  });

  test("should return first organization when multiple exist", async ({
    makeOrganization,
  }) => {
    // Create first org with specific theme
    await makeOrganization({
      theme: "catppuccin",
      customFont: "inter",
    });

    // Create second org (should be ignored since we only support single-org)
    // Note: In actual system, only one org should exist, but testing edge case
    await makeOrganization({
      theme: "cyberpunk",
      customFont: "roboto",
    });

    const appearance = await OrganizationModel.getPublicAppearance();

    // Should return first organization's appearance
    expect(appearance).not.toBeNull();
    if (appearance) {
      expect(appearance.theme).toBe("catppuccin");
      expect(appearance.customFont).toBe("inter");
    }
  });
});
