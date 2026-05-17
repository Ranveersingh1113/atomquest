import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Button, Badge, Spinner, Banner, Field, Input, Select } from '../ui.jsx';

function StatusRow({ label, on, note }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className={`w-2 h-2 rounded-full ${on ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <Badge color={on ? 'green' : 'slate'}>{on ? 'Connected' : 'Not configured'}</Badge>
      {note && <span className="text-xs text-slate-400">{note}</span>}
    </div>
  );
}

export default function Settings() {
  const [data, setData] = useState(null);
  const [url, setUrl] = useState('');
  const [kind, setKind] = useState('workflow');
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState(null); // { tone, text }

  function load() {
    api.get('/settings/integrations').then((d) => {
      setData(d);
      setUrl(d.teams.webhookUrl || '');
      setKind(d.teams.kind || 'workflow');
    });
  }
  useEffect(load, []);
  if (!data) return <Spinner />;

  async function save() {
    setBusy(true); setMsg(null);
    try {
      await api.put('/settings/integrations', { teams_webhook_url: url.trim(), teams_webhook_kind: kind });
      setMsg({ tone: 'success', text: 'Teams webhook saved.' });
      load();
    } catch (e) { setMsg({ tone: 'error', text: e.message }); }
    finally { setBusy(false); }
  }
  async function test() {
    setTesting(true); setMsg(null);
    try {
      await api.post('/settings/integrations/test-teams');
      setMsg({ tone: 'success', text: 'Test card sent — check your Teams channel.' });
      load();
    } catch (e) { setMsg({ tone: 'error', text: e.message }); }
    finally { setTesting(false); }
  }
  async function disconnect() {
    setBusy(true); setMsg(null);
    try {
      await api.put('/settings/integrations', { teams_webhook_url: '' });
      setUrl('');
      setMsg({ tone: 'info', text: 'Teams webhook disconnected.' });
      load();
    } catch (e) { setMsg({ tone: 'error', text: e.message }); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Integrations"
        subtitle="Connect your organisation's Microsoft Teams, email and identity provider" />

      {msg && <div className="mb-4"><Banner tone={msg.tone}>{msg.text}</Banner></div>}

      {/* --- Microsoft Teams (in-app configurable) --- */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-slate-900">Microsoft Teams</h3>
          <Badge color={data.teams.configured ? 'green' : 'slate'}>
            {data.teams.configured ? 'Connected' : 'Not connected'}
          </Badge>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Posts a card to a Teams channel on goal submission, approval, rejection and
          check-in reminders — with a deep link to the goal sheet.
        </p>

        <div className="space-y-3 max-w-xl">
          <Field label="Webhook type"
            hint="Power Automate Workflows is the current method. Use Incoming Webhook only for older connector URLs.">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="workflow">Power Automate Workflows (recommended)</option>
              <option value="connector">Classic Incoming Webhook (connector)</option>
            </Select>
          </Field>
          <Field label="Webhook URL"
            hint="Teams channel → ••• → Workflows → 'Post to a channel when a webhook request is received' → copy the generated URL.">
            <Input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://prod-XX.westus.logic.azure.com:443/workflows/..." />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          <Button variant="secondary" onClick={test} disabled={testing || !data.teams.configured}>
            {testing ? 'Sending…' : 'Send test card'}
          </Button>
          {data.teams.configured && (
            <Button variant="secondary" onClick={disconnect} disabled={busy}>Disconnect</Button>
          )}
        </div>
      </Card>

      {/* --- Email + Entra (env-driven, read-only status) --- */}
      <Card className="p-5">
        <h3 className="font-bold text-slate-900 mb-1">Server-managed integrations</h3>
        <p className="text-sm text-slate-500 mb-3">
          Email and Single Sign-On hold secret credentials, so they are configured
          via server environment variables (<code>server/.env</code>) rather than in-app.
        </p>
        <StatusRow label="Email (SMTP)" on={data.smtp.configured}
          note={data.smtp.configured ? null : 'set SMTP_* in server/.env'} />
        <StatusRow label="Microsoft Entra ID SSO" on={data.entra.configured}
          note={data.entra.configured ? null : 'set AZURE_* in server/.env'} />
      </Card>
    </div>
  );
}
