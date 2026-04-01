const { createApp } = require("../src/app");
const { initializeDatabase } = require("../src/shared/services/database.service");

const app = createApp();
let initPromise;

module.exports = async (req, res) => {
  const requestPath = req.url || "";
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
    return res.status(500).json({
      error: "Backend initialization failed",
      detail: error?.message || "Unknown initialization error",
    });
  }
};
