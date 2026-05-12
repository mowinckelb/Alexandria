/** CORS — single source of truth for allowed origins. */

export function getAllowedOrigins(): string[] {
  const bases = ['https://alexandria-library.com', 'https://mowinckel.ai'];
  return [
    ...bases,
    ...bases.map((b) => b.replace('https://', 'https://www.')),
    'http://localhost:3000',
  ];
}
