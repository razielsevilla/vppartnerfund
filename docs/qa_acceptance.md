# QA Acceptance Plan (MVP)

## 1. Purpose

This document defines the pass/fail quality gates for MVP release of the DEVCON Laguna internal dashboard.

Primary objective:

- Ensure MVP is fully working before go-live.
- Prevent immediate post-phase code revisions by enforcing strict acceptance criteria.

## 2. Test Execution Rules

- Every test case must have evidence (screenshot, API response, or log reference).
- Critical test cases must be 100 percent passed.
- High-priority test cases must be at least 95 percent passed with zero open critical defects.
- Any failed critical case blocks release.

## 3. Environment Preconditions

| Checkpoint   | Requirement                                                 |
| ------------ | ----------------------------------------------------------- |
| Environment  | Staging mirrors production stack and configuration          |
| Data         | Seeded realistic dataset for partners, tasks, and artifacts |
| Accounts     | Preset Admin and Team Member accounts are active            |
| Migrations   | Latest schema migrations applied successfully               |
| Integrations | File storage and monitoring are reachable                   |

## 4. Feature Traceability Matrix

| Feature ID | Feature Name                       | Minimum Test Coverage                    | Blocking Severity |
| ---------- | ---------------------------------- | ---------------------------------------- | ----------------- |
| F-01       | Partner CRM (Registry)             | CRUD, filters, duplicate guard           | Critical          |
| F-02       | Workflow Tracker (Pipeline)        | transitions, guardrails, timeline        | Critical          |
| F-03       | Qualification and Fit Mapping      | mapping persistence and validation       | High              |
| F-04       | Responsibilities Matrix            | display and data consistency             | High              |
| F-05       | Artifact and Document Vault        | upload, versioning, stage gates          | Critical          |
| F-06       | Task and Accountability System     | assignment, due logic, completion flow   | Critical          |
| F-07       | Discovery and Notes System         | guided and freeform notes persistence    | High              |
| F-08       | Outreach and Communication Support | template flow and draft persistence      | High              |
| F-09       | Dashboard and Analytics            | KPI correctness and drill-down integrity | Critical          |
| F-10       | Data Quality and Governance        | controlled values and validation rules   | Critical          |
| F-11       | Spreadsheet Migration and Import   | dry run, commit, conflict handling       | High              |
| F-12       | Settings and Configuration         | controlled edits and audit logging       | High              |
| F-13       | User Management and Access Control | login-only auth, role permissions        | Critical          |

## 5. Critical Path Acceptance Tests

### 5.1 Authentication and Access (F-13)

| Test ID | Name                   | Scenario                                   | Expected Result                                          | Evidence                 | Status  |
| ------- | ---------------------- | ------------------------------------------ | -------------------------------------------------------- | ------------------------ | ------- |
| AUTH-01 | Login success          | Valid preset Admin credentials             | Access granted, session created, redirected to dashboard | Screenshot + session log | Not Run |
| AUTH-02 | No sign-up route       | Attempt to access sign-up URL or API route | Route does not exist or returns forbidden                | Screenshot/API output    | Not Run |
| AUTH-03 | Role restriction       | Team Member attempts Admin-only action     | Access denied with clear error                           | Screenshot/API output    | Not Run |
| AUTH-04 | Session expiry         | Session timeout reached                    | User is logged out and prompted to login again           | Screenshot + log         | Not Run |
| AUTH-05 | Failed login hardening | Repeated invalid credentials               | Rate-limit/lockout behavior triggered                    | Auth log excerpt         | Not Run |

### 5.2 Partner CRM (F-01)

| Test ID | Name              | Scenario                         | Expected Result                                                             | Evidence              | Status  |
| ------- | ----------------- | -------------------------------- | --------------------------------------------------------------------------- | --------------------- | ------- |
| CRM-01  | Create partner    | Create a valid partner record    | Record saved with generated ID and visible in list                          | Screenshot/API output | Not Run |
| CRM-02  | Edit partner      | Update profile details           | Changes persist and appear after refresh                                    | Screenshot            | Not Run |
| CRM-03  | Archive partner   | Archive selected partner         | Archived record removed from active list and retrievable via archive filter | Screenshot            | Not Run |
| CRM-04  | Search and filter | Filter by type, industry, status | Results match selected filters accurately                                   | Screenshot            | Not Run |
| CRM-05  | Duplicate warning | Create similar-name partner      | Duplicate detection warning or block appears                                | Screenshot            | Not Run |

### 5.3 Workflow Tracker (F-02)

| Test ID | Name                       | Scenario                                                 | Expected Result                              | Evidence                 | Status  |
| ------- | -------------------------- | -------------------------------------------------------- | -------------------------------------------- | ------------------------ | ------- |
| WF-01   | Valid transition           | Move partner from one stage to next with required fields | Transition succeeds and timeline logs change | Screenshot + audit entry | Not Run |
| WF-02   | Invalid transition blocked | Missing required fields during stage change              | Transition blocked with explanation          | Screenshot               | Not Run |
| WF-03   | Overdue visibility         | Next action due date in past                             | Partner is flagged as overdue/stalled        | Screenshot               | Not Run |
| WF-04   | Transition audit           | Perform stage changes as different users                 | Actor and timestamp are recorded correctly   | Audit query/output       | Not Run |

### 5.4 Artifact Vault and Gates (F-05)

