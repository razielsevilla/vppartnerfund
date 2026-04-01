# Database Schema Design (MVP)

## 1. Scope and Design Goals

This schema is designed for a private, internal-only DEVCON Laguna web app with login-only access and preset users.

Primary goals:

- Strong relational integrity for CRM and workflow data.
- Clear auditability for critical operations.
- Practical performance for dashboard and filtering queries.
- Production-ready PostgreSQL schema (SQLite optional for local-only prototype use).

## 2. Naming and Conventions

- Naming style: `snake_case`.
- Primary keys: UUID (`id`).
- Foreign keys: `<entity>_id`.
- Timestamps: `created_at`, `updated_at` (UTC).
- Soft deletes where needed: `archived_at`.
- Enumerations implemented as lookup tables (preferred) for flexibility.

## 3. Core Domains

- Identity and access: users, roles, sessions.
- CRM: partners, contacts, relationship history.
- Workflow: phases, transitions, activity logs.
- Strategic mapping: functions, value propositions, tiers, exchange items.
- Execution: tasks and reminders.
- Document vault: artifacts and versions.
- Governance: settings, import batches, audit events.

## 4. Table Catalog

### 4.1 Identity and Access

#### `roles`

| Column     | Type        | Constraints             | Notes                        |
| ---------- | ----------- | ----------------------- | ---------------------------- |
| id         | uuid        | PK                      | Generated UUID               |
| code       | text        | UNIQUE, NOT NULL        | e.g., `admin`, `team_member` |
| name       | text        | NOT NULL                | Display label                |
| created_at | timestamptz | NOT NULL, DEFAULT now() |                              |

#### `users`

| Column              | Type        | Constraints              | Notes                  |
| ------------------- | ----------- | ------------------------ | ---------------------- |
| id                  | uuid        | PK                       | Generated UUID         |
| role_id             | uuid        | FK -> roles.id, NOT NULL | User role              |
| full_name           | text        | NOT NULL                 |                        |
| email               | text        | UNIQUE, NOT NULL         | Login identifier       |
| password_hash       | text        | NOT NULL                 | bcrypt/argon hash only |
| is_active           | boolean     | NOT NULL, DEFAULT true   | Access switch          |
| must_reset_password | boolean     | NOT NULL, DEFAULT false  | Optional security flow |
| last_login_at       | timestamptz | NULL                     |                        |
| created_at          | timestamptz | NOT NULL, DEFAULT now()  |                        |
| updated_at          | timestamptz | NOT NULL, DEFAULT now()  |                        |

#### `user_sessions`

| Column             | Type        | Constraints              | Notes                 |
| ------------------ | ----------- | ------------------------ | --------------------- |
| id                 | uuid        | PK                       | Session id            |
| user_id            | uuid        | FK -> users.id, NOT NULL | Owner                 |
| session_token_hash | text        | NOT NULL                 | Never store raw token |
| ip_address         | inet        | NULL                     | Security log support  |
| user_agent         | text        | NULL                     | Security log support  |
| expires_at         | timestamptz | NOT NULL                 | Session expiry        |
| revoked_at         | timestamptz | NULL                     | Logout/invalidation   |
| created_at         | timestamptz | NOT NULL, DEFAULT now()  |                       |

### 4.2 CRM

#### `partners`

| Column            | Type        | Constraints                        | Notes                |
| ----------------- | ----------- | ---------------------------------- | -------------------- |
| id                | uuid        | PK                                 | Generated UUID       |
| organization_name | text        | NOT NULL                           | Primary display name |
| organization_type | text        | NOT NULL                           | Controlled value     |
| industry_niche    | text        | NOT NULL                           | Controlled value     |
| website_url       | text        | NULL                               | URL                  |
| location          | text        | NULL                               | City/region          |
| past_relationship | text        | NULL                               | Historical context   |
| current_phase_id  | uuid        | FK -> workflow_phases.id, NOT NULL | Current stage        |
| last_contact_date | date        | NULL                               | Operational field    |
| next_action_step  | text        | NULL                               | Operational field    |
| impact_tier       | text        | NULL                               | Standard/Major/Lead  |
| archived_at       | timestamptz | NULL                               | Soft archive         |
| created_by        | uuid        | FK -> users.id, NOT NULL           | Audit link           |
| created_at        | timestamptz | NOT NULL, DEFAULT now()            |                      |
| updated_at        | timestamptz | NOT NULL, DEFAULT now()            |                      |

