# Naming Conventions

This document defines naming rules for the VP Partner Fund codebase.

## General Rules

- Use lowercase kebab-case for folder names.
- Use clear domain nouns for modules (auth, partners, workflow, tasks, vault, settings).
- Avoid abbreviations unless they are standard and obvious.

## Frontend Conventions

- Feature modules live under `frontend/src/features/<feature-name>/`.
- React components use PascalCase filenames, for example `LoginPage.tsx`.
- Hooks use camelCase prefixed with `use`, for example `useAuthSession.ts`.
- Utility files use camelCase, for example `formatCurrency.ts`.
- Constants use uppercase snake case for exported values, for example `MAX_UPLOAD_SIZE_MB`.
- Types and interfaces use PascalCase names, for example `PartnerRecord`.

## Backend Conventions

- Domain modules live under `backend/src/modules/<module-name>/`.
- Route files use `<module>.routes.js` naming style.
- Controller files use `<module>.controller.js` naming style.
- Service files use `<module>.service.js` naming style.
- Repository files use `<module>.repository.js` naming style.
- Validation files use `<module>.validator.js` naming style.

## API and Data Conventions

- API paths use kebab-case and plural resources, for example `/api/partners`.
- JSON keys use snake_case for persistence layer compatibility.
- Database table and column names use snake_case.
- Enum-like constants should be documented and centrally defined.

## Git and Commit Conventions

- Use conventional commit prefixes: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
- Scope commits when possible, for example `feat(auth): add login handler`.
- Keep commits focused on a single concern.
