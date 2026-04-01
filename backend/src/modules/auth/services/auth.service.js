const crypto = require("crypto");

const sessions = new Map();
const users = new Map();

const isProduction = process.env.NODE_ENV === "production";

const userRecord = ({ id, email, role, displayName, password }) => ({
  id,
  email,
  role,
  displayName,
  password,
  createdAt: new Date().toISOString(),
});

const seedUsers = () => {
  if (isProduction) {
    return;
  }

  const adminEmail = process.env.AUTH_ADMIN_EMAIL || "admin@devconlaguna.internal";
  const adminPassword = process.env.AUTH_ADMIN_PASSWORD || "changeme";
  const teamEmail = process.env.AUTH_TEAM_EMAIL || "team@devconlaguna.internal";
  const teamPassword = process.env.AUTH_TEAM_PASSWORD || "changeme";

  users.set(
    adminEmail,
    userRecord({
      id: "seed-admin-user",
      email: adminEmail,
      role: "admin",
      displayName: "VP Partnerships",
      password: adminPassword,
    }),
  );

  users.set(
    teamEmail,
    userRecord({
      id: "seed-team-user",
      email: teamEmail,
      role: "team_member",
      displayName: "Partnerships Team Member",
      password: teamPassword,
    }),
  );
};

seedUsers();

const safeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
  };
};

const validateCredentials = (email, password) => {
  const user = users.get(email);
  if (!user) {
    return null;
  }

  if (user.password !== password) {
    return null;
  }

  return safeUser(user);
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

const provisionUser = ({ email, password, role, displayName }) => {
  if (!email || !password || !role || !displayName) {
    throw new Error("email, password, role, and displayName are required");
  }

  if (!["admin", "team_member"].includes(role)) {
    throw new Error("role must be either admin or team_member");
  }

  if (users.has(email)) {
    throw new Error("user already exists");
  }

  const user = userRecord({
    id: crypto.randomUUID(),
    email,
    role,
    displayName,
    password,
  });

  users.set(email, user);
  return safeUser(user);
};

module.exports = {
  validateCredentials,
  createSession,
  findSession,
  revokeSession,
  provisionUser,
  isProduction,
};
