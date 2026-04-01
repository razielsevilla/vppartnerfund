const express = require("express");
const { requireAuth, requireRole } = require("../../../shared/middleware/auth.middleware");
const { ALL_ROLE_CODES } = require("../../../shared/constants/roles");
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
router.post("/reminders/trigger", requireRole(ALL_ROLE_CODES), triggerTaskRemindersHandler);
router.get("/", listTasksHandler);
router.post("/", requireRole(ALL_ROLE_CODES), createTaskHandler);
router.get("/:taskId", getTaskHandler);
router.put("/:taskId", requireRole(ALL_ROLE_CODES), updateTaskHandler);
router.delete("/:taskId", requireRole(ALL_ROLE_CODES), deleteTaskHandler);

module.exports = router;