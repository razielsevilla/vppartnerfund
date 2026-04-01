const express = require("express");
const { login, session, logout, provision } = require("../controllers/auth.controller");
const { requireAuth, requireRole } = require("../../../shared/middleware/auth.middleware");

const router = express.Router();

router.post("/login", login);
router.get("/session", requireAuth, session);
router.post("/logout", requireAuth, logout);
router.post("/provision", requireAuth, requireRole(["admin"]), provision);

module.exports = router;
