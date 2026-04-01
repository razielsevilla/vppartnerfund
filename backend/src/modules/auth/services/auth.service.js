const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const sessions = new Map();
const users = new Map();

const isProduction = process.env.NODE_ENV === "production";
const bcryptRounds = Number(process.env.AUTH_BCRYPT_ROUNDS || 10);

const userRecord = ({ id, email, role, displayName, passwordHash }) => ({
  id,
  email,
  role,
  displayName,
  passwordHash,
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
      passwordHash: bcrypt.hashSync(adminPassword, bcryptRounds),
    }),
  );

  users.set(
    teamEmail,
    userRecord({
      id: "seed-team-user",
      email: teamEmail,
      role: "team_member",
      displayName: "Partnerships Team Member",
      passwordHash: bcrypt.hashSync(teamPassword, bcryptRounds),
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

const validateCredentials = async (email, password) => {
  const user = users.get(email);
  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
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

const provisionUser = async ({ email, password, role, displayName }) => {
  if (!email || !password || !role || !displayName) {
    throw new Error("email, password, role, and displayName are required");
  }

  if (!["admin", "team_member"].includes(role)) {
    throw new Error("role must be either admin or team_member");
  }

  if (users.has(email)) {
    throw new Error("user already exists");
  }

  const passwordHash = await bcrypt.hash(password, bcryptRounds);

  const user = userRecord({
    id: crypto.randomUUID(),
    email,
    role,
    displayName,
    passwordHash,
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
