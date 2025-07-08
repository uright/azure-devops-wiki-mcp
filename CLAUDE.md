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

## Tool Specifications

### search_wiki
**Purpose**: Search across wiki content using Azure DevOps Search API
**Parameters**: organization, project, searchText, wikiId (optional)
**Output**: Array of search results with page titles, content snippets, and URLs

### wiki_get_page_tree
**Purpose**: Retrieve hierarchical page structure from wiki
**Parameters**: organization, project, wikiId, depth (optional)
**Output**: Tree structure of wiki pages with parent-child relationships

### wiki_get_page
**Purpose**: Get content of a specific wiki page
**Parameters**: organization, project, wikiId, path
**Output**: Page content (Markdown), metadata, and version information

### wiki_update_page
**Purpose**: Update content of an existing wiki page
**Parameters**: organization, project, wikiId, path, content, version
**Output**: Updated page information and new version details

## Implementation Architecture

### Data Flow
1. MCP Host sends tool request to MCP Server
2. MCP Server validates request parameters using Zod schemas
3. Server authenticates with Azure DevOps using Azure CLI credentials
4. Server calls appropriate Azure DevOps Wiki API endpoint
5. API response is processed and formatted
6. Result is returned to MCP Host via MCP protocol

### Error Handling Strategy
- **Validation errors**: Return structured error responses with clear messages
- **Authentication failures**: Provide guidance on Azure CLI setup (`az login`)
- **API errors**: Translate Azure DevOps errors to user-friendly messages
- **Network issues**: Implement retry logic with exponential backoff

### Performance Requirements
- Response time < 5 seconds for typical wiki operations
- Support for concurrent requests
- Efficient handling of large wiki structures

## Current Implementation Status

**Note**: Some Azure DevOps API methods are currently stubbed out in `src/azure-client.ts`:
- `search_wiki`: Requires proper Search API integration
- `wiki_get_page`: Needs correct `getPageByPath` method implementation
- `wiki_update_page`: Requires proper `updatePageByPath` method implementation
- `wiki_get_page_tree`: Needs correct `getPagesBatch` method implementation

When implementing these methods, refer to the azure-devops-node-api documentation for correct method signatures and parameters.

## Security Considerations

- Secure credential handling using Azure identity libraries
- No storage of sensitive authentication data
- Proper error handling without credential exposure
- Wiki read/write permissions based on tool operations

## Testing Strategy

- Unit tests for individual tool implementations
- Integration tests with mocked Azure DevOps API
- Authentication flow testing
- Error scenario validation
- Current test coverage: Zod schema validation tests in `test/types.test.ts`

## Key Implementation Notes

- All tools must implement proper MCP tool interface with schema validation
- Error handling should provide meaningful messages for Azure DevOps API failures
- Page content is stored as Markdown and should be handled accordingly
- Wiki operations are backed by Git, so concurrent modifications need consideration
- Follow security best practices for handling Azure DevOps credentials
- Use `@azure/identity` DefaultAzureCredential for authentication
- All request parameters are validated using Zod schemas in `src/types.ts`