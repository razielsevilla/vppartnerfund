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

test("workflow phases are centrally available through config endpoint", async () => {
  const response = await agent.get("/api/workflow/config");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.phases));
  assert.ok(response.body.phases.length > 0);
  assert.ok(Array.isArray(response.body.transitionRules));
  assert.ok(response.body.transitionRules.length > 0);
});

test("blocks invalid workflow transition with clear allowed targets", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Phase Test Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(createResponse.status, 201);

  const transitionResponse = await agent
    .post(`/api/partners/${createResponse.body.partner.id}/transition`)
    .send({ toPhaseId: "phase_proposal", reason: "Trying to skip phases" });

  assert.equal(transitionResponse.status, 400);
  assert.equal(transitionResponse.body.error.code, "WORKFLOW_INVALID_TRANSITION");
  assert.ok(Array.isArray(transitionResponse.body.error.details[0].allowedToPhaseIds));
  assert.ok(transitionResponse.body.error.details[0].allowedToPhaseIds.includes("phase_prospecting"));
});

test("enforces required fields for transition rules", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Rule Gate Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(createResponse.status, 201);

  const partnerId = createResponse.body.partner.id;

  const toProspecting = await agent
    .post(`/api/partners/${partnerId}/transition`)
    .send({ toPhaseId: "phase_prospecting" });
  assert.equal(toProspecting.status, 200);

  const blockedToQualification = await agent
    .post(`/api/partners/${partnerId}/transition`)
    .send({ toPhaseId: "phase_qualification" });
  assert.equal(blockedToQualification.status, 400);
  assert.equal(blockedToQualification.body.error.code, "WORKFLOW_REQUIREMENTS_NOT_MET");
  assert.ok(blockedToQualification.body.error.details[0].requiredFields.includes("lastContactDate"));
  assert.ok(blockedToQualification.body.error.details[0].requiredFields.includes("nextActionStep"));

  const updateResponse = await agent.put(`/api/partners/${partnerId}`).send({
    lastContactDate: "2026-04-01",
    nextActionStep: "Schedule qualification call",
  });
  assert.equal(updateResponse.status, 200);

  const allowedToQualification = await agent
    .post(`/api/partners/${partnerId}/transition`)
    .send({ toPhaseId: "phase_qualification", reason: "Fields now complete" });
  assert.equal(allowedToQualification.status, 200);
  assert.equal(allowedToQualification.body.partner.currentPhaseId, "phase_qualification");
});

test("blocks phase change through generic partner update endpoint", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Direct Update Block Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(createResponse.status, 201);

  const updateResponse = await agent.put(`/api/partners/${createResponse.body.partner.id}`).send({
    currentPhaseId: "phase_prospecting",
  });

  assert.equal(updateResponse.status, 400);
  assert.equal(updateResponse.body.error.code, "PARTNER_PHASE_UPDATE_BLOCKED");
});