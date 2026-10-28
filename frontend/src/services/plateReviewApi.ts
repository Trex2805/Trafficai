export interface PlateRecord {
  record_id: string;
  job_id: string;
  frame_number?: number;
  timestamp_seconds?: number;
  plate_text_raw?: string | null;
  plate_text_corrected?: string | null;
  detector_confidence?: number;
  ocr_confidence?: number;
  vehicle_track_id?: number | string | null;
  association_status?: string;
  recognition_status?: string;
  review_status?: string;
  is_verified?: boolean;
  crop_url: string;
}

interface PlateListResponse {
  job_id: string;
  count: number;
  plates: PlateRecord[];
}

import { authenticatedFetch } from './authService';

const apiRoot = '/api/v1/inference';

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function fetchPlateRecords(
  jobId: string
): Promise<PlateListResponse> {
  const response = await authenticatedFetch(
    `${apiRoot}/jobs/${encodeURIComponent(jobId)}/plates`
  );
  return readResponse<PlateListResponse>(response);
}

export async function submitPlateReview(
  jobId: string,
  recordId: string,
  action: 'correct' | 'verify' | 'reject',
  correctedPlateText?: string
): Promise<{ message: string; plate: PlateRecord }> {
  const response = await authenticatedFetch(
    `${apiRoot}/jobs/${encodeURIComponent(jobId)}/plates/${encodeURIComponent(recordId)}/review`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        corrected_plate_text: correctedPlateText || null,
      }),
    }
  );

  return readResponse(response);
}
