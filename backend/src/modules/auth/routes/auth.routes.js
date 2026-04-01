const express = require("express");
const { login, session, logout } = require("../controllers/auth.controller");
const { requireAuth } = require("../../../shared/middleware/auth.middleware");

const router = express.Router();

router.post("/login", login);
router.get("/session", requireAuth, session);
router.post("/logout", requireAuth, logout);

module.exports = router;
