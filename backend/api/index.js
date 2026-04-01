const { createApp } = require("../src/app");
const { initializeDatabase } = require("../src/shared/services/database.service");

const app = createApp();
let initPromise;

module.exports = async (req, res) => {
  if (!initPromise) {
    initPromise = initializeDatabase();
  }

  await initPromise;
  return app(req, res);
};
