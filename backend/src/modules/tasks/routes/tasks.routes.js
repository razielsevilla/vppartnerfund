const express = require("express");
const { requireAuth } = require("../../../shared/middleware/auth.middleware");
const {
  createTaskHandler,
  listTasksHandler,
  getTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
} = require("../controllers/tasks.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", listTasksHandler);
router.post("/", createTaskHandler);
router.get("/:taskId", getTaskHandler);
router.put("/:taskId", updateTaskHandler);
router.delete("/:taskId", deleteTaskHandler);

module.exports = router;