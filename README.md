# VP Partner Fund Workspace

This repository contains the internal DEVCON Laguna dashboard workspace.

## Project Structure

- `frontend/` - React + TypeScript app (Vite)
- `backend/` - Node.js + Express API
- `docs/` - planning and architecture documents

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

1. Install frontend dependencies:
   `npm --prefix frontend install`
2. Install backend dependencies:
   `npm --prefix backend install`
3. Copy environment template:
   `Copy-Item .env.example .env`

## Development

Run both applications together:
`npm run dev`

Or run them separately:

- `npm run dev:backend`
- `npm run dev:frontend`

## Tooling

- Build (frontend + backend build step):
  `npm run build`
- Lint:
  `npm run lint`
- Test:
  `npm run test`
- Formatting check:
  `npm run format:check`
- Format repository files:
  `npm run format`

## CI Commands

The repository includes a GitHub Actions workflow at `.github/workflows/ci.yml`.

- Run full CI command chain locally:
  `npm run ci`
- Run CI sub-commands:
  `npm run ci:lint`
  `npm run ci:test`
  `npm run ci:build`

## Environment Variables

Use `.env.example` as the source of required variables for local development.

## Early Access Deployment

This repository includes a one-service early-access deployment path:

- Deployment guide: `docs/deployment-early-access.md`
- Render blueprint: `render.yaml`

For completely free deployment using Vercel (frontend + backend as two projects), use:

- `docs/deployment-vercel-free.md`

The early-access path serves frontend and backend from one Node service and uses persistent SQLite + local artifact disk.

## Internal User Provisioning

Non-production behavior:

- VP and officer accounts are seeded from `.env` values.
- Default seeded credentials are intended for local and staging only.

Manual provisioning (non-production only):

1. Login as Admin using `POST /api/auth/login`.
2. Call `POST /api/auth/provision` with bearer token and payload:
  `{"email":"member@devconlaguna.internal","password":"<temporary>","role":"liaison_officer","displayName":"Liaison Officer"}`

Production provisioning path:

- Runtime provisioning endpoint is intentionally disabled in production.
- Provision production users through controlled deployment-time account setup (secrets-managed seed values and approved credential rotation process).

## Release and Onboarding Documents

- UAT sign-off record: `docs/uat-signoff.md`
- Internal team onboarding guide: `docs/team-onboarding.md`
- Deployment/go-live controls: `docs/deployment.md`
- QA acceptance gates: `docs/qa_acceptance.md`
