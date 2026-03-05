// Environment bindings for Cloudflare Workers
export interface Env {
  AUTHORS_KV: KVNamespace;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ENCRYPTION_KEY: string;
}

// Stored per Author in KV — keyed by their API token
export interface AuthorRecord {
  googleRefreshToken: string;
  googleAccessToken?: string;
  googleTokenExpiry?: number;
  driveFolderId: string;         // Alexandria/ folder in their Drive
  constitutionFolderId: string;  // Alexandria/Constitution/ subfolder
  createdAt: string;
}

// Constitution domains
export const CONSTITUTION_DOMAINS = [
  'Worldview',
  'Values',
  'Models',
  'Identity',
  'Taste',
  'Shadows',
] as const;

export type ConstitutionDomain = typeof CONSTITUTION_DOMAINS[number];
