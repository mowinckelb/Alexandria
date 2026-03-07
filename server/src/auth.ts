/**
 * Google OAuth flow.
 *
 * When Claude initiates the MCP connection, the Author is redirected to
 * Google's consent screen. On approval, we get a refresh token, encrypt it,
 * and return it as the MCP "access token." The server stores nothing.
 */

import { google } from 'googleapis';
import { encrypt } from './crypto.js';
import type { Router } from 'express';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.SERVER_URL}/oauth/callback`,
  );
}

export function registerAuthRoutes(router: Router) {
  // Step 1: Redirect to Google consent
  router.get('/oauth/authorize', (req, res) => {
    const oauth2 = getOAuth2Client();
    const state = (req.query.state as string) || '';
    const url = oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      state,
    });
    res.redirect(url);
  });

  // Step 2: Google redirects back with auth code
  router.get('/oauth/callback', async (req, res) => {
    const code = req.query.code as string;
    if (!code) {
      res.status(400).send('Missing authorization code');
      return;
    }

    try {
      const oauth2 = getOAuth2Client();
      const { tokens } = await oauth2.getToken(code);

      if (!tokens.refresh_token) {
        res.status(400).send('No refresh token received. Please revoke access at myaccount.google.com/permissions and try again.');
        return;
      }

      // Encrypt the refresh token — this becomes the MCP bearer token
      const encryptedToken = encrypt(tokens.refresh_token);

      // Return a simple page that shows success
      // In production, this would redirect back to Claude with the token
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Alexandria — Connected</title></head>
          <body style="font-family: serif; max-width: 400px; margin: 80px auto; text-align: center;">
            <h2>alexandria.</h2>
            <p>Connected to Google Drive.</p>
            <p style="font-size: 0.8rem; color: #666;">Your token (use as Bearer token for MCP):</p>
            <textarea readonly style="width: 100%; height: 80px; font-size: 0.7rem;">${encryptedToken}</textarea>
            <p style="font-size: 0.75rem; color: #999; margin-top: 24px;">
              This token is your encrypted Google Drive credential.<br>
              Alexandria stores nothing — this token IS your connection.
            </p>
          </body>
        </html>
      `);
    } catch (err) {
      console.error('OAuth error:', err);
      res.status(500).send('Authentication failed. Please try again.');
    }
  });
}
