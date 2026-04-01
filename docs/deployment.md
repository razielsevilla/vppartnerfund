# Deployment Plan (Internal Production)

## 1. Deployment Objective
Deploy a stable, private, login-only MVP for DEVCON Laguna internal operations with no immediate post-phase code revisions.

This plan prioritizes:
- Predictable release quality.
- Secure internal access.
- Rollback safety.
- Operational observability.

## 2. Target Environments

### Development
Purpose: day-to-day coding and feature validation.

Characteristics:
- Local or shared dev environment.
- Mock/seed data allowed.
- Lower security strictness compared to production (never for credentials).

### Staging (Mandatory)
Purpose: production-like validation and UAT.

Characteristics:
- Same stack as production.
- Real migration flow from empty DB.
- Preset internal test users only.
- Used for final acceptance and release readiness checks.

### Production (Internal)
Purpose: daily operations for DEVCON Laguna team.

Characteristics:
- HTTPS-only.
- Private access model.
- Preset credential accounts only.
- Backup and monitoring enabled from day 1.

## 3. Recommended Hosting Topology
- Frontend: static app host (private domain) behind HTTPS.
- Backend API: private service with restricted inbound access.
- Database: managed PostgreSQL instance (or equivalent secured internal database host).
- Artifact storage: private object storage bucket or secured local volume with backup.

Minimum network controls:
- Restrict API origins.
- Enforce CORS to known frontend domain(s).
- Limit admin routes by role and optionally IP allowlist.

## 4. Configuration and Secrets Management
Use environment-based configuration.

Required secret categories:
- Database connection string.
- Session secret.
- Password hashing configuration.
- Artifact storage credentials.
- Monitoring and alerting keys.

Rules:
- No secrets in source control.
- Rotate secrets before production launch.
- Keep `.env.example` only for non-secret variable names.

## 5. CI/CD Pipeline (Required)
Pipeline stages:
1. Install dependencies.
2. Lint and static checks.
3. Unit and integration test execution.
4. Build frontend and backend artifacts.
5. Run migration dry run.
6. Deploy to staging.
7. Run smoke tests and UAT gate.
8. Promote to production only on signed approval.

Release must be blocked automatically if:
- Tests fail.
- Migration fails.
- Security checks fail.
- Smoke tests fail.

## 6. Database Deployment Strategy
- Use migration files with strict ordering.
- Run migrations during deployment window before service traffic shift.
- Keep pre-deploy backup snapshot.
- Validate migration success with post-migration checks.

Rollback policy:
- If migration fails, stop deployment and restore previous snapshot.
- If app health fails after migration, execute rollback procedure and reopen old version.

## 7. Artifact Storage Deployment Strategy
- Enforce file type and file size restrictions at API edge.
- Store artifacts under partner-scoped path conventions.
- Keep immutable artifact versions after upload.
- Schedule daily backup of artifact storage and metadata.

## 8. Security Controls for Production
Mandatory controls:
- HTTPS and secure cookie settings.
- Session expiration and revocation support.
- Rate-limited login endpoint.
- Role-based authorization on sensitive endpoints.
- Structured audit logging for auth and critical mutations.

Optional but recommended:
- IP allowlist for admin-level routes.
- Additional WAF/proxy filtering for abuse traffic.

## 9. Monitoring and Alerting
Minimum observability stack:
- API request logs with status and latency.
- Error tracking for frontend and backend.
- DB health metrics (connections, slow queries).
- Disk/storage utilization alerts.
- Failed login and suspicious auth attempt alerts.

Alert policy:
- Critical alerts: immediate notification to owner.
- Warning alerts: grouped digest with action items.

## 10. Backup and Disaster Recovery
Backup policy:
- Database backups: daily full + periodic point-in-time strategy if available.
- Artifact backups: daily incremental.
- Config backups: versioned snapshots for environment config templates.

Recovery policy:
- Monthly restore drill in staging.
- Recovery runbook maintained and updated after each drill.
- Maximum acceptable data loss and downtime targets documented before go-live.

## 11. UAT and Release Governance
UAT scope must include:
- Login-only access with preset credentials.
- Partner CRUD and filter behavior.
- Workflow transitions and audit timeline.
- Task lifecycle and overdue handling.
- Artifact upload/versioning and stage gate behavior.
- Dashboard KPI correctness.

Release governance:
- Require explicit owner sign-off before production promotion.
- Record release notes and known limitations.
- Tag release version in repository.

## 12. MVP Finalization Policy (No Immediate Revisions)
To satisfy the requirement that MVP is fully working after all phases and avoids immediate code revisions, production release is allowed only when all conditions below are met:

- Feature completeness:
  - All MVP features in `features.md` are implemented and validated.
- Quality completeness:
  - No unresolved critical or high-severity defects.
  - All critical paths pass automated and manual tests.
- Data and workflow integrity:
  - All workflow guardrails and required artifact gates are active.
  - Audit logging for critical actions is verified.
- Operational readiness:
  - Monitoring, alerting, and backups are live and tested.
  - Recovery runbook has a successful restore rehearsal.
- Approval gate:
  - Final UAT sign-off by product owner (you) and internal team representative.

If any of these fail, release is postponed instead of patching immediately after go-live.

## 13. Deployment Checklist (Go-Live Day)
- [ ] Production environment variables are set and verified.
- [ ] Database backup snapshot completed.
- [ ] Migrations applied successfully.
- [ ] Smoke tests passed.
- [ ] Login-only and role checks verified.
- [ ] Dashboard and core workflows validated.
- [ ] Monitoring dashboards and alerts active.
- [ ] Release notes and rollback steps documented.
- [ ] Final approval recorded.
