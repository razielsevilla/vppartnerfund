import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import {
  getTaskReminderSummaryRequest,
  listTasksRequest,
  triggerTaskRemindersRequest,
  updateTaskRequest,
  type TaskRecord,
  type TaskReminderSummary,
  type TaskStatus,
} from "../services/tasks-api";

type QueueMode = "personal" | "team";

type TaskFilters = {
  status: "" | TaskStatus;
  ownerId: string;
  dueDateFrom: string;
  dueDateTo: string;
};

function parseTaskStatus(value: string | null): "" | TaskStatus {
  if (value === "open" || value === "in_progress" || value === "blocked" || value === "done") {
    return value;
  }

  return "";
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

function isOverdue(task: TaskRecord): boolean {
  if (task.status === "done") {
    return false;
  }

  const due = new Date(`${task.dueDate}T23:59:59.999Z`).getTime();
  return due < Date.now();
}

export const TaskQueuePage = () => {
  const { user, logout } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [queueMode, setQueueMode] = useState<QueueMode>(() =>
    searchParams.get("queue") === "team" ? "team" : "personal",
  );
  const [filters, setFilters] = useState<TaskFilters>(() => {
    const dueBucket = searchParams.get("dueBucket");
    const defaultDueDateTo = dueBucket === "overdue" ? new Date().toISOString().slice(0, 10) : "";

    return {
      status: parseTaskStatus(searchParams.get("status")),
      ownerId: searchParams.get("ownerId") || "",
      dueDateFrom: searchParams.get("dueDateFrom") || "",
      dueDateTo: searchParams.get("dueDateTo") || defaultDueDateTo,
    };
  });
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [reminderSummary, setReminderSummary] = useState<TaskReminderSummary | null>(null);
  const [isTriggeringReminders, setIsTriggeringReminders] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompletingById, setIsCompletingById] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const params = new URLSearchParams();
    if (queueMode !== "personal") {
      params.set("queue", queueMode);
    }
    if (filters.status) {
      params.set("status", filters.status);
    }
    if (filters.ownerId.trim()) {
      params.set("ownerId", filters.ownerId.trim());
    }
    if (filters.dueDateFrom) {
      params.set("dueDateFrom", filters.dueDateFrom);
    }
    if (filters.dueDateTo) {
      params.set("dueDateTo", filters.dueDateTo);
    }

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [
    filters.dueDateFrom,
    filters.dueDateTo,
    filters.ownerId,
    filters.status,
    queueMode,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadTasks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const ownerId = queueMode === "personal" ? user?.id || "" : filters.ownerId;
        const [data, reminders] = await Promise.all([
          listTasksRequest({
            ownerId: ownerId || undefined,
            status: filters.status || undefined,
            dueDateFrom: filters.dueDateFrom || undefined,
            dueDateTo: filters.dueDateTo || undefined,
          }),
          getTaskReminderSummaryRequest({
            ownerId: ownerId || undefined,
          }),
        ]);

        if (!cancelled) {
          setTasks(data);
          setReminderSummary(reminders);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load task queue");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      cancelled = true;
    };
  }, [filters.dueDateFrom, filters.dueDateTo, filters.ownerId, filters.status, queueMode, user?.id]);

  const ownerOptions = useMemo(() => {
    const owners = new Map<string, string>();
    for (const task of tasks) {
      if (!owners.has(task.ownerId)) {
        owners.set(task.ownerId, task.ownerId);
      }
    }
    return Array.from(owners.entries()).map(([id, label]) => ({ id, label }));
  }, [tasks]);

  const summary = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.status === "done").length;
    const open = tasks.filter((task) => task.status === "open").length;
    const inProgress = tasks.filter((task) => task.status === "in_progress").length;
    const blocked = tasks.filter((task) => task.status === "blocked").length;
    const overdue = tasks.filter((task) => isOverdue(task)).length;

    const reminderByTaskId = new Map(
      (reminderSummary?.reminders || []).map((item) => [item.taskId, item.reminderType]),
    );
    const upcoming = tasks.filter((task) => reminderByTaskId.get(task.id) === "upcoming").length;

    return { total, done, open, inProgress, blocked, overdue, upcoming, reminderByTaskId };
  }, [reminderSummary?.reminders, tasks]);

  const subtitle = useMemo(() => {
    if (isLoading) {
      return "Loading task queues...";
    }
    if (error) {
      return "Could not load task queue data.";
    }
    return `${summary.total} task${summary.total === 1 ? "" : "s"} in ${queueMode} queue`;
  }, [error, isLoading, queueMode, summary.total]);

  const completeTask = async (taskId: string) => {
    setIsCompletingById((prev) => ({ ...prev, [taskId]: true }));
    setError(null);

    try {
      const updated = await updateTaskRequest(taskId, { status: "done" });
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
      window.dispatchEvent(new Event("task:updated"));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to complete task");
    } finally {
      setIsCompletingById((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    }
  };

  const triggerReminders = async () => {
    const ownerId = queueMode === "personal" ? user?.id || "" : filters.ownerId;
    setIsTriggeringReminders(true);
    setTriggerMessage(null);
    try {
      const response = await triggerTaskRemindersRequest({ ownerId: ownerId || undefined });
      setReminderSummary(response);
      setTriggerMessage(`${response.triggeredEvents || 0} reminder event(s) logged.`);
      window.dispatchEvent(new Event("task:updated"));
    } catch (triggerError) {
      setTriggerMessage(
        triggerError instanceof Error ? triggerError.message : "Failed to trigger reminders",
      );
    } finally {
      setIsTriggeringReminders(false);
    }
  };

  return (
    <main className="page-layout">
      <header className="page-header">
        <div>
          <h1>Task Queues</h1>
          <p className="muted">{subtitle}</p>
        </div>
        <div className="user-actions">
          <nav className="page-nav-links" aria-label="Primary navigation">
            <Link to="/dashboard" className="link-button">
              Dashboard
            </Link>
            <Link to="/partners" className="link-button">
              Partners
            </Link>
            <Link to="/tasks" className="link-button link-button-active">
              Tasks
            </Link>
            <Link to="/settings" className="link-button">
              Settings
            </Link>
          </nav>
          <span>{user?.displayName}</span>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <section className="health-metrics-panel" aria-label="Task queue summary">
        <h2>Task Counters</h2>
        <div className="health-cards">
          <article className="health-card">
            <h3>Open</h3>
            <strong>{summary.open}</strong>
          </article>
          <article className="health-card">
            <h3>In Progress</h3>
            <strong>{summary.inProgress}</strong>
          </article>
          <article className="health-card">
            <h3>Blocked</h3>
            <strong>{summary.blocked}</strong>
          </article>
          <article className="health-card">
            <h3>Completed</h3>
            <strong>{summary.done}</strong>
          </article>
          <article className="health-card health-card-warning">
            <h3>Upcoming</h3>
            <strong>{summary.upcoming}</strong>
          </article>
          <article className="health-card health-card-warning">
            <h3>Overdue</h3>
            <strong>{summary.overdue}</strong>
          </article>
        </div>
        <div className="task-reminder-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={triggerReminders}
            disabled={isTriggeringReminders}
          >
            {isTriggeringReminders ? "Triggering..." : "Trigger Critical Reminders"}
          </button>
          {triggerMessage && <p className="muted">{triggerMessage}</p>}
        </div>
      </section>

      <section className="registry-controls" aria-label="Task queue filters">
        <label>
          Queue
          <select
            value={queueMode}
            onChange={(event) => setQueueMode(event.target.value as QueueMode)}
          >
            <option value="personal">Personal Queue</option>
            <option value="team">Team Queue</option>
          </select>
        </label>

        <label>
          Status
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, status: event.target.value as TaskFilters["status"] }))
            }
          >
            <option value="">All states</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>
        </label>

        <label>
          Owner
          <select
            value={queueMode === "personal" ? user?.id || "" : filters.ownerId}
            onChange={(event) => setFilters((prev) => ({ ...prev, ownerId: event.target.value }))}
            disabled={queueMode === "personal"}
          >
            {queueMode === "personal" ? (
              <option value={user?.id || ""}>{user?.displayName || "Current user"}</option>
            ) : (
              <>
                <option value="">All owners</option>
                {ownerOptions.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.label}
                  </option>
                ))}
              </>
            )}
          </select>
        </label>

        <label>
          Due from
          <input
            type="date"
            value={filters.dueDateFrom}
            onChange={(event) => setFilters((prev) => ({ ...prev, dueDateFrom: event.target.value }))}
          />
        </label>

        <label>
          Due to
          <input
            type="date"
            value={filters.dueDateTo}
            onChange={(event) => setFilters((prev) => ({ ...prev, dueDateTo: event.target.value }))}
          />
        </label>
      </section>

      <section className="registry-panel" aria-label="Task queue table">
        {isLoading && <p className="loading-state">Loading tasks...</p>}

        {!isLoading && error && (
          <div className="status-card status-error" role="alert">
            <h2>Failed to load tasks</h2>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && tasks.length === 0 && (
          <div className="status-card status-empty">
            <h2>No tasks found</h2>
            <p>Try adjusting queue filters to broaden results.</p>
          </div>
        )}

        {!isLoading && !error && tasks.length > 0 && (
          <div className="registry-table-wrap">
            <table className="registry-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Owner</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Partner</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const overdue = isOverdue(task);
                  const reminderType = summary.reminderByTaskId.get(task.id);
                  return (
                    <tr key={task.id} className={overdue ? "task-row-overdue" : ""}>
                      <td>
                        <div className="task-title-cell">
                          <strong>{task.title}</strong>
                          {task.description && <span className="muted">{task.description}</span>}
                        </div>
                      </td>
                      <td>{task.ownerId}</td>
                      <td>{task.dueDate}</td>
                      <td>{task.priority}</td>
                      <td>
                        <span className={`task-status-chip task-status-${task.status}`}>
                          {STATUS_LABELS[task.status]}
                        </span>
                        {reminderType === "upcoming" && <span className="task-upcoming-flag">Upcoming</span>}
                        {overdue && <span className="task-overdue-flag">Overdue</span>}
                      </td>
                      <td>
                        <Link to={`/partners/${task.partnerId}`} className="table-link">
                          View Partner
                        </Link>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="task-complete-btn"
                          disabled={task.status === "done" || Boolean(isCompletingById[task.id])}
                          onClick={() => completeTask(task.id)}
                        >
                          {task.status === "done"
                            ? "Completed"
                            : isCompletingById[task.id]
                              ? "Completing..."
                              : "Mark Done"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};
