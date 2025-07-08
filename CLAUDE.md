# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides integration with Azure DevOps Wiki API. The project follows the architecture patterns established by the microsoft/azure-devops-mcp reference implementation.

## Development Commands

```bash
# Build the project
npm run build

# Build in watch mode during development
npm run watch

# Start the MCP server
npm start

# Run tests
npm test

# Run linting
npm run lint

# Clean build artifacts
npm run clean
```

## Architecture

### MCP Server Structure
- **Entry Point**: Main server that implements MCP protocol using `@modelcontextprotocol/sdk`
- **Azure DevOps Client**: Wrapper around `azure-devops-node-api` for Wiki API operations
- **Tool Handlers**: Four main tools implementing MCP tool interface
- **Authentication**: Azure CLI-based authentication following azure-devops-mcp patterns

### Core Tools Implementation

The server provides four main tools:

1. **search_wiki**: Search across wiki content using Azure DevOps Search API
2. **wiki_get_page_tree**: Retrieve hierarchical page structure from wiki
3. **wiki_get_page**: Get content of a specific wiki page
4. **wiki_update_page**: Update content of an existing wiki page

### Azure DevOps Wiki API Integration

- **Base URL**: `https://dev.azure.com/{organization}/{project}/_apis/wiki/`
- **Authentication**: Uses Azure CLI credentials via `@azure/identity`
- **API Version**: 7.1
- **Content Format**: Markdown files backed by Git repository

## Technology Stack

### Core Dependencies
- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `azure-devops-node-api`: Official Azure DevOps API client
- `zod`: Runtime validation and schema definition
- `@azure/identity`: Azure authentication

### Development Tools
- TypeScript for type safety
- Jest for testing
- ESLint for code quality
- Standard Node.js build pipeline

## Authentication Requirements

The server requires Azure CLI authentication:
1. User must be logged in via `az login`
2. Must have appropriate permissions for target Azure DevOps organization
3. Wiki access permissions required for read/write operations

## Key Implementation Notes

- All tools must implement proper MCP tool interface with schema validation
- Error handling should provide meaningful messages for Azure DevOps API failures
- Page content is stored as Markdown and should be handled accordingly
- Wiki operations are backed by Git, so concurrent modifications need consideration
- Follow security best practices for handling Azure DevOps credentials