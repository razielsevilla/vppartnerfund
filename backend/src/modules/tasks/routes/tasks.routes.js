const express = require("express");
const { requireAuth } = require("../../../shared/middleware/auth.middleware");
const {
  createTaskHandler,
  listTasksHandler,
  getTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  getTaskReminderSummaryHandler,
  triggerTaskRemindersHandler,
} = require("../controllers/tasks.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/reminders/summary", getTaskReminderSummaryHandler);
router.post("/reminders/trigger", triggerTaskRemindersHandler);
router.get("/", listTasksHandler);
router.post("/", createTaskHandler);
router.get("/:taskId", getTaskHandler);
router.put("/:taskId", updateTaskHandler);
router.delete("/:taskId", deleteTaskHandler);

module.exports = router;