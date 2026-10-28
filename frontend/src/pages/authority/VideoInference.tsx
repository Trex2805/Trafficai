import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileVideo,
  Loader2,
  RefreshCw,
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

export default function VideoInference() {
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [analysis, setAnalysis] = useState<unknown>(null);
  const [reviewCases, setReviewCases] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [videoObjectUrl, setVideoObjectUrl] = useState('');
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
      const form = new FormData();
      form.append('file', file);

      const created = await readJson<Job>(
        await authenticatedFetch(`${API}/video`, { method: 'POST', body: form }),
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
              className="max-h-[560px] w-full rounded-xl bg-black"
            />
            <p className="mt-3 text-xs text-gray-500">
              If playback fails, verify that the job video endpoint is returning
              the generated annotated video.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">Inference result</h2>
            <pre className="max-h-96 overflow-auto rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-900">
              {pretty(job.result)}
            </pre>
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
