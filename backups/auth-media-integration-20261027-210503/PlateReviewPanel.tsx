import React, { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, Search, X } from 'lucide-react';
import {
  fetchPlateRecords,
  submitPlateReview,
  type PlateRecord,
} from '../../services/plateReviewApi';

const DEFAULT_JOB_ID = '80a84f6018794077bb2102e4813aafc6';

export const PlateReviewPanel: React.FC = () => {
  const [jobId, setJobId] = useState(() => {
    try {
      return window.localStorage.getItem('trafficai.activeJobId') || DEFAULT_JOB_ID;
    } catch {
      return DEFAULT_JOB_ID;
    }
  });
  const [activeJobId, setActiveJobId] = useState(() => {
    try {
      return window.localStorage.getItem('trafficai.activeJobId') || DEFAULT_JOB_ID;
    } catch {
      return DEFAULT_JOB_ID;
    }
  });
  const [plates, setPlates] = useState<PlateRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadPlates = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await fetchPlateRecords(id);
      setPlates(result.plates);
      setActiveJobId(id);
      setDrafts(Object.fromEntries(
        result.plates.map((plate) => [
          plate.record_id,
          plate.plate_text_corrected || plate.plate_text_raw || '',
        ])
      ));
    } catch (err) {
      setPlates([]);
      setError(err instanceof Error ? err.message : 'Could not load plate records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlates(activeJobId);
  }, [loadPlates, activeJobId]);

  const review = async (
    plate: PlateRecord,
    action: 'correct' | 'verify' | 'reject'
  ) => {
    const text = (drafts[plate.record_id] || '').trim().toUpperCase();

    if ((action === 'correct' || action === 'verify') && !text) {
      setError('Enter the plate text before correcting or verifying this record.');
      return;
    }

    setBusyId(plate.record_id);
    setError('');
    setNotice('');

    try {
      await submitPlateReview(activeJobId, plate.record_id, action, text);
      setNotice(
        action === 'verify'
          ? 'Plate identity marked verified. This does not approve a violation or issue a fine.'
          : action === 'correct'
            ? 'Corrected plate text saved. The identity remains pending verification.'
            : 'Plate candidate rejected.'
      );
      await loadPlates(activeJobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save review.');
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = plates.filter(
    (plate) => (plate.review_status || 'pending') === 'pending'
  ).length;
  const verifiedCount = plates.filter(
    (plate) => plate.is_verified || plate.review_status === 'verified'
  ).length;
  const unreadableCount = plates.filter(
    (plate) => !(plate.plate_text_corrected || plate.plate_text_raw || '').trim()
  ).length;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white">Number Plate Review</h2>
        <p className="mt-1 text-sm text-slate-400">
          Review OCR candidates and plate crops. Plate verification is separate
          from violation approval and fine generation.
        </p>
      </div>

      <div className="card space-y-4">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void loadPlates(jobId.trim());
          }}
        >
          <label className="flex-1">
            <span className="mb-1 block text-sm text-slate-300">Inference job ID</span>
            <input
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
              placeholder="Paste a completed job ID"
              required
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <Search size={16} /> Load job
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadPlates(activeJobId)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-slate-200 hover:bg-slate-700 disabled:opacity-50"
              title="Refresh records"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </form>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {notice}
          </p>
        )}

        {loading ? (
          <p className="py-8 text-center text-slate-400">Loading plate records...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['Total candidates', plates.length],
                ['Pending review', pendingCount],
                ['Unreadable OCR', unreadableCount],
                ['Verified plates', verifiedCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            {plates.length === 0 ? (
              <p className="py-8 text-center text-slate-400">
                No plate records found for this job.
              </p>
            ) : (
              <div className="space-y-4">
                {plates.map((plate) => {
                  const currentText = (
                    plate.plate_text_corrected || plate.plate_text_raw || ''
                  ).trim();
                  const status = plate.review_status || 'pending';
                  const isBusy = busyId === plate.record_id;

                  return (
                    <article
                      key={plate.record_id}
                      className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/50 p-4 md:grid-cols-[180px_minmax(0,1fr)]"
                    >
                      <a
                        href={plate.crop_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                        title="Open plate crop in a new tab"
                      >
                        <img
                          src={plate.crop_url}
                          alt={`Plate crop at frame ${plate.frame_number ?? 'unknown'}`}
                          loading="lazy"
                          className="h-32 w-full rounded-lg border border-slate-700 bg-slate-800 object-contain"
                        />
                        <span className="mt-1 block text-center text-xs text-slate-400">
                          Frame {plate.frame_number ?? 'N/A'} · Open crop
                        </span>
                      </a>

                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-slate-400">
                            Record {plate.record_id.slice(0, 12)}…
                          </span>
                          <span className={`rounded-full px-2 py-1 text-xs ${
                            status === 'verified'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : status === 'rejected'
                                ? 'bg-red-500/15 text-red-300'
                                : 'bg-amber-500/15 text-amber-300'
                          }`}>
                            {status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-slate-400">Raw OCR</p>
                            <p className="font-mono text-white">{plate.plate_text_raw || 'Unreadable'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">OCR confidence</p>
                            <p className="text-white">
                              {typeof plate.ocr_confidence === 'number'
                                ? `${(plate.ocr_confidence * 100).toFixed(1)}%`
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Detector confidence</p>
                            <p className="text-white">
                              {typeof plate.detector_confidence === 'number'
                                ? `${(plate.detector_confidence * 100).toFixed(1)}%`
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Vehicle association</p>
                            <p className="text-white">
                              {plate.association_status || 'Unassigned'}
                            </p>
                          </div>
                        </div>

                        <label className="block">
                          <span className="mb-1 block text-xs text-slate-400">
                            Corrected registration text
                          </span>
                          <input
                            value={drafts[plate.record_id] ?? currentText}
                            onChange={(event) => setDrafts((previous) => ({
                              ...previous,
                              [plate.record_id]: event.target.value.toUpperCase(),
                            }))}
                            maxLength={20}
                            disabled={isBusy || status === 'rejected'}
                            placeholder="Enter the text visible on the plate"
                            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-mono uppercase text-white disabled:opacity-60"
                          />
                        </label>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isBusy || status === 'rejected'}
                            onClick={() => void review(plate, 'correct')}
                            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                          >
                            Save correction
                          </button>
                          <button
                            type="button"
                            disabled={isBusy || status === 'rejected' || !drafts[plate.record_id]?.trim()}
                            onClick={() => void review(plate, 'verify')}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600 disabled:opacity-50"
                          >
                            <Check size={15} /> Verify plate
                          </button>
                          <button
                            type="button"
                            disabled={isBusy || status === 'rejected' || status === 'verified'}
                            onClick={() => {
                              if (window.confirm('Reject this plate candidate?')) {
                                void review(plate, 'reject');
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-700 px-3 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-50"
                          >
                            <X size={15} /> Reject candidate
                          </button>
                          {isBusy && (
                            <span className="self-center text-xs text-slate-400">Saving…</span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