| Test ID | Name                   | Scenario                                       | Expected Result                            | Evidence   | Status  |
| ------- | ---------------------- | ---------------------------------------------- | ------------------------------------------ | ---------- | ------- |
| DOC-01  | Upload artifact        | Upload valid proposal or MOA file              | File accepted and linked to partner        | Screenshot | Not Run |
| DOC-02  | Reject invalid file    | Upload unsupported file type/size              | Upload blocked with validation message     | Screenshot | Not Run |
| DOC-03  | Versioning             | Upload replacement for same artifact           | New version created, old version preserved | Screenshot | Not Run |
| DOC-04  | Stage gate enforcement | Advance stage without required signed artifact | Transition blocked until requirement met   | Screenshot | Not Run |

### 5.5 Tasks and Accountability (F-06)

| Test ID | Name              | Scenario                            | Expected Result                                   | Evidence   | Status  |
| ------- | ----------------- | ----------------------------------- | ------------------------------------------------- | ---------- | ------- |
| TASK-01 | Create and assign | Create task with owner and due date | Task appears in owner queue with metadata         | Screenshot | Not Run |
| TASK-02 | Overdue tagging   | Due date passes without completion  | Task marked overdue and visible in overdue filter | Screenshot | Not Run |
| TASK-03 | Complete task     | Mark task complete                  | Status and completion timestamp recorded          | Screenshot | Not Run |

### 5.6 Dashboard and KPIs (F-09)

| Test ID | Name                     | Scenario                                    | Expected Result                                     | Evidence           | Status  |
| ------- | ------------------------ | ------------------------------------------- | --------------------------------------------------- | ------------------ | ------- |
| KPI-01  | Stage count integrity    | Compare dashboard stage counts to DB source | Numbers match exactly                               | Query + screenshot | Not Run |
| KPI-02  | Overdue metric integrity | Compare overdue KPI with task records       | KPI value matches filtered task data                | Query + screenshot | Not Run |
| KPI-03  | Drill-down accuracy      | Click KPI to open operational view          | Resulting list reflects same underlying data subset | Screenshot         | Not Run |

### 5.7 Data Governance (F-10)

| Test ID | Name                              | Scenario                              | Expected Result                                          | Evidence     | Status  |
| ------- | --------------------------------- | ------------------------------------- | -------------------------------------------------------- | ------------ | ------- |
| GOV-01  | Controlled vocabulary enforcement | Submit invalid status/category values | API rejects invalid value                                | API output   | Not Run |
| GOV-02  | Required-field validation         | Submit incomplete required payload    | Validation error returned with clear field info          | API output   | Not Run |
| GOV-03  | Audit generation                  | Perform critical update               | Audit record created with actor and before/after payload | Audit output | Not Run |

## 6. High-Priority Functional Tests

| Test ID   | Feature | Scenario                              | Expected Result                                    | Status  |
| --------- | ------- | ------------------------------------- | -------------------------------------------------- | ------- |
| QMAP-01   | F-03    | Save qualification mapping and reload | Values persist and are accurate                    | Not Run |
| MATRIX-01 | F-04    | Render give-and-get matrix by tier    | Matrix is complete and correctly grouped           | Not Run |
| NOTES-01  | F-07    | Save guided discovery notes           | Notes persist and appear in timeline               | Not Run |
| OUTR-01   | F-08    | Generate and save outreach draft      | Draft persists without forced stage transition     | Not Run |
| IMP-01    | F-11    | Execute dry-run import                | Validation summary produced without writes         | Not Run |
| IMP-02    | F-11    | Execute commit import with mixed rows | Created/updated/skipped/failed summary is accurate | Not Run |
| CFG-01    | F-12    | Modify allowed setting as Admin       | Change persists and audit entry is created         | Not Run |

## 7. Non-Functional Acceptance Tests

| Test ID | Category        | Scenario                               | Pass Criteria                                      | Status  |
| ------- | --------------- | -------------------------------------- | -------------------------------------------------- | ------- |
| NF-01   | Performance     | Partner list with realistic volume     | Core list/filter interactions remain responsive    | Not Run |
| NF-02   | Reliability     | Simulate upload/API failure            | UI shows recoverable error without data corruption | Not Run |
| NF-03   | Security        | Access protected route without session | Access blocked and redirected to login             | Not Run |
| NF-04   | Backup/Recovery | Restore latest backup in staging       | Restored environment is usable and complete        | Not Run |

## 8. Defect Severity Rules

| Severity | Definition                                              | Release Impact                         |
| -------- | ------------------------------------------------------- | -------------------------------------- |
| Critical | Blocks core workflow, data integrity, auth, or security | Release blocked                        |
| High     | Major function degraded with workaround                 | Limited tolerance; must be near-zero   |
| Medium   | Non-critical issue with acceptable workaround           | Can ship with explicit risk acceptance |
| Low      | Cosmetic or minor inconvenience                         | Can ship                               |

## 9. Release Gate (Go/No-Go)

| Gate ID | Condition             | Required Outcome                                                            |
| ------- | --------------------- | --------------------------------------------------------------------------- |
| RG-01   | Critical tests        | 100 percent passed                                                          |
| RG-02   | High-priority tests   | At least 95 percent passed                                                  |
| RG-03   | Critical/High defects | Zero open critical, zero open high unless explicitly risk-accepted by owner |
| RG-04   | Data integrity checks | KPI and workflow data verified against source queries                       |
| RG-05   | Operational readiness | Monitoring, backups, and restore test completed                             |
| RG-06   | Owner sign-off        | Final approval recorded by product owner                                    |

## 10. Final MVP Acceptance Statement

MVP is considered fully complete only when all release gates pass in staging and are re-validated after production deployment smoke tests. If any gate fails, release is postponed instead of shipping and revising immediately after go-live.
