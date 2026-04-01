const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
const authRoutes = require("./modules/auth/routes/auth.routes");
const partnerRoutes = require("./modules/partners/routes/partners.routes");
const taskRoutes = require("./modules/tasks/routes/tasks.routes");
const vaultRoutes = require("./modules/vault/routes/vault.routes");
const workflowRoutes = require("./modules/workflow/routes/workflow.routes");
const settingsRoutes = require("./modules/settings/routes/settings.routes");
const teamRoutes = require("./modules/team/routes/team.routes");
const {
  attachRequestContext,
  notFoundHandler,
  errorHandler,
} = require("./shared/middleware/request-logging.middleware");

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
  const hasFrontendDist = fs.existsSync(frontendDistPath);

  app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(attachRequestContext);

  app.use("/api/auth", authRoutes);
  app.use("/api/partners", partnerRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/vault", vaultRoutes);
  app.use("/api/workflow", workflowRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/team", teamRoutes);

  app.get("/api/health", (_req, res) => {
    res
      .status(200)
      .json({ status: "ok", service: "backend", timestamp: new Date().toISOString() });
  });

  if (isProduction && hasFrontendDist) {
    app.use(express.static(frontendDistPath));
    app.get(/^(?!\/api\/).*/, (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }

      return res.sendFile(path.join(frontendDistPath, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };