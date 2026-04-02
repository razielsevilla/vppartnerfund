const {
  validateCredentials,
  createSession,
  revokeSession,
  provisionUser,
  listCredentialOwners,
  isProduction,
} = require("../services/auth.service");
const { logFailedLoginEvent } = require("../../../shared/utils/auth-audit-log");

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "vp_partner_fund_session";
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 8);

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_TTL_MS,
};

const login = async (req, res) => {
  const { email, password } = req.body || {};
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";

  if (!email || !password) {
    logFailedLoginEvent({ email: email || "unknown", ip, reason: "missing_credentials" });
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await validateCredentials(email, password);
  if (!user) {
    logFailedLoginEvent({ email, ip, reason: "invalid_credentials" });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = createSession(user);
  console.log(`[AuthDebug] Logged in user ${user.id}, token generated.`);
  
  // Vercel: Always use secure cookies in production (HTTPS)
  const isVercel = Boolean(process.env.VERCEL);
  const options = {
    ...cookieOptions,
    secure: isVercel || isProduction,
    sameSite: "lax", // 'Lax' is required for CSRF protection and works well within .vercel.app
  };

  res.cookie(SESSION_COOKIE_NAME, token, options);
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

const provision = async (req, res) => {
  if (isProduction) {
    return res.status(400).json({
      error:
        "Provisioning is disabled in production runtime. Use documented production provisioning process.",
    });
  }

  try {
    const user = await provisionUser(req.body || {});
    return res.status(201).json({ user });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const listAccounts = async (_req, res) => {
  const accounts = await listCredentialOwners();
  return res.status(200).json({ accounts });
};

module.exports = {
  login,
  session,
  logout,
  provision,
  listAccounts,
};
