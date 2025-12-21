import { RouteId } from "@shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { OrganizationModel } from "@/models";
import { constructResponseSchema, PublicAppearanceSchema } from "@/types";

/**
 * Public appearance routes - accessible without authentication.
 * Used by login/auth pages to display custom branding (theme, logo, fonts).
 */
const appearanceRoutes: FastifyPluginAsyncZod = async (fastify) => {
  /**
   * Public endpoint for login/auth pages - returns appearance settings.
   * Does NOT require authentication (skipped in middleware).
   * Returns theme, customFont, and logo for branding unauthenticated pages.
   */
  fastify.get(
    "/api/appearance/public",
    {
      schema: {
        operationId: RouteId.GetPublicAppearance,
        description:
          "Get public appearance settings (theme, logo, font) for unauthenticated pages",
        tags: ["Appearance"],
        response: constructResponseSchema(PublicAppearanceSchema.nullable()),
      },
    },
    async (_request, reply) => {
      const appearance = await OrganizationModel.getPublicAppearance();
      return reply.send(appearance);
    },
  );
};

export default appearanceRoutes;
