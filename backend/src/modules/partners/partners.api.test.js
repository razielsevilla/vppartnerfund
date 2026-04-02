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
  await db("settings_audit_logs").del();
  await db("workflow_snapshots").del();
  await db("artifact_records").del();
  await db("discovery_notes").del();
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

test("filters partners by workflow phase code", async () => {
  const leadPartner = await agent.post("/api/partners").send({
    organizationName: "Lead Filter Corp",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(leadPartner.status, 201);

  const prospectPartner = await agent.post("/api/partners").send({
    organizationName: "Prospecting Filter Corp",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_prospecting",
  });
  assert.equal(prospectPartner.status, 201);

  const filteredResponse = await agent.get("/api/partners?phaseCode=prospecting");
  assert.equal(filteredResponse.status, 200);
  assert.equal(filteredResponse.body.partners.length, 1);
  assert.equal(filteredResponse.body.partners[0].currentPhaseId, "phase_prospecting");
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

test("import mapping config endpoint returns configurable field map metadata", async () => {
  const response = await agent.get("/api/partners/import/mapping");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.fields));
  assert.ok(response.body.fields.some((field) => field.key === "organizationName" && field.required));
  assert.ok(Array.isArray(response.body.phaseOptions));
  assert.ok(response.body.phaseOptions.some((phase) => phase.id === "phase_lead"));
});

test("partner import supports dry-run validation and apply summary outcomes", async () => {
  const seedResponse = await agent.post("/api/partners").send({
    organizationName: "Import Existing Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(seedResponse.status, 201);

  const payload = {
    dryRun: true,
    mapping: {
      organizationName: "Organization Name",
      organizationType: "Type",
      industryNiche: "Industry",
      currentPhase: "Phase",
      impactTier: "Impact",
      location: "Location",
    },
    rows: [
      {
        "Organization Name": "Import Existing Partner",
        Type: "Corporate",
        Industry: "Technology",
        Phase: "lead",
        Impact: "major",
        Location: "Laguna",
      },
      {
        "Organization Name": "Import New Partner",
        Type: "Startup",
        Industry: "Education",
        Phase: "phase_prospecting",
        Impact: "standard",
        Location: "Cabuyao",
      },
      {
        "Organization Name": "",
        Type: "Government",
        Industry: "Public",
      },
    ],
  };

  const dryRunResponse = await agent.post("/api/partners/import").send(payload);
  assert.equal(dryRunResponse.status, 200);
  assert.equal(dryRunResponse.body.dryRun, true);
  assert.equal(dryRunResponse.body.summary.created, 1);
  assert.equal(dryRunResponse.body.summary.updated, 1);
  assert.equal(dryRunResponse.body.summary.failed, 1);

  const countAfterDryRun = await agent.get("/api/partners?status=all");
  assert.equal(countAfterDryRun.status, 200);
  assert.equal(countAfterDryRun.body.partners.length, 1);

  const applyResponse = await agent.post("/api/partners/import").send({ ...payload, dryRun: false });
  assert.equal(applyResponse.status, 200);
  assert.equal(applyResponse.body.dryRun, false);
  assert.equal(applyResponse.body.summary.created, 1);
  assert.equal(applyResponse.body.summary.updated, 1);
  assert.equal(applyResponse.body.summary.failed, 1);

  const listAfterApply = await agent.get("/api/partners?status=all");
  assert.equal(listAfterApply.status, 200);
  assert.equal(listAfterApply.body.partners.length, 2);
  assert.ok(
    listAfterApply.body.partners.some((partner) => partner.organizationName === "Import New Partner"),
  );
});

test("workflow phases are centrally available through config endpoint", async () => {
  const response = await agent.get("/api/workflow/config");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.phases));
  assert.ok(response.body.phases.length > 0);
  assert.ok(Array.isArray(response.body.transitionRules));
  assert.ok(response.body.transitionRules.length > 0);
});

test("settings master data can be updated safely and logs audit entries", async () => {
  const getResponse = await agent.get("/api/settings/master-data");
  assert.equal(getResponse.status, 200);
  assert.ok(Array.isArray(getResponse.body.workflowPhases));
  assert.ok(Array.isArray(getResponse.body.taxonomies.value_proposition));

  const phasesPayload = {
    phases: getResponse.body.workflowPhases.map((phase) => ({
      ...phase,
      name: phase.code === "lead" ? "Lead Intake" : phase.name,
    })),
  };
  const updatePhasesResponse = await agent.put("/api/settings/workflow-phases").send(phasesPayload);
  assert.equal(updatePhasesResponse.status, 200);
  assert.ok(
    updatePhasesResponse.body.workflowPhases.some(
      (phase) => phase.code === "lead" && phase.name === "Lead Intake",
    ),
  );

  const taxonomyPayload = {
    items: [
      { value: "brand_visibility", label: "Brand Visibility", sortOrder: 1, isActive: true },
      { value: "talent_pipeline", label: "Talent Pipeline", sortOrder: 2, isActive: true },
      { value: "market_expansion", label: "Market Expansion", sortOrder: 3, isActive: false },
    ],
  };
  const updateTaxonomyResponse = await agent
    .put("/api/settings/taxonomies/value_proposition")
    .send(taxonomyPayload);
  assert.equal(updateTaxonomyResponse.status, 200);

  const auditResponse = await agent.get("/api/settings/audit-log?limit=10");
  assert.equal(auditResponse.status, 200);
  assert.ok(Array.isArray(auditResponse.body.entries));
  assert.ok(auditResponse.body.entries.some((entry) => entry.domain === "workflow_phases"));
  assert.ok(auditResponse.body.entries.some((entry) => entry.domain === "taxonomy:value_proposition"));
});

test("invalid settings edits are blocked", async () => {
  const getResponse = await agent.get("/api/settings/master-data");
  assert.equal(getResponse.status, 200);

  const invalidPhasePayload = {
    phases: getResponse.body.workflowPhases.map((phase) => ({
      ...phase,
      isActive: false,
    })),
  };
  const invalidPhaseResponse = await agent.put("/api/settings/workflow-phases").send(invalidPhasePayload);
  assert.equal(invalidPhaseResponse.status, 400);
  assert.equal(invalidPhaseResponse.body.error.code, "SETTINGS_ARCHIVED_PHASE_PROTECTED");

  const invalidTaxonomyResponse = await agent.put("/api/settings/taxonomies/impact_tier").send({
    items: [{ value: "major", label: "Major", sortOrder: 1, isActive: true }],
  });
  assert.equal(invalidTaxonomyResponse.status, 400);
  assert.equal(invalidTaxonomyResponse.body.error.code, "SETTINGS_IMPACT_TIER_REQUIRED");
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

test("blocks transition when required artifacts are missing and allows once uploaded", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Artifact Guardrail Partner",
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

  const updateResponse = await agent.put(`/api/partners/${partnerId}`).send({
    lastContactDate: "2026-04-01",
    nextActionStep: "Prepare qualification packet",
  });
  assert.equal(updateResponse.status, 200);

  const toQualification = await agent
    .post(`/api/partners/${partnerId}/transition`)
    .send({ toPhaseId: "phase_qualification" });
  assert.equal(toQualification.status, 200);

  const blockedToProposal = await agent
    .post(`/api/partners/${partnerId}/transition`)
    .send({ toPhaseId: "phase_proposal" });
  assert.equal(blockedToProposal.status, 400);
  assert.equal(blockedToProposal.body.error.code, "WORKFLOW_ARTIFACT_REQUIREMENTS_NOT_MET");
  assert.ok(Array.isArray(blockedToProposal.body.error.details[0].requiredArtifacts));
  assert.equal(blockedToProposal.body.error.details[0].requiredArtifacts[0].documentType, "proposal");

  const uploadResponse = await agent
    .post(`/api/vault/partners/${partnerId}/artifacts`)
    .field("documentType", "proposal")
    .field("status", "active")
    .attach("file", Buffer.from("proposal doc"), {
      filename: "proposal.txt",
      contentType: "text/plain",
    });
  assert.equal(uploadResponse.status, 201);

  const allowedToProposal = await agent
    .post(`/api/partners/${partnerId}/transition`)
    .send({ toPhaseId: "phase_proposal", reason: "Proposal doc uploaded" });
  assert.equal(allowedToProposal.status, 200);
  assert.equal(allowedToProposal.body.partner.currentPhaseId, "phase_proposal");
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

test("timeline endpoint returns status changes with actor and previous/new values", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Timeline Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
    lastContactDate: "2026-04-01",
    nextActionStep: "Initial discovery",
  });
  assert.equal(createResponse.status, 201);

  const partnerId = createResponse.body.partner.id;

  const transitionResponse = await agent
    .post(`/api/partners/${partnerId}/transition`)
    .send({ toPhaseId: "phase_prospecting", reason: "Discovery complete" });
  assert.equal(transitionResponse.status, 200);

  const timelineResponse = await agent.get(`/api/partners/${partnerId}/timeline`);
  assert.equal(timelineResponse.status, 200);
  assert.ok(Array.isArray(timelineResponse.body.entries));
  assert.ok(timelineResponse.body.entries.length > 0);

  const statusEntry = timelineResponse.body.entries.find((entry) => entry.kind === "status_change");
  assert.ok(statusEntry);
  assert.equal(statusEntry.actorId, "seed-admin-user");
  assert.equal(statusEntry.previousValue.phaseId, "phase_lead");
  assert.equal(statusEntry.newValue.phaseId, "phase_prospecting");
  assert.ok(statusEntry.happenedAt);
});

test("timeline audit endpoint is read-only in standard routes", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Immutable Timeline Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(createResponse.status, 201);

  const partnerId = createResponse.body.partner.id;

  const mutateAttempt = await agent.post(`/api/partners/${partnerId}/timeline`).send({
    fake: true,
  });

  assert.ok([404, 405].includes(mutateAttempt.status));
});

test("qualification mapping supports multi-select potential and confirmed sets", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Qualification Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(createResponse.status, 201);

  const partnerId = createResponse.body.partner.id;

  const saveResponse = await agent.put(`/api/partners/${partnerId}/qualification`).send({
    durationCategory: "project_based",
    impactLevel: "high",
    functionalRole: "Strategic Sponsor",
    potentialValuePropositions: ["Brand Visibility", "Talent Pipeline", "Product Adoption"],
    confirmedValuePropositions: ["Brand Visibility"],
  });

  assert.equal(saveResponse.status, 200);
  assert.equal(saveResponse.body.qualification.durationCategory, "project_based");
  assert.equal(saveResponse.body.qualification.impactLevel, "high");
  assert.equal(saveResponse.body.qualification.potentialValuePropositions.length, 3);
  assert.equal(saveResponse.body.qualification.confirmedValuePropositions.length, 1);
});

