# Architecture Plan

## Summary
| Area | Decision |
|---|---|
| Product Type | Private internal web app for DEVCON Laguna only |
| Access Model | Login only, preset team credentials, no sign-up route |
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS + component primitives |
| Backend | Node.js + Express |
| Database | PostgreSQL (production-ready), SQLite optional for local prototype only |
| Auth | Session-based auth with HTTP-only cookies and role checks |
| File Storage | Local/S3-compatible document storage abstraction |
| Deployment | Private internal deployment, HTTPS-only |

## Architecture Intent
This system is designed as an internal operations platform, not a public product. The architecture prioritizes data reliability, fast daily workflows, security of partnership documents, and clear maintainability for a small internal team.

The application must support a single organization context (DEVCON Laguna), with controlled user access and predictable data governance. Every architecture choice below is aligned to that constraint.

## Technology Stack and Framework Choices

### Frontend
Use React with Vite and TypeScript.

Why this choice:
- React provides strong component modularity for CRM, workflow, matrix, and vault modules.
- Vite gives fast startup and build performance, ideal for rapid internal iteration.
- TypeScript reduces data-shape bugs, especially for partner records, statuses, and artifacts.

Recommended frontend libraries:
- React Router for protected routes and feature navigation.
- TanStack Query for server-state fetching, cache control, and mutation invalidation.
- React Hook Form + Zod for robust forms and schema-based validation.
- Tailwind CSS for consistent UI velocity, paired with a small reusable component layer.

### Backend
Use Node.js with Express.

Why this choice:
- Keeps API development simple and fast for an internal team.
- Easy integration with auth middleware, upload handling, and modular route organization.
- Strong ecosystem for validation, security middleware, and logging.

Recommended backend libraries:
- Zod for request validation.
- bcrypt for password hashing.
- express-session with secure session store for login sessions.
- multer or equivalent for controlled file uploads.
- pino for structured logging.

### Database
Primary choice should be PostgreSQL.

Why this choice:
- Better long-term reliability and concurrency than SQLite for multi-user team operations.
- Strong support for constraints, indexing, and schema evolution.
- Clean migration path and backup strategy for production-like use.

SQLite can be kept only as an optional local development fallback, not the target production data layer.

### File and Artifact Storage
Use a storage abstraction so artifacts are not tightly coupled to local disk paths.

Preferred path:
- Local storage for early local development.
- S3-compatible bucket (or equivalent private object storage) for internal production.

Why this choice:
- Prevents rewrite when moving from local machine to hosted internal environment.
- Supports controlled access, retention, and backup policies for proposal and MOA files.

## System Design

### Application Structure
Organize by feature domain instead of technical type only.

Suggested top-level modules:
- Auth
- Dashboard
- Partners
- Workflow
- Matrix
- Tasks
- Vault
- Settings

Each module should own:
- UI views and components
- Client-side state and hooks
- API calls for that domain
- Validation schemas related to its forms

### API Design
Use versioned REST endpoints with strict request and response contracts.

Key API principles:
- Validate every write at the API boundary.
- Enforce role authorization per route.
- Return consistent error objects.
- Keep status transitions explicit and auditable.

### State Strategy
Split state into clear categories:
- Server state: managed with TanStack Query.
- UI state: local component state or feature-scoped store.
- Form state: React Hook Form + Zod validation.
- Session state: centralized auth context tied to protected routing.

This avoids prop drilling and keeps updates predictable.

## Authentication and User Management
The app is private and login-only.

Required behavior:
- No sign-up page and no registration API route.
- Accounts are manually created by Admin (you) for approved team members.
- Minimum roles: Admin and Team Member.
- Sessions use HTTP-only cookies with secure flags and expiration.
- Passwords are hashed and never stored in plaintext.
- Login endpoint is rate-limited to reduce brute-force risk.

## Security Baseline
Security controls should be present from the first build.

Baseline controls:
- HTTPS for all non-local environments.
- Input validation and sanitization for all payloads.
- File upload restrictions: type, size, extension, and storage path control.
- Role checks on sensitive actions (user management, destructive updates, config edits).
- Audit logging for login attempts, permission-sensitive actions, and stage transitions.

## Deployment Strategy
Use two environments only at first:
- Development: local machine, seeded data, rapid iteration.
- Internal production: private deployment for DEVCON Laguna team.

Deployment requirements:
- Environment-based configuration for secrets and storage paths.
- Automated database migrations.
- Scheduled backups for database and artifacts.
- Basic health checks and error monitoring.

## Scalability and Maintainability Plan
Even for a private app, architecture should prevent future rewrites.

Design for growth by:
- Keeping feature modules isolated.
- Defining stable API contracts early.
- Enforcing controlled vocabularies for statuses and categories.
- Adding database indexes for common filters and dashboard queries.
- Using a storage abstraction from day one.

## Implementation Sequence
1. Build auth and protected routing first.
2. Build Partner CRM and Workflow core.
3. Add Tasks, Notes, and Communication logging.
4. Add Document Vault with artifact-state guardrails.
5. Add Dashboard analytics and import tooling.
6. Add admin settings and user management hardening.

## Architecture Acceptance Criteria
- Only preset users can access the app through login.
- No public registration flow exists.
- Role permissions are enforced for protected actions.
- Partner workflow transitions are validated and auditable.
- Required artifacts can gate specified workflow stages.
- Dashboard metrics are computed from current system data, not static values.
