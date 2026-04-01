const {
  TaskServiceError,
  createTask,
  listTasks,
  getTaskById,
  updateTask,
  deleteTask,
} = require("../services/tasks.service");
const {
  validateCreateTaskPayload,
  validateUpdateTaskPayload,
} = require("../validators/tasks.validator");

function validationError(res, details) {
  return res.status(400).json({
    error: {
      code: "TASK_VALIDATION_FAILED",
      message: "Task payload validation failed",
      details,
    },
  });
}

function serviceError(res, error) {
  if (error instanceof TaskServiceError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  return res.status(500).json({
    error: {
      code: "TASK_INTERNAL_ERROR",
      message: "Unexpected task service error",
      details: [],
    },
  });
}

async function createTaskHandler(req, res) {
  const validation = validateCreateTaskPayload(req.body);
  if (!validation.isValid) return validationError(res, validation.errors);

  try {
    const task = await createTask(validation.value, req.user.id);
    return res.status(201).json({ task });
  } catch (error) {
    return serviceError(res, error);
  }
}

async function listTasksHandler(req, res) {
  try {
    const tasks = await listTasks({
      ownerId: req.query.ownerId,
      partnerId: req.query.partnerId,
      status: req.query.status,
    });
    return res.status(200).json({ tasks });
  } catch (error) {
    return serviceError(res, error);
  }
}

async function getTaskHandler(req, res) {
  try {
    const task = await getTaskById(req.params.taskId);
    if (!task) {
      return res.status(404).json({
        error: {
          code: "TASK_NOT_FOUND",
          message: "Task was not found",
          details: [{ field: "taskId", message: "No task exists with this id" }],
        },
      });
    }
    return res.status(200).json({ task });
  } catch (error) {
    return serviceError(res, error);
  }
}

async function updateTaskHandler(req, res) {
  const validation = validateUpdateTaskPayload(req.body);
  if (!validation.isValid) return validationError(res, validation.errors);

  try {
    const task = await updateTask(req.params.taskId, validation.value);
    if (!task) {
      return res.status(404).json({
        error: {
          code: "TASK_NOT_FOUND",
          message: "Task was not found",
          details: [{ field: "taskId", message: "No task exists with this id" }],
        },
      });
    }
    return res.status(200).json({ task });
  } catch (error) {
    return serviceError(res, error);
  }
}

async function deleteTaskHandler(req, res) {
  try {
    const deleted = await deleteTask(req.params.taskId);
    if (!deleted) {
      return res.status(404).json({
        error: {
          code: "TASK_NOT_FOUND",
          message: "Task was not found",
          details: [{ field: "taskId", message: "No task exists with this id" }],
        },
      });
    }
    return res.status(204).send();
  } catch (error) {
    return serviceError(res, error);
  }
}

module.exports = {
  createTaskHandler,
  listTasksHandler,
  getTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
};