test("qualification mapping persists and rehydrates on reload", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Reload Qualification Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(createResponse.status, 201);

  const partnerId = createResponse.body.partner.id;

  const firstSave = await agent.put(`/api/partners/${partnerId}/qualification`).send({
    durationCategory: "term_based",
    impactLevel: "transformational",
    functionalRole: "Innovation Partner",
    potentialValuePropositions: ["Research Collaboration", "Market Expansion"],
    confirmedValuePropositions: ["Research Collaboration"],
  });
  assert.equal(firstSave.status, 200);

  const reload = await agent.get(`/api/partners/${partnerId}/qualification`);
  assert.equal(reload.status, 200);
  assert.equal(reload.body.qualification.durationCategory, "term_based");
  assert.equal(reload.body.qualification.impactLevel, "transformational");
  assert.equal(reload.body.qualification.functionalRole, "Innovation Partner");
  assert.ok(reload.body.qualification.potentialValuePropositions.includes("Market Expansion"));
  assert.ok(reload.body.qualification.confirmedValuePropositions.includes("Research Collaboration"));
});

test("qualification mapping supports role packages and functional benefit packages", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Package Menu Partner",
    organizationType: "Tech Corporate",
    industryNiche: "Developer tools",
    currentPhaseId: "phase_lead",
  });
  assert.equal(createResponse.status, 201);

  const partnerId = createResponse.body.partner.id;

  const saveResponse = await agent.put(`/api/partners/${partnerId}/qualification`).send({
    durationCategory: "project_based",
    rolePackages: [
      { impactLevel: "standard", functionalRole: "Technology Partner" },
      { impactLevel: "major", functionalRole: "Mentorship Partner" },
      { impactLevel: "lead", functionalRole: "Knowledge Partner" },
    ],
    functionalBenefits: [
      "Direct Access to Tech Talent",
      "Talent Vetting and Mentorship",
      "Thought Leadership and Speaking Slots",
      "Up-Skilling Opportunities",
    ],
  });

  assert.equal(saveResponse.status, 200);
  assert.equal(saveResponse.body.qualification.rolePackages.length, 3);
  assert.equal(saveResponse.body.qualification.functionalBenefits.length, 4);
});

