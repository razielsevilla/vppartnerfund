# Early Access Deployment Guide

This guide deploys VP Partner Fund as a single web service for fast internal rollout.

## Goal

- Deploy one service that serves both API and frontend.
- Use persistent SQLite and persistent artifact storage.
- Keep setup simple for early internal access.

## Platform

Recommended: Render using the included [render.yaml](../render.yaml).

## 1. Pre-Deploy Checklist

1. Ensure latest `main` is pushed.
2. Confirm lint/build pass locally:
   - `npm run lint`
   - `npm run build`
3. Prepare production secrets and role credentials.

## 2. Create Render Service

1. In Render, click New + and choose Blueprint.
2. Select this repository.
3. Render reads [render.yaml](../render.yaml) and creates one web service with a persistent disk.

## 3. Set Required Secrets

Set these env vars in Render dashboard:

- `SESSION_SECRET`
- `CLIENT_ORIGIN`
- `AUTH_VP_EMAIL`
- `AUTH_VP_PASSWORD`
- `AUTH_LIAISON_EMAIL`
- `AUTH_LIAISON_PASSWORD`
- `AUTH_COMPLIANCE_EMAIL`
- `AUTH_COMPLIANCE_PASSWORD`
- `AUTH_DEVCON_EMAIL`
- `AUTH_DEVCON_PASSWORD`

Notes:

- `CLIENT_ORIGIN` should be your Render app URL during early access.
- Cookies are secure in production; use HTTPS URL only.

## 4. Verify Deployment

1. Open `https://<your-app>.onrender.com/api/health`.
2. Confirm `status: ok`.
3. Open app root URL and log in with VP credentials.
4. Verify team, partners, tasks, settings pages load.
5. Upload one artifact and confirm retrieval.

## 5. Operational Notes

- Database file path: `/var/data/prod.db`
- Artifact path: `/var/data/artifacts`
- Both are persisted via Render disk.

## 6. Rollback

1. In Render, open Deploys.
2. Re-deploy previous successful release.
3. Keep persistent disk attached to preserve data.

## 7. Post-Early-Access Upgrade Path

When traffic/criticality increases:

1. Move to managed Postgres (`DATABASE_CLIENT=pg`, set `DATABASE_URL`).
2. Move artifacts to object storage provider.
3. Add private network/IP allowlist and centralized monitoring.
