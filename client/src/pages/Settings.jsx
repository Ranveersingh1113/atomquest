import { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  Card, PageHeader, Button, Badge, Spinner, Banner, Field, Input, Select, Icon, StatusDot,
} from '../ui.jsx';

function StatusRow({ label, on, hint, note }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-t border-paper-100 first:border-t-0">
      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${on ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]' : 'bg-paper-300'}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12.5px] font-semibold text-slate-800">{label}</span>
          <Badge color={on ? 'green' : 'slate'} dot>{on ? 'Connected' : 'Not configured'}</Badge>
        </div>
        {(hint || note) && <div className="text-[11px] text-slate-400 mt-1">{hint || note}</div>}
      </div>
    </div>
  );
}

export default function Settings() {
  const [data, setData] = useState(null);
  const [url, setUrl] = useState('');
  const [kind, setKind] = useState('workflow');
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState(null);

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
      <Card className="p-5 mb-3">
        <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 grid place-items-center">
              <Icon name="layers" className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 text-[14px]">Microsoft Teams</h3>
              <p className="text-[11.5px] text-slate-500">Posts a card to a Teams channel on each lifecycle event.</p>
            </div>
          </div>
          <Badge color={data.teams.configured ? 'green' : 'slate'} dot>
            {data.teams.configured ? 'Connected' : 'Not connected'}
          </Badge>
        </div>

        <div className="space-y-3 max-w-xl mt-4 pt-4 border-t border-paper-100">
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
          <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          <Button variant="secondary" onClick={test} disabled={testing || !data.teams.configured}>
            <Icon name="bell" className="w-3.5 h-3.5" />
            {testing ? 'Sending…' : 'Send test card'}
          </Button>
          {data.teams.configured && (
            <Button variant="ghost" onClick={disconnect} disabled={busy}>Disconnect</Button>
          )}
        </div>
      </Card>

      {/* --- Email + Entra (env-driven, read-only status) --- */}
      <Card className="p-5">
        <div className="flex items-start gap-2.5 mb-2">
          <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 grid place-items-center">
            <Icon name="lock" className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-[14px]">Server-managed integrations</h3>
            <p className="text-[11.5px] text-slate-500 max-w-md">
              Email and SSO hold secret credentials, so they live in <code className="text-[11px] text-slate-700">server/.env</code> rather than in-app.
            </p>
          </div>
        </div>
        <div className="mt-3 pt-1">
          <StatusRow label="Email (SMTP)" on={data.smtp.configured}
            note={data.smtp.configured ? null : 'Set SMTP_* in server/.env to enable transactional email.'} />
          <StatusRow label="Microsoft Entra ID SSO" on={data.entra.configured}
            note={data.entra.configured ? null : 'Set AZURE_* in server/.env to enable single sign-on.'} />
        </div>
      </Card>
    </div>
  );
}