test("partner contacts can be added and listed", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Contact Partner",
    organizationType: "Tech Corporate",
    industryNiche: "Cloud solutions",
    currentPhaseId: "phase_lead",
  });
  assert.equal(createResponse.status, 201);

  const partnerId = createResponse.body.partner.id;

  const createContactResponse = await agent.post(`/api/partners/${partnerId}/contacts`).send({
    fullName: "Maria Santos",
    jobTitle: "Partnership Manager",
    email: "maria@example.com",
    phone: "+639171234567",
    linkUrl: "https://linkedin.com/in/maria-santos",
    isPrimary: true,
  });

  assert.equal(createContactResponse.status, 201);
  assert.equal(createContactResponse.body.contact.fullName, "Maria Santos");
  assert.equal(createContactResponse.body.contact.isPrimary, true);

  const listResponse = await agent.get(`/api/partners/${partnerId}/contacts`);
  assert.equal(listResponse.status, 200);
  assert.ok(Array.isArray(listResponse.body.contacts));
  assert.equal(listResponse.body.contacts.length, 1);
  assert.equal(listResponse.body.contacts[0].email, "maria@example.com");
});

test("workflow health metrics flag overdue next actions", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Overdue Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
    lastContactDate: "2025-12-01",
    nextActionStep: "Follow up with procurement",
  });
  assert.equal(createResponse.status, 201);

  const metricsResponse = await agent.get("/api/workflow/health/metrics");
  assert.equal(metricsResponse.status, 200);
  assert.ok(metricsResponse.body.summary.overdueNextActionCount >= 1);
  assert.ok(
    metricsResponse.body.overduePartners.some(
      (partner) => partner.organizationName === "Overdue Partner",
    ),
  );
});

test("stalled stage thresholds are configurable and reflected in metrics", async () => {
  const configResponse = await agent.get("/api/workflow/health/config");
  assert.equal(configResponse.status, 200);
  assert.ok(Array.isArray(configResponse.body.stageThresholds));

  const saveConfigResponse = await agent.put("/api/workflow/health/config").send({
    overdueNextActionDays: 10,
    stageThresholds: [
      { phaseId: "phase_lead", stallThresholdDays: 2 },
      { phaseId: "phase_prospecting", stallThresholdDays: 3 },
      { phaseId: "phase_qualification", stallThresholdDays: 4 },
      { phaseId: "phase_proposal", stallThresholdDays: 5 },
      { phaseId: "phase_negotiation", stallThresholdDays: 6 },
      { phaseId: "phase_won", stallThresholdDays: 7 },
    ],
  });
  assert.equal(saveConfigResponse.status, 200);
  assert.equal(saveConfigResponse.body.overdueNextActionDays, 10);

  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Stalled Prospect Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
    lastContactDate: "2026-01-01",
    nextActionStep: "Send deck",
  });
  assert.equal(createResponse.status, 201);
  const partnerId = createResponse.body.partner.id;

  const transitionResponse = await agent
    .post(`/api/partners/${partnerId}/transition`)
    .send({ toPhaseId: "phase_prospecting" });
  assert.equal(transitionResponse.status, 200);

  const db = getDatabase();
  await db("workflow_transitions")
    .where({ partner_id: partnerId, to_phase_id: "phase_prospecting" })
    .update({ changed_at: "2026-01-01T00:00:00.000Z" });

  const metricsResponse = await agent.get("/api/workflow/health/metrics");
  assert.equal(metricsResponse.status, 200);
  assert.ok(metricsResponse.body.summary.stalledPartnerCount >= 1);
  assert.ok(
    metricsResponse.body.stalledPartners.some(
      (partner) => partner.organizationName === "Stalled Prospect Partner",
    ),
  );
});

