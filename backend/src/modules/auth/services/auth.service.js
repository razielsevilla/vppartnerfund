const crypto = require("crypto");

const sessions = new Map();

const getPresetUser = () => {
  const email = process.env.AUTH_ADMIN_EMAIL || "admin@devconlaguna.internal";
  return {
    id: "admin-user",
    email,
    role: "admin",
    displayName: "VP Partnerships",
  };
};

const validateCredentials = (email, password) => {
  const presetEmail = process.env.AUTH_ADMIN_EMAIL || "admin@devconlaguna.internal";
  const presetPassword = process.env.AUTH_ADMIN_PASSWORD || "changeme";
  return email === presetEmail && password === presetPassword;
};

const createSession = (user) => {
  const token = crypto.randomUUID();
  sessions.set(token, {
    user,
    createdAt: new Date().toISOString(),
  });
  return token;
};

const findSession = (token) => {
  if (!token) {
    return null;
  }
  return sessions.get(token) || null;
};

const revokeSession = (token) => {
  if (!token) {
    return false;
  }
  return sessions.delete(token);
};

module.exports = {
  getPresetUser,
  validateCredentials,
  createSession,
  findSession,
  revokeSession,
};
