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
    .field("documentType", "proposal")
    .field("status", "pending_review")
    .attach("file", Buffer.from("sample artifact"), {
      filename: "brief.txt",
      contentType: "text/plain",
    });

  assert.equal(uploadResponse.status, 201);
  assert.equal(uploadResponse.body.artifact.partnerId, partner.id);
  assert.equal(uploadResponse.body.artifact.mimeType, "text/plain");
  assert.equal(uploadResponse.body.artifact.documentType, "proposal");
  assert.equal(uploadResponse.body.artifact.status, "pending_review");
  assert.equal(uploadResponse.body.artifact.versionNumber, 1);

  const listResponse = await agent.get(`/api/vault/partners/${partner.id}/artifacts`);
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.artifacts.length, 1);

  const artifactId = listResponse.body.artifacts[0].id;
  const getResponse = await agent.get(`/api/vault/artifacts/${artifactId}`);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.headers["content-type"], "text/plain");
  assert.ok(getResponse.text.includes("sample artifact"));
});

test("new uploads create incremented version for the same document type", async () => {
  const partner = await createPartner();

  const first = await agent
    .post(`/api/vault/partners/${partner.id}/artifacts`)
    .field("documentType", "mou")
    .attach("file", Buffer.from("version 1"), {
      filename: "mou-v1.txt",
      contentType: "text/plain",
    });
  assert.equal(first.status, 201);
  assert.equal(first.body.artifact.versionNumber, 1);

  const second = await agent
    .post(`/api/vault/partners/${partner.id}/artifacts`)
    .field("documentType", "mou")
    .attach("file", Buffer.from("version 2"), {
      filename: "mou-v2.txt",
      contentType: "text/plain",
    });
  assert.equal(second.status, 201);
  assert.equal(second.body.artifact.versionNumber, 2);

  const listResponse = await agent.get(`/api/vault/partners/${partner.id}/artifacts`);
  assert.equal(listResponse.status, 200);

  const mouArtifacts = listResponse.body.artifacts.filter((item) => item.documentType === "mou");
  assert.equal(mouArtifacts.length, 2);
  assert.equal(mouArtifacts[0].versionNumber, 2);
  assert.equal(mouArtifacts[1].versionNumber, 1);
});

test("artifact status can be updated and tracked", async () => {
  const partner = await createPartner();

  const uploadResponse = await agent
    .post(`/api/vault/partners/${partner.id}/artifacts`)
    .field("documentType", "contract")
    .attach("file", Buffer.from("contract"), {
      filename: "contract.txt",
      contentType: "text/plain",
    });
  assert.equal(uploadResponse.status, 201);

  const artifactId = uploadResponse.body.artifact.id;
  const updateResponse = await agent
    .put(`/api/vault/artifacts/${artifactId}/status`)
    .send({ status: "archived" });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.artifact.status, "archived");
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
