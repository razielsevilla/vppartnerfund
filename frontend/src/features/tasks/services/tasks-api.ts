const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export type TaskStatus = "open" | "in_progress" | "blocked" | "done";

export type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  partnerId: string;
  workflowPhaseId: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "critical";
  status: TaskStatus;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskListFilters = {
  ownerId?: string;
  status?: TaskStatus | "";
  dueDateFrom?: string;
  dueDateTo?: string;
};

export type TaskReminderItem = {
  taskId: string;
  partnerId: string;
  ownerId: string;
  dueDate: string;
  reminderType: "upcoming" | "overdue";
  daysUntilDue: number;
  title: string;
};

export type TaskReminderSummary = {
  summary: {
    windowDays: number;
    criticalOpenTasks: number;
    upcomingCount: number;
    overdueCount: number;
  };
  reminders: TaskReminderItem[];
  triggeredEvents?: number;
};

function extractApiMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return fallback;
  }

  const error = body.error as { message?: string };
  return error.message || fallback;
}

export const listTasksRequest = async (filters: TaskListFilters): Promise<TaskRecord[]> => {
  const params = new URLSearchParams();
  if (filters.ownerId?.trim()) {
    params.set("ownerId", filters.ownerId.trim());
  }
  if (filters.status?.trim()) {
    params.set("status", filters.status);
  }
  if (filters.dueDateFrom?.trim()) {
    params.set("dueDateFrom", filters.dueDateFrom.trim());
  }
  if (filters.dueDateTo?.trim()) {
    params.set("dueDateTo", filters.dueDateTo.trim());
  }

  const query = params.toString();
  const response = await fetch(`${API_URL}/tasks${query ? `?${query}` : ""}`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load tasks"));
  }

  return (body as { tasks: TaskRecord[] }).tasks;
};

export const updateTaskRequest = async (
  taskId: string,
  payload: Partial<{
    title: string;
    description: string | null;
    ownerId: string;
    partnerId: string;
    workflowPhaseId: string;
    dueDate: string;
    priority: "low" | "medium" | "high" | "critical";
    status: TaskStatus;
  }>,
): Promise<TaskRecord> => {
  const response = await fetch(`${API_URL}/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to update task"));
  }

  return (body as { task: TaskRecord }).task;
};

export const getTaskReminderSummaryRequest = async (params?: {
  ownerId?: string;
  windowDays?: number;
}): Promise<TaskReminderSummary> => {
  const search = new URLSearchParams();
  if (params?.ownerId?.trim()) {
    search.set("ownerId", params.ownerId.trim());
  }
  if (params?.windowDays) {
    search.set("windowDays", String(params.windowDays));
  }

  const query = search.toString();
  const response = await fetch(`${API_URL}/tasks/reminders/summary${query ? `?${query}` : ""}`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load task reminder summary"));
  }

  return body as TaskReminderSummary;
};

export const triggerTaskRemindersRequest = async (params?: {
  ownerId?: string;
  windowDays?: number;
}): Promise<TaskReminderSummary> => {
  const response = await fetch(`${API_URL}/tasks/reminders/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params || {}),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to trigger task reminders"));
  }

  return body as TaskReminderSummary;
};
