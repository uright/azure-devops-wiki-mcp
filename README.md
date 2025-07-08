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

This server uses Azure CLI authentication. Make sure you're logged in:

```bash
az login
```

The server will use your Azure CLI credentials to authenticate with Azure DevOps.

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