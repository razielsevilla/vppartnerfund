const { createApp } = require("../src/app");
const { initializeDatabase } = require("../src/shared/services/database.service");

const app = createApp();
let initPromise;

module.exports = async (req, res) => {
  const requestPath = req.url || "";
  const method = (req.method || "GET").toUpperCase();

  // Let Express CORS middleware handle preflight without requiring DB availability.
  if (method === "OPTIONS") {
    return app(req, res);
  }

  if (requestPath === "/api/health" || requestPath.startsWith("/api/health?")) {
    return app(req, res);
  }

  try {
    if (!initPromise) {
      initPromise = initializeDatabase();
    }

    await initPromise;
    return app(req, res);
  } catch (error) {
    initPromise = undefined;

    // Avoid opaque browser CORS errors when initialization fails before routing.
    const origin = req.headers?.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    return res.status(500).json({
      error: "Backend initialization failed",
      detail: error?.message || "Unknown initialization error",
    });
  }
};
