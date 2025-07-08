import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema, 
  Tool 
} from '@modelcontextprotocol/sdk/types.js';
import { AzureDevOpsWikiClient } from './azure-client.js';
import { 
  WikiSearchRequestSchema, 
  WikiPageTreeRequestSchema, 
  WikiGetPageRequestSchema, 
  WikiUpdatePageRequestSchema 
} from './types.js';

export class AzureDevOpsWikiServer {
  private client: AzureDevOpsWikiClient | null = null;

  constructor(private server: Server) {}

  async initialize(): Promise<void> {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_wiki',
            description: 'Search across wiki content using Azure DevOps Search API',
            inputSchema: {
              type: 'object',
              properties: {
                organization: {
                  type: 'string',
                  description: 'Azure DevOps organization name'
                },
                project: {
                  type: 'string',
                  description: 'Project name'
                },
                searchText: {
                  type: 'string',
                  description: 'Search query string'
                },
                wikiId: {
                  type: 'string',
                  description: 'Optional specific wiki identifier'
                }
              },
              required: ['organization', 'project', 'searchText']
            }
          },
          {
            name: 'wiki_get_page_tree',
            description: 'Retrieve hierarchical page structure from wiki',
            inputSchema: {
              type: 'object',
              properties: {
                organization: {
                  type: 'string',
                  description: 'Azure DevOps organization name'
                },
                project: {
                  type: 'string',
                  description: 'Project name'
                },
                wikiId: {
                  type: 'string',
                  description: 'Wiki identifier'
                },
                depth: {
                  type: 'number',
                  description: 'Optional maximum depth to retrieve'
                }
              },
              required: ['organization', 'project', 'wikiId']
            }
          },
          {
            name: 'wiki_get_page',
            description: 'Get content of a specific wiki page',
            inputSchema: {
              type: 'object',
              properties: {
                organization: {
                  type: 'string',
                  description: 'Azure DevOps organization name'
                },
                project: {
                  type: 'string',
                  description: 'Project name'
                },
                wikiId: {
                  type: 'string',
                  description: 'Wiki identifier'
                },
                path: {
                  type: 'string',
                  description: 'Page path or page ID'
                }
              },
              required: ['organization', 'project', 'wikiId', 'path']
            }
          },
          {
            name: 'wiki_update_page',
            description: 'Update content of an existing wiki page',
            inputSchema: {
              type: 'object',
              properties: {
                organization: {
                  type: 'string',
                  description: 'Azure DevOps organization name'
                },
                project: {
                  type: 'string',
                  description: 'Project name'
                },
                wikiId: {
                  type: 'string',
                  description: 'Wiki identifier'
                },
                path: {
                  type: 'string',
                  description: 'Page path or page ID'
                },
                content: {
                  type: 'string',
                  description: 'New page content (Markdown)'
                },
                version: {
                  type: 'string',
                  description: 'Page version for concurrency control'
                }
              },
              required: ['organization', 'project', 'wikiId', 'path', 'content', 'version']
            }
          }
        ] as Tool[]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_wiki':
            return await this.handleSearchWiki(args);
          case 'wiki_get_page_tree':
            return await this.handleGetPageTree(args);
          case 'wiki_get_page':
            return await this.handleGetPage(args);
          case 'wiki_update_page':
            return await this.handleUpdatePage(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    });
  }

  private async getClient(organization: string): Promise<AzureDevOpsWikiClient> {
    if (!this.client) {
      this.client = new AzureDevOpsWikiClient({ organization, project: '' });
      await this.client.initialize();
    }
    return this.client;
  }

  private async handleSearchWiki(args: any) {
    const request = WikiSearchRequestSchema.parse(args);
    const client = await this.getClient(request.organization);
    const results = await client.searchWiki(request);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2)
      }]
    };
  }

  private async handleGetPageTree(args: any) {
    const request = WikiPageTreeRequestSchema.parse(args);
    const client = await this.getClient(request.organization);
    const tree = await client.getPageTree(request);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(tree, null, 2)
      }]
    };
  }

  private async handleGetPage(args: any) {
    const request = WikiGetPageRequestSchema.parse(args);
    const client = await this.getClient(request.organization);
    const page = await client.getPage(request);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(page, null, 2)
      }]
    };
  }

  private async handleUpdatePage(args: any) {
    const request = WikiUpdatePageRequestSchema.parse(args);
    const client = await this.getClient(request.organization);
    const result = await client.updatePage(request);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
}