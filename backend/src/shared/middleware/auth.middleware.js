const { findSession } = require("../../modules/auth/services/auth.service");

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "vp_partner_fund_session";

const getBearerToken = (authHeader) => {
  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const requireAuth = (req, res, next) => {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME] || null;
  const token = cookieToken || getBearerToken(req.headers.authorization);
  const session = findSession(token);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.authToken = token;
  req.user = session.user;
  return next();
};

const requireRole = (allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return next();
};

module.exports = {
  requireAuth,
  requireRole,
  getBearerToken,
};
