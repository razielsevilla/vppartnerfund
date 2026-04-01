const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const authRoutes = require("./modules/auth/routes/auth.routes");
const { initializeDatabase, closeDatabase } = require("./shared/services/database.service");

dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "backend", timestamp: new Date().toISOString() });
});

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
