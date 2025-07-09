import { 
  WikiSearchRequestSchema, 
  WikiPageTreeRequestSchema, 
  WikiGetPageRequestSchema, 
  WikiUpdatePageRequestSchema 
} from '../src/types';

describe('Request Schema Validation', () => {
  describe('WikiSearchRequestSchema', () => {
    it('should validate valid search request', () => {
      const validRequest = {
        organization: 'myorg',
        project: 'myproject',
        searchText: 'test search'
      };
      
      expect(() => WikiSearchRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should reject empty organization', () => {
      const invalidRequest = {
        organization: '',
        project: 'myproject',
        searchText: 'test search'
      };
      
      expect(() => WikiSearchRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('WikiPageTreeRequestSchema', () => {
    it('should validate valid page tree request', () => {
      const validRequest = {
        organization: 'myorg',
        project: 'myproject',
        wikiId: 'wiki123'
      };
      
      expect(() => WikiPageTreeRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should validate request with depth', () => {
      const validRequest = {
        organization: 'myorg',
        project: 'myproject',
        wikiId: 'wiki123',
        depth: 3
      };
      
      expect(() => WikiPageTreeRequestSchema.parse(validRequest)).not.toThrow();
    });
  });

  describe('WikiGetPageRequestSchema', () => {
    it('should validate valid get page request', () => {
      const validRequest = {
        organization: 'myorg',
        project: 'myproject',
        wikiId: 'wiki123',
        path: '/some/page'
      };
      
      expect(() => WikiGetPageRequestSchema.parse(validRequest)).not.toThrow();
    });
  });

  describe('WikiUpdatePageRequestSchema', () => {
    it('should validate valid update page request', () => {
      const validRequest = {
        organization: 'myorg',
        project: 'myproject',
        wikiId: 'wiki123',
        path: '/some/page',
        content: '# Updated content'
      };
      
      expect(() => WikiUpdatePageRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should allow empty content', () => {
      const validRequest = {
        organization: 'myorg',
        project: 'myproject',
        wikiId: 'wiki123',
        path: '/some/page',
        content: ''
      };
      
      expect(() => WikiUpdatePageRequestSchema.parse(validRequest)).not.toThrow();
    });
  });
});