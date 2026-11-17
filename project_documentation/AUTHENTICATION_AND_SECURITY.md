# Authentication and security

## Verified flow

Registration normalizes email, hashes passwords with `pwdlib.PasswordHash.recommended()`, and creates `user`, `authority`-pending, or developer accounts according to the requested role. JWTs use HS256, issuer `TrafficAI`, a 30-minute expiry, and required `sub`, `exp`, `iat`, and `iss` claims. Active users are reloaded from MongoDB for every protected request.

Developer invitations and password-reset tokens are persisted as SHA-256 digests. Authority approval/rejection uses a separate administrator header key with constant-time comparison. Password reset responses are intentionally generic to reduce account enumeration.

## Findings

1. The active `RegisterRequest` shown in `auth.py` has no `invitation_token` field, while `tests/test_auth_policy.py` expects developer invitation validation. The tests and route contract are inconsistent; developer registration behavior must be reconciled before relying on it.
2. Inference job access checks role but not ownership, tenant, camera, or creator. A known job ID may expose another user's media and analysis.
3. Administrator operations use a shared header secret rather than an authenticated administrator identity and audit record.
4. CORS, rate limiting, token revocation, refresh tokens, and security headers are not verified in active backend setup.
5. Password reset email failures are logged, but reset-token cleanup/indexing and request throttling are not verified.
6. The frontend stores access tokens in `sessionStorage`, reducing persistence but not eliminating XSS exposure.
7. The standalone evidence service's retrieval URL is not backed by a route, and its DB/image writes are not transactional.

## Secret handling

Environment variable names observed include `MONGODB_URI`, `MONGODB_DATABASE`, `TRAFFICAI_AUTH_SECRET`, `TRAFFICAI_ADMIN_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, and `FRONTEND_BASE_URL`. Values are not included in this document. `.gitignore` excludes populated env files and credential files, but repository history should still be checked for accidental secret commits.
