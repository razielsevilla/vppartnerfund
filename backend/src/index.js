const dotenv = require("dotenv");
const { initializeDatabase, closeDatabase } = require("./shared/services/database.service");
const { createApp } = require("./app");

dotenv.config();

const PORT = process.env.BACKEND_PORT || 4000;
const app = createApp();

async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend running on http://localhost:${PORT}`);
    });

    // Handle graceful shutdown
    process.on("SIGTERM", async () => {
      // eslint-disable-next-line no-console
      console.log("SIGTERM received, closing database connection");
      await closeDatabase();
      process.exit(0);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
