# Azure DevOps Wiki MCP Server

A Model Context Protocol (MCP) server that provides integration with Azure DevOps Wiki API, enabling AI applications to interact with Azure DevOps wikis.

## Features

- **search_wiki**: Search across wiki content using Azure DevOps Search API
- **wiki_get_page_tree**: Retrieve hierarchical page structure from wiki
- **wiki_get_page**: Get content of a specific wiki page
- **wiki_update_page**: Update content of an existing wiki page

## Installation

```bash
npm install -g azure-devops-wiki-mcp
```

## Prerequisites

- Node.js 18 or higher
- Azure CLI installed and configured (`az login`)
- Appropriate Azure DevOps permissions for target organization

## Usage

### With Claude Desktop

#### For Global Installation
Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "azure-devops-wiki": {
      "command": "mcp-server-azure-devops-wiki",
      "args": []
    }
  }
}
```

#### For Local Development
Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "azure-devops-wiki": {
      "command": "node",
      "args": ["/Users/jack/Projects/uright/azure-devops-wiki-mcp/dist/index.js"],
      "env": {
        "AZURE_DEVOPS_URL": "https://dev.azure.com/your-organization",
        "AZURE_DEVOPS_PROJECT": "your-project",
        "AZURE_DEVOPS_PAT": "your-pat-token"
      }
    }
  }
}
```

**Note**: Replace the path with your actual project path and update the environment variables with your Azure DevOps configuration.

### Direct Usage

```bash
mcp-server-azure-devops-wiki
```

## Tool Specifications

### search_wiki

Search across wiki content using Azure DevOps Search API.

**Parameters:**
- `organization` (required): Azure DevOps organization name
- `project` (required): Project name
- `searchText` (required): Search query string
- `wikiId` (optional): Specific wiki identifier

### wiki_get_page_tree

Retrieve hierarchical page structure from wiki.

**Parameters:**
- `organization` (required): Azure DevOps organization name
- `project` (required): Project name
- `wikiId` (required): Wiki identifier
- `depth` (optional): Maximum depth to retrieve

### wiki_get_page

Get content of a specific wiki page.

**Parameters:**
- `organization` (required): Azure DevOps organization name
- `project` (required): Project name
- `wikiId` (required): Wiki identifier
- `path` (required): Page path or page ID

### wiki_update_page

Update content of an existing wiki page.

**Parameters:**
- `organization` (required): Azure DevOps organization name
- `project` (required): Project name
- `wikiId` (required): Wiki identifier
- `path` (required): Page path or page ID
- `content` (required): New page content (Markdown)
- `version` (required): Page version for concurrency control

## Authentication

This server supports two authentication methods:

### 1. Azure CLI Authentication (Default)

Make sure you're logged in:

```bash
az login
```

The server will use your Azure CLI credentials to authenticate with Azure DevOps.

### 2. Personal Access Token (PAT)

You can also use a Personal Access Token for authentication by setting environment variables:

```bash
export AZURE_DEVOPS_URL="https://dev.azure.com/your-organization"
export AZURE_DEVOPS_PROJECT="your-default-project"
export AZURE_DEVOPS_PAT="your-personal-access-token"
```

**Quick Setup:**
1. Copy the example environment file: `cp example.env .env`
2. Edit `.env` with your actual values
3. Load the environment: `source .env` or use a tool like `dotenv`

**Creating a PAT:**
1. Go to Azure DevOps → User Settings → Personal Access Tokens
2. Create a new token with the following scopes:
   - **Wiki**: Read & Write
   - **Project and Team**: Read (for project access)
3. Copy the token and set it in the `AZURE_DEVOPS_PAT` environment variable

**Environment Variables:**
- `AZURE_DEVOPS_URL`: Your Azure DevOps organization URL (optional, defaults to `https://dev.azure.com/{organization}`)
- `AZURE_DEVOPS_PROJECT`: Default project name (optional, can be overridden per request)
- `AZURE_DEVOPS_PAT`: Personal Access Token (optional, falls back to Azure CLI if not provided)

When using PAT authentication, the server will prioritize the PAT over Azure CLI credentials.

## Development

### Setup

```bash
git clone <repository-url>
cd azure-devops-wiki-mcp
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Run in Development

```bash
npm run watch
```

### Lint

```bash
npm run lint
```

## Architecture

The server follows the Model Context Protocol specification and integrates with Azure DevOps Wiki API through the official `azure-devops-node-api` client library.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT