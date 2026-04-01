const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

process.env.NODE_ENV = "test";

const { createApp } = require("../../app");
const { initializeDatabase, getDatabase, closeDatabase } = require("../../shared/services/database.service");

let app;
let agent;

test.before(async () => {
  await initializeDatabase();
  app = createApp();
  agent = request.agent(app);

  await agent.post("/api/auth/login").send({
    email: process.env.AUTH_ADMIN_EMAIL || "admin@devconlaguna.internal",
    password: process.env.AUTH_ADMIN_PASSWORD || "changeme",
  });
});

test.after(async () => {
  await closeDatabase();
});

test.beforeEach(async () => {
  const db = getDatabase();
  await db("division_members").del();
});

test("lists seeded team structure groups", async () => {
  const response = await agent.get("/api/team/structure");
  assert.equal(response.status, 200);
  assert.equal(Array.isArray(response.body.groups), true);
  assert.ok(response.body.groups.length >= 4);
});

test("creates, updates and deletes a team member", async () => {
  const createResponse = await agent.post("/api/team/groups/group_a/members").send({
    fullName: "Alex Rivera",
    officerType: "liaison",
    designation: "Corporate Liaison Officer",
    email: "alex@example.com",
  });

  assert.equal(createResponse.status, 201);
  const memberId = createResponse.body.member.id;

  const updateResponse = await agent.put(`/api/team/members/${memberId}`).send({
    status: "inactive",
    notes: "On semester break",
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.member.status, "inactive");

  const deleteResponse = await agent.delete(`/api/team/members/${memberId}`);
  assert.equal(deleteResponse.status, 204);
});

test("updates group staffing targets", async () => {
  const response = await agent.put("/api/team/groups/group_b").send({
    liaisonMin: 2,
    liaisonMax: 3,
    complianceMin: 2,
    complianceMax: 3,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.group.liaisonMin, 2);
  assert.equal(response.body.group.liaisonMax, 3);
  assert.equal(response.body.group.complianceMin, 2);
  assert.equal(response.body.group.complianceMax, 3);
});