test("kpi metrics endpoint returns stage counts, conversion, and overdue actions", async () => {
  const seedPartners = [
    {
      organizationName: "Lead Alpha",
      currentPhaseId: "phase_lead",
      lastContactDate: "2026-01-01",
      nextActionStep: "Follow up call",
    },
    {
      organizationName: "Lead Beta",
      currentPhaseId: "phase_lead",
    },
    {
      organizationName: "Prospecting Org",
      currentPhaseId: "phase_prospecting",
    },
    {
      organizationName: "Qualification Org",
      currentPhaseId: "phase_qualification",
    },
    {
      organizationName: "Proposal Org",
      currentPhaseId: "phase_proposal",
    },
    {
      organizationName: "Negotiation Org",
      currentPhaseId: "phase_negotiation",
    },
    {
      organizationName: "Won Org",
      currentPhaseId: "phase_won",
    },
  ];

  for (const partner of seedPartners) {
    const createResponse = await agent.post("/api/partners").send({
      organizationName: partner.organizationName,
      organizationType: "Corporate",
      industryNiche: "Technology",
      currentPhaseId: partner.currentPhaseId,
      lastContactDate: partner.lastContactDate,
      nextActionStep: partner.nextActionStep,
    });
    assert.equal(createResponse.status, 201);
  }

  const metricsResponse = await agent.get("/api/workflow/kpi/metrics");
  assert.equal(metricsResponse.status, 200);

  const stageCountsByCode = new Map(
    metricsResponse.body.stageCounts.map((entry) => [entry.phaseCode, entry.count]),
  );

  assert.equal(metricsResponse.body.summary.totalActivePartners, 7);
  assert.equal(stageCountsByCode.get("lead"), 2);
  assert.equal(stageCountsByCode.get("prospecting"), 1);
  assert.equal(stageCountsByCode.get("qualification"), 1);
  assert.equal(stageCountsByCode.get("proposal"), 1);
  assert.equal(stageCountsByCode.get("negotiation"), 1);
  assert.equal(stageCountsByCode.get("won"), 1);

  assert.equal(metricsResponse.body.conversion.overallWinRatePct, 14.29);
  const leadToProspecting = metricsResponse.body.conversion.stageConversion.find(
    (entry) => entry.fromPhaseCode === "lead" && entry.toPhaseCode === "prospecting",
  );
  assert.ok(leadToProspecting);
  assert.equal(leadToProspecting.conversionRatePct, 50);

  assert.equal(metricsResponse.body.overdueActions.count, 1);
  assert.ok(
    metricsResponse.body.overdueActions.partners.some(
      (partner) => partner.organizationName === "Lead Alpha",
    ),
  );

  assert.equal(typeof metricsResponse.body.summary.responseTimeMs, "number");
  assert.ok(metricsResponse.body.summary.responseTimeMs >= 0);
  assert.ok(metricsResponse.body.summary.generatedAt);
});

test("coverage insights expose demand distribution and actionable gap drill-downs", async () => {
  const createAlpha = await agent.post("/api/partners").send({
    organizationName: "Coverage Alpha",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(createAlpha.status, 201);

  const createBeta = await agent.post("/api/partners").send({
    organizationName: "Coverage Beta",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_prospecting",
  });
  assert.equal(createBeta.status, 201);

  const alphaId = createAlpha.body.partner.id;
  const betaId = createBeta.body.partner.id;

  const saveAlphaQualification = await agent.put(`/api/partners/${alphaId}/qualification`).send({
    durationCategory: "project_based",
    impactLevel: "high",
    functionalRole: "Strategic Sponsor",
    potentialValuePropositions: ["Talent Pipeline", "Brand Visibility"],
    confirmedValuePropositions: ["Brand Visibility"],
  });
  assert.equal(saveAlphaQualification.status, 200);

  const saveBetaQualification = await agent.put(`/api/partners/${betaId}/qualification`).send({
    durationCategory: "term_based",
    impactLevel: "transformational",
    functionalRole: "Innovation Partner",
    potentialValuePropositions: ["Talent Pipeline"],
    confirmedValuePropositions: ["Talent Pipeline"],
  });
  assert.equal(saveBetaQualification.status, 200);

  const insightsResponse = await agent.get("/api/workflow/kpi/coverage-insights");
  assert.equal(insightsResponse.status, 200);
  assert.equal(typeof insightsResponse.body.summary.categoriesTracked, "number");
  assert.ok(Array.isArray(insightsResponse.body.demandDistribution));
  assert.ok(Array.isArray(insightsResponse.body.coverageGaps));

  const talentPipeline = insightsResponse.body.demandDistribution.find(
    (entry) => entry.category === "Talent Pipeline",
  );
  assert.ok(talentPipeline);
  assert.equal(talentPipeline.demandCount, 2);
  assert.equal(talentPipeline.confirmedCount, 1);
  assert.equal(talentPipeline.gapCount, 1);

  const gapPartners = await agent.get(
    "/api/partners?status=active&valueProp=Talent%20Pipeline&coverageState=gap",
  );
  assert.equal(gapPartners.status, 200);
  assert.equal(gapPartners.body.partners.length, 1);
  assert.equal(gapPartners.body.partners[0].organizationName, "Coverage Alpha");
});

test("workflow snapshots can be triggered and retrieved as timestamped history", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Snapshot Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(createResponse.status, 201);

  const weeklySnapshotResponse = await agent.post("/api/workflow/snapshots").send({
    periodType: "weekly",
  });
  assert.equal(weeklySnapshotResponse.status, 201);
  assert.equal(weeklySnapshotResponse.body.snapshot.periodType, "weekly");
  assert.ok(weeklySnapshotResponse.body.snapshot.generatedAt);
  assert.ok(weeklySnapshotResponse.body.snapshot.periodStart);
  assert.ok(weeklySnapshotResponse.body.snapshot.periodEnd);
  assert.ok(weeklySnapshotResponse.body.snapshot.metrics.kpi);
  assert.ok(weeklySnapshotResponse.body.snapshot.metrics.coverage);

  const monthlySnapshotResponse = await agent.post("/api/workflow/snapshots").send({
    periodType: "monthly",
  });
  assert.equal(monthlySnapshotResponse.status, 201);
  assert.equal(monthlySnapshotResponse.body.snapshot.periodType, "monthly");

  const historyResponse = await agent.get("/api/workflow/snapshots?limit=5");
  assert.equal(historyResponse.status, 200);
  assert.ok(Array.isArray(historyResponse.body.snapshots));
  assert.equal(historyResponse.body.snapshots.length, 2);
  assert.ok(historyResponse.body.snapshots[0].createdAt);
  assert.ok(historyResponse.body.snapshots[0].generatedAt);
  assert.ok(historyResponse.body.snapshots.some((entry) => entry.periodType === "weekly"));
  assert.ok(historyResponse.body.snapshots.some((entry) => entry.periodType === "monthly"));
});

test("discovery note templates are available during discovery sessions", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Template Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(createResponse.status, 201);

  const response = await agent.get(
    `/api/partners/${createResponse.body.partner.id}/discovery-notes/templates`,
  );
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.templates));
  assert.ok(response.body.templates.length >= 3);
  assert.ok(Array.isArray(response.body.templates[0].questions));
});

