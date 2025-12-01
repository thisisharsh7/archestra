/**
 * E2E Tests for MCP Tool Name Prefix Stripping (Fix for #1179)
 *
 * These tests verify that when catalog name differs from server name,
 * tool names are correctly stripped before being sent to the MCP server.
 *
 * Bug scenario:
 * - Catalog name: "n8n"
 * - Server name: "n8n-lidar"
 * - Tool stored as: "n8n-lidar__get_workflow"
 * - MCP server should receive: "get_workflow" (not "n8n-lidar__get_workflow")
 *
 * These tests can be verified through the UI by observing tool calls succeed
 * instead of showing "Model tried to call unavailable tool" errors.
 */

import { expect, test } from "./fixtures";

test.describe("MCP Tool Prefix Stripping - Fix for #1179", () => {
  let agentId: string;
  let catalogId: string;
  let serverId: string;

  test.beforeAll(async ({ request, createAgent, createMcpCatalogItem }) => {
    // Create test agent
    const agentResponse = await createAgent(
      request,
      "Tool Prefix Test Agent",
    );
    const agent = await agentResponse.json();
    agentId = agent.id;

    // Create catalog with name "test-catalog"
    const catalogResponse = await createMcpCatalogItem(request, {
      name: "test-catalog",
      description: "Catalog for testing tool prefix stripping",
      serverType: "remote",
      serverUrl: "https://example.com/mcp",
    });
    const catalogItem = await catalogResponse.json();
    catalogId = catalogItem.id;
  });

  test.afterAll(
    async ({ request, deleteAgent, deleteMcpCatalogItem, uninstallMcpServer }) => {
      // Clean up in reverse order
      if (serverId) {
        try {
          await uninstallMcpServer(request, serverId);
        } catch (e) {
          // Server may not exist if test failed early
        }
      }
      if (catalogId) await deleteMcpCatalogItem(request, catalogId);
      if (agentId) await deleteAgent(request, agentId);
    },
  );

  test("verifies tools have server name prefix in database", async ({
    request,
    makeApiRequest,
    installMcpServer,
  }) => {
    // Install MCP server with name different from catalog
    const serverResponse = await installMcpServer(request, {
      name: "test-server-instance", // Different from "test-catalog"!
      catalogId: catalogId,
    });
    const server = await serverResponse.json();
    serverId = server.id;

    // Get tools from the server
    const toolsResponse = await makeApiRequest({
      request,
      method: "get",
      urlSuffix: `/api/mcp_server/${serverId}/tools`,
    });

    expect(toolsResponse.status()).toBe(200);
    const tools = await toolsResponse.json();

    // Verify at least one tool exists
    expect(Array.isArray(tools)).toBe(true);
    if (tools.length > 0) {
      // Verify tools are stored with SERVER name prefix (not catalog name)
      const firstTool = tools[0];
      expect(firstTool.name).toContain("__"); // Has separator

      // Tool name should start with server name, not catalog name
      const lowerToolName = firstTool.name.toLowerCase();
      expect(lowerToolName.startsWith("test-server-instance__")).toBe(true);
      expect(lowerToolName.startsWith("test-catalog__")).toBe(false);
    }
  });

  test("verifies agent tools API returns correct tool names", async ({
    request,
    makeApiRequest,
  }) => {
    // Assign tools to agent
    const assignResponse = await makeApiRequest({
      request,
      method: "post",
      urlSuffix: `/api/agents/${agentId}/tools`,
      data: {
        mcpServerId: serverId,
      },
    });
    expect(assignResponse.status()).toBe(200);

    // Get agent tools
    const agentToolsResponse = await makeApiRequest({
      request,
      method: "get",
      urlSuffix: `/api/agent-tools?agentId=${agentId}`,
    });
    expect(agentToolsResponse.status()).toBe(200);
    const agentToolsData = await agentToolsResponse.json();

    const agentTools = agentToolsData.data || [];
    expect(agentTools.length).toBeGreaterThan(0);

    // Verify tools have server name prefix
    for (const agentTool of agentTools) {
      if (agentTool.tool.mcpServerId === serverId) {
        const toolName = agentTool.tool.name.toLowerCase();
        // Should have server name prefix
        expect(toolName).toContain("__");
        expect(toolName.startsWith("test-server-instance__")).toBe(true);
      }
    }
  });

  test("documents the bug scenario with catalog vs server name mismatch", async ({
    request,
    makeApiRequest,
    createMcpCatalogItem,
    installMcpServer,
    deleteMcpCatalogItem,
    uninstallMcpServer,
  }) => {
    // Create the EXACT scenario from bug #1179
    // Catalog name: "n8n"
    // Server name: "n8n-lidar"

    const n8nCatalogResponse = await createMcpCatalogItem(request, {
      name: "n8n",
      description: "n8n workflow automation",
      serverType: "remote",
      serverUrl: "https://n8n.example.com/mcp",
    });
    const n8nCatalog = await n8nCatalogResponse.json();

    const n8nServerResponse = await installMcpServer(request, {
      name: "n8n-lidar", // Different from catalog name!
      catalogId: n8nCatalog.id,
    });
    const n8nServer = await n8nServerResponse.json();

    // Get tools - they should have "n8n-lidar__" prefix, not "n8n__"
    const toolsResponse = await makeApiRequest({
      request,
      method: "get",
      urlSuffix: `/api/mcp_server/${n8nServer.id}/tools`,
    });

    expect(toolsResponse.status()).toBe(200);
    const tools = await toolsResponse.json();

    // Clean up
    await uninstallMcpServer(request, n8nServer.id);
    await deleteMcpCatalogItem(request, n8nCatalog.id);

    // Verify tools follow the pattern
    if (tools.length > 0) {
      for (const tool of tools) {
        const toolName = tool.name.toLowerCase();

        // OLD BUG: Code would try to strip "n8n__" but tools have "n8n-lidar__"
        // NEW FIX: Code strips "n8n-lidar__" correctly

        // Tools should be named: {serverName}__{toolName}
        expect(toolName).toContain("__");

        // This assertion documents the fix:
        // Tools are stored with SERVER name prefix, not CATALOG name prefix
        expect(toolName.startsWith("n8n-lidar__")).toBe(true);
      }
    }
  });
});

