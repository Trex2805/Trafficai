import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, UserCheck, UserX } from 'lucide-react';

type RequestItem = {
  id: string;
  name: string;
  email: string;
  created_at: string | null;
};

export const AuthorityAccessManagement: React.FC = () => {
  const [adminKey, setAdminKey] = useState('');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [note, setNote] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadRequests = useCallback(async () => {
    if (!adminKey.trim()) {
      setError('Enter the administrator key to load requests.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/v1/auth/admin/authority-requests', {
        headers: { 'X-Admin-Key': adminKey },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || `Request failed (${response.status})`);
      setRequests(body.requests || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load authority requests.');
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    setRequests([]);
  }, []);

  const act = async (item: RequestItem, action: 'approve' | 'reject') => {
    const verificationNote = (note[item.id] || '').trim();
    if (verificationNote.length < 10) {
      setError('Enter a verification or rejection note of at least 10 characters.');
      return;
    }
    if (action === 'approve' && !verified[item.id]) {
      setError('Confirm eligibility verification before approving.');
      return;
    }
    const prompt = action === 'approve'
      ? `Approve authority access for ${item.name}? Confirm eligibility was independently verified.`
      : `Reject the authority request from ${item.name}?`;
    if (!window.confirm(prompt)) return;

    setBusyId(item.id);
    setError('');
    setMessage('');
    try {
      const response = await fetch(
        `/api/v1/auth/admin/authority-requests/${encodeURIComponent(item.id)}/${action}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': adminKey,
          },
          body: JSON.stringify(
            action === 'approve'
              ? { eligibility_verified: true, verification_note: verificationNote }
              : { rejection_note: verificationNote },
          ),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || `Request failed (${response.status})`);
      setMessage(body.message || `Request ${action}d.`);
      setRequests((current) => current.filter((request) => request.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The operation failed.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Access Management</h1>
        <p className="text-slate-400">
          Review pending RTO authority access requests. Verify eligibility independently before approval.
        </p>
      </div>

      <section className="card space-y-4">
        <label className="block text-sm text-slate-300" htmlFor="admin-key">
          Administrator key
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="admin-key"
            type="password"
            autoComplete="off"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="Enter administrator key"
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
          />
          <button
            onClick={() => void loadRequests()}
            disabled={loading || !adminKey.trim()}
            className="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-white"
          >
            <RefreshCw className="inline mr-2" size={16} />
            {loading ? 'Loading…' : 'Load requests'}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          The key is held in page memory only. Use this page only over a trusted, HTTPS connection.
        </p>
      </section>

      {error && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-300">{error}</div>}
      {message && <div role="status" className="rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-green-300">{message}</div>}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Pending authority requests</h2>
        <span className="text-sm text-slate-400">{requests.length} pending</span>
      </div>

      {requests.length === 0 ? (
        <div className="card text-slate-400">
          {loading ? 'Loading requests…' : 'Load requests to view pending applicants.'}
        </div>
      ) : requests.map((item) => (
        <section key={item.id} className="card space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{item.name}</h3>
            <p className="text-slate-300">{item.email}</p>
            <p className="text-xs text-slate-500 mt-1">
              Submitted: {item.created_at ? new Date(item.created_at).toLocaleString() : 'Unknown'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Request ID: {item.id}</p>
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={Boolean(verified[item.id])}
              onChange={(event) => setVerified((current) => ({ ...current, [item.id]: event.target.checked }))}
              className="mt-1"
            />
            I independently verified this applicant's eligibility for RTO authority access.
          </label>

          <label className="block text-sm text-slate-300">
            Verification or rejection note
            <textarea
              value={note[item.id] || ''}
              onChange={(event) => setNote((current) => ({ ...current, [item.id]: event.target.value }))}
              minLength={10}
              maxLength={1000}
              rows={2}
              placeholder="Record the verification basis or rejection reason (minimum 10 characters)"
              className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void act(item, 'approve')}
              disabled={Boolean(busyId)}
              className="rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 px-4 py-2 text-white"
            >
              <UserCheck className="inline mr-2" size={16} />
              {busyId === item.id ? 'Processing…' : 'Approve verified request'}
            </button>
            <button
              onClick={() => void act(item, 'reject')}
              disabled={Boolean(busyId)}
              className="rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 px-4 py-2 text-white"
            >
              <UserX className="inline mr-2" size={16} />
              Reject request
            </button>
          </div>
        </section>
      ))}

      <p className="text-xs text-slate-500">
        <ShieldCheck className="inline mr-1" size={14} />
        Approval and rejection are enforced by the backend administrator-key check.
      </p>
    </div>
  );
};
