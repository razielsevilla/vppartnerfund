const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { getDatabase } = require("../../../shared/services/database.service");
const { ALL_ROLE_CODES } = require("../../../shared/constants/roles");

const sessions = new Map();

const isProduction = process.env.NODE_ENV === "production";
const bcryptRounds = Number(process.env.AUTH_BCRYPT_ROUNDS || 10);

const safeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    lastLoginAt: user.lastLoginAt || null,
  };
};

const validateCredentials = async (email, password) => {
  const db = getDatabase();
  const matchingAccounts = await db("users")
    .join("roles", "roles.id", "users.role_id")
    .select(
      "users.id",
      "users.email",
      "users.full_name as displayName",
      "users.password_hash as passwordHash",
      "users.last_login_at as lastLoginAt",
      "users.is_active as isActive",
      "roles.code as role",
    )
    .whereRaw("LOWER(users.email) = LOWER(?)", [email]);

  if (!matchingAccounts.length) {
    return null;
  }

  for (const account of matchingAccounts) {
    if (!account.isActive) {
      continue;
    }

    const passwordMatches = await bcrypt.compare(password, account.passwordHash);
    if (!passwordMatches) {
      continue;
    }

    const nowIso = new Date().toISOString();
    await db("users").where({ id: account.id }).update({
      last_login_at: nowIso,
      updated_at: nowIso,
    });

    return safeUser({
      ...account,
      lastLoginAt: nowIso,
    });
  }

  return null;
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

  if (!ALL_ROLE_CODES.includes(role)) {
    throw new Error(`role must be one of: ${ALL_ROLE_CODES.join(", ")}`);
  }

  const db = getDatabase();
  const roleRow = await db("roles").select("id").where({ code: role }).first();
  if (!roleRow) {
    throw new Error("role not configured in database");
  }

  const passwordHash = await bcrypt.hash(password, bcryptRounds);
  const nowIso = new Date().toISOString();

  const user = {
    id: crypto.randomUUID(),
    role_id: roleRow.id,
    full_name: displayName,
    email,
    password_hash: passwordHash,
    is_active: true,
    must_reset_password: false,
    created_at: nowIso,
    updated_at: nowIso,
    last_login_at: null,
  };

  await db("users").insert(user);

  return safeUser({
    id: user.id,
    email: user.email,
    role,
    displayName,
    lastLoginAt: null,
  });
};

const listCredentialOwners = async () => {
  const db = getDatabase();
  const rows = await db("users")
    .join("roles", "roles.id", "users.role_id")
    .select(
      "users.id",
      "users.full_name as displayName",
      "users.email",
      "users.last_login_at as lastLoginAt",
      "users.is_active as isActive",
      "users.created_at as createdAt",
      "roles.code as role",
      "roles.name as roleName",
    )
    .orderBy("roles.code", "asc")
    .orderBy("users.full_name", "asc");

  return rows;
};

module.exports = {
  validateCredentials,
  createSession,
  findSession,
  revokeSession,
  provisionUser,
  listCredentialOwners,
  isProduction,
};
