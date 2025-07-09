import { z } from 'zod';

export const WikiSearchRequestSchema = z.object({
  organization: z.string().min(1).optional(),
  project: z.string().min(1).optional(),
  searchText: z.string().min(1),
  wikiId: z.string().optional(),
});

export const WikiPageTreeRequestSchema = z.object({
  organization: z.string().min(1).optional(),
  project: z.string().min(1).optional(),
  wikiId: z.string().min(1),
  depth: z.number().int().positive().optional(),
});

export const WikiGetPageRequestSchema = z.object({
  organization: z.string().min(1).optional(),
  project: z.string().min(1).optional(),
  wikiId: z.string().min(1),
  path: z.string().min(1),
});

export const WikiUpdatePageRequestSchema = z.object({
  organization: z.string().min(1).optional(),
  project: z.string().min(1).optional(),
  wikiId: z.string().min(1),
  path: z.string().min(1),
  content: z.string(),
  version: z.string().min(1),
});

export type WikiSearchRequest = z.infer<typeof WikiSearchRequestSchema>;
export type WikiPageTreeRequest = z.infer<typeof WikiPageTreeRequestSchema>;
export type WikiGetPageRequest = z.infer<typeof WikiGetPageRequestSchema>;
export type WikiUpdatePageRequest = z.infer<typeof WikiUpdatePageRequestSchema>;

export interface WikiSearchResult {
  title: string;
  url: string;
  content: string;
  project: string;
  wiki: string;
}

export interface WikiPageNode {
  id: string;
  path: string;
  title: string;
  order: number;
  gitItemPath: string;
  subPages?: WikiPageNode[];
}

export interface WikiPageContent {
  id: string;
  path: string;
  title: string;
  content: string;
  gitItemPath: string;
  order: number;
  version: string;
  isParentPage: boolean;
}

export interface WikiPageUpdateResult {
  id: string;
  path: string;
  title: string;
  version: string;
  isParentPage: boolean;
  order: number;
  gitItemPath: string;
}

export interface AzureDevOpsConfig {
  organization: string;
  project: string;
  personalAccessToken?: string;
  azureDevOpsUrl?: string;
}

export const EnvironmentConfigSchema = z.object({
  AZURE_DEVOPS_URL: z.string().url().optional(),
  AZURE_DEVOPS_PROJECT: z.string().min(1).optional(),
  AZURE_DEVOPS_PAT: z.string().min(1).optional(),
  AZURE_DEVOPS_ORGANIZATION: z.string().min(1).optional(),
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

export interface ServerConfig {
  azureDevOpsUrl?: string;
  defaultProject?: string;
  defaultOrganization?: string;
  personalAccessToken?: string;
}