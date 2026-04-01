const crypto = require("crypto");
const { getDatabase } = require("../../../shared/services/database.service");
const { logPartnerActivity } = require("../../../shared/services/audit-log.service");

const DEFAULT_REMINDER_WINDOW_DAYS = 3;

class TaskServiceError extends Error {
  constructor(message, code, status = 400, details = []) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function mapTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    ownerId: row.owner_id,
    partnerId: row.partner_id,
    workflowPhaseId: row.workflow_phase_id,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDateOnly(dateString) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function classifyCriticalReminder(task, nowUtc, windowDays) {
  if (task.priority !== "critical" || task.status === "done") {
    return null;
  }

  const dueUtc = toDateOnly(task.dueDate);
  const diffDays = Math.floor((dueUtc.getTime() - nowUtc.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      type: "overdue",
      daysUntilDue: diffDays,
    };
  }

  if (diffDays <= windowDays) {
    return {
      type: "upcoming",
      daysUntilDue: diffDays,
    };
  }

  return null;
}

async function assertExists(db, table, id, fieldName) {
  const row = await db(table).where({ id }).first();
  if (!row) {
    throw new TaskServiceError(`${fieldName} does not exist`, "TASK_INVALID_REFERENCE", 400, [
      { field: fieldName, message: `Referenced ${fieldName} was not found` },
    ]);
  }
}

async function createTask(data, actorId) {
  const db = getDatabase();
  await assertExists(db, "users", data.ownerId, "ownerId");
  await assertExists(db, "partners", data.partnerId, "partnerId");
  await assertExists(db, "workflow_phases", data.workflowPhaseId, "workflowPhaseId");

  const id = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  await db("tasks").insert({
    id,
    title: data.title,
    description: data.description,
    owner_id: data.ownerId,
    partner_id: data.partnerId,
    workflow_phase_id: data.workflowPhaseId,
    due_date: data.dueDate,
    priority: data.priority,
    status: data.status,
    completed_at: data.status === "done" ? nowIso : null,
    created_by: actorId,
    created_at: nowIso,
    updated_at: nowIso,
  });

  const created = await db("tasks").where({ id }).first();
  return mapTask(created);
}

async function listTasks(filters) {
  const db = getDatabase();
  const query = db("tasks");

  if (filters.ownerId) query.where("owner_id", filters.ownerId);
  if (filters.partnerId) query.where("partner_id", filters.partnerId);
  if (filters.status) query.where("status", filters.status);
  if (filters.dueDateFrom) query.where("due_date", ">=", filters.dueDateFrom);
  if (filters.dueDateTo) query.where("due_date", "<=", filters.dueDateTo);

  const rows = await query.orderBy("due_date", "asc").orderBy("created_at", "desc");
  return rows.map(mapTask);
}

async function getTaskById(taskId) {
  const db = getDatabase();
  const row = await db("tasks").where({ id: taskId }).first();
  return mapTask(row);
}

async function updateTask(taskId, updates) {
  const db = getDatabase();
  const existing = await db("tasks").where({ id: taskId }).first();
  if (!existing) return null;

  if (updates.ownerId) await assertExists(db, "users", updates.ownerId, "ownerId");
  if (updates.partnerId) await assertExists(db, "partners", updates.partnerId, "partnerId");
  if (updates.workflowPhaseId) {
    await assertExists(db, "workflow_phases", updates.workflowPhaseId, "workflowPhaseId");
  }

  const nowIso = new Date().toISOString();
  const payload = { updated_at: nowIso };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.ownerId !== undefined) payload.owner_id = updates.ownerId;
  if (updates.partnerId !== undefined) payload.partner_id = updates.partnerId;
  if (updates.workflowPhaseId !== undefined) payload.workflow_phase_id = updates.workflowPhaseId;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.status !== undefined) {
    payload.status = updates.status;
    payload.completed_at = updates.status === "done" ? nowIso : null;
  }

  await db("tasks").where({ id: taskId }).update(payload);
  const updated = await db("tasks").where({ id: taskId }).first();
  return mapTask(updated);
}

async function deleteTask(taskId) {
  const db = getDatabase();
  const deleted = await db("tasks").where({ id: taskId }).del();
  return deleted > 0;
}

async function getTaskReminderSummary(filters = {}) {
  const db = getDatabase();
  const windowDays = Number(filters.windowDays || DEFAULT_REMINDER_WINDOW_DAYS);
  const query = db("tasks").where("priority", "critical").whereNot("status", "done");

  if (filters.ownerId) {
    query.where("owner_id", filters.ownerId);
  }

  const rows = await query.orderBy("due_date", "asc");
  const tasks = rows.map(mapTask);
  const nowUtc = toDateOnly(new Date().toISOString().slice(0, 10));

  const reminders = tasks
    .map((task) => {
      const classification = classifyCriticalReminder(task, nowUtc, windowDays);
      if (!classification) {
        return null;
      }

      return {
        taskId: task.id,
        partnerId: task.partnerId,
        ownerId: task.ownerId,
        dueDate: task.dueDate,
        reminderType: classification.type,
        daysUntilDue: classification.daysUntilDue,
        title: task.title,
      };
    })
    .filter(Boolean);

  return {
    summary: {
      windowDays,
      criticalOpenTasks: tasks.length,
      upcomingCount: reminders.filter((item) => item.reminderType === "upcoming").length,
      overdueCount: reminders.filter((item) => item.reminderType === "overdue").length,
    },
    reminders,
  };
}

async function triggerTaskReminders(actorId, filters = {}) {
  const db = getDatabase();
  const summary = await getTaskReminderSummary(filters);
  const nowIso = new Date().toISOString();
  let insertedEvents = 0;

  for (const reminder of summary.reminders) {
    const existing = await db("task_reminder_events")
      .where({
        task_id: reminder.taskId,
        reminder_type: reminder.reminderType,
        due_date: reminder.dueDate,
      })
      .first();

    if (existing) {
      continue;
    }

    await db("task_reminder_events").insert({
      id: crypto.randomUUID(),
      task_id: reminder.taskId,
      partner_id: reminder.partnerId,
      reminder_type: reminder.reminderType,
      due_date: reminder.dueDate,
      triggered_at: nowIso,
      triggered_by: actorId,
    });

    await logPartnerActivity(db, {
      partnerId: reminder.partnerId,
      actionType: `task_reminder_${reminder.reminderType}`,
      actorId,
      payload: {
        taskId: reminder.taskId,
        title: reminder.title,
        dueDate: reminder.dueDate,
        daysUntilDue: reminder.daysUntilDue,
      },
    });

    insertedEvents += 1;
  }

  return {
    ...summary,
    triggeredEvents: insertedEvents,
  };
}

module.exports = {
  TaskServiceError,
  DEFAULT_REMINDER_WINDOW_DAYS,
  createTask,
  listTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskReminderSummary,
  triggerTaskReminders,
};