test("supports creating and editing guided and freeform discovery notes", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Discovery Notes Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(createResponse.status, 201);
  const partnerId = createResponse.body.partner.id;

  const createNoteResponse = await agent.post(`/api/partners/${partnerId}/discovery-notes`).send({
    templateId: "initial_discovery",
    templateName: "Initial Discovery",
    guidedAnswers: [
      {
        question: "What problem is the partner trying to solve?",
        answer: "They need better developer pipeline visibility.",
      },
    ],
    freeformText: "Partner is open to a pilot in the next quarter.",
  });
  assert.equal(createNoteResponse.status, 201);
  assert.equal(createNoteResponse.body.note.templateId, "initial_discovery");
  assert.equal(createNoteResponse.body.note.guidedAnswers.length, 1);

  const noteId = createNoteResponse.body.note.id;
  const updateResponse = await agent
    .put(`/api/partners/${partnerId}/discovery-notes/${noteId}`)
    .send({
      freeformText: "Pilot conversation moved to next month due to budget review.",
    });
  assert.equal(updateResponse.status, 200);
  assert.equal(
    updateResponse.body.note.freeformText,
    "Pilot conversation moved to next month due to budget review.",
  );

  const listResponse = await agent.get(`/api/partners/${partnerId}/discovery-notes`);
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.notes.length, 1);
  assert.equal(listResponse.body.notes[0].id, noteId);
});

test("discovery note activity appears in chronological partner timeline", async () => {
  const createResponse = await agent.post("/api/partners").send({
    organizationName: "Discovery Timeline Partner",
    organizationType: "Corporate",
    industryNiche: "Technology",
    currentPhaseId: "phase_lead",
  });
  assert.equal(createResponse.status, 201);
  const partnerId = createResponse.body.partner.id;

  const createNoteResponse = await agent.post(`/api/partners/${partnerId}/discovery-notes`).send({
    templateId: "value_alignment",
    guidedAnswers: [
      {
        question: "Which value propositions resonate most with the partner?",
        answer: "Community access and event activation",
      },
    ],
  });
  assert.equal(createNoteResponse.status, 201);

  const timelineResponse = await agent.get(`/api/partners/${partnerId}/timeline`);
  assert.equal(timelineResponse.status, 200);

  const noteEntry = timelineResponse.body.entries.find(
    (entry) => entry.kind === "activity" && entry.actionType === "discovery_note_created",
  );
  assert.ok(noteEntry);
  assert.equal(noteEntry.actorId, "seed-admin-user");
});