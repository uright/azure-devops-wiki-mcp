# Azure DevOps Wiki MCP Server - System Requirements Document

## 1. Project Overview

### 1.1 Purpose
The Azure DevOps Wiki MCP Server is a Model Context Protocol (MCP) server that provides seamless integration between AI applications and Azure DevOps Wiki API. This server enables AI models to interact with Azure DevOps wikis through standardized MCP tools.

### 1.2 Scope
This system provides four core functionalities:
- Search across wiki content
- Retrieve wiki page hierarchies
- Get individual wiki page content
- Update wiki page content

### 1.3 Reference Architecture
The project follows the established patterns from the microsoft/azure-devops-mcp project, ensuring consistency with existing Azure DevOps MCP implementations.

## 2. Technical Requirements

### 2.1 Technology Stack
- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **Protocol**: Model Context Protocol (MCP)
- **API Integration**: Azure DevOps REST API v7.1
- **Authentication**: Azure CLI-based authentication

### 2.2 Core Dependencies
- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `azure-devops-node-api`: Official Azure DevOps API client
- `@azure/identity`: Azure authentication library
- `zod`: Schema validation and type safety

### 2.3 Development Dependencies
- TypeScript compiler and configuration
- Jest for testing framework
- ESLint for code quality
- Standard Node.js build tools

## 3. Functional Requirements

### 3.1 MCP Tools Specification

#### 3.1.1 search_wiki
**Purpose**: Search across wiki content using Azure DevOps Search API
**Input Parameters**:
- `organization`: Azure DevOps organization name
- `project`: Project name
- `searchText`: Search query string
- `wikiId` (optional): Specific wiki identifier

**Output**: Array of search results with page titles, content snippets, and URLs

#### 3.1.2 wiki_get_page_tree
**Purpose**: Retrieve hierarchical page structure from wiki
**Input Parameters**:
- `organization`: Azure DevOps organization name
- `project`: Project name
- `wikiId`: Wiki identifier
- `depth` (optional): Maximum depth to retrieve

**Output**: Tree structure of wiki pages with parent-child relationships

#### 3.1.3 wiki_get_page
**Purpose**: Get content of a specific wiki page
**Input Parameters**:
- `organization`: Azure DevOps organization name
- `project`: Project name
- `wikiId`: Wiki identifier
- `path`: Page path or page ID

**Output**: Page content (Markdown), metadata, and version information

#### 3.1.4 wiki_update_page
**Purpose**: Update content of an existing wiki page
**Input Parameters**:
- `organization`: Azure DevOps organization name
- `project`: Project name
- `wikiId`: Wiki identifier
- `path`: Page path or page ID
- `content`: New page content (Markdown)
- `version`: Page version for concurrency control

**Output**: Updated page information and new version details

### 3.2 Authentication Requirements
- Azure CLI authentication (`az login`)
- Appropriate Azure DevOps permissions for target organization
- Wiki read/write permissions based on tool operations

## 4. Non-Functional Requirements

### 4.1 Performance
- Response time < 5 seconds for typical wiki operations
- Support for concurrent requests
- Efficient handling of large wiki structures

### 4.2 Security
- Secure credential handling using Azure identity libraries
- No storage of sensitive authentication data
- Proper error handling without credential exposure

### 4.3 Reliability
- Robust error handling for Azure DevOps API failures
- Graceful degradation when services are unavailable
- Proper validation of input parameters

### 4.4 Maintainability
- Clear separation of concerns
- Comprehensive error messages
- Extensible architecture for future enhancements

## 5. System Architecture

### 5.1 Component Overview
```
┌─────────────────────────────────────────────┐
│                MCP Host                     │
│            (AI Application)                 │
└─────────────────────────────────────────────┘
                        │
                        │ MCP Protocol
                        │
┌─────────────────────────────────────────────┐
│            MCP Server                       │
│        (azure-devops-wiki-mcp)             │
├─────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────────────┐│
│  │ Tool        │  │ Azure DevOps Wiki       ││
│  │ Handlers    │  │ API Client              ││
│  └─────────────┘  └─────────────────────────┘│
└─────────────────────────────────────────────┘
                        │
                        │ HTTPS/REST
                        │
┌─────────────────────────────────────────────┐
│         Azure DevOps Services               │
│              Wiki API                       │
└─────────────────────────────────────────────┘
```

### 5.2 Data Flow
1. MCP Host sends tool request to MCP Server
2. MCP Server validates request parameters
3. Server authenticates with Azure DevOps using Azure CLI credentials
4. Server calls appropriate Azure DevOps Wiki API endpoint
5. API response is processed and formatted
6. Result is returned to MCP Host via MCP protocol

## 6. Implementation Guidelines

### 6.1 Project Structure
```
azure-devops-wiki-mcp/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── server.ts             # MCP server implementation
│   ├── tools/                # Tool implementations
│   │   ├── search-wiki.ts
│   │   ├── get-page-tree.ts
│   │   ├── get-page.ts
│   │   └── update-page.ts
│   ├── azure-client.ts       # Azure DevOps API client
│   └── types.ts              # Type definitions
├── test/                     # Test files
├── docs/                     # Documentation
└── dist/                     # Compiled output
```

### 6.2 Error Handling Strategy
- Validation errors: Return structured error responses with clear messages
- Authentication failures: Provide guidance on Azure CLI setup
- API errors: Translate Azure DevOps errors to user-friendly messages
- Network issues: Implement retry logic with exponential backoff

### 6.3 Testing Strategy
- Unit tests for individual tool implementations
- Integration tests with mocked Azure DevOps API
- Authentication flow testing
- Error scenario validation

## 7. Deployment and Distribution

### 7.1 Package Distribution
- NPM package with executable binary
- GitHub repository with source code
- Documentation and examples

### 7.2 Installation Requirements
- Node.js v18 or higher
- Azure CLI installed and configured
- Appropriate Azure DevOps permissions

## 8. Future Enhancements

### 8.1 Potential Extensions
- Support for creating new wiki pages
- Batch operations for multiple pages
- Wiki attachment handling
- Advanced search filters
- Page history and version management

### 8.2 Integration Possibilities
- VS Code extension integration
- GitHub Actions workflow support
- CI/CD pipeline integration