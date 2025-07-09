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

  private formatPagePath(path: string): string {
    if (!path) return '';
    
    // Remove leading slash if present
    let formattedPath = path;
    
    // Remove .md extension if present
    if (formattedPath.endsWith('.md')) {
      formattedPath = formattedPath.substring(0, formattedPath.length - 3);
    }
    
    // Replace hyphens with spaces
    formattedPath = formattedPath.replace(/-/g, ' ');
    
    return formattedPath;
  }

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

  async searchWiki(request: WikiSearchRequest): Promise<WikiSearchResult[]> {
    if (!this.wikiApi || !this.connection) {
      throw new Error('Azure DevOps client not initialized');
    }

    try {
      const organization = request.organization || this.config.organization;
      const project = request.project || this.config.project;
      
      if (!organization || !project) {
        throw new Error('Organization and project must be provided');
      }

      const searchApiUrl = `https://almsearch.dev.azure.com/${organization}/${project}/_apis/search/wikisearchresults?api-version=7.1`;
      
      interface WikiSearchRequestBody {
        searchText: string;
        $skip: number;
        $top: number;
        includeFacets: boolean;
        filters?: {
          Wiki?: string[];
        };
      }

      const requestBody: WikiSearchRequestBody = {
        searchText: request.searchText,
        $skip: 0,
        $top: 100, // Default to 100 results
        includeFacets: false
      };

      // Add wiki filter if specified
      if (request.wikiId) {
        requestBody.filters = {
          Wiki: [request.wikiId]
        };
      }

      const response = await this.connection.rest.client.post(searchApiUrl, JSON.stringify(requestBody), {
        'Content-Type': 'application/json'
      });
      
      if (!response.message || response.message.statusCode !== 200) {
        throw new Error(`Search failed: HTTP ${response.message?.statusCode || 'Unknown'}`);
      }

      const responseBody = await response.readBody();
      if (!responseBody) {
        return [];
      }

      const data = JSON.parse(responseBody);
      
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      interface WikiSearchResultItem {
        fileName?: string;
        path?: string;
        url?: string;
        matches?: {
          content?: { text: string }[];
        };
        project?: {
          name: string;
        };
        wiki?: {
          name: string;
        };
      }

      return data.results.map((result: WikiSearchResultItem) => ({
        title: result.fileName || (result.path ? result.path.split('/').pop() || 'Unknown' : 'Unknown'),
        url: result.url || '',
        content: result.matches && result.matches.content 
          ? result.matches.content.map((match) => match.text).join(' ')
          : '',
        project: result.project?.name || project,
        wiki: result.wiki?.name || request.wikiId || 'Unknown',
        pagePath: this.formatPagePath(result.path || '')
      }));

    } catch (error) {
      throw new Error(`Failed to search wiki: ${error instanceof Error ? error.message : String(error)}`);
    }
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

  async updatePage(request: WikiUpdatePageRequest): Promise<WikiPageUpdateResult> {
    if (!this.wikiApi || !this.connection) {
      throw new Error('Azure DevOps client not initialized');
    }

    try {
      const organization = request.organization || this.config.organization;
      const project = request.project || this.config.project;
      
      if (!organization || !project) {
        throw new Error('Organization and project must be provided');
      }

      // Set encoded pagePath
      const encodedPath = encodeURIComponent(request.path);

      // Get wiki object
      const wiki = await this.wikiApi.getWiki(request.wikiId, project);
      
      // First, check if page exists to get version for updates
      let pageVersion: string | undefined;
      let pageExists = false;
      
      try {
        let wikiPageResponse = await this.wikiApi.http.get(`${wiki.url}/pages?path=${encodedPath}`);

        if (wikiPageResponse.message && wikiPageResponse.message.statusCode === 200) {
          pageExists = true;
          pageVersion = wikiPageResponse.message.headers.etag;
        }
      } catch (checkError) {
        // Page doesn't exist, we'll create it
        pageExists = false;
      }

      // Create headers object with proper typing
      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json'
      };

      // Only add If-Match header if page exists and we have a version
      // For new pages, don't include If-Match header
      if (pageExists && pageVersion) {
        headers['If-Match'] = pageVersion;
      }

      const requestBody = {
        content: request.content
      };

      // TODO: Add versionDescriptor.versionType and versionDescriptor.version as optional environment variables
      const apiUrl = `${wiki.url}/pages?path=${encodedPath}&api-version=7.1&versionDescriptor.versionType=branch&versionDescriptor.version=master`;
      
      const response = await this.wikiApi.http.put(apiUrl, JSON.stringify(requestBody), headers);
      
      if (!response.message || (response.message.statusCode !== 200 && response.message.statusCode !== 201)) {
        // Enhanced error information for debugging
        const errorDetails: {
          statusCode: number | undefined;
          statusMessage: string | undefined;
          headers: { [key: string]: string | string[] | undefined } | undefined;
          url: string;
          requestHeaders: { [key: string]: string };
          requestBody: { content: string };
          pageExists: boolean;
          pageVersion: string | undefined;
          responseBody?: string;
        } = {
          statusCode: response.message?.statusCode,
          statusMessage: response.message?.statusMessage,
          headers: response.message?.headers,
          url: apiUrl,
          requestHeaders: headers,
          requestBody: requestBody,
          pageExists,
          pageVersion
        };
        
        throw new Error(`Failed to ${pageExists ? 'update' : 'create'} page: HTTP ${response.message?.statusCode || 'Unknown'}. Details: ${JSON.stringify(errorDetails, null, 2)}`);
      }

      const responseBody = await response.readBody();
      if (!responseBody) {
        throw new Error('Empty response body');
      }

      const data = JSON.parse(responseBody);
      
      // Handle the response structure
      let pageData = data.value || data;
      
      if (!pageData || pageData === null || (data.value !== undefined && data.value === null)) {
        throw new Error(`Failed to ${pageExists ? 'update' : 'create'} page: ${request.path}`);
      }

      return {
        id: pageData.id?.toString() || '',
        path: pageData.path || request.path,
        title: pageData.path ? pageData.path.split('/').pop() || '' : '',
        version: pageData.version || response.message.headers.etag || '',
        isParentPage: pageData.isParentPage || false,
        order: pageData.order || 0,
        gitItemPath: pageData.gitItemPath || ''
      };
    } catch (error) {
      throw new Error(`Failed to update page: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

}