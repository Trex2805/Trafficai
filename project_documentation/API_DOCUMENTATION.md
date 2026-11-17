# API documentation

All router endpoints below are prefixed with `/api/v1` unless noted. Inference endpoints have a router-level requirement for `developer` or `authority`; review mutation endpoints narrow this to `authority`.

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/` | Application metadata | No |
| GET | `/api/v1/health` | Model/evidence/database health | No |
| POST | `/api/v1/auth/register` | Register user/authority/developer request | No |
| POST | `/api/v1/auth/login` | Issue JWT | No |
| GET | `/api/v1/auth/me` | Return active user | Bearer |
| POST | `/api/v1/auth/forgot-password` | Start password reset | No |
| POST | `/api/v1/auth/reset-password` | Consume reset token | No |
| POST | `/api/v1/auth/admin/developer-invitations` | Create invitation | `X-Admin-Key` |
| DELETE | `/api/v1/auth/admin/developer-invitations/{id}` | Revoke invitation | `X-Admin-Key` |
| GET | `/api/v1/auth/admin/authority-requests` | List pending authority users | `X-Admin-Key` |
| POST | `/api/v1/auth/admin/authority-requests/{user_id}/approve` | Approve authority | `X-Admin-Key` |
| POST | `/api/v1/auth/admin/authority-requests/{user_id}/reject` | Reject authority | `X-Admin-Key` |
| POST | `/api/v1/inference/video` | Queue video upload | Developer/authority |
| GET | `/api/v1/inference/jobs/{job_id}` | Get job state/result paths | Developer/authority |
| GET | `/api/v1/inference/jobs/{job_id}/video` | Download annotated video | Developer/authority |
| GET | `/api/v1/inference/jobs/{job_id}/events` | Download detection JSONL | Developer/authority |
| GET | `/api/v1/inference/jobs/{job_id}/analysis` | Read summaries/candidates/helmet aggregation | Developer/authority |
| GET | `/api/v1/inference/jobs/{job_id}/review-cases` | Read generated review cases | Developer/authority |
| GET | `/api/v1/inference/jobs/{job_id}/review-cases/frames/{filename}` | Download review JPG | Developer/authority |
| GET | `/api/v1/inference/jobs/{job_id}/plates` | List plate candidates | Developer/authority |
| GET | `/api/v1/inference/jobs/{job_id}/plates/{record_id}/crop` | Download plate crop | Developer/authority |
| PATCH | `/api/v1/inference/jobs/{job_id}/plates/{record_id}/review` | Correct/verify/reject plate | Authority |
| GET | `/api/v1/inference/jobs/{job_id}/persisted-review-cases` | List MongoDB review cases | Developer/authority |
| PATCH | `/api/v1/inference/jobs/{job_id}/review-cases/{case_id}/decision` | Confirm/reject review case | Authority |

Request bodies are Pydantic models for auth and review actions; video uses multipart field `file`. Job and analysis response shapes are assembled dictionaries and should be formalized as response models before external use.

## Endpoint gaps

No active CRUD/search endpoint was found for vehicles, violations, evidence IDs, cameras, fines, or global search. The frontend mock service must not be mistaken for these APIs.
