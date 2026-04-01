const express = require("express");
const { requireAuth, requireRole } = require("../../../shared/middleware/auth.middleware");
const {
  createPartnerHandler,
  listPartnersHandler,
  getPartnerImportMappingHandler,
  importPartnersHandler,
  getPartnerHandler,
  getPartnerQualificationHandler,
  getPartnerTimelineHandler,
  upsertPartnerQualificationHandler,
  listDiscoveryNoteTemplatesHandler,
  listDiscoveryNotesHandler,
  createDiscoveryNoteHandler,
  updateDiscoveryNoteHandler,
  updatePartnerHandler,
  archivePartnerHandler,
  transitionPartnerHandler,
} = require("../controllers/partners.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", listPartnersHandler);
router.get("/import/mapping", getPartnerImportMappingHandler);
router.post("/import", requireRole(["admin"]), importPartnersHandler);
router.post("/", requireRole(["admin", "team_member"]), createPartnerHandler);
router.get("/:partnerId", getPartnerHandler);
router.get("/:partnerId/qualification", getPartnerQualificationHandler);
router.get("/:partnerId/timeline", getPartnerTimelineHandler);
router.get("/:partnerId/discovery-notes/templates", listDiscoveryNoteTemplatesHandler);
router.get("/:partnerId/discovery-notes", listDiscoveryNotesHandler);
router.post("/:partnerId/discovery-notes", requireRole(["admin", "team_member"]), createDiscoveryNoteHandler);
router.put("/:partnerId/discovery-notes/:noteId", requireRole(["admin", "team_member"]), updateDiscoveryNoteHandler);
router.put("/:partnerId/qualification", requireRole(["admin", "team_member"]), upsertPartnerQualificationHandler);
router.put("/:partnerId", requireRole(["admin", "team_member"]), updatePartnerHandler);
router.post("/:partnerId/transition", requireRole(["admin", "team_member"]), transitionPartnerHandler);
router.post("/:partnerId/archive", requireRole(["admin", "team_member"]), archivePartnerHandler);

module.exports = router;