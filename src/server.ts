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
  WikiUpdatePageRequestSchema,
  WikiListRequestSchema,
  EnvironmentConfigSchema,
  ServerConfig
} from './types.js';

export class AzureDevOpsWikiServer {
  private client: AzureDevOpsWikiClient | null = null;
  private config: ServerConfig;

  constructor(private server: Server) {
    this.config = this.loadConfiguration();
  }

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
              required: ['searchText']
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
              required: ['wikiId']
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
              required: ['wikiId', 'path']
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
                }
              },
              required: ['wikiId', 'path', 'content']
            }
          },
          {
            name: 'list_wiki',
            description: 'List all wikis in a project',
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
                }
              },
              required: []
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
          case 'list_wiki':
            return await this.handleListWiki(args);
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

  private loadConfiguration(): ServerConfig {
    try {
      const envConfig = EnvironmentConfigSchema.parse(process.env);
      return {
        azureDevOpsUrl: envConfig.AZURE_DEVOPS_URL,
        defaultProject: envConfig.AZURE_DEVOPS_PROJECT,
        defaultOrganization: envConfig.AZURE_DEVOPS_ORGANIZATION,
        personalAccessToken: envConfig.AZURE_DEVOPS_PAT
      };
    } catch (error) {
      console.error('Environment configuration validation failed:', error);
      return {};
    }
  }

  private async getClient(organization: string, project?: string): Promise<AzureDevOpsWikiClient> {
    if (!this.client) {
      const clientConfig = {
        organization,
        project: project || this.config.defaultProject || '',
        personalAccessToken: this.config.personalAccessToken,
        azureDevOpsUrl: this.config.azureDevOpsUrl
      };
      
      this.client = new AzureDevOpsWikiClient(clientConfig);
      await this.client.initialize();
    }
    return this.client;
  }

  private async handleSearchWiki(args: any) {
    const request = WikiSearchRequestSchema.parse(args);
    const organization = request.organization || this.config.defaultOrganization;
    const project = request.project || this.config.defaultProject;
    
    if (!organization) {
      throw new Error('Organization is required either as parameter or in server configuration');
    }
    if (!project) {
      throw new Error('Project is required either as parameter or in server configuration');
    }
    
    const client = await this.getClient(organization, project);
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
    const organization = request.organization || this.config.defaultOrganization;
    const project = request.project || this.config.defaultProject;
    
    if (!organization) {
      throw new Error('Organization is required either as parameter or in server configuration');
    }
    if (!project) {
      throw new Error('Project is required either as parameter or in server configuration');
    }
    
    const client = await this.getClient(organization, project);
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
    const organization = request.organization || this.config.defaultOrganization;
    const project = request.project || this.config.defaultProject;
    
    if (!organization) {
      throw new Error('Organization is required either as parameter or in server configuration');
    }
    if (!project) {
      throw new Error('Project is required either as parameter or in server configuration');
    }
    
    const client = await this.getClient(organization, project);
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
    const organization = request.organization || this.config.defaultOrganization;
    const project = request.project || this.config.defaultProject;
    
    if (!organization) {
      throw new Error('Organization is required either as parameter or in server configuration');
    }
    if (!project) {
      throw new Error('Project is required either as parameter or in server configuration');
    }
    
    const client = await this.getClient(organization, project);
    const result = await client.updatePage(request);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  private async handleListWiki(args: any) {
    const request = WikiListRequestSchema.parse(args);
    const organization = request.organization || this.config.defaultOrganization;
    const project = request.project || this.config.defaultProject;
    
    if (!organization) {
      throw new Error('Organization is required either as parameter or in server configuration');
    }
    if (!project) {
      throw new Error('Project is required either as parameter or in server configuration');
    }
    
    const client = await this.getClient(organization, project);
    const wikis = await client.listWikis(request);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(wikis, null, 2)
      }]
    };
  }
}