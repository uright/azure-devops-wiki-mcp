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
- **Tool Handlers**: Five main tools implementing MCP tool interface
- **Authentication**: Azure CLI-based authentication following azure-devops-mcp patterns

### Core Tools Implementation

The server provides five main tools:

1. **search_wiki**: Search across wiki content using Azure DevOps Search API
2. **wiki_get_page_tree**: Retrieve hierarchical page structure from wiki
3. **wiki_get_page**: Get content of a specific wiki page
4. **wiki_update_page**: Update content of an existing wiki page
5. **list_wiki**: List all wikis in a project

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

The server supports two authentication methods:

### 1. Azure CLI Authentication (Default)
1. User must be logged in via `az login`
2. Must have appropriate permissions for target Azure DevOps organization
3. Wiki access permissions required for read/write operations

### 2. Personal Access Token (PAT)
Environment variables for PAT authentication:
- `AZURE_DEVOPS_URL`: Azure DevOps organization URL (optional)
- `AZURE_DEVOPS_PROJECT`: Default project name (optional)
- `AZURE_DEVOPS_PAT`: Personal Access Token (optional)

**Developer Setup**: Copy `example.env` to `.env` and configure with actual values

PAT requires the following scopes:
- **Wiki**: Read & Write
- **Project and Team**: Read (for project access)

Authentication priority: PAT takes precedence over Azure CLI credentials when both are available.

## Tool Specifications

### search_wiki
**Purpose**: Search across wiki content using Azure DevOps Search API
**Parameters**: organization, project, searchText, wikiId (optional)
**Output**: Array of search results with page titles, content snippets, URLs, and pagePath for use with wiki_get_page

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

### list_wiki
**Purpose**: List all wikis in a project
**Parameters**: organization (optional), project (optional)
**Output**: Array of wiki information including id, name, type, url, project, repositoryId, and mappedPath

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

### Implemented Methods
- **`wiki_get_page_tree`**: ✅ Fully implemented using Azure DevOps REST API
  - Uses direct HTTP client calls to `/pages` endpoint with recursion level support
  - Handles hierarchical page structures with proper sorting by order
  - Comprehensive unit test coverage with success/error scenarios

- **`wiki_get_page`**: ✅ Fully implemented using Azure DevOps REST API
  - Uses direct HTTP client calls to `/pages` endpoint with path parameter and includeContent=true
  - Handles both array and direct response formats from the API
  - Proper URL encoding for page paths with special characters
  - Comprehensive error handling for missing pages, network failures, and malformed responses
  - Comprehensive unit test coverage with success/error scenarios

- **`wiki_update_page`**: ✅ Fully implemented using Azure DevOps REST API
  - Uses direct HTTP client calls to `/pages` endpoint with PUT method for page updates
  - Handles version-based conflict resolution with proper ETag handling
  - Comprehensive error handling for version conflicts, missing pages, and malformed responses
  - Comprehensive unit test coverage with success/error scenarios

- **`search_wiki`**: ✅ Fully implemented using Azure DevOps Search API
  - Uses direct HTTP client calls to `/search/wikisearchresults` endpoint
  - Handles search queries with optional wiki filtering
  - Returns search results with `pagePath` attribute for use with `wiki_get_page`
  - Comprehensive error handling for API failures and malformed responses
  - Comprehensive unit test coverage with success/error scenarios

- **`list_wiki`**: ✅ Fully implemented using Azure DevOps Wiki API
  - Uses `wikiApi.getAllWikis()` method to retrieve all wikis in a project
  - Handles optional organization and project parameters with environment defaults
  - Returns structured wiki information including id, name, type, url, project, repositoryId, and mappedPath
  - Comprehensive error handling for API failures and missing configuration
  - Comprehensive unit test coverage with success/error scenarios

### Implementation Notes
- `wiki_get_page_tree` bypasses azure-devops-node-api limitations by using direct REST calls
- `search_wiki` uses the Azure DevOps Search API with direct REST calls for better control
- `list_wiki` uses the standard azure-devops-node-api WikiApi.getAllWikis() method
- All implemented methods include comprehensive error handling and type safety
- Consistent title extraction logic across all methods using `path.split('/').pop()`

## Security Considerations

- Secure credential handling using Azure identity libraries
- No storage of sensitive authentication data
- Proper error handling without credential exposure
- Wiki read/write permissions based on tool operations

## Testing Strategy

### Current Test Coverage
- **Schema validation tests** in `test/types.test.ts`: Validates Zod schemas for all request types
- **Environment configuration tests** in `test/environment-config.test.ts`: Tests environment variable validation
- **Azure client unit tests** in `test/azure-client.test.ts`: Comprehensive tests for AzureDevOpsWikiClient methods

### Unit Testing Guidelines
- **Mocking**: Use Jest mocks for external dependencies (azure-devops-node-api, @azure/identity)
- **Test structure**: Follow AAA pattern (Arrange, Act, Assert)
- **Coverage areas**:
  - Success scenarios with various data structures
  - Error scenarios (network failures, authentication issues, malformed responses)
  - Edge cases (empty responses, missing properties, invalid configurations)
  - Parameter validation and fallback behavior

### Test Implementation Details
- **Azure DevOps API mocking**: Mock WebApi, WikiApi, and REST client responses
- **Authentication mocking**: Mock both PAT and Azure CLI authentication paths
- **Response simulation**: Test with realistic Azure DevOps API response structures
- **Error handling**: Verify proper error messages and exception handling

### Running Tests
```bash
# Run all tests
npm test
```

## Key Implementation Notes

- All tools must implement proper MCP tool interface with schema validation
- Error handling should provide meaningful messages for Azure DevOps API failures
- Page content is stored as Markdown and should be handled accordingly
- Wiki operations are backed by Git, so concurrent modifications need consideration
- Follow security best practices for handling Azure DevOps credentials
- Use `@azure/identity` DefaultAzureCredential for authentication (fallback)
- PAT authentication via `azure-devops-node-api` getPersonalAccessTokenHandler
- All request parameters are validated using Zod schemas in `src/types.ts`
- Environment variables are validated using `EnvironmentConfigSchema` in `src/types.ts`
- Server configuration is loaded from environment variables in `src/server.ts`