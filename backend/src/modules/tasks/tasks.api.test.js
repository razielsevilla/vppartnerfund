const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

process.env.NODE_ENV = "test";

const { createApp } = require("../../app");
const { initializeDatabase, getDatabase, closeDatabase } = require("../../shared/services/database.service");

let app;
let agent;

async function createPartner() {
  const response = await agent.post("/api/partners").send({
    organizationName: "Task Link Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(response.status, 201);
  return response.body.partner;
}

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
  await db("tasks").del();
  await db("partners").del();
});

test("returns validation errors for invalid task create payload", async () => {
  const response = await agent.post("/api/tasks").send({});
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "TASK_VALIDATION_FAILED");
});

test("creates, reads, updates, lists, and deletes tasks linked to partner and workflow stage", async () => {
  const partner = await createPartner();

  const createResponse = await agent.post("/api/tasks").send({
    title: "Prepare proposal draft",
    description: "Draft scope and budget",
    ownerId: "seed-admin-user",
    partnerId: partner.id,
    workflowPhaseId: "phase_lead",
    dueDate: "2026-05-01",
    priority: "high",
    status: "open",
  });
  assert.equal(createResponse.status, 201);
  const taskId = createResponse.body.task.id;

  const getResponse = await agent.get(`/api/tasks/${taskId}`);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.task.partnerId, partner.id);
  assert.equal(getResponse.body.task.workflowPhaseId, "phase_lead");

  const listResponse = await agent.get(`/api/tasks?partnerId=${partner.id}`);
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.tasks.length, 1);

  const updateResponse = await agent.put(`/api/tasks/${taskId}`).send({
    status: "done",
    workflowPhaseId: "phase_prospecting",
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.task.status, "done");
  assert.equal(updateResponse.body.task.workflowPhaseId, "phase_prospecting");
  assert.ok(updateResponse.body.task.completedAt);

  const deleteResponse = await agent.delete(`/api/tasks/${taskId}`);
  assert.equal(deleteResponse.status, 204);

  const afterDelete = await agent.get(`/api/tasks/${taskId}`);
  assert.equal(afterDelete.status, 404);
});

test("rejects create when linked references are invalid", async () => {
  const response = await agent.post("/api/tasks").send({
    title: "Follow-up call",
    ownerId: "missing-user",
    partnerId: "missing-partner",
    workflowPhaseId: "missing-phase",
    dueDate: "2026-05-01",
    priority: "medium",
    status: "open",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "TASK_INVALID_REFERENCE");
});