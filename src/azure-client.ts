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

  async getPageTree(request: WikiPageTreeRequest): Promise<WikiPageNode[]> {
    if (!this.wikiApi || !this.connection) {
      throw new Error('Azure DevOps client not initialized');
    }

    try {
      const organization = request.organization || this.config.organization;
      const project = request.project || this.config.project;
      
      if (!organization || !project) {
        throw new Error('Organization and project must be provided');
      }

      const orgUrl = this.config.azureDevOpsUrl || `https://dev.azure.com/${organization}`;
      const recursionLevel = request.depth ? 'Full' : 'OneLevel';
      const apiUrl = `${orgUrl}/${project}/_apis/wiki/wikis/${request.wikiId}/pages?recursionLevel=${recursionLevel}&api-version=7.1`;

      const response = await this.connection.rest.client.get(apiUrl);
      
      if (!response.message || response.message.statusCode !== 200) {
        return [];
      }

      const responseBody = await response.readBody();
      if (!responseBody) {
        return [];
      }

      const data = JSON.parse(responseBody);
      let pages = [];
      if (data.value) {
        pages = data.value;
      } else if (data.subPages) {
        pages = [data];
      } else {
        pages = [data];
      }

      const processPages = (pageList: unknown[]): WikiPageNode[] => {
        return pageList.map((page: unknown) => {
          const pageData = page as { 
            id?: number; 
            path?: string; 
            order?: number; 
            gitItemPath?: string; 
            subPages?: unknown[] 
          };
          return {
            id: pageData.id?.toString() || '',
            path: pageData.path || '',
            title: pageData.path ? pageData.path.split('/').pop() || '' : '',
            order: pageData.order || 0,
            gitItemPath: pageData.gitItemPath || '',
            subPages: pageData.subPages ? processPages(pageData.subPages) : []
          };
        }).sort((a, b) => a.order - b.order);
      };

      return processPages(pages);
    } catch (error) {
      throw new Error(`Failed to get page tree: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getPage(request: WikiGetPageRequest): Promise<WikiPageContent> {
    if (!this.wikiApi || !this.connection) {
      throw new Error('Azure DevOps client not initialized');
    }

    try {
      const organization = request.organization || this.config.organization;
      const project = request.project || this.config.project;
      
      if (!organization || !project) {
        throw new Error('Organization and project must be provided');
      }

      const orgUrl = this.config.azureDevOpsUrl || `https://dev.azure.com/${organization}`;
      const encodedPath = encodeURIComponent(request.path);
      const apiUrl = `${orgUrl}/${project}/_apis/wiki/wikis/${request.wikiId}/pages?path=${encodedPath}&includeContent=true&api-version=7.1`;

      const response = await this.connection.rest.client.get(apiUrl);
      
      if (!response.message || response.message.statusCode !== 200) {
        throw new Error(`Failed to get page: HTTP ${response.message?.statusCode || 'Unknown'}`);
      }

      const responseBody = await response.readBody();
      if (!responseBody) {
        throw new Error('Empty response body');
      }

      const data = JSON.parse(responseBody);
      
      // Handle the response structure
      let pageData;
      if (data.value) {
        // If value is an array, get the first element
        if (Array.isArray(data.value) && data.value.length > 0) {
          pageData = data.value[0];
        } else if (Array.isArray(data.value) && data.value.length === 0) {
          // Empty array means page not found
          throw new Error(`Page not found: ${request.path}`);
        } else {
          // value is not an array, use it directly
          pageData = data.value;
        }
      } else {
        // No value property, use data directly
        pageData = data;
      }
      
      if (!pageData || pageData === null) {
        throw new Error(`Page not found: ${request.path}`);
      }

      return {
        id: pageData.id?.toString() || '',
        path: pageData.path || request.path,
        title: pageData.path ? pageData.path.split('/').pop() || '' : '',
        content: pageData.content || '',
        gitItemPath: pageData.gitItemPath || '',
        order: pageData.order || 0,
        version: pageData.version || '',
        isParentPage: pageData.isParentPage || false
      };
    } catch (error) {
      throw new Error(`Failed to get page: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updatePage(_request: WikiUpdatePageRequest): Promise<WikiPageUpdateResult> {
    throw new Error('Update page functionality not implemented yet - requires proper API method');
  }

}