// 5.1 Microsoft Entra ID (Azure AD) Single Sign-On.
// OAuth2 authorization-code flow via MSAL. On callback the portal:
//   - reads the user's Graph profile,
//   - derives the portal role from AAD security-group membership,
//   - syncs the reporting line from the Graph `manager` relationship,
//   - provisions / updates the local user and issues a portal session token.
import { Router } from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
import crypto from 'crypto';
import db from '../db.js';
import { signToken } from '../lib/auth.js';
import { config, entraConfigured } from '../lib/config.js';

const r = Router();
const pendingStates = new Map(); // CSRF state → issued-at timestamp

let msalApp = null;
function getMsal() {
  if (!entraConfigured()) return null;
  if (!msalApp) {
    msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: config.entra.clientId,
        authority: `https://login.microsoftonline.com/${config.entra.tenantId}`,
        clientSecret: config.entra.clientSecret,
      },
    });
  }
  return msalApp;
}

async function graph(path, token) {
  const res = await fetch('https://graph.microsoft.com/v1.0' + path, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) throw new Error(`Graph ${path} → ${res.status}`);
  return res.json();
}

// Lets the login screen show the Microsoft button only when SSO is wired up.
r.get('/auth/sso/status', (_req, res) => res.json({ enabled: entraConfigured() }));

// Step 1 — redirect the browser to Microsoft Entra ID.
r.get('/auth/sso/login', async (req, res, next) => {
  const app = getMsal();
  if (!app) return res.status(503).json({ error: 'Entra ID SSO is not configured on the server' });
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, Date.now());
  try {
    const url = await app.getAuthCodeUrl({
      scopes: config.entra.scopes,
      redirectUri: config.entra.redirectUri,
      state,
      // Always show the Microsoft account chooser — otherwise an existing
      // browser session is signed in silently with no choice of account.
      prompt: 'select_account',
    });
    res.redirect(url);
  } catch (e) { next(e); }
});

// Step 2 — Microsoft redirects back here with an auth code.
r.get('/auth/sso/callback', async (req, res) => {
  const app = getMsal();
  const home = config.appBaseUrl + '/login';
  if (!app) return res.redirect(`${home}?sso_error=SSO+not+configured`);
  const { code, state, error, error_description } = req.query;
  if (error) return res.redirect(`${home}?sso_error=${encodeURIComponent(error_description || error)}`);
  if (!state || !pendingStates.has(state))
    return res.redirect(`${home}?sso_error=Invalid+or+expired+sign-in+state`);
  pendingStates.delete(state);

  try {
    const result = await app.acquireTokenByCode({
      code, scopes: config.entra.scopes, redirectUri: config.entra.redirectUri,
    });
    const token = result.accessToken;

    const profile = await graph(
      '/me?$select=id,displayName,mail,userPrincipalName,jobTitle,department', token);
    const email = (profile.mail || profile.userPrincipalName || '').toLowerCase();
    if (!email) throw new Error('Entra profile has no email address');

    // Role from AAD group membership (only override when membership was readable).
    let role = null;
    try {
      const groups = await graph('/me/memberOf?$select=id', token);
      const ids = (groups.value || []).map(g => g.id);
      if (config.entra.adminGroupId && ids.includes(config.entra.adminGroupId)) role = 'admin';
      else if (config.entra.managerGroupId && ids.includes(config.entra.managerGroupId)) role = 'manager';
      else role = 'employee';
    } catch { /* group scope not granted — keep existing/default role */ }

    // Reporting line from the Graph manager relationship.
    let managerId = null;
    try {
      const mgr = await graph('/me/manager?$select=mail,userPrincipalName', token);
      const mEmail = (mgr.mail || mgr.userPrincipalName || '').toLowerCase();
      if (mEmail) {
        const m = db.prepare('SELECT id FROM users WHERE email=?').get(mEmail);
        if (m) managerId = m.id;
      }
    } catch { /* no manager / no permission */ }

    const existing = db.prepare('SELECT * FROM users WHERE email=? OR entra_oid=?')
      .get(email, profile.id);
    let userId;
    if (existing) {
      db.prepare(`UPDATE users SET name=?, entra_oid=?, auth_provider='entra',
        role=COALESCE(?,role), department=COALESCE(?,department),
        title=COALESCE(?,title), manager_id=COALESCE(?,manager_id) WHERE id=?`)
        .run(profile.displayName, profile.id, role, profile.department,
             profile.jobTitle, managerId, existing.id);
      userId = existing.id;
    } else {
      userId = db.prepare(`INSERT INTO users
        (name,email,password,role,manager_id,department,title,auth_provider,entra_oid)
        VALUES (?,?,?,?,?,?,?,'entra',?)`)
        .run(profile.displayName, email, '(sso)', role || 'employee', managerId,
             profile.department || '', profile.jobTitle || '', profile.id).lastInsertRowid;
    }
    res.redirect(`${home}?sso_token=${signToken(userId)}`);
  } catch (e) {
    res.redirect(`${home}?sso_error=${encodeURIComponent(e.message)}`);
  }
});

export default r;
