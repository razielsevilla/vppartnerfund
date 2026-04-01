const {
  validateCredentials,
  createSession,
  revokeSession,
  provisionUser,
  isProduction,
} = require("../services/auth.service");

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "vp_partner_fund_session";
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 8);

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_TTL_MS,
};

const login = (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = validateCredentials(email, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = createSession(user);
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions);

  return res.status(200).json({ user });
};

const session = (req, res) => {
  return res.status(200).json({ user: req.user });
};

const logout = (req, res) => {
  revokeSession(req.authToken);
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });
  return res.status(200).json({ message: "Logged out" });
};

const provision = (req, res) => {
  if (isProduction) {
    return res.status(400).json({
      error:
        "Provisioning is disabled in production runtime. Use documented production provisioning process.",
    });
  }

  try {
    const user = provisionUser(req.body || {});
    return res.status(201).json({ user });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  login,
  session,
  logout,
  provision,
};
