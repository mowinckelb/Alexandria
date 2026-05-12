/** CORS — single source of truth for allowed origins. */

export function getAllowedOrigins(): string[] {
  const base = process.env.WEBSITE_URL || 'https://alexandria-library.com';
  return [base, base.replace('https://', 'https://www.'), 'http://localhost:3000'];
}
