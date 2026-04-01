const express = require("express");
const rateLimit = require("express-rate-limit");
const { login, session, logout, provision, listAccounts } = require("../controllers/auth.controller");
const { requireAuth, requireRole } = require("../../../shared/middleware/auth.middleware");
const { ROLE_CODES } = require("../../../shared/constants/roles");

const router = express.Router();

const loginLimiter = rateLimit({
	windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
	max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 5),
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: "Too many login attempts. Try again later." },
});

router.post("/login", loginLimiter, login);
router.get("/session", requireAuth, session);
router.post("/logout", requireAuth, logout);
router.post("/provision", requireAuth, requireRole([ROLE_CODES.VP_HEAD]), provision);
router.get("/accounts", requireAuth, requireRole([ROLE_CODES.VP_HEAD]), listAccounts);

module.exports = router;
