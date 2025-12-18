import { expect, test } from "./fixtures";

test.describe("PATCH /api/chat/messages/:id - API Validation", () => {
  test("returns 404 for non-existent message", async ({
    request,
    makeApiRequest,
  }) => {
    const response = await makeApiRequest({
      request,
      method: "patch",
      urlSuffix: "/api/chat/messages/00000000-0000-0000-0000-000000000000",
      data: {
        partIndex: 0,
        text: "Updated text",
      },
      ignoreStatusCheck: true,
    });

    expect(response.status()).toBe(404);
  });

  test("validates minimum text length", async ({ request, makeApiRequest }) => {
    const response = await makeApiRequest({
      request,
      method: "patch",
      urlSuffix: "/api/chat/messages/00000000-0000-0000-0000-000000000001",
      data: {
        partIndex: 0,
        text: "",
      },
      ignoreStatusCheck: true,
    });

    expect(response.status()).toBe(400);
  });

  test("validates partIndex is a number", async ({
    request,
    makeApiRequest,
  }) => {
    const response = await makeApiRequest({
      request,
      method: "patch",
      urlSuffix: "/api/chat/messages/00000000-0000-0000-0000-000000000002",
      data: {
        partIndex: "not-a-number" as unknown as number,
        text: "Updated text",
      },
      ignoreStatusCheck: true,
    });

    expect(response.status()).toBe(400);
  });

  test("validates partIndex is non-negative", async ({
    request,
    makeApiRequest,
  }) => {
    const response = await makeApiRequest({
      request,
      method: "patch",
      urlSuffix: "/api/chat/messages/00000000-0000-0000-0000-000000000003",
      data: {
        partIndex: -1,
        text: "Updated text",
      },
      ignoreStatusCheck: true,
    });

    expect(response.status()).toBe(400);
  });

  test("validates request body schema", async ({ request, makeApiRequest }) => {
    const response = await makeApiRequest({
      request,
      method: "patch",
      urlSuffix: "/api/chat/messages/00000000-0000-0000-0000-000000000004",
      data: {},
      ignoreStatusCheck: true,
    });

    expect(response.status()).toBe(400);
  });

  test("validates UUID format in path parameter", async ({
    request,
    makeApiRequest,
  }) => {
    const response = await makeApiRequest({
      request,
      method: "patch",
      urlSuffix: "/api/chat/messages/invalid-uuid",
      data: {
        partIndex: 0,
        text: "Updated text",
      },
      ignoreStatusCheck: true,
    });

    expect(response.status()).toBe(400);
  });
});

test.describe("Chat Messages Access Control", () => {
  test("requires authentication", async ({ makeApiRequest }) => {
    const playwright = await import("@playwright/test");
    const unauthenticatedContext = await playwright.request.newContext({});

    const response = await makeApiRequest({
      request: unauthenticatedContext,
      method: "patch",
      urlSuffix: "/api/chat/messages/00000000-0000-0000-0000-000000000000",
      data: {
        partIndex: 0,
        text: "Updated text",
      },
      ignoreStatusCheck: true,
    });

    expect([401, 403]).toContain(response.status());

    await unauthenticatedContext.dispose();
  });
});
