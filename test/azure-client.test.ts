import { AzureDevOpsWikiClient } from '../src/azure-client';
import { WikiPageTreeRequest, WikiGetPageRequest, WikiUpdatePageRequest, WikiSearchRequest, WikiListRequest } from '../src/types';
import * as azdev from 'azure-devops-node-api';
import { WikiApi } from 'azure-devops-node-api/WikiApi';
import { DefaultAzureCredential } from '@azure/identity';

// Mock azure-devops-node-api
jest.mock('azure-devops-node-api');
jest.mock('azure-devops-node-api/WikiApi');
jest.mock('@azure/identity');

describe('AzureDevOpsWikiClient', () => {
  let client: AzureDevOpsWikiClient;
  let mockConnection: jest.Mocked<azdev.WebApi>;
  let mockWikiApi: jest.Mocked<WikiApi>;
  let mockRestClient: jest.Mocked<any>;
  let mockHttpClient: jest.Mocked<any>;

  const mockConfig = {
    organization: 'testorg',
    project: 'testproject',
    personalAccessToken: 'test-token'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock REST client
    mockRestClient = {
      get: jest.fn(),
      post: jest.fn()
    };

    // Mock HTTP client for WikiApi
    mockHttpClient = {
      get: jest.fn(),
      put: jest.fn()
    };

    // Mock WikiApi
    mockWikiApi = {
      getPagesBatch: jest.fn(),
      getWiki: jest.fn(),
      getAllWikis: jest.fn(),
      http: mockHttpClient
    } as any;

    // Mock WebApi connection
    mockConnection = {
      getWikiApi: jest.fn().mockResolvedValue(mockWikiApi),
      rest: {
        client: mockRestClient
      }
    } as any;

    // Mock azdev.WebApi constructor
    (azdev.WebApi as jest.MockedClass<typeof azdev.WebApi>).mockImplementation(() => mockConnection);
    (azdev.getPersonalAccessTokenHandler as jest.Mock).mockReturnValue({});

    // Mock DefaultAzureCredential
    const mockCredential = {
      getToken: jest.fn().mockResolvedValue({ token: 'mock-token' })
    };
    (DefaultAzureCredential as jest.MockedClass<typeof DefaultAzureCredential>).mockImplementation(() => mockCredential as any);
    (azdev.getBearerHandler as jest.Mock).mockReturnValue({});

    client = new AzureDevOpsWikiClient(mockConfig);
  });

  describe('searchWiki', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    describe('success scenarios', () => {
      it('should return search results for basic search query', async () => {
        const mockRequest: WikiSearchRequest = {
          organization: 'testorg',
          project: 'testproject',
          searchText: 'test query'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            count: 2,
            results: [
              {
                fileName: 'Home.md',
                path: '/Home',
                url: 'https://dev.azure.com/testorg/testproject/_wiki/wikis/wiki123?pagePath=/Home',
                matches: {
                  content: [
                    { text: 'This is a test page with query content' }
                  ]
                },
                project: {
                  name: 'testproject'
                },
                wiki: {
                  name: 'wiki123'
                }
              },
              {
                fileName: 'Getting-Started.md',
                path: '/Getting-Started',
                url: 'https://dev.azure.com/testorg/testproject/_wiki/wikis/wiki123?pagePath=/Getting-Started',
                matches: {
                  content: [
                    { text: 'Getting started with test framework' }
                  ]
                },
                project: {
                  name: 'testproject'
                },
                wiki: {
                  name: 'wiki123'
                }
              }
            ]
          }))
        };

        mockRestClient.post.mockResolvedValue(mockResponse);

        const result = await client.searchWiki(mockRequest);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          title: 'Home.md',
          url: 'https://dev.azure.com/testorg/testproject/_wiki/wikis/wiki123?pagePath=/Home',
          content: 'This is a test page with query content',
          project: 'testproject',
          wiki: 'wiki123',
          pagePath: '/Home'
        });
        expect(result[1]).toEqual({
          title: 'Getting-Started.md',
          url: 'https://dev.azure.com/testorg/testproject/_wiki/wikis/wiki123?pagePath=/Getting-Started',
          content: 'Getting started with test framework',
          project: 'testproject',
          wiki: 'wiki123',
          pagePath: '/Getting Started'
        });

        // Verify API call was made correctly
        expect(mockRestClient.post).toHaveBeenCalledWith(
          'https://almsearch.dev.azure.com/testorg/testproject/_apis/search/wikisearchresults?api-version=7.1',
          JSON.stringify({
            searchText: 'test query',
            $skip: 0,
            $top: 100,
            includeFacets: false
          }),
          {
            'Content-Type': 'application/json'
          }
        );
      });

      it('should return search results with wiki filter applied', async () => {
        const mockRequest: WikiSearchRequest = {
          organization: 'testorg',
          project: 'testproject',
          searchText: 'filtered query',
          wikiId: 'specific-wiki'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            count: 1,
            results: [
              {
                fileName: 'Filtered.md',
                path: '/Filtered',
                url: 'https://dev.azure.com/testorg/testproject/_wiki/wikis/specific-wiki?pagePath=/Filtered',
                matches: {
                  content: [
                    { text: 'Filtered content matches' }
                  ]
                },
                project: {
                  name: 'testproject'
                },
                wiki: {
                  name: 'specific-wiki'
                }
              }
            ]
          }))
        };

        mockRestClient.post.mockResolvedValue(mockResponse);

        const result = await client.searchWiki(mockRequest);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          title: 'Filtered.md',
          url: 'https://dev.azure.com/testorg/testproject/_wiki/wikis/specific-wiki?pagePath=/Filtered',
          content: 'Filtered content matches',
          project: 'testproject',
          wiki: 'specific-wiki',
          pagePath: '/Filtered'
        });

        // Verify API call included wiki filter
        expect(mockRestClient.post).toHaveBeenCalledWith(
          'https://almsearch.dev.azure.com/testorg/testproject/_apis/search/wikisearchresults?api-version=7.1',
          JSON.stringify({
            searchText: 'filtered query',
            $skip: 0,
            $top: 100,
            includeFacets: false,
            filters: {
              Wiki: ['specific-wiki']
            }
          }),
          {
            'Content-Type': 'application/json'
          }
        );
      });

      it('should return empty array when no results found', async () => {
        const mockRequest: WikiSearchRequest = {
          organization: 'testorg',
          project: 'testproject',
          searchText: 'nonexistent query'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            count: 0,
            results: []
          }))
        };

        mockRestClient.post.mockResolvedValue(mockResponse);

        const result = await client.searchWiki(mockRequest);

        expect(result).toHaveLength(0);
      });

      it('should handle search results with missing optional fields', async () => {
        const mockRequest: WikiSearchRequest = {
          organization: 'testorg',
          project: 'testproject',
          searchText: 'minimal result'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            count: 1,
            results: [
              {
                path: '/minimal'
                // Missing fileName, url, matches, project, collection
              }
            ]
          }))
        };

        mockRestClient.post.mockResolvedValue(mockResponse);

        const result = await client.searchWiki(mockRequest);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          title: 'minimal',
          url: '',
          content: '',
          project: 'testproject',
          wiki: 'Unknown',
          pagePath: '/minimal'
        });
      });

      it('should use default organization and project from config', async () => {
        const mockRequest: WikiSearchRequest = {
          searchText: 'config defaults test'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            count: 0,
            results: []
          }))
        };

        mockRestClient.post.mockResolvedValue(mockResponse);

        await client.searchWiki(mockRequest);

        expect(mockRestClient.post).toHaveBeenCalledWith(
          'https://almsearch.dev.azure.com/testorg/testproject/_apis/search/wikisearchresults?api-version=7.1',
          JSON.stringify({
            searchText: 'config defaults test',
            $skip: 0,
            $top: 100,
            includeFacets: false
          }),
          {
            'Content-Type': 'application/json'
          }
        );
      });
    });

    describe('error scenarios', () => {
      it('should throw error when client is not initialized', async () => {
        const uninitializedClient = new AzureDevOpsWikiClient(mockConfig);
        const mockRequest: WikiSearchRequest = {
          searchText: 'test query'
        };

        await expect(uninitializedClient.searchWiki(mockRequest)).rejects.toThrow('Azure DevOps client not initialized');
      });

      it('should throw error when organization is missing', async () => {
        const clientWithoutOrg = new AzureDevOpsWikiClient({
          organization: '',
          project: 'testproject'
        });
        await clientWithoutOrg.initialize();

        const mockRequest: WikiSearchRequest = {
          searchText: 'test query'
        };

        await expect(clientWithoutOrg.searchWiki(mockRequest)).rejects.toThrow('Organization and project must be provided');
      });

      it('should throw error when project is missing', async () => {
        const clientWithoutProject = new AzureDevOpsWikiClient({
          organization: 'testorg',
          project: ''
        });
        await clientWithoutProject.initialize();

        const mockRequest: WikiSearchRequest = {
          searchText: 'test query'
        };

        await expect(clientWithoutProject.searchWiki(mockRequest)).rejects.toThrow('Organization and project must be provided');
      });

      it('should throw error when search API returns non-200 status', async () => {
        const mockRequest: WikiSearchRequest = {
          searchText: 'test query'
        };

        const mockResponse = {
          message: { statusCode: 400 },
          readBody: jest.fn().mockResolvedValue('')
        };

        mockRestClient.post.mockResolvedValue(mockResponse);

        await expect(client.searchWiki(mockRequest)).rejects.toThrow('Search failed: HTTP 400');
      });

      it('should throw error when search API returns empty response body', async () => {
        const mockRequest: WikiSearchRequest = {
          searchText: 'test query'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue('')
        };

        mockRestClient.post.mockResolvedValue(mockResponse);

        const result = await client.searchWiki(mockRequest);
        expect(result).toEqual([]);
      });

      it('should throw error when search API returns malformed response', async () => {
        const mockRequest: WikiSearchRequest = {
          searchText: 'test query'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue('invalid json')
        };

        mockRestClient.post.mockResolvedValue(mockResponse);

        await expect(client.searchWiki(mockRequest)).rejects.toThrow('Failed to search wiki:');
      });

      it('should handle network errors gracefully', async () => {
        const mockRequest: WikiSearchRequest = {
          searchText: 'test query'
        };

        mockRestClient.post.mockRejectedValue(new Error('Network error'));

        await expect(client.searchWiki(mockRequest)).rejects.toThrow('Failed to search wiki: Network error');
      });

      it('should return empty array when response has no results property', async () => {
        const mockRequest: WikiSearchRequest = {
          searchText: 'test query'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            count: 0
            // Missing results property
          }))
        };

        mockRestClient.post.mockResolvedValue(mockResponse);

        const result = await client.searchWiki(mockRequest);
        expect(result).toEqual([]);
      });

      it('should return empty array when results is not an array', async () => {
        const mockRequest: WikiSearchRequest = {
          searchText: 'test query'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            count: 1,
            results: 'not an array'
          }))
        };

        mockRestClient.post.mockResolvedValue(mockResponse);

        const result = await client.searchWiki(mockRequest);
        expect(result).toEqual([]);
      });
    });
  });

  describe('getPageTree', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    describe('success scenarios', () => {
      it('should return page tree for simple wiki structure', async () => {
        const mockRequest: WikiPageTreeRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: [
              {
                id: 1,
                path: '/Home',
                order: 1,
                gitItemPath: '/Home.md'
              },
              {
                id: 2,
                path: '/Getting-Started',
                order: 2,
                gitItemPath: '/Getting-Started.md'
              }
            ]
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        const result = await client.getPageTree(mockRequest);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          id: '1',
          path: '/Home',
          title: 'Home',
          order: 1,
          gitItemPath: '/Home.md',
          subPages: []
        });
        expect(result[1]).toEqual({
          id: '2',
          path: '/Getting-Started',
          title: 'Getting-Started',
          order: 2,
          gitItemPath: '/Getting-Started.md',
          subPages: []
        });
      });

      it('should return hierarchical page tree with nested subPages', async () => {
        const mockRequest: WikiPageTreeRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          depth: 3
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: [
              {
                id: 1,
                path: '/Home',
                order: 1,
                gitItemPath: '/Home.md',
                subPages: [
                  {
                    id: 2,
                    path: '/Home/Overview',
                    order: 1,
                    gitItemPath: '/Home/Overview.md'
                  },
                  {
                    id: 3,
                    path: '/Home/Quick-Start',
                    order: 2,
                    gitItemPath: '/Home/Quick-Start.md',
                    subPages: [
                      {
                        id: 4,
                        path: '/Home/Quick-Start/Installation',
                        order: 1,
                        gitItemPath: '/Home/Quick-Start/Installation.md'
                      }
                    ]
                  }
                ]
              }
            ]
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        const result = await client.getPageTree(mockRequest);

        expect(result).toHaveLength(1);
        expect(result[0].subPages).toHaveLength(2);
        expect(result[0].subPages![1].subPages).toHaveLength(1);
        expect(result[0].subPages![1].subPages![0]).toEqual({
          id: '4',
          path: '/Home/Quick-Start/Installation',
          title: 'Installation',
          order: 1,
          gitItemPath: '/Home/Quick-Start/Installation.md',
          subPages: []
        });
      });

      it('should handle single page response format', async () => {
        const mockRequest: WikiPageTreeRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            id: 1,
            path: '/Home',
            order: 1,
            gitItemPath: '/Home.md',
            subPages: [
              {
                id: 2,
                path: '/Home/Overview',
                order: 1,
                gitItemPath: '/Home/Overview.md'
              }
            ]
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        const result = await client.getPageTree(mockRequest);

        expect(result).toHaveLength(1);
        expect(result[0].subPages).toHaveLength(1);
      });

      it('should sort pages by order property', async () => {
        const mockRequest: WikiPageTreeRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: [
              {
                id: 3,
                path: '/Third',
                order: 3,
                gitItemPath: '/Third.md'
              },
              {
                id: 1,
                path: '/First',
                order: 1,
                gitItemPath: '/First.md'
              },
              {
                id: 2,
                path: '/Second',
                order: 2,
                gitItemPath: '/Second.md'
              }
            ]
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        const result = await client.getPageTree(mockRequest);

        expect(result).toHaveLength(3);
        expect(result[0].title).toBe('First');
        expect(result[1].title).toBe('Second');
        expect(result[2].title).toBe('Third');
      });

      it('should use fallback values for missing properties', async () => {
        const mockRequest: WikiPageTreeRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: [
              {
                path: '/Incomplete-Page'
              }
            ]
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        const result = await client.getPageTree(mockRequest);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          id: '',
          path: '/Incomplete-Page',
          title: 'Incomplete-Page',
          order: 0,
          gitItemPath: '',
          subPages: []
        });
      });

      it('should use config organization/project when not provided in request', async () => {
        const mockRequest: WikiPageTreeRequest = {
          wikiId: 'wiki123'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: []
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        await client.getPageTree(mockRequest);

        expect(mockRestClient.get).toHaveBeenCalledWith(
          expect.stringContaining('https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123/pages')
        );
      });

      it('should set correct recursion level based on depth parameter', async () => {
        const mockRequestWithDepth: WikiPageTreeRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          depth: 5
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({ value: [] }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        await client.getPageTree(mockRequestWithDepth);

        expect(mockRestClient.get).toHaveBeenCalledWith(
          expect.stringContaining('recursionLevel=Full')
        );

        // Test without depth
        const mockRequestWithoutDepth: WikiPageTreeRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123'
        };

        await client.getPageTree(mockRequestWithoutDepth);

        expect(mockRestClient.get).toHaveBeenCalledWith(
          expect.stringContaining('recursionLevel=OneLevel')
        );
      });
    });

    describe('error scenarios', () => {
      it('should throw error when client is not initialized', async () => {
        const uninitializedClient = new AzureDevOpsWikiClient(mockConfig);
        const mockRequest: WikiPageTreeRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123'
        };

        await expect(uninitializedClient.getPageTree(mockRequest)).rejects.toThrow(
          'Azure DevOps client not initialized'
        );
      });

      it('should throw error when organization is missing', async () => {
        const clientWithoutOrg = new AzureDevOpsWikiClient({
          organization: '',
          project: 'testproject',
          personalAccessToken: 'test-token'
        });
        await clientWithoutOrg.initialize();

        const mockRequest: WikiPageTreeRequest = {
          wikiId: 'wiki123'
        };

        await expect(clientWithoutOrg.getPageTree(mockRequest)).rejects.toThrow(
          'Organization and project must be provided'
        );
      });

      it('should throw error when project is missing', async () => {
        const clientWithoutProject = new AzureDevOpsWikiClient({
          organization: 'testorg',
          project: '',
          personalAccessToken: 'test-token'
        });
        await clientWithoutProject.initialize();

        const mockRequest: WikiPageTreeRequest = {
          wikiId: 'wiki123'
        };

        await expect(clientWithoutProject.getPageTree(mockRequest)).rejects.toThrow(
          'Organization and project must be provided'
        );
      });

      it('should return empty array when API returns non-200 status', async () => {
        const mockRequest: WikiPageTreeRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123'
        };

        const mockResponse = {
          message: { statusCode: 404 },
          readBody: jest.fn().mockResolvedValue('')
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        const result = await client.getPageTree(mockRequest);

        expect(result).toEqual([]);
      });

      it('should return empty array when response body is empty', async () => {
        const mockRequest: WikiPageTreeRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue('')
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        const result = await client.getPageTree(mockRequest);

        expect(result).toEqual([]);
      });

      it('should throw error when API request fails', async () => {
        const mockRequest: WikiPageTreeRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123'
        };

        mockRestClient.get.mockRejectedValue(new Error('Network error'));

        await expect(client.getPageTree(mockRequest)).rejects.toThrow(
          'Failed to get page tree: Network error'
        );
      });

      it('should throw error when JSON parsing fails', async () => {
        const mockRequest: WikiPageTreeRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue('invalid json')
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        await expect(client.getPageTree(mockRequest)).rejects.toThrow(
          'Failed to get page tree:'
        );
      });

      it('should handle missing message in response', async () => {
        const mockRequest: WikiPageTreeRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123'
        };

        const mockResponse = {
          readBody: jest.fn().mockResolvedValue('')
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        const result = await client.getPageTree(mockRequest);

        expect(result).toEqual([]);
      });
    });
  });

  describe('getPage', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    describe('success scenarios', () => {
      it('should return page content for a simple page', async () => {
        const mockRequest: WikiGetPageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Home'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: [
              {
                id: 1,
                path: '/Home',
                content: '# Welcome to our Wiki\n\nThis is the home page.',
                gitItemPath: '/Home.md',
                order: 1,
                version: 'abc123',
                isParentPage: false
              }
            ]
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        const result = await client.getPage(mockRequest);

        expect(result).toEqual({
          id: '1',
          path: '/Home',
          title: 'Home',
          content: '# Welcome to our Wiki\n\nThis is the home page.',
          gitItemPath: '/Home.md',
          order: 1,
          version: 'abc123',
          isParentPage: false
        });
      });

      it('should handle direct page response format (not wrapped in value array)', async () => {
        const mockRequest: WikiGetPageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Getting-Started'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            id: 2,
            path: '/Getting-Started',
            content: '# Getting Started\n\nFollow these steps...',
            gitItemPath: '/Getting-Started.md',
            order: 2,
            version: 'def456',
            isParentPage: true
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        const result = await client.getPage(mockRequest);

        expect(result).toEqual({
          id: '2',
          path: '/Getting-Started',
          title: 'Getting-Started',
          content: '# Getting Started\n\nFollow these steps...',
          gitItemPath: '/Getting-Started.md',
          order: 2,
          version: 'def456',
          isParentPage: true
        });
      });

      it('should handle nested page paths correctly', async () => {
        const mockRequest: WikiGetPageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Documentation/API/Authentication'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: [
              {
                id: 10,
                path: '/Documentation/API/Authentication',
                content: '# Authentication\n\nAuthentication is required...',
                gitItemPath: '/Documentation/API/Authentication.md',
                order: 3,
                version: 'ghi789',
                isParentPage: false
              }
            ]
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        const result = await client.getPage(mockRequest);

        expect(result.title).toBe('Authentication');
        expect(result.path).toBe('/Documentation/API/Authentication');
        expect(result.content).toBe('# Authentication\n\nAuthentication is required...');
      });

      it('should use fallback values for missing properties', async () => {
        const mockRequest: WikiGetPageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Minimal-Page'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: [
              {
                path: '/Minimal-Page'
              }
            ]
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        const result = await client.getPage(mockRequest);

        expect(result).toEqual({
          id: '',
          path: '/Minimal-Page',
          title: 'Minimal-Page',
          content: '',
          gitItemPath: '',
          order: 0,
          version: '',
          isParentPage: false
        });
      });

      it('should use config organization/project when not provided in request', async () => {
        const mockRequest: WikiGetPageRequest = {
          wikiId: 'wiki123',
          path: '/Home'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: [
              {
                id: 1,
                path: '/Home',
                content: 'Content here'
              }
            ]
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        await client.getPage(mockRequest);

        expect(mockRestClient.get).toHaveBeenCalledWith(
          expect.stringContaining('https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123/pages')
        );
      });

      it('should properly encode the path parameter', async () => {
        const mockRequest: WikiGetPageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Special Page with Spaces & Symbols'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: [
              {
                id: 5,
                path: '/Special Page with Spaces & Symbols',
                content: 'Special content'
              }
            ]
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        await client.getPage(mockRequest);

        expect(mockRestClient.get).toHaveBeenCalledWith(
          expect.stringContaining('path=%2FSpecial%20Page%20with%20Spaces%20%26%20Symbols')
        );
      });

      it('should include includeContent=true in API call', async () => {
        const mockRequest: WikiGetPageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Home'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: [{ id: 1, path: '/Home', content: 'Content' }]
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        await client.getPage(mockRequest);

        expect(mockRestClient.get).toHaveBeenCalledWith(
          expect.stringContaining('includeContent=true')
        );
      });
    });

    describe('error scenarios', () => {
      it('should throw error when client is not initialized', async () => {
        const uninitializedClient = new AzureDevOpsWikiClient(mockConfig);
        const mockRequest: WikiGetPageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Home'
        };

        await expect(uninitializedClient.getPage(mockRequest)).rejects.toThrow(
          'Azure DevOps client not initialized'
        );
      });

      it('should throw error when organization is missing', async () => {
        const clientWithoutOrg = new AzureDevOpsWikiClient({
          organization: '',
          project: 'testproject',
          personalAccessToken: 'test-token'
        });
        await clientWithoutOrg.initialize();

        const mockRequest: WikiGetPageRequest = {
          wikiId: 'wiki123',
          path: '/Home'
        };

        await expect(clientWithoutOrg.getPage(mockRequest)).rejects.toThrow(
          'Organization and project must be provided'
        );
      });

      it('should throw error when project is missing', async () => {
        const clientWithoutProject = new AzureDevOpsWikiClient({
          organization: 'testorg',
          project: '',
          personalAccessToken: 'test-token'
        });
        await clientWithoutProject.initialize();

        const mockRequest: WikiGetPageRequest = {
          wikiId: 'wiki123',
          path: '/Home'
        };

        await expect(clientWithoutProject.getPage(mockRequest)).rejects.toThrow(
          'Organization and project must be provided'
        );
      });

      it('should throw error when API returns non-200 status', async () => {
        const mockRequest: WikiGetPageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/NonExistent'
        };

        const mockResponse = {
          message: { statusCode: 404 },
          readBody: jest.fn().mockResolvedValue('')
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        await expect(client.getPage(mockRequest)).rejects.toThrow(
          'Failed to get page: HTTP 404'
        );
      });

      it('should throw error when response body is empty', async () => {
        const mockRequest: WikiGetPageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Home'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue('')
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        await expect(client.getPage(mockRequest)).rejects.toThrow(
          'Empty response body'
        );
      });

      it('should throw error when page is not found in response', async () => {
        const mockRequest: WikiGetPageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Missing'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: []
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        await expect(client.getPage(mockRequest)).rejects.toThrow(
          'Page not found: /Missing'
        );
      });

      it('should throw error when page data is null', async () => {
        const mockRequest: WikiGetPageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Null'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: [null]
          }))
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        await expect(client.getPage(mockRequest)).rejects.toThrow(
          'Page not found: /Null'
        );
      });

      it('should throw error when API request fails', async () => {
        const mockRequest: WikiGetPageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Home'
        };

        mockRestClient.get.mockRejectedValue(new Error('Network error'));

        await expect(client.getPage(mockRequest)).rejects.toThrow(
          'Failed to get page: Network error'
        );
      });

      it('should throw error when JSON parsing fails', async () => {
        const mockRequest: WikiGetPageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Home'
        };

        const mockResponse = {
          message: { statusCode: 200 },
          readBody: jest.fn().mockResolvedValue('invalid json')
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        await expect(client.getPage(mockRequest)).rejects.toThrow(
          'Failed to get page:'
        );
      });

      it('should handle missing message in response', async () => {
        const mockRequest: WikiGetPageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Home'
        };

        const mockResponse = {
          readBody: jest.fn().mockResolvedValue('')
        };

        mockRestClient.get.mockResolvedValue(mockResponse);

        await expect(client.getPage(mockRequest)).rejects.toThrow(
          'Failed to get page: HTTP Unknown'
        );
      });
    });
  });

  describe('updatePage', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    describe('success scenarios', () => {
      it('should update an existing page successfully', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Home',
          content: '# Updated Home Page\n\nThis is the updated content.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { 
            statusCode: 200,
            headers: { etag: 'abc123' }
          }
        };

        const mockUpdateResponse = {
          message: { 
            statusCode: 200,
            headers: { etag: 'def456' }
          },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            id: 1,
            path: '/Home',
            version: 'def456',
            isParentPage: false,
            order: 1,
            gitItemPath: '/Home.md'
          }))
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockUpdateResponse);

        const result = await client.updatePage(mockRequest);

        expect(result).toEqual({
          id: '1',
          path: '/Home',
          title: 'Home',
          version: 'def456',
          isParentPage: false,
          order: 1,
          gitItemPath: '/Home.md'
        });

        expect(mockWikiApi.getWiki).toHaveBeenCalledWith('wiki123', 'testproject');
        expect(mockHttpClient.get).toHaveBeenCalledWith(
          expect.stringContaining('pages?path=%2FHome')
        );
        expect(mockHttpClient.put).toHaveBeenCalledWith(
          expect.stringContaining('pages?path=%2FHome'),
          JSON.stringify({ content: '# Updated Home Page\n\nThis is the updated content.' }),
          expect.objectContaining({
            'Content-Type': 'application/json',
            'If-Match': 'abc123'
          })
        );
      });

      it('should create a new page when page does not exist', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/New-Page',
          content: '# New Page\n\nThis is a new page.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { statusCode: 404 }
        };

        const mockCreateResponse = {
          message: { 
            statusCode: 201,
            headers: { etag: 'new123' }
          },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            id: 2,
            path: '/New-Page',
            version: 'new123',
            isParentPage: false,
            order: 0,
            gitItemPath: '/New-Page.md'
          }))
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockCreateResponse);

        const result = await client.updatePage(mockRequest);

        expect(result).toEqual({
          id: '2',
          path: '/New-Page',
          title: 'New-Page',
          version: 'new123',
          isParentPage: false,
          order: 0,
          gitItemPath: '/New-Page.md'
        });

        expect(mockHttpClient.put).toHaveBeenCalledWith(
          expect.stringContaining('pages?path=%2FNew-Page'),
          JSON.stringify({ content: '# New Page\n\nThis is a new page.' }),
          expect.objectContaining({
            'Content-Type': 'application/json'
          })
        );
        expect(mockHttpClient.put).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.not.objectContaining({ 'If-Match': expect.anything() })
        );
      });

      it('should handle page check failure and create new page', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Error-Check-Page',
          content: '# Error Check Page\n\nContent after error.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCreateResponse = {
          message: { 
            statusCode: 201,
            headers: { etag: 'error123' }
          },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            id: 3,
            path: '/Error-Check-Page',
            version: 'error123',
            isParentPage: false,
            order: 0,
            gitItemPath: '/Error-Check-Page.md'
          }))
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockRejectedValue(new Error('Check failed'));
        mockHttpClient.put.mockResolvedValue(mockCreateResponse);

        const result = await client.updatePage(mockRequest);

        expect(result).toEqual({
          id: '3',
          path: '/Error-Check-Page',
          title: 'Error-Check-Page',
          version: 'error123',
          isParentPage: false,
          order: 0,
          gitItemPath: '/Error-Check-Page.md'
        });
      });

      it('should handle nested page paths correctly', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Documentation/API/Authentication',
          content: '# Updated Authentication\n\nUpdated authentication docs.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { 
            statusCode: 200,
            headers: { etag: 'auth123' }
          }
        };

        const mockUpdateResponse = {
          message: { 
            statusCode: 200,
            headers: { etag: 'auth456' }
          },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            id: 10,
            path: '/Documentation/API/Authentication',
            version: 'auth456',
            isParentPage: false,
            order: 3,
            gitItemPath: '/Documentation/API/Authentication.md'
          }))
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockUpdateResponse);

        const result = await client.updatePage(mockRequest);

        expect(result.title).toBe('Authentication');
        expect(result.path).toBe('/Documentation/API/Authentication');
        expect(mockHttpClient.put).toHaveBeenCalledWith(
          expect.stringContaining('path=%2FDocumentation%2FAPI%2FAuthentication'),
          expect.anything(),
          expect.anything()
        );
      });

      it('should properly encode the path parameter', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Special Page with Spaces & Symbols',
          content: '# Special Page\n\nSpecial content.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { statusCode: 404 }
        };

        const mockCreateResponse = {
          message: { 
            statusCode: 201,
            headers: { etag: 'special123' }
          },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            id: 5,
            path: '/Special Page with Spaces & Symbols',
            version: 'special123',
            isParentPage: false,
            order: 0,
            gitItemPath: '/Special Page with Spaces & Symbols.md'
          }))
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockCreateResponse);

        await client.updatePage(mockRequest);

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          expect.stringContaining('path=%2FSpecial%20Page%20with%20Spaces%20%26%20Symbols')
        );
        expect(mockHttpClient.put).toHaveBeenCalledWith(
          expect.stringContaining('path=%2FSpecial%20Page%20with%20Spaces%20%26%20Symbols'),
          expect.anything(),
          expect.anything()
        );
      });

      it('should use config organization/project when not provided in request', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          wikiId: 'wiki123',
          path: '/Home',
          content: '# Home\n\nUpdated home content.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { statusCode: 404 }
        };

        const mockCreateResponse = {
          message: { 
            statusCode: 201,
            headers: { etag: 'config123' }
          },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            id: 1,
            path: '/Home',
            version: 'config123',
            isParentPage: false,
            order: 1,
            gitItemPath: '/Home.md'
          }))
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockCreateResponse);

        await client.updatePage(mockRequest);

        expect(mockWikiApi.getWiki).toHaveBeenCalledWith('wiki123', 'testproject');
      });

      it('should use fallback values for missing response properties', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Minimal',
          content: '# Minimal\n\nMinimal content.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { statusCode: 404 }
        };

        const mockCreateResponse = {
          message: { 
            statusCode: 201,
            headers: { etag: 'minimal123' }
          },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            path: '/Minimal'
          }))
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockCreateResponse);

        const result = await client.updatePage(mockRequest);

        expect(result).toEqual({
          id: '',
          path: '/Minimal',
          title: 'Minimal',
          version: 'minimal123',
          isParentPage: false,
          order: 0,
          gitItemPath: ''
        });
      });

      it('should handle response with value wrapper', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Wrapped',
          content: '# Wrapped\n\nWrapped content.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { statusCode: 404 }
        };

        const mockCreateResponse = {
          message: { 
            statusCode: 201,
            headers: { etag: 'wrapped123' }
          },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: {
              id: 7,
              path: '/Wrapped',
              version: 'wrapped123',
              isParentPage: false,
              order: 0,
              gitItemPath: '/Wrapped.md'
            }
          }))
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockCreateResponse);

        const result = await client.updatePage(mockRequest);

        expect(result).toEqual({
          id: '7',
          path: '/Wrapped',
          title: 'Wrapped',
          version: 'wrapped123',
          isParentPage: false,
          order: 0,
          gitItemPath: '/Wrapped.md'
        });
      });
    });

    describe('error scenarios', () => {
      it('should throw error when client is not initialized', async () => {
        const uninitializedClient = new AzureDevOpsWikiClient(mockConfig);
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Home',
          content: '# Home\n\nContent.'
        };

        await expect(uninitializedClient.updatePage(mockRequest)).rejects.toThrow(
          'Azure DevOps client not initialized'
        );
      });

      it('should throw error when organization is missing', async () => {
        const clientWithoutOrg = new AzureDevOpsWikiClient({
          organization: '',
          project: 'testproject',
          personalAccessToken: 'test-token'
        });
        await clientWithoutOrg.initialize();

        const mockRequest: WikiUpdatePageRequest = {
          wikiId: 'wiki123',
          path: '/Home',
          content: '# Home\n\nContent.'
        };

        await expect(clientWithoutOrg.updatePage(mockRequest)).rejects.toThrow(
          'Organization and project must be provided'
        );
      });

      it('should throw error when project is missing', async () => {
        const clientWithoutProject = new AzureDevOpsWikiClient({
          organization: 'testorg',
          project: '',
          personalAccessToken: 'test-token'
        });
        await clientWithoutProject.initialize();

        const mockRequest: WikiUpdatePageRequest = {
          wikiId: 'wiki123',
          path: '/Home',
          content: '# Home\n\nContent.'
        };

        await expect(clientWithoutProject.updatePage(mockRequest)).rejects.toThrow(
          'Organization and project must be provided'
        );
      });

      it('should throw error when wiki API fails to get wiki', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Home',
          content: '# Home\n\nContent.'
        };

        mockWikiApi.getWiki.mockRejectedValue(new Error('Wiki not found'));

        await expect(client.updatePage(mockRequest)).rejects.toThrow(
          'Failed to update page: Wiki not found'
        );
      });

      it('should throw error when page update fails with 400 status', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Home',
          content: '# Home\n\nContent.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { 
            statusCode: 200,
            headers: { etag: 'test123' }
          }
        };

        const mockUpdateResponse = {
          message: { 
            statusCode: 400,
            statusMessage: 'Bad Request'
          },
          readBody: jest.fn().mockResolvedValue('')
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockUpdateResponse);

        await expect(client.updatePage(mockRequest)).rejects.toThrow(
          'Failed to update page: HTTP 400'
        );
      });

      it('should throw error when page creation fails with 409 status', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Conflict',
          content: '# Conflict\n\nContent.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { statusCode: 404 }
        };

        const mockCreateResponse = {
          message: { 
            statusCode: 409,
            statusMessage: 'Conflict'
          },
          readBody: jest.fn().mockResolvedValue('')
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockCreateResponse);

        await expect(client.updatePage(mockRequest)).rejects.toThrow(
          'Failed to create page: HTTP 409'
        );
      });

      it('should throw error when response body is empty', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Home',
          content: '# Home\n\nContent.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { statusCode: 404 }
        };

        const mockCreateResponse = {
          message: { 
            statusCode: 201,
            headers: { etag: 'empty123' }
          },
          readBody: jest.fn().mockResolvedValue('')
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockCreateResponse);

        await expect(client.updatePage(mockRequest)).rejects.toThrow(
          'Empty response body'
        );
      });

      it('should throw error when JSON parsing fails', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Home',
          content: '# Home\n\nContent.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { statusCode: 404 }
        };

        const mockCreateResponse = {
          message: { 
            statusCode: 201,
            headers: { etag: 'json123' }
          },
          readBody: jest.fn().mockResolvedValue('invalid json')
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockCreateResponse);

        await expect(client.updatePage(mockRequest)).rejects.toThrow(
          'Failed to update page:'
        );
      });

      it('should throw error when page data is null', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Null',
          content: '# Null\n\nContent.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { statusCode: 404 }
        };

        const mockCreateResponse = {
          message: { 
            statusCode: 201,
            headers: { etag: 'null123' }
          },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({
            value: null
          }))
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockCreateResponse);

        await expect(client.updatePage(mockRequest)).rejects.toThrow(
          'Failed to create page: /Null'
        );
      });

      it('should throw error when page data is undefined', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Undefined',
          content: '# Undefined\n\nContent.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { statusCode: 404 }
        };

        const mockCreateResponse = {
          message: { 
            statusCode: 201,
            headers: { etag: 'undefined123' }
          },
          readBody: jest.fn().mockResolvedValue(JSON.stringify({ value: null }))
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockCreateResponse);

        await expect(client.updatePage(mockRequest)).rejects.toThrow(
          'Failed to create page: /Undefined'
        );
      });

      it('should handle missing message in response', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Home',
          content: '# Home\n\nContent.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { statusCode: 404 }
        };

        const mockCreateResponse = {
          readBody: jest.fn().mockResolvedValue('')
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockCreateResponse);

        await expect(client.updatePage(mockRequest)).rejects.toThrow(
          'Failed to create page: HTTP Unknown'
        );
      });

      it('should include detailed error information in error message', async () => {
        const mockRequest: WikiUpdatePageRequest = {
          organization: 'testorg',
          project: 'testproject',
          wikiId: 'wiki123',
          path: '/Debug',
          content: '# Debug\n\nContent.'
        };

        const mockWiki = {
          url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki123'
        };

        const mockCheckResponse = {
          message: { 
            statusCode: 200,
            headers: { etag: 'debug123' }
          }
        };

        const mockUpdateResponse = {
          message: { 
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            headers: { 'content-type': 'application/json' }
          },
          readBody: jest.fn().mockResolvedValue('')
        };

        mockWikiApi.getWiki.mockResolvedValue(mockWiki);
        mockHttpClient.get.mockResolvedValue(mockCheckResponse);
        mockHttpClient.put.mockResolvedValue(mockUpdateResponse);

        await expect(client.updatePage(mockRequest)).rejects.toThrow();
      });
    });
  });

  describe('listWikis', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    describe('success scenarios', () => {
      it('should list all wikis successfully', async () => {
        const mockRequest: WikiListRequest = {
          organization: 'testorg',
          project: 'testproject'
        };

        const mockWikis = [
          {
            id: 'wiki1',
            name: 'Project Wiki',
            type: 1, // WikiType.ProjectWiki
            url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki1',
            projectId: 'testproject',
            repositoryId: 'repo1',
            mappedPath: '/'
          },
          {
            id: 'wiki2',
            name: 'Code Wiki',
            type: 2, // WikiType.CodeWiki
            url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki2',
            projectId: 'testproject',
            repositoryId: 'repo2',
            mappedPath: '/docs'
          }
        ];

        mockWikiApi.getAllWikis.mockResolvedValue(mockWikis);

        const result = await client.listWikis(mockRequest);

        expect(result).toEqual([
          {
            id: 'wiki1',
            name: 'Project Wiki',
            type: '1',
            url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki1',
            project: 'testproject',
            repositoryId: 'repo1',
            mappedPath: '/'
          },
          {
            id: 'wiki2',
            name: 'Code Wiki',
            type: '2',
            url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki2',
            project: 'testproject',
            repositoryId: 'repo2',
            mappedPath: '/docs'
          }
        ]);

        expect(mockWikiApi.getAllWikis).toHaveBeenCalledWith('testproject');
      });

      it('should handle empty wiki list', async () => {
        const mockRequest: WikiListRequest = {
          organization: 'testorg',
          project: 'testproject'
        };

        mockWikiApi.getAllWikis.mockResolvedValue([]);

        const result = await client.listWikis(mockRequest);

        expect(result).toEqual([]);
        expect(mockWikiApi.getAllWikis).toHaveBeenCalledWith('testproject');
      });

      it('should use default organization and project from config', async () => {
        const mockRequest: WikiListRequest = {};

        const mockWikis = [
          {
            id: 'wiki1',
            name: 'Default Wiki',
            type: 1, // WikiType.ProjectWiki
            url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki1',
            projectId: 'testproject',
            repositoryId: 'repo1',
            mappedPath: '/'
          }
        ];

        mockWikiApi.getAllWikis.mockResolvedValue(mockWikis);

        const result = await client.listWikis(mockRequest);

        expect(result).toEqual([
          {
            id: 'wiki1',
            name: 'Default Wiki',
            type: '1',
            url: 'https://dev.azure.com/testorg/testproject/_apis/wiki/wikis/wiki1',
            project: 'testproject',
            repositoryId: 'repo1',
            mappedPath: '/'
          }
        ]);

        expect(mockWikiApi.getAllWikis).toHaveBeenCalledWith('testproject');
      });
    });

    describe('error scenarios', () => {
      it('should throw error when not initialized', async () => {
        const uninitializedClient = new AzureDevOpsWikiClient(mockConfig);
        const mockRequest: WikiListRequest = {
          organization: 'testorg',
          project: 'testproject'
        };

        await expect(uninitializedClient.listWikis(mockRequest))
          .rejects
          .toThrow('Azure DevOps client not initialized');
      });

      it('should throw error when organization is missing', async () => {
        const clientWithoutOrg = new AzureDevOpsWikiClient({
          organization: '',
          project: 'testproject'
        });
        await clientWithoutOrg.initialize();

        const mockRequest: WikiListRequest = {
          project: 'testproject'
        };

        await expect(clientWithoutOrg.listWikis(mockRequest))
          .rejects
          .toThrow('Organization and project must be provided');
      });

      it('should throw error when project is missing', async () => {
        const clientWithoutProject = new AzureDevOpsWikiClient({
          organization: 'testorg',
          project: ''
        });
        await clientWithoutProject.initialize();

        const mockRequest: WikiListRequest = {
          organization: 'testorg'
        };

        await expect(clientWithoutProject.listWikis(mockRequest))
          .rejects
          .toThrow('Organization and project must be provided');
      });

      it('should throw error when API call fails', async () => {
        const mockRequest: WikiListRequest = {
          organization: 'testorg',
          project: 'testproject'
        };

        mockWikiApi.getAllWikis.mockRejectedValue(new Error('API call failed'));

        await expect(client.listWikis(mockRequest))
          .rejects
          .toThrow('Failed to list wikis: API call failed');
      });

      it('should handle null response from API', async () => {
        const mockRequest: WikiListRequest = {
          organization: 'testorg',
          project: 'testproject'
        };

        mockWikiApi.getAllWikis.mockResolvedValue(null as any);

        const result = await client.listWikis(mockRequest);

        expect(result).toEqual([]);
        expect(mockWikiApi.getAllWikis).toHaveBeenCalledWith('testproject');
      });
    });
  });
});