const {
  getPresetUser,
  validateCredentials,
  createSession,
  revokeSession,
} = require("../services/auth.service");

const login = (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (!validateCredentials(email, password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = getPresetUser();
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

module.exports = {
  login,
  session,
  logout,
};
