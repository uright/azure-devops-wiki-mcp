import { AzureDevOpsWikiClient } from '../src/azure-client';
import { WikiPageTreeRequest, WikiGetPageRequest } from '../src/types';
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

  const mockConfig = {
    organization: 'testorg',
    project: 'testproject',
    personalAccessToken: 'test-token'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock REST client
    mockRestClient = {
      get: jest.fn()
    };

    // Mock WikiApi
    mockWikiApi = {
      getPagesBatch: jest.fn()
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
});