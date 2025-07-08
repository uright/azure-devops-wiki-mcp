#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AzureDevOpsWikiServer } from './server.js';

async function main() {
  const server = new Server(
    {
      name: 'azure-devops-wiki-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const wikiServer = new AzureDevOpsWikiServer(server);
  await wikiServer.initialize();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Azure DevOps Wiki MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});