// Real outbound integrations — SMTP email + Microsoft Teams webhook.
// Teams config is admin-managed in-app (settings table); SMTP is env-driven.
// Every dispatch is recorded in the `notifications` table for governance.
import nodemailer from 'nodemailer';
import db from '../db.js';
import { config, smtpConfigured } from './config.js';
import { getSetting } from './settings.js';

const record = db.prepare(`INSERT INTO notifications
  (channel,event,recipient,subject,body,link,status,error) VALUES (?,?,?,?,?,?,?,?)`);

// --- Teams target resolution: DB setting first, env var as fallback default ---
export function teamsTarget() {
  const url = getSetting('teams_webhook_url', config.teamsWebhookUrl);
  // 'workflow' = Power Automate Workflows (Adaptive Card), 'connector' = classic Incoming Webhook (MessageCard).
  const kind = getSetting('teams_webhook_kind', 'workflow');
  return { url, kind };
}
export const teamsConfigured = () => !!teamsTarget().url;

let transporter = null;
function getTransporter() {
  if (!smtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

// --- Email via SMTP ---
export async function sendEmail({ to, subject, text, html, event = 'email', link = null }) {
  const tx = getTransporter();
  if (!tx) {
    record.run('email', event, to, subject, text || '', link, 'skipped', 'SMTP not configured');
    return { ok: false, skipped: true };
  }
  try {
    await tx.sendMail({ from: config.smtp.from, to, subject, text, html: html || undefined });
    record.run('email', event, to, subject, text || '', link, 'sent', null);
    return { ok: true };
  } catch (e) {
    record.run('email', event, to, subject, text || '', link, 'failed', e.message);
    return { ok: false, error: e.message };
  }
}

// Builds the right JSON body for the configured Teams webhook kind.
function buildTeamsPayload(kind, { title, text, link, linkLabel }) {
  if (kind === 'connector') {
    // Classic Incoming Webhook — Office 365 MessageCard.
    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor: 'F5A623',
      summary: title,
      sections: [{ activityTitle: title, text }],
      ...(link ? { potentialAction: [{ '@type': 'OpenUri', name: linkLabel,
        targets: [{ os: 'default', uri: link }] }] } : {}),
    };
  }
  // Power Automate Workflows — Adaptive Card wrapped in a message attachment.
  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        type: 'AdaptiveCard',
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        version: '1.4',
        body: [
          { type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium', wrap: true },
          { type: 'TextBlock', text, wrap: true, spacing: 'Small' },
        ],
        actions: link ? [{ type: 'Action.OpenUrl', title: linkLabel, url: link }] : [],
      },
    }],
  };
}

// --- Microsoft Teams notification via the configured webhook ---
export async function sendTeams({ title, text, event = 'teams', link = null, linkLabel = 'Open in Atomberg' }) {
  const { url, kind } = teamsTarget();
  if (!url) {
    record.run('teams', event, '(none)', title, text, link, 'skipped', 'Teams webhook not configured');
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildTeamsPayload(kind, { title, text, link, linkLabel })),
    });
    if (!res.ok) throw new Error(`Teams webhook returned ${res.status}`);
    record.run('teams', event, `teams (${kind})`, title, text, link, 'sent', null);
    return { ok: true };
  } catch (e) {
    record.run('teams', event, `teams (${kind})`, title, text, link, 'failed', e.message);
    return { ok: false, error: e.message };
  }
}
