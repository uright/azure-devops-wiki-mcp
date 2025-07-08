import * as azdev from 'azure-devops-node-api';
import { WikiApi } from 'azure-devops-node-api/WikiApi';
import { IRequestHandler } from 'azure-devops-node-api/interfaces/common/VsoBaseInterfaces';
import { DefaultAzureCredential } from '@azure/identity';
import { 
  WikiSearchRequest, 
  WikiPageTreeRequest, 
  WikiGetPageRequest, 
  WikiUpdatePageRequest,
  WikiSearchResult,
  WikiPageNode,
  WikiPageContent,
  WikiPageUpdateResult,
  AzureDevOpsConfig 
} from './types.js';

export class AzureDevOpsWikiClient {
  private connection: azdev.WebApi | null = null;
  private wikiApi: WikiApi | null = null;

  constructor(private config: AzureDevOpsConfig) {}

  async initialize(): Promise<void> {
    try {
      let authHandler: IRequestHandler;
      
      if (this.config.personalAccessToken) {
        authHandler = azdev.getPersonalAccessTokenHandler(this.config.personalAccessToken);
      } else {
        const credential = new DefaultAzureCredential();
        const token = await credential.getToken(['https://app.vssps.visualstudio.com/.default']);
        authHandler = azdev.getBearerHandler(token.token);
      }

      // Support custom Azure DevOps URL or default to dev.azure.com
      const orgUrl = this.config.azureDevOpsUrl || `https://dev.azure.com/${this.config.organization}`;
      this.connection = new azdev.WebApi(orgUrl, authHandler);
      
      this.wikiApi = await this.connection.getWikiApi();
    } catch (error) {
      throw new Error(`Failed to initialize Azure DevOps client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async searchWiki(_request: WikiSearchRequest): Promise<WikiSearchResult[]> {
    throw new Error('Search functionality not implemented yet - requires search API integration');
  }

  async getPageTree(_request: WikiPageTreeRequest): Promise<WikiPageNode[]> {
    throw new Error('Get page tree functionality not implemented yet - requires proper API method');
  }

  async getPage(_request: WikiGetPageRequest): Promise<WikiPageContent> {
    throw new Error('Get page functionality not implemented yet - requires proper API method');
  }

  async updatePage(_request: WikiUpdatePageRequest): Promise<WikiPageUpdateResult> {
    throw new Error('Update page functionality not implemented yet - requires proper API method');
  }

  private buildPageTree(pages: any[]): WikiPageNode[] {
    const pageMap = new Map<string, WikiPageNode>();
    const rootPages: WikiPageNode[] = [];

    pages.forEach(page => {
      const node: WikiPageNode = {
        id: page.id?.toString() || '',
        path: page.path || '',
        title: page.title || '',
        order: page.order || 0,
        gitItemPath: page.gitItemPath || '',
        subPages: []
      };
      pageMap.set(node.id, node);
    });

    pages.forEach(page => {
      const node = pageMap.get(page.id?.toString() || '');
      if (!node) return;

      if (page.parentId) {
        const parent = pageMap.get(page.parentId.toString());
        if (parent) {
          parent.subPages = parent.subPages || [];
          parent.subPages.push(node);
        }
      } else {
        rootPages.push(node);
      }
    });

    const sortPages = (pages: WikiPageNode[]): WikiPageNode[] => {
      return pages.sort((a, b) => a.order - b.order).map(page => ({
        ...page,
        subPages: page.subPages ? sortPages(page.subPages) : []
      }));
    };

    return sortPages(rootPages);
  }
}