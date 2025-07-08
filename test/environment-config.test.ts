import { EnvironmentConfigSchema } from '../src/types';

describe('Environment Configuration', () => {
  describe('EnvironmentConfigSchema', () => {
    it('should validate valid environment configuration', () => {
      const validConfig = {
        AZURE_DEVOPS_URL: 'https://dev.azure.com/myorg',
        AZURE_DEVOPS_PROJECT: 'myproject',
        AZURE_DEVOPS_PAT: 'mytoken123'
      };
      
      expect(() => EnvironmentConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should validate configuration with missing optional fields', () => {
      const minimalConfig = {};
      
      expect(() => EnvironmentConfigSchema.parse(minimalConfig)).not.toThrow();
    });

    it('should validate configuration with only PAT', () => {
      const patOnlyConfig = {
        AZURE_DEVOPS_PAT: 'mytoken123'
      };
      
      expect(() => EnvironmentConfigSchema.parse(patOnlyConfig)).not.toThrow();
    });

    it('should validate configuration with only URL', () => {
      const urlOnlyConfig = {
        AZURE_DEVOPS_URL: 'https://dev.azure.com/myorg'
      };
      
      expect(() => EnvironmentConfigSchema.parse(urlOnlyConfig)).not.toThrow();
    });

    it('should reject invalid URL format', () => {
      const invalidConfig = {
        AZURE_DEVOPS_URL: 'not-a-url'
      };
      
      expect(() => EnvironmentConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject empty project name', () => {
      const invalidConfig = {
        AZURE_DEVOPS_PROJECT: ''
      };
      
      expect(() => EnvironmentConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject empty PAT', () => {
      const invalidConfig = {
        AZURE_DEVOPS_PAT: ''
      };
      
      expect(() => EnvironmentConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should handle mixed valid and invalid fields', () => {
      const mixedConfig = {
        AZURE_DEVOPS_URL: 'https://dev.azure.com/myorg',
        AZURE_DEVOPS_PROJECT: '',  // Invalid
        AZURE_DEVOPS_PAT: 'mytoken123'
      };
      
      expect(() => EnvironmentConfigSchema.parse(mixedConfig)).toThrow();
    });
  });
});