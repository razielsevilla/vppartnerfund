const dotenv = require("dotenv");
const { initializeDatabase, closeDatabase } = require("./shared/services/database.service");
const { createApp } = require("./app");
const logger = require("./shared/utils/logger");

dotenv.config();

const PORT = process.env.PORT || process.env.BACKEND_PORT || 4000;
const app = createApp();

async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      logger.info("server_started", { port: Number(PORT) });
    });

    // Handle graceful shutdown
    process.on("SIGTERM", async () => {
      logger.warn("server_sigterm", { message: "SIGTERM received, closing database connection" });
      await closeDatabase();
      process.exit(0);
    });

    process.on("uncaughtException", (error) => {
      logger.error("uncaught_exception", {
        message: error?.message || "Unknown uncaught exception",
        stack: error?.stack || null,
      });
    });

    process.on("unhandledRejection", (reason) => {
      logger.error("unhandled_rejection", {
        reason: reason instanceof Error ? reason.message : String(reason),
      });
    });
  } catch (err) {
    logger.error("server_start_failed", {
      message: err?.message || "Failed to start server",
      stack: err?.stack || null,
    });
    process.exit(1);
  }
}

startServer();
