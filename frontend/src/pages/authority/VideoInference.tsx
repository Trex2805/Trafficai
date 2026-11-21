import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileVideo,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  Video,
} from 'lucide-react';

type Job = {
  job_id: string;
  filename?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | string;
  progress?: number;
  error?: string | null;
  result?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

type ApiError = { detail?: string; message?: string };

type ReviewCase = {
  case_id: string;
  frame_index?: number;
  timestamp_seconds?: number;
  rider_track_id?: number | null;
  helmet_status?: string;
  helmet_confidence?: number | null;
  candidate_violation?: boolean;
  evidence_url?: string | null;
};

import {
  authenticatedFetch,
  fetchAuthenticatedBlobUrl,
} from '../../services/authService';

const API = '/api/v1/inference';

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({} as ApiError));

  if (!response.ok) {
    const error = body as ApiError;
    throw new Error(
      error.detail || error.message || `Request failed (${response.status})`,
    );
  }

  return body as T;
}

function pretty(value: unknown): string {
  if (value === undefined || value === null) return 'Not available';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function resultNumber(result: Record<string, unknown> | null | undefined, key: string): number {
  const value = result?.[key];
  return typeof value === 'number' ? value : 0;
}

function resultRecord(
  result: Record<string, unknown> | null | undefined,
  key: string,
): Record<string, unknown> | null {
  const value = result?.[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function artifactName(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'Not available';
  return value.split(/[\\/]/).pop() || value;
}

function reviewCaseList(value: unknown): ReviewCase[] {
  if (Array.isArray(value)) return value as ReviewCase[];
  if (value && typeof value === 'object') {
    const cases = (value as { review_cases?: unknown }).review_cases;
    return Array.isArray(cases) ? (cases as ReviewCase[]) : [];
  }
  return [];
}

export default function VideoInference() {
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [analysis, setAnalysis] = useState<unknown>(null);
  const [reviewCases, setReviewCases] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [videoObjectUrl, setVideoObjectUrl] = useState('');
  const [reviewEvidenceUrls, setReviewEvidenceUrls] = useState<Record<string, string>>({});
  const fileInput = useRef<HTMLInputElement>(null);

  const active = job?.status === 'queued' || job?.status === 'processing';

  useEffect(() => {
    if (!job?.job_id || !active) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const latest = await readJson<Job>(
          await authenticatedFetch(`${API}/jobs/${encodeURIComponent(job.job_id)}`, {
            cache: 'no-store',
          }),
        );

        if (cancelled) return;
        setJob(latest);

        if (latest.status === 'completed') {
          try {
            const [analysisResponse, reviewResponse] = await Promise.allSettled([
              authenticatedFetch(`${API}/jobs/${encodeURIComponent(latest.job_id)}/analysis`),
              authenticatedFetch(`${API}/jobs/${encodeURIComponent(latest.job_id)}/review-cases`),
            ]);

            if (cancelled) return;

            if (
              analysisResponse.status === 'fulfilled' &&
              analysisResponse.value.ok
            ) {
              setAnalysis(await analysisResponse.value.json());
            } else if (latest.result?.analysis) {
              setAnalysis(latest.result.analysis);
            }

            if (
              reviewResponse.status === 'fulfilled' &&
              reviewResponse.value.ok
            ) {
              setReviewCases(await reviewResponse.value.json());
            }

            setNotice('Inference completed. Review the generated results before making enforcement decisions.');
          } catch {
            setNotice('Inference completed. Some optional analysis or review data could not be loaded.');
          }
          return;
        }

        if (latest.status === 'failed') {
          setError(latest.error || 'Video processing failed.');
          return;
        }

        timer = setTimeout(poll, 2000);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to check job status.');
        timer = setTimeout(poll, 4000);
      }
    };

    timer = setTimeout(poll, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [job?.job_id, active]);

  async function submitVideo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy || active) return;

    setBusy(true);
    setError('');
    setNotice('');
    setJob(null);
    setAnalysis(null);
    setReviewCases(null);

    try {
      const upload = await readJson<{
        upload_id: string;
        chunk_size: number;
        total_chunks: number;
      }>(
        await authenticatedFetch(`${API}/video/uploads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, size: file.size }),
        }),
      );

      for (let index = 0; index < upload.total_chunks; index += 1) {
        const start = index * upload.chunk_size;
        const chunk = file.slice(start, start + upload.chunk_size);
        const form = new FormData();
        form.append('file', chunk, file.name);
        const chunkResponse = await authenticatedFetch(
          `${API}/video/uploads/${encodeURIComponent(upload.upload_id)}/chunks/${index}`,
          { method: 'PUT', body: form },
        );
        if (!chunkResponse.ok) {
          await readJson<unknown>(chunkResponse);
        }
        setNotice(`Uploading video: ${index + 1}/${upload.total_chunks} chunks`);
      }

      const created = await readJson<Job>(
        await authenticatedFetch(
          `${API}/video/uploads/${encodeURIComponent(upload.upload_id)}/complete`,
          { method: 'POST' },
        ),
      );

      setJob(created);
      try {
        window.localStorage.setItem('trafficai.activeJobId', created.job_id);
      } catch {
        // The upload still works if browser storage is unavailable.
      }
      setNotice('Video accepted. Waiting for the processing job to finish.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload video.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    if (active) return;
    setFile(null);
    setJob(null);
    setAnalysis(null);
    setReviewCases(null);
    setError('');
    setNotice('');
    if (fileInput.current) fileInput.current.value = '';
  }

  const completed = job?.status === 'completed';
  const result = job?.result;
  const platePipeline = resultRecord(result, 'plate_pipeline');
  const platePipelineFailed = platePipeline?.status === 'failed';
  const reviewCaseItems = reviewCaseList(reviewCases);
  const videoUrl = job?.job_id
    ? `${API}/jobs/${encodeURIComponent(job.job_id)}/video`
    : '';

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';

    setVideoObjectUrl('');

    if (!videoUrl || !completed) {
      return () => {
        cancelled = true;
      };
    }

    void fetchAuthenticatedBlobUrl(videoUrl)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setVideoObjectUrl(url);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? `Annotated video: ${err.message}`
              : 'Could not load the annotated video.',
          );
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoUrl, completed]);

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];

    setReviewEvidenceUrls({});

    async function loadEvidence() {
      const entries = await Promise.all(
        reviewCaseItems
          .filter((item) => item.evidence_url)
          .map(async (item) => {
            try {
              const url = await fetchAuthenticatedBlobUrl(item.evidence_url!);
              if (cancelled) {
                URL.revokeObjectURL(url);
                return null;
              }
              createdUrls.push(url);
              return [item.case_id, url] as const;
            } catch {
              return null;
            }
          }),
      );

      if (!cancelled) {
        setReviewEvidenceUrls(
          Object.fromEntries(entries.filter((entry) => entry !== null)),
        );
      }
    }

    if (reviewCaseItems.length) void loadEvidence();

    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [reviewCases]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-cyan-600">
            <Activity size={17} />
            TrafficAI / Inference
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Video Inference
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Process traffic footage with the configured detection pipeline and
            inspect its annotated output and human-review candidates.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={busy || !!active}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} /> New job
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-slate-900">
          <Upload size={19} />
          <h2 className="font-semibold">Upload traffic video</h2>
        </div>

        <form onSubmit={submitVideo} className="space-y-4">
          <label
            htmlFor="traffic-video"
            className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center hover:bg-gray-50"
          >
            <FileVideo size={30} className="mb-3 text-cyan-600" />
            <span className="font-medium">
              {file ? file.name : 'Choose a video file'}
            </span>
            <span className="mt-1 text-xs text-gray-500">
              Select a supported video file from your device
            </span>
            <input
              ref={fileInput}
              id="traffic-video"
              type="file"
              accept="video/*,.mp4,.avi,.mov,.mkv"
              className="sr-only"
              disabled={busy || !!active}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          {file && (
            <p className="text-sm text-gray-500">
              File size: {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          )}

          <button
            type="submit"
            disabled={!file || busy || !!active}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-5 py-2.5 font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Video size={17} />
            )}
            {busy ? 'Uploading…' : 'Run inference'}
          </button>
        </form>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Request or processing error</p>
            <p className="mt-1 break-words">{error}</p>
          </div>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <p>{notice}</p>
        </div>
      )}

      {job && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Processing job</h2>
              <p className="mt-1 break-all font-mono text-xs text-gray-500">
                ID: {job.job_id}
              </p>
              {job.filename && (
                <p className="mt-1 text-sm text-gray-500">{job.filename}</p>
              )}
            </div>
            <span className="rounded-full border px-3 py-1 text-sm capitalize">
              {job.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-gray-500">Processing progress</span>
              <span className="font-semibold">{job.progress ?? 0}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-valuenow={job.progress ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-cyan-600 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, job.progress ?? 0))}%` }}
              />
            </div>
            {active && (
              <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <Clock3 size={15} /> Status refreshes automatically.
              </p>
            )}
          </div>
        </section>
      )}

      {completed && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-slate-900">
              <Video size={19} />
              <h2 className="font-semibold">Annotated video</h2>
            </div>
            <video
              key={videoUrl}
              src={videoObjectUrl || undefined}
              controls
              preload="metadata"
              onError={() => setError('The annotated video could not be decoded. Install the ML dependencies and rerun inference to create a browser-compatible MP4.')}
              className="max-h-[560px] w-full rounded-xl bg-black"
            />
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
              <span><strong className="text-emerald-700">Green boxes</strong> indicate helmet detections.</span>
              <span><strong className="text-red-700">Red boxes</strong> indicate review candidates.</span>
              <span>Each label includes the tracked rider ID and confidence.</span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
                  Completed analysis
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Inference result</h2>
                <p className="mt-1 text-sm text-slate-500">
                  A quick operational summary of the processed footage.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                <ShieldCheck size={16} /> Completed
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Frames processed', resultNumber(result, 'frames_processed'), 'Video coverage'],
                ['Detections recorded', resultNumber(result, 'detections_recorded'), 'Vehicle events'],
                ['Helmet checks', resultNumber(result, 'helmet_crops_tested'), 'Rider crops tested'],
                ['Review candidates', resultNumber(result, 'helmet_review_candidates'), 'Need human review'],
              ].map(([label, value, caption]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                    {Number(value).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{caption}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">Captured review frames</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Actual frames captured by the model for human verification.
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {reviewCaseItems.length} candidate{reviewCaseItems.length === 1 ? '' : 's'}
                </span>
              </div>

              {reviewCaseItems.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  No captured review frames were returned for this job.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {reviewCaseItems.map((item) => (
                    <article key={item.case_id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {reviewEvidenceUrls[item.case_id] ? (
                        <img
                          src={reviewEvidenceUrls[item.case_id]}
                          alt={`Captured review frame ${item.frame_index ?? ''}`}
                          className="aspect-video w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-video items-center justify-center bg-slate-200 text-xs text-slate-500">
                          Evidence frame unavailable
                        </div>
                      )}
                      <div className="space-y-2 p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-red-700">
                            {item.helmet_status || 'Review candidate'}
                          </span>
                          {item.helmet_confidence != null && (
                            <span className="font-medium text-slate-600">
                              {(item.helmet_confidence * 100).toFixed(1)}% confidence
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-500">
                          <span>Frame {item.frame_index ?? 'N/A'}</span>
                          <span>{item.timestamp_seconds != null ? `${item.timestamp_seconds.toFixed(2)}s` : 'Time N/A'}</span>
                          <span>Track ID {item.rider_track_id ?? 'N/A'}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-cyan-700" />
                  <h3 className="font-semibold">Pipeline status</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Vehicle and helmet inference</span>
                    <span className="font-semibold text-emerald-700">Completed</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Helmet detections</span>
                    <span className="font-semibold text-slate-900">
                      {resultNumber(result, 'helmet_detections').toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Plate recognition</span>
                    <span className={platePipelineFailed ? 'font-semibold text-amber-700' : 'font-semibold text-emerald-700'}>
                      {platePipelineFailed ? 'Unavailable' : 'Completed'}
                    </span>
                  </div>
                  {platePipelineFailed && (
                    <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                      {String(platePipeline.error || 'Plate recognition could not be completed.')}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText size={18} className="text-cyan-700" />
                  <h3 className="font-semibold">Generated outputs</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Annotated video</span>
                    <span className="max-w-[58%] truncate font-medium text-slate-900">
                      {artifactName(result?.annotated_video)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Detection log</span>
                    <span className="max-w-[58%] truncate font-medium text-slate-900">
                      {artifactName(result?.detection_log)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Review cases</span>
                    <span className="max-w-[58%] truncate font-medium text-slate-900">
                      {artifactName(result?.review_cases_json)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">Event analysis</h2>
            {analysis !== null ? (
              <pre className="max-h-96 overflow-auto rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-900">
                {pretty(analysis)}
              </pre>
            ) : (
              <p className="text-sm text-gray-500">
                Analysis was not returned by the API or is not available for this job.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
            <h2 className="mb-2 font-semibold text-slate-900">Review candidates</h2>
            <p className="mb-3 text-sm text-gray-500">
              These records require human verification. They are not automatically
              confirmed traffic violations.
            </p>
            {reviewCases !== null ? (
              <pre className="max-h-96 overflow-auto rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-900">
                {pretty(reviewCases)}
              </pre>
            ) : (
              <p className="text-sm text-gray-500">
                Review cases could not be loaded, or none were returned.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