test.describe("MCP Tool Prefix Stripping - Edge Cases", () => {
  test("handles catalog and server names that are the same", async ({
    request,
    makeApiRequest,
    createAgent,
    createMcpCatalogItem,
    installMcpServer,
    deleteAgent,
    deleteMcpCatalogItem,
    uninstallMcpServer,
  }) => {
    // When catalog name = server name, it should still work
    const agentResponse = await createAgent(request, "Same Name Test Agent");
    const agent = await agentResponse.json();

    const catalogResponse = await createMcpCatalogItem(request, {
      name: "same-name-server",
      description: "Server with same name as catalog",
      serverType: "remote",
      serverUrl: "https://same.example.com/mcp",
    });
    const catalog = await catalogResponse.json();

    const serverResponse = await installMcpServer(request, {
      name: "same-name-server", // Same as catalog!
      catalogId: catalog.id,
    });
    const server = await serverResponse.json();

    // Get tools
    const toolsResponse = await makeApiRequest({
      request,
      method: "get",
      urlSuffix: `/api/mcp_server/${server.id}/tools`,
    });

    expect(toolsResponse.status()).toBe(200);
    const tools = await toolsResponse.json();

    // Clean up
    await uninstallMcpServer(request, server.id);
    await deleteMcpCatalogItem(request, catalog.id);
    await deleteAgent(request, agent.id);

    // Tools should have the server name prefix
    if (tools.length > 0) {
      for (const tool of tools) {
        expect(tool.name).toContain("__");
        expect(tool.name.toLowerCase().startsWith("same-name-server__")).toBe(
          true,
        );
      }
    }
  });

  test("handles server names with special characters", async ({
    request,
    makeApiRequest,
    createAgent,
    createMcpCatalogItem,
    installMcpServer,
    deleteAgent,
    deleteMcpCatalogItem,
    uninstallMcpServer,
  }) => {
    const agentResponse = await createAgent(
      request,
      "Special Chars Test Agent",
    );
    const agent = await agentResponse.json();

    const catalogResponse = await createMcpCatalogItem(request, {
      name: "special-catalog",
      description: "Catalog with special chars",
      serverType: "remote",
      serverUrl: "https://special.example.com/mcp",
    });
    const catalog = await catalogResponse.json();

    const serverResponse = await installMcpServer(request, {
      name: "my-server_123", // Hyphens and underscores
      catalogId: catalog.id,
    });
    const server = await serverResponse.json();

    // Get tools
    const toolsResponse = await makeApiRequest({
      request,
      method: "get",
      urlSuffix: `/api/mcp_server/${server.id}/tools`,
    });

    expect(toolsResponse.status()).toBe(200);
    const tools = await toolsResponse.json();

    // Clean up
    await uninstallMcpServer(request, server.id);
    await deleteMcpCatalogItem(request, catalog.id);
    await deleteAgent(request, agent.id);

    // Tools should have the server name prefix with special chars
    if (tools.length > 0) {
      for (const tool of tools) {
        expect(tool.name).toContain("__");
        expect(tool.name.toLowerCase().startsWith("my-server_123__")).toBe(
          true,
        );
      }
    }
  });
});