#### `partner_contacts`

| Column     | Type        | Constraints                 | Notes                  |
| ---------- | ----------- | --------------------------- | ---------------------- |
| id         | uuid        | PK                          | Generated UUID         |
| partner_id | uuid        | FK -> partners.id, NOT NULL | Parent partner         |
| full_name  | text        | NOT NULL                    |                        |
| job_title  | text        | NULL                        |                        |
| email      | text        | NULL                        |                        |
| phone      | text        | NULL                        |                        |
| is_primary | boolean     | NOT NULL, DEFAULT false     | Primary contact marker |
| created_at | timestamptz | NOT NULL, DEFAULT now()     |                        |
| updated_at | timestamptz | NOT NULL, DEFAULT now()     |                        |

#### `partner_relationship_notes`

| Column     | Type        | Constraints                 | Notes                                |
| ---------- | ----------- | --------------------------- | ------------------------------------ |
| id         | uuid        | PK                          | Generated UUID                       |
| partner_id | uuid        | FK -> partners.id, NOT NULL | Parent partner                       |
| note_type  | text        | NOT NULL                    | e.g., discovery, follow-up, internal |
| content    | text        | NOT NULL                    | Rich text or plain text              |
| created_by | uuid        | FK -> users.id, NOT NULL    | Author                               |
| created_at | timestamptz | NOT NULL, DEFAULT now()     |                                      |

### 4.3 Workflow and Activity

#### `workflow_phases`

| Column     | Type        | Constraints             | Notes          |
| ---------- | ----------- | ----------------------- | -------------- |
| id         | uuid        | PK                      | Generated UUID |
| code       | text        | UNIQUE, NOT NULL        | Stable key     |
| name       | text        | UNIQUE, NOT NULL        | Display name   |
| sort_order | int         | NOT NULL                | Stage ordering |
| is_active  | boolean     | NOT NULL, DEFAULT true  | Configurable   |
| created_at | timestamptz | NOT NULL, DEFAULT now() |                |

#### `workflow_transitions`

| Column        | Type        | Constraints                        | Notes                           |
| ------------- | ----------- | ---------------------------------- | ------------------------------- |
| id            | uuid        | PK                                 | Generated UUID                  |
| partner_id    | uuid        | FK -> partners.id, NOT NULL        | Subject partner                 |
| from_phase_id | uuid        | FK -> workflow_phases.id, NULL     | Nullable for initial assignment |
| to_phase_id   | uuid        | FK -> workflow_phases.id, NOT NULL | New stage                       |
| change_reason | text        | NULL                               | Optional reason                 |
| changed_by    | uuid        | FK -> users.id, NOT NULL           | Actor                           |
| changed_at    | timestamptz | NOT NULL, DEFAULT now()            |                                 |

#### `activity_logs`

| Column        | Type        | Constraints                   | Notes                            |
| ------------- | ----------- | ----------------------------- | -------------------------------- |
| id            | uuid        | PK                            | Generated UUID                   |
| partner_id    | uuid        | FK -> partners.id, NOT NULL   | Context                          |
| actor_user_id | uuid        | FK -> users.id, NOT NULL      | Actor                            |
| activity_type | text        | NOT NULL                      | e.g., note_added, task_completed |
| metadata_json | jsonb       | NOT NULL, DEFAULT '{}'::jsonb | Flexible payload                 |
| created_at    | timestamptz | NOT NULL, DEFAULT now()       |                                  |

### 4.4 Strategic Mapping

#### `functions`

| Column      | Type        | Constraints             | Notes          |
| ----------- | ----------- | ----------------------- | -------------- |
| id          | uuid        | PK                      | Generated UUID |
| code        | text        | UNIQUE, NOT NULL        | Stable key     |
| name        | text        | NOT NULL                | Function label |
| description | text        | NULL                    |                |
| created_at  | timestamptz | NOT NULL, DEFAULT now() |                |

#### `value_propositions`

| Column      | Type        | Constraints             | Notes                   |
| ----------- | ----------- | ----------------------- | ----------------------- |
| id          | uuid        | PK                      | Generated UUID          |
| code        | text        | UNIQUE, NOT NULL        | Stable key              |
| name        | text        | NOT NULL                | Value proposition label |
| description | text        | NULL                    |                         |
| created_at  | timestamptz | NOT NULL, DEFAULT now() |                         |

#### `partner_qualification`

