const express = require("express");
const { requireAuth, requireRole } = require("../../../shared/middleware/auth.middleware");
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
router.post("/reminders/trigger", requireRole(["admin", "team_member"]), triggerTaskRemindersHandler);
router.get("/", listTasksHandler);
router.post("/", requireRole(["admin", "team_member"]), createTaskHandler);
router.get("/:taskId", getTaskHandler);
router.put("/:taskId", requireRole(["admin", "team_member"]), updateTaskHandler);
router.delete("/:taskId", requireRole(["admin", "team_member"]), deleteTaskHandler);

module.exports = router;