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
