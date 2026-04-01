const { findSession } = require("../../modules/auth/services/auth.service");

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
  const token = getBearerToken(req.headers.authorization);
  const session = findSession(token);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.authToken = token;
  req.user = session.user;
  return next();
};

module.exports = {
  requireAuth,
  getBearerToken,
};
