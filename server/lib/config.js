// Central runtime configuration. Every integration is driven purely by env vars
// so the portal runs with zero external services and lights up real Entra ID /
// SMTP / Teams integrations the moment credentials are supplied.

export const config = {
  port: Number(process.env.PORT) || 4000,
  authSecret: process.env.AUTH_SECRET || 'atomberg-demo-secret',
  // Public base URL of the web app — used for Teams deep links and the SSO redirect home.
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',

  // --- 5.1 Microsoft Entra ID (Azure AD) SSO ---
  entra: {
    tenantId: process.env.AZURE_TENANT_ID || '',
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    // Must exactly match a redirect URI registered on the app registration.
    redirectUri: process.env.AZURE_REDIRECT_URI || 'http://localhost:4000/api/auth/sso/callback',
    // Graph scopes requested at sign-in (space separated).
    scopes: (process.env.AZURE_SCOPES || 'User.Read').split(/\s+/).filter(Boolean),
    // AAD security-group object IDs → portal role. Membership in neither = employee.
    adminGroupId: process.env.AZURE_ADMIN_GROUP_ID || '',
    managerGroupId: process.env.AZURE_MANAGER_GROUP_ID || '',
  },

  // --- 5.2 Email (SMTP) ---
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Atomberg Portal <no-reply@atomberg.com>',
  },

  // --- 5.2 Microsoft Teams (incoming webhook) ---
  teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL || '',
};

export const entraConfigured = () =>
  !!(config.entra.tenantId && config.entra.clientId && config.entra.clientSecret);
export const smtpConfigured = () => !!(config.smtp.host && config.smtp.user);
export const teamsConfigured = () => !!config.teamsWebhookUrl;
