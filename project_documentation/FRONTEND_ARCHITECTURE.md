# Frontend architecture

## Stack and startup

The frontend is React 18 with TypeScript, Vite 5, React Router 6, Tailwind CSS, Leaflet, Recharts, and Lucide icons. `frontend/vite.config.ts` serves on `0.0.0.0:5173` and proxies `/api` to `http://127.0.0.1:8000`.

## Routes

`App.tsx` defines login, forgot/reset password, account, traffic map, developer dashboard/inference/models/learning/data/logs/settings/access-management, and authority dashboard/cameras/inference/violations/fines/analytics routes. Layout navigation is role-specific, but route protection is primarily based on the app's local authenticated state.

## Integration split

- `services/authService.ts` calls real `/api/v1/auth` endpoints, stores the bearer token in `sessionStorage`, validates `/me` on startup, and fetches protected media as object URLs.
- `services/plateReviewApi.ts` calls real plate list/review endpoints.
- `VideoInference.tsx` calls real upload, polling, analysis, review-case, and annotated-video endpoints.
- `HelmetReviewPanel.tsx` calls real persisted review-case endpoints.
- `services/api.ts` simulates dashboards, cameras, violations, fines, analytics, models, and logs from `data/mockData.ts`.

## UX and data model

`src/types/index.ts` defines frontend-only vehicle, violation, fine, camera, model, analytics, and dashboard types. These types do not match all MongoDB/API documents, so adapters are required before replacing mock services with real calls.

## Incomplete surfaces

- Global search logs the query and does not call a backend search endpoint.
- Fine generation and violation verification mutate in-memory mock objects.
- Developer settings lists illustrative API paths rather than registered backend endpoints.
- Some review panels contain a fallback job ID for development convenience; production UI should require a selected job.
- Several pages are present as dashboard shells but their data is not backend-backed.
