import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { listTasksRequest, updateTaskRequest, type TaskRecord, type TaskStatus } from "../services/tasks-api";

type QueueMode = "personal" | "team";

type TaskFilters = {
  status: "" | TaskStatus;
  ownerId: string;
  dueDateFrom: string;
  dueDateTo: string;
};

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
  const [queueMode, setQueueMode] = useState<QueueMode>("personal");
  const [filters, setFilters] = useState<TaskFilters>({
    status: "",
    ownerId: "",
    dueDateFrom: "",
    dueDateTo: "",
  });
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompletingById, setIsCompletingById] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    const loadTasks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const ownerId = queueMode === "personal" ? user?.id || "" : filters.ownerId;
        const data = await listTasksRequest({
          ownerId: ownerId || undefined,
          status: filters.status || undefined,
          dueDateFrom: filters.dueDateFrom || undefined,
          dueDateTo: filters.dueDateTo || undefined,
        });

        if (!cancelled) {
          setTasks(data);
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

    return { total, done, open, inProgress, blocked, overdue };
  }, [tasks]);

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

  return (
    <main className="page-layout">
      <header className="page-header">
        <div>
          <h1>Task Queues</h1>
          <p className="muted">{subtitle}</p>
        </div>
        <div className="user-actions">
          <nav className="page-nav-links" aria-label="Primary navigation">
            <Link to="/partners" className="link-button">
              Partners
            </Link>
            <Link to="/tasks" className="link-button link-button-active">
              Tasks
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
            <h3>Overdue</h3>
            <strong>{summary.overdue}</strong>
          </article>
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
