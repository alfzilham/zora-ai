/**
 * ZORA AI  Frontend Runtime Config
 * Reads public configuration injected via <meta> tags in HTML.
 */
const ZORA_CONFIG = {
  GOOGLE_CLIENT_ID: document
    .querySelector('meta[name="google-client-id"]')
    ?.getAttribute('content') || '',
  GITHUB_CLIENT_ID: document
    .querySelector('meta[name="github-client-id"]')
    ?.getAttribute('content') || '',
};

window.ZORA_CONFIG = ZORA_CONFIG;
