import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    "tests/**/*.ts",
    "playwright.config.ts",
    "consts.ts",
    "fixtures.ts",
    // Playwright setup files (used via testMatch in playwright.config.ts)
    "auth.admin.setup.ts",
    "auth.teams.setup.ts",
    "auth.users.setup.ts",
  ],
  project: ["**/*.ts"],
  ignore: ["auth.*.setup.ts"],
  ignoreDependencies: [
    // Workspace dependency - resolved by pnpm
    "@shared",
  ],
  ignoreBinaries: [
    // biome is in root package.json
    "biome",
    // tsc is in root package.json (typescript)
    "tsc",
  ],
};

export default config;
