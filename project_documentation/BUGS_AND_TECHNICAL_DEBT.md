# Bugs and technical debt

## High priority

| Priority | Evidence | Impact | Recommendation |
|---|---|---|---|
| High | `tests/test_auth_policy.py` sends `invitation_token`; active `RegisterRequest` does not declare it | Invitation policy tests and runtime contract disagree | Define and validate the token in one request model, then update tests |
| High | Inference routes authorize role only and fetch jobs by ID | Cross-user media/data exposure | Store creator/tenant ownership and enforce it on every job/output route |
| High | Active vehicle/helmet inference forces `device=0` | CPU-only deployments fail even though plate processing has fallback | Make device configurable and test CPU/GPU modes |
| High | No active evidence retrieval route or connected evidence capture | Confirmed review cases cannot become a consistent evidence record | Select one evidence schema and expose authenticated retrieval |

## Medium priority

| Priority | Evidence | Impact | Recommendation |
|---|---|---|---|
| Medium | Frontend `api.ts` returns mock data for violations, fines, cameras, dashboards | UI can show data unrelated to backend | Replace each service incrementally with typed API clients |
| Medium | `BackgroundTasks` performs long GPU work in the web process | Restart/concurrency failure and poor scalability | Use a durable queue/worker and persist progress |
| Medium | MongoDB setup is split between `backend/core/mongodb.py` and `MongoDB/mongo_connection.py` | Different paths, indexes, and error behavior | Consolidate connection and migrations |
| Medium | Paths and timestamps have mixed conventions | Portability and query issues | Store canonical UTC datetimes and root-relative artifact IDs |
| Medium | No active search endpoint | Required plate/violation lookup is unavailable | Add indexed normalized-plate and violation-ID searches |

## Low priority

- Duplicate `if not cases_path.is_file()` check in `inference.py`.
- Some processing failures use `print` instead of structured logging.
- Standalone and FastAPI modules have inconsistent import styles.
- Frontend fallback job IDs and illustrative settings endpoints should be removed or clearly marked development-only.

## Verification debt

The test set covers selected registration policy, geometric plate association, and pure review mapping. It does not provide complete route, integration, media authorization, MongoDB schema, GPU/CPU, or end-to-end pipeline coverage.