| Column        | Type        | Constraints                         | Notes                         |
| ------------- | ----------- | ----------------------------------- | ----------------------------- |
| id            | uuid        | PK                                  | Generated UUID                |
| partner_id    | uuid        | FK -> partners.id, UNIQUE, NOT NULL | 1 active qualification record |
| duration_type | text        | NOT NULL                            | Event/Project/Term            |
| impact_tier   | text        | NOT NULL                            | Standard/Major/Lead           |
| function_id   | uuid        | FK -> functions.id, NOT NULL        | Primary function              |
| created_by    | uuid        | FK -> users.id, NOT NULL            | Actor                         |
| created_at    | timestamptz | NOT NULL, DEFAULT now()             |                               |
| updated_at    | timestamptz | NOT NULL, DEFAULT now()             |                               |

#### `partner_value_propositions`

| Column               | Type        | Constraints                           | Notes                      |
| -------------------- | ----------- | ------------------------------------- | -------------------------- |
| id                   | uuid        | PK                                    | Generated UUID             |
| partner_id           | uuid        | FK -> partners.id, NOT NULL           | Parent partner             |
| value_proposition_id | uuid        | FK -> value_propositions.id, NOT NULL | Mapping target             |
| mapping_type         | text        | NOT NULL                              | `potential` or `confirmed` |
| created_at           | timestamptz | NOT NULL, DEFAULT now()               |                            |

Unique constraint recommended: `(partner_id, value_proposition_id, mapping_type)`.

### 4.5 Tasks and Reminders

#### `tasks`

| Column        | Type        | Constraints                 | Notes                           |
| ------------- | ----------- | --------------------------- | ------------------------------- |
| id            | uuid        | PK                          | Generated UUID                  |
| partner_id    | uuid        | FK -> partners.id, NOT NULL | Linked partner                  |
| title         | text        | NOT NULL                    | Task name                       |
| description   | text        | NULL                        |                                 |
| owner_user_id | uuid        | FK -> users.id, NOT NULL    | Assignee                        |
| due_date      | date        | NULL                        |                                 |
| priority      | text        | NOT NULL, DEFAULT 'medium'  | low/medium/high                 |
| status        | text        | NOT NULL, DEFAULT 'open'    | open/in_progress/done/cancelled |
| created_by    | uuid        | FK -> users.id, NOT NULL    | Creator                         |
| completed_at  | timestamptz | NULL                        | Completion timestamp            |
| created_at    | timestamptz | NOT NULL, DEFAULT now()     |                                 |
| updated_at    | timestamptz | NOT NULL, DEFAULT now()     |                                 |

#### `task_reminders`

| Column     | Type        | Constraints                 | Notes               |
| ---------- | ----------- | --------------------------- | ------------------- |
| id         | uuid        | PK                          | Generated UUID      |
| task_id    | uuid        | FK -> tasks.id, NOT NULL    | Parent task         |
| remind_at  | timestamptz | NOT NULL                    | Reminder schedule   |
| sent_at    | timestamptz | NULL                        | Delivery timestamp  |
| status     | text        | NOT NULL, DEFAULT 'pending' | pending/sent/failed |
| created_at | timestamptz | NOT NULL, DEFAULT now()     |                     |

### 4.6 Document Vault

#### `artifact_types`

| Column                | Type        | Constraints                    | Notes                 |
| --------------------- | ----------- | ------------------------------ | --------------------- |
| id                    | uuid        | PK                             | Generated UUID        |
| code                  | text        | UNIQUE, NOT NULL               | e.g., proposal, moa   |
| name                  | text        | NOT NULL                       | Display label         |
| is_required_for_phase | uuid        | FK -> workflow_phases.id, NULL | Optional gating phase |
| created_at            | timestamptz | NOT NULL, DEFAULT now()        |                       |

#### `artifacts`

| Column           | Type        | Constraints                       | Notes                     |
| ---------------- | ----------- | --------------------------------- | ------------------------- |
| id               | uuid        | PK                                | Generated UUID            |
| partner_id       | uuid        | FK -> partners.id, NOT NULL       | Parent partner            |
| artifact_type_id | uuid        | FK -> artifact_types.id, NOT NULL | Document category         |
| current_status   | text        | NOT NULL                          | draft/review/final/signed |
| created_by       | uuid        | FK -> users.id, NOT NULL          | Owner                     |
| created_at       | timestamptz | NOT NULL, DEFAULT now()           |                           |
| updated_at       | timestamptz | NOT NULL, DEFAULT now()           |                           |

