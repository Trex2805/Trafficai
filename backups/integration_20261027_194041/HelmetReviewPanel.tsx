import React, { useCallback, useEffect, useState } from 'react';

const JOB_ID = '80a84f6018794077bb2102e4813aafc6';

type ReviewCase = {
  case_id: string;
  job_id: string;
  timestamp_seconds?: number;
  rider_track_id?: number | null;
  motorcycle_track_id?: number | null;
  helmet_status?: string;
  helmet_confidence?: number | null;
  association_status?: string;
  review_status: string;
  is_confirmed_violation: boolean;
  evidence_url?: string | null;
};

export const HelmetReviewPanel: React.FC = () => {
  const [cases, setCases] = useState<ReviewCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/v1/inference/jobs/${JOB_ID}/persisted-review-cases`
      );
      if (!response.ok) throw new Error(`Could not load review cases (${response.status}).`);
      const data = await response.json();
      setCases(data.review_cases ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load review cases.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCases(); }, [loadCases]);

  const decide = async (item: ReviewCase, action: 'confirm' | 'reject') => {
    const message = action === 'confirm'
      ? 'Confirm this as a helmet violation? Only proceed after checking the evidence.'
      : 'Reject this review candidate?';
    if (!window.confirm(message)) return;

    setBusy(item.case_id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(
        `/api/v1/inference/jobs/${JOB_ID}/review-cases/${encodeURIComponent(item.case_id)}/decision`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || `Could not save decision (${response.status}).`);
      }
      setNotice(`Review case ${action === 'confirm' ? 'confirmed' : 'rejected'}.`);
      await loadCases();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save decision.');
    } finally {
      setBusy(null);
    }
  };

  const pending = cases.filter(c => c.review_status === 'pending').length;
  const confirmed = cases.filter(c => c.is_confirmed_violation).length;
  const rejected = cases.filter(c => c.review_status === 'rejected').length;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white">Helmet Violation Review</h2>
        <p className="mt-1 text-sm text-slate-400">
          Inspect the saved evidence before confirming or rejecting a candidate.
          Confirmation records a review decision; it does not submit an official challan.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[['Total cases', cases.length], ['Pending', pending], ['Confirmed', confirmed], ['Rejected', rejected]].map(([label, value]) => (
          <div key={String(label)} className="card p-3">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-400">{notice}</p>}

      {loading ? <p className="text-slate-400">Loading review cases...</p> :
        cases.length === 0 ? <p className="text-slate-400">No persisted review cases found for this job.</p> :
        <div className="space-y-3">
          {cases.map(item => (
            <article key={item.case_id} className="card space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white">{item.case_id}</h3>
                  <p className="text-sm text-slate-400">
                    Time: {item.timestamp_seconds ?? 'N/A'}s · Rider track: {item.rider_track_id ?? 'Unassigned'} · Motorcycle track: {item.motorcycle_track_id ?? 'Unassigned'}
                  </p>
                </div>
                <span className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200">
                  {item.review_status}
                </span>
              </div>

              <div className="grid gap-1 text-sm text-slate-300 sm:grid-cols-3">
                <p>Helmet: {item.helmet_status ?? 'Unknown'}</p>
                <p>Confidence: {item.helmet_confidence == null ? 'N/A' : `${(item.helmet_confidence * 100).toFixed(1)}%`}</p>
                <p>Association: {item.association_status ?? 'Unknown'}</p>
              </div>

              {item.evidence_url && (
                <a
                  className="text-sm text-blue-400 underline"
                  href={item.evidence_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open evidence frame
                </a>
              )}

              {item.review_status === 'pending' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy === item.case_id}
                    onClick={() => void decide(item, 'confirm')}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    Confirm violation
                  </button>
                  <button
                    disabled={busy === item.case_id}
                    onClick={() => void decide(item, 'reject')}
                    className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    Reject candidate
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      }
      <button onClick={() => void loadCases()} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-white">
        Refresh cases
      </button>
    </section>
  );
};
