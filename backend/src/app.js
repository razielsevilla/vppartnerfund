const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./modules/auth/routes/auth.routes");
const partnerRoutes = require("./modules/partners/routes/partners.routes");
const taskRoutes = require("./modules/tasks/routes/tasks.routes");
const workflowRoutes = require("./modules/workflow/routes/workflow.routes");

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

function createApp() {
  const app = express();

  app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/partners", partnerRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/workflow", workflowRoutes);

  app.get("/api/health", (_req, res) => {
    res
      .status(200)
      .json({ status: "ok", service: "backend", timestamp: new Date().toISOString() });
  });

  return app;
}

module.exports = { createApp };