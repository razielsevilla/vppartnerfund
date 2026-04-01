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
  await db("partners").del();
});

test("returns structured validation errors for invalid create payload", async () => {
  const response = await agent.post("/api/partners").send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "PARTNER_VALIDATION_FAILED");
  assert.equal(Array.isArray(response.body.error.details), true);
  assert.ok(response.body.error.details.length > 0);
});

test("archives a partner and excludes it from default active list", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Acme Corp",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
    location: "Laguna",
    impactTier: "major",
  });

  assert.equal(createResponse.status, 201);
  const partnerId = createResponse.body.partner.id;

  const archiveResponse = await agent.post(`/api/partners/${partnerId}/archive`).send({});
  assert.equal(archiveResponse.status, 200);
  assert.ok(archiveResponse.body.partner.archivedAt);

  const activeListResponse = await agent.get("/api/partners");
  assert.equal(activeListResponse.status, 200);
  assert.equal(activeListResponse.body.partners.length, 0);

  const archivedListResponse = await agent.get("/api/partners?status=archived");
  assert.equal(archivedListResponse.status, 200);
  assert.equal(archivedListResponse.body.partners.length, 1);
  assert.equal(archivedListResponse.body.partners[0].id, partnerId);
});

test("blocks create when similar-name duplicate is detected", async () => {
  const firstCreate = await agent.post("/api/partners").send({
    organizationName: "Acme Corporation",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(firstCreate.status, 201);

  const duplicateCreate = await agent.post("/api/partners").send({
    organizationName: "ACME Corp",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });

  assert.equal(duplicateCreate.status, 409);
  assert.equal(duplicateCreate.body.error.code, "PARTNER_DUPLICATE_DETECTED");
  assert.ok(Array.isArray(duplicateCreate.body.error.details));
  assert.ok(duplicateCreate.body.error.details[0].canConfirmDuplicate);
  assert.ok(Array.isArray(duplicateCreate.body.error.details[0].candidates));
  assert.ok(duplicateCreate.body.error.details[0].candidates.length > 0);
});

test("allows intentional duplicate when confirmDuplicate is true", async () => {
  const firstCreate = await agent.post("/api/partners").send({
    organizationName: "Future Labs",
    organizationType: "Startup",
    industryNiche: "Education",
    currentPhaseId: "phase_lead",
  });
  assert.equal(firstCreate.status, 201);

  const confirmCreate = await agent.post("/api/partners").send({
    organizationName: "Future Labs",
    organizationType: "Startup",
    industryNiche: "Education",
    currentPhaseId: "phase_lead",
    confirmDuplicate: true,
  });

  assert.equal(confirmCreate.status, 201);

  const listResponse = await agent.get("/api/partners?status=all");
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.partners.length, 2);
});

test("does not block distinct names that are not similar", async () => {
  const firstCreate = await agent.post("/api/partners").send({
    organizationName: "Northwind Cooperative",
    organizationType: "NGO",
    industryNiche: "Environment",
    currentPhaseId: "phase_lead",
  });
  assert.equal(firstCreate.status, 201);

  const secondCreate = await agent.post("/api/partners").send({
    organizationName: "Blue Harbor Ventures",
    organizationType: "Corporate",
    industryNiche: "Logistics",
    currentPhaseId: "phase_lead",
  });
  assert.equal(secondCreate.status, 201);
});