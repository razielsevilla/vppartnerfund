const {
  validateCredentials,
  createSession,
  revokeSession,
  provisionUser,
  isProduction,
} = require("../services/auth.service");

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

  return res.status(200).json({ token, user });
};

const session = (req, res) => {
  return res.status(200).json({ user: req.user });
};

const logout = (req, res) => {
  revokeSession(req.authToken);
  return res.status(200).json({ message: "Logged out" });
};

const provision = (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

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