#### `artifact_versions`

| Column          | Type        | Constraints                  | Notes              |
| --------------- | ----------- | ---------------------------- | ------------------ |
| id              | uuid        | PK                           | Generated UUID     |
| artifact_id     | uuid        | FK -> artifacts.id, NOT NULL | Parent artifact    |
| version_no      | int         | NOT NULL                     | 1..n               |
| file_name       | text        | NOT NULL                     | Original file name |
| mime_type       | text        | NOT NULL                     |                    |
| file_size_bytes | bigint      | NOT NULL                     |                    |
| storage_path    | text        | NOT NULL                     | Object key/path    |
| uploaded_by     | uuid        | FK -> users.id, NOT NULL     | Actor              |
| uploaded_at     | timestamptz | NOT NULL, DEFAULT now()      |                    |

Unique constraint recommended: `(artifact_id, version_no)`.

### 4.7 Governance and Import

#### `settings`

| Column     | Type        | Constraints              | Notes                    |
| ---------- | ----------- | ------------------------ | ------------------------ |
| id         | uuid        | PK                       | Generated UUID           |
| namespace  | text        | NOT NULL                 | e.g., workflow, taxonomy |
| key        | text        | NOT NULL                 | config key               |
| value_json | jsonb       | NOT NULL                 | typed config payload     |
| updated_by | uuid        | FK -> users.id, NOT NULL | Actor                    |
| updated_at | timestamptz | NOT NULL, DEFAULT now()  |                          |

Unique constraint recommended: `(namespace, key)`.

#### `import_batches`

| Column       | Type        | Constraints                   | Notes              |
| ------------ | ----------- | ----------------------------- | ------------------ |
| id           | uuid        | PK                            | Generated UUID     |
| source_name  | text        | NOT NULL                      | e.g., google_sheet |
| mode         | text        | NOT NULL                      | dry_run or commit  |
| started_by   | uuid        | FK -> users.id, NOT NULL      | Actor              |
| started_at   | timestamptz | NOT NULL, DEFAULT now()       |                    |
| finished_at  | timestamptz | NULL                          |                    |
| summary_json | jsonb       | NOT NULL, DEFAULT '{}'::jsonb | counts and errors  |

#### `audit_events`

| Column        | Type        | Constraints              | Notes                          |
| ------------- | ----------- | ------------------------ | ------------------------------ |
| id            | uuid        | PK                       | Generated UUID                 |
| actor_user_id | uuid        | FK -> users.id, NOT NULL | Actor                          |
| entity_type   | text        | NOT NULL                 | e.g., partner, task, artifact  |
| entity_id     | uuid        | NOT NULL                 | Subject id                     |
| action        | text        | NOT NULL                 | create/update/delete/login/etc |
| before_json   | jsonb       | NULL                     | snapshot before                |
| after_json    | jsonb       | NULL                     | snapshot after                 |
| created_at    | timestamptz | NOT NULL, DEFAULT now()  |                                |

## 5. Index Strategy (MVP)

Recommended indexes:

- `partners (organization_name)`
- `partners (organization_type, industry_niche)`
- `partners (current_phase_id)`
- `partners (archived_at)`
- `tasks (owner_user_id, status, due_date)`
- `workflow_transitions (partner_id, changed_at desc)`
- `activity_logs (partner_id, created_at desc)`
- `artifacts (partner_id, artifact_type_id)`
- `artifact_versions (artifact_id, version_no desc)`
- `audit_events (entity_type, entity_id, created_at desc)`

## 6. Critical Business Rules

- No public registration exists.
- Only active users can authenticate.
- Partner stage transitions must be written through workflow logic and logged.
- Required artifacts can block stage transition (configured by `artifact_types`).
- Task completion must preserve `completed_at` and actor traceability.

## 7. Migration Plan

- Use migration files for every schema change.
- Never edit production schema manually.
- Seed required lookup rows (roles, workflow phases, artifact types) via idempotent scripts.
- Keep backward-compatible migrations during MVP build period.

## 8. MVP Freeze Readiness Criteria

To meet the requirement of no code revisions immediately after all phases, the following must be true before go-live:

- Schema migration history is clean and reproducible from empty database.
- All required constraints and indexes are in place.
- End-to-end flows pass on seeded and realistic data volume.
- UAT sign-off includes workflow gates, auth, task flow, and document vault behavior.
- Backup and restore test is successful on release-candidate database.
