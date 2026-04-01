# Internal Team Onboarding Guide

This guide provides the minimum onboarding flow for internal users operating the DEVCON Laguna partnership dashboard.

## 1. Audience and Roles

- Admin: manages settings, quality controls, and high-impact updates.
- Team Member: executes day-to-day CRM, workflow, task, and vault operations.

## 2. Access and Credentials

1. Request account provisioning from internal Admin owner.
2. Verify login URL and internal environment.
3. Login with assigned internal credentials.
4. Confirm your role by checking available navigation items and restricted actions.

Security notes:

- No self-registration path is available.
- Credentials must not be shared.
- Sessions are role-scoped; unauthorized actions are blocked.

## 3. First-Day Workflow

1. Open Dashboard and review KPI cards and overdue indicators.
2. Open Partners and validate assigned records.
3. Review Tasks queue for due and overdue actions.
4. Confirm access to Artifact Vault within at least one partner record.
5. If you are Admin, open Settings and verify controlled masters are visible.

## 4. Core Operating Procedures

### Partner lifecycle

1. Create or update partner record with required fields.
2. Add qualification mapping and discovery notes.
3. Move partner through workflow transitions with required artifacts.
4. Archive partner only when active work is complete.

### Task management

1. Create tasks with owner, due date, priority, and status.
2. Keep overdue tasks visible and actively triaged.
3. Mark completed tasks promptly to preserve KPI accuracy.

### Artifact governance

1. Upload only allowed file types and valid partner-linked documents.
2. Use replacement uploads for version history.
3. Resolve missing required artifacts before advancing gated workflow stages.

## 5. Admin-Only Operations

1. Update workflow phases and taxonomies only through Settings controls.
2. Review settings audit logs before and after impactful changes.
3. Trigger reminder workflows only for valid operational windows.
4. Execute backup commands before high-risk maintenance.

## 6. Backup and Recovery Basics

- Backup command: `npm run db:backup`
- Restore command: `RESTORE_BACKUP_PATH=<path> npm run db:restore`
- Full runbook: [docs/backup-restore.md](./backup-restore.md)

## 7. Common Troubleshooting

- Cannot login: verify account exists and role is provisioned.
- Action denied: confirm role permissions for that endpoint/action.
- Upload rejected: verify file type and size policy.
- Transition blocked: inspect required fields/artifacts for target stage.
- Data mismatch concern: compare dashboard values with filtered operational views.

## 8. Escalation Path

1. Capture issue summary, timestamp, and affected partner/task IDs.
2. Attach screenshot or API error payload if available.
3. Report to internal Admin and Technical Lead.
4. If release-impacting, classify severity using [docs/qa_acceptance.md](./qa_acceptance.md).

## 9. Quick Reference

- Deployment and go-live controls: [docs/deployment.md](./deployment.md)
- QA gates and severity rules: [docs/qa_acceptance.md](./qa_acceptance.md)
- Backup and restore runbook: [docs/backup-restore.md](./backup-restore.md)
