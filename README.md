# 🌟 Azure DevOps Wiki MCP Server

A Model Context Protocol (MCP) server that brings Azure DevOps Wiki context to your AI agents, enabling seamless integration with Azure DevOps wikis.

## 📄 Table of Contents

- [🌟 Project Overview](#-project-overview)
- [⚙️ Supported Tools](#️-supported-tools)
- [🔌 Installation & Getting Started](#-installation--getting-started)
- [🔑 Authentication](#-authentication)
- [🛠️ Development](#️-development)
- [🏗️ Architecture](#️-architecture)
- [🤝 Contributing](#-contributing)
- [📝 License](#-license)

## 🌟 Project Overview

The Azure DevOps Wiki MCP Server enables AI applications to interact with Azure DevOps wikis through the Model Context Protocol. It provides comprehensive wiki operations including content search, page management, and hierarchical structure navigation.

**Key Features:**
- 🔍 Search across wiki content
- 📄 Read and update wiki pages
- 🌲 Navigate hierarchical page structures
- 📋 List and manage wikis
- 🔐 Secure authentication via Azure CLI or PAT

## ⚙️ Supported Tools

### 🔍 search_wiki
Search across wiki content using Azure DevOps Search API.

**Parameters:**
- `organization` (required): Azure DevOps organization name
- `project` (required): Project name
- `searchText` (required): Search query string
- `wikiId` (optional): Specific wiki identifier

### 🌲 wiki_get_page_tree
Retrieve hierarchical page structure from wiki.

**Parameters:**
- `organization` (required): Azure DevOps organization name
- `project` (required): Project name
- `wikiId` (required): Wiki identifier
- `depth` (optional): Maximum depth to retrieve

### 📄 wiki_get_page
Get content of a specific wiki page.

**Parameters:**
- `organization` (required): Azure DevOps organization name
- `project` (required): Project name
- `wikiId` (required): Wiki identifier
- `path` (required): Page path or page ID

### ✏️ wiki_update_page
Update content of an existing wiki page or create a new page if it does not exist.

**Parameters:**
- `organization` (required): Azure DevOps organization name
- `project` (required): Project name
- `wikiId` (required): Wiki identifier
- `path` (required): Page path or page ID
- `content` (required): New page content (Markdown)

### 📋 list_wiki
List all wikis in a project.

**Parameters:**
- `organization` (optional): Azure DevOps organization name
- `project` (optional): Project name

**Note:** Both parameters are optional and will use environment defaults if not provided.

## 🔌 Installation & Getting Started

### Prerequisites

- Node.js 18 or higher
- Azure CLI installed and configured (`az login`) *Required only if you wish to authenticate with Azure, not required if you choose to use PAT token*
- Appropriate Azure DevOps permissions for target organization

### Configure in Claude Desktop using PAT authentication

Add to your `claude_desktop_config.json`:
```json
{
    "mcpServers": {
        "azure-devops-wiki": {
            "command": "npx",
            "args": [
                "-y",
                "azure-devops-wiki-mcp"
            ],
            "env": {
                "AZURE_DEVOPS_URL": "https://dev.azure.com/your-organization",
                "AZURE_DEVOPS_PROJECT": "your-project",
                "AZURE_DEVOPS_PAT": "your-pat-token",
                "AZURE_DEVOPS_ORGANIZATION": "your-organization-name"
            }
        }
    }
}
```

### Configure in Claude Desktop using Azure authentication

1. **Authenticate with Azure:**
   ```bash
   az login
   ```

2. **Configure with Claude Desktop:**
   Add to your `claude_desktop_config.json`:
   ```json
    {
        "mcpServers": {
            "azure-devops-wiki": {
                "command": "npx",
                "args": [
                    "-y",
                    "azure-devops-wiki-mcp"
                ],
                "env": {
                    "AZURE_DEVOPS_URL": "https://dev.azure.com/your-organization",
                    "AZURE_DEVOPS_PROJECT": "your-project",
                    "AZURE_DEVOPS_ORGANIZATION": "your-organization-name"
                }
            }
        }
    }
    ```

## 🔑 Authentication

This server supports two authentication methods:

### 1. Azure CLI Authentication (Default)

Make sure you're logged in:

```bash
az login
```

The server will use your Azure CLI credentials to authenticate with Azure DevOps.

### 2. Personal Access Token (PAT)

You can also use a Personal Access Token for authentication by setting environment variable `AZURE_DEVOPS_PAT`.

**Creating a PAT:**
1. Go to Azure DevOps → User Settings → Personal Access Tokens
2. Create a new token with the following scopes:
   - **Wiki**: Read & Write
   - **Project and Team**: Read (for project access)
3. Copy the token and set it in the `AZURE_DEVOPS_PAT` environment variable

**Environment Variables:**

| **Environment Variables** | **Description**                 | Required? |
| ------------------------- | ------------------------------- | --------- |
| AZURE_DEVOPS_URL          | Azure DevOps URL                | Yes       |
| AZURE_DEVOPS_PROJECT      | Default project name (optional) | No        |
| AZURE_DEVOPS_PAT          |                                 | No        |
| AZURE_DEVOPS_ORGANIZATION | Azure DevOps Organization Name  | Yes       |

When using PAT authentication, the server will prioritize the PAT over Azure CLI credentials.

## 🛠️ Development

### Setup

```bash
git clone <repository-url>
cd azure-devops-wiki-mcp
npm install
```

### Available Commands

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

# Version bump and publishing
npm run version:patch   # Bump patch version (1.0.0 → 1.0.1)
npm run version:minor   # Bump minor version (1.0.0 → 1.1.0)
npm run version:major   # Bump major version (1.0.0 → 2.0.0)
npm run release         # Run build, test, and lint checks before publishing
```

### For Local Development
Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "azure-devops-wiki": {
      "command": "node",
      "args": ["path/to/azure-devops-wiki-mcp/dist/index.js"],
      "env": {
        "AZURE_DEVOPS_URL": "https://dev.azure.com/your-organization",
        "AZURE_DEVOPS_PROJECT": "your-project",
        "AZURE_DEVOPS_PAT": "your-pat-token",
        "AZURE_DEVOPS_ORGANIZATION": "your-organization-name"
      }
    }
  }
}
```

### Debug in IDE

1. Start up @modelcontextprotocol/inspector with inspection turned on:
   ```bash
   mcp-inspector node --inspect dist/index.js

   # Alternatively, set the environment variables when you launch it
   mcp-inspector -e AZURE_DEVOPS_URL="Your DevOps URL" -e AZURE_DEVOPS_PROJECT="Your DevOps Project" -e AZURE_DEVOPS_PAT="Your PAT" -e AZURE_DEVOPS_ORGANIZATION="Your DevOps Organization" node --inspect dist/index.js
   ```

2. Use IDE (vscode / cursor), select "Attach to MCP Server" and start debug

3. Enter local test data from MCP Inspector UI

## 🏗️ Architecture

The server follows the Model Context Protocol specification and integrates with Azure DevOps Wiki API through the official `azure-devops-node-api` client library.

**Key Components:**
- **MCP Server**: Implements MCP protocol using `@modelcontextprotocol/sdk`
- **Azure DevOps Client**: Wrapper around `azure-devops-node-api` for Wiki API operations
- **Tool Handlers**: Five main tools implementing MCP tool interface
- **Authentication**: Azure CLI-based authentication with PAT fallback

## 📦 Package Publishing & Release Management

### Version Bumping

The project includes automated version bumping scripts for semantic versioning:

```bash
# Bump patch version (1.0.0 → 1.0.1) - for bug fixes
npm run version:patch

# Bump minor version (1.0.0 → 1.1.0) - for new features  
npm run version:minor

# Bump major version (1.0.0 → 2.0.0) - for breaking changes
npm run version:major
```

Each version bump command automatically:
1. Updates the version in `package.json`
2. Creates a git commit with the version number
3. Creates a git tag (e.g., `v1.0.1`)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

MIT