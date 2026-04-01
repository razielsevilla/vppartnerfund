const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

process.env.NODE_ENV = "test";

const { createApp } = require("../../app");
const { initializeDatabase, closeDatabase } = require("../../shared/services/database.service");

let app;

const defaultVpEmail = process.env.AUTH_VP_EMAIL || process.env.AUTH_ADMIN_EMAIL || "admin@devconlaguna.internal";
const defaultVpPassword = process.env.AUTH_VP_PASSWORD || process.env.AUTH_ADMIN_PASSWORD || "changeme";
const liaisonEmail = process.env.AUTH_LIAISON_EMAIL || process.env.AUTH_TEAM_EMAIL || "team@devconlaguna.internal";
const complianceEmail = process.env.AUTH_COMPLIANCE_EMAIL || liaisonEmail;
const liaisonPassword = process.env.AUTH_LIAISON_PASSWORD || process.env.AUTH_TEAM_PASSWORD || "changeme";
const compliancePassword = process.env.AUTH_COMPLIANCE_PASSWORD || "changeme-compliance";

test.before(async () => {
  await initializeDatabase();
  app = createApp();
});

test.after(async () => {
  await closeDatabase();
});

test("authenticates individual users under role mailbox credentials", async () => {
  const liaisonAgent = request.agent(app);
  const liaisonResponse = await liaisonAgent.post("/api/auth/login").send({
    email: liaisonEmail,
    password: liaisonPassword,
  });

  assert.equal(liaisonResponse.status, 200);
  assert.equal(liaisonResponse.body.user.role, "liaison_officer");

  const complianceAgent = request.agent(app);
  const complianceResponse = await complianceAgent.post("/api/auth/login").send({
    email: complianceEmail,
    password: compliancePassword,
  });

  assert.equal(complianceResponse.status, 200);
  assert.equal(complianceResponse.body.user.role, "compliance_officer");
});

test("allows VP head to view credential ownership records", async () => {
  const vpAgent = request.agent(app);
  const loginResponse = await vpAgent.post("/api/auth/login").send({
    email: defaultVpEmail,
    password: defaultVpPassword,
  });

  assert.equal(loginResponse.status, 200);

  const accountsResponse = await vpAgent.get("/api/auth/accounts");

  assert.equal(accountsResponse.status, 200);
  assert.ok(Array.isArray(accountsResponse.body.accounts));
  assert.ok(accountsResponse.body.accounts.length >= 4);
});

test("forbids non-vp users from credential ownership records", async () => {
  const liaisonAgent = request.agent(app);
  const loginResponse = await liaisonAgent.post("/api/auth/login").send({
    email: liaisonEmail,
    password: liaisonPassword,
  });

  assert.equal(loginResponse.status, 200);

  const accountsResponse = await liaisonAgent.get("/api/auth/accounts");

  assert.equal(accountsResponse.status, 403);
});
