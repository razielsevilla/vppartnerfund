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
    organizationName: "Artifact Partner",
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
  await db("artifact_records").del();
  await db("partners").del();
});

test("uploads artifact with validation and lists/retrieves it", async () => {
  const partner = await createPartner();

  const uploadResponse = await agent
    .post(`/api/vault/partners/${partner.id}/artifacts`)
    .attach("file", Buffer.from("sample artifact"), {
      filename: "brief.txt",
      contentType: "text/plain",
    });

  assert.equal(uploadResponse.status, 201);
  assert.equal(uploadResponse.body.artifact.partnerId, partner.id);
  assert.equal(uploadResponse.body.artifact.mimeType, "text/plain");

  const listResponse = await agent.get(`/api/vault/partners/${partner.id}/artifacts`);
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.artifacts.length, 1);

  const artifactId = listResponse.body.artifacts[0].id;
  const getResponse = await agent.get(`/api/vault/artifacts/${artifactId}`);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.headers["content-type"], "text/plain");
  assert.ok(getResponse.text.includes("sample artifact"));
});

test("rejects disallowed artifact file type", async () => {
  const partner = await createPartner();

  const uploadResponse = await agent
    .post(`/api/vault/partners/${partner.id}/artifacts`)
    .attach("file", Buffer.from("<binary>"), {
      filename: "payload.exe",
      contentType: "application/octet-stream",
    });

  assert.equal(uploadResponse.status, 400);
  assert.equal(uploadResponse.body.error.code, "ARTIFACT_FILE_TYPE_INVALID");
});

test("requires authentication for artifact retrieval", async () => {
  const partner = await createPartner();

  const uploadResponse = await agent
    .post(`/api/vault/partners/${partner.id}/artifacts`)
    .attach("file", Buffer.from("sample artifact"), {
      filename: "brief.txt",
      contentType: "text/plain",
    });
  assert.equal(uploadResponse.status, 201);

  const artifactId = uploadResponse.body.artifact.id;

  const noAuthResponse = await request(app).get(`/api/vault/artifacts/${artifactId}`);
  assert.equal(noAuthResponse.status, 401);
});
