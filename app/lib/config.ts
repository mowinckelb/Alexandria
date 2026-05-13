export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://api.alexandria-library.com';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://alexandria-library.com';
export const FETCH_TIMEOUT_MS = 8000;

// Founder contact — used on /cancel and anywhere else a user needs the
// human at the other end (mailto / tel). Kept here so a single edit
// propagates to every surface and the value stays out of component code.
export const FOUNDER_EMAIL = 'mowinckel.b@gmail.com';
export const FOUNDER_PHONE = '+14155038178';
