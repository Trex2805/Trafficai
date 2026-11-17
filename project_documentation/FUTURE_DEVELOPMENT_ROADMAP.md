# Future development roadmap

The phases below are intentionally marked by source evidence, not by the project brief.

1. **Stabilize existing functionality - partial.** Health/auth/job/review paths exist, but tests and request models disagree.
2. **Complete vehicle detection and tracking - partial.** YOLO plus ByteTrack works in the active code path; production device/configuration and resilience are incomplete.
3. **Complete number-plate recognition - partial.** Detection, OCR, crop persistence, and review exist; identity confidence and search are incomplete.
4. **Complete traffic violation detection - not verified.** No active legal-rule engine beyond candidate generation was found.
5. **Complete evidence capture and storage - partial.** Review-frame evidence exists; standalone violation/evidence capture is disconnected.
6. **Complete MongoDB integration - partial.** Jobs, plates, review cases, auth, and parallel schema scripts exist; collections are not unified.
7. **Complete frontend/dashboard - partial.** Routes and review UI exist, but most dashboard data is mock.
8. **Complete authentication/access management - partial.** JWT, role checks, admin operations, and reset flow exist; ownership, admin identity, rate limits, and contract tests need work.
9. **Testing/performance optimization - not verified.** Focused unit tests exist; end-to-end and benchmark coverage is incomplete.
10. **Production deployment - not verified.** No production deployment definition or worker architecture was found.

## Recommended sequence

First reconcile auth contracts and secure job ownership. Then consolidate MongoDB/evidence schemas and add endpoint integration tests. Next replace one mock frontend domain at a time, beginning with review cases and plates. Only after those are stable should rule-specific violations, fines, live cameras, and continual learning be implemented.
