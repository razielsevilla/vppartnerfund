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
router.post("/", createPartnerHandler);
router.get("/:partnerId", getPartnerHandler);
router.get("/:partnerId/qualification", getPartnerQualificationHandler);
router.get("/:partnerId/timeline", getPartnerTimelineHandler);
router.get("/:partnerId/discovery-notes/templates", listDiscoveryNoteTemplatesHandler);
router.get("/:partnerId/discovery-notes", listDiscoveryNotesHandler);
router.post("/:partnerId/discovery-notes", createDiscoveryNoteHandler);
router.put("/:partnerId/discovery-notes/:noteId", updateDiscoveryNoteHandler);
router.put("/:partnerId/qualification", upsertPartnerQualificationHandler);
router.put("/:partnerId", updatePartnerHandler);
router.post("/:partnerId/transition", transitionPartnerHandler);
router.post("/:partnerId/archive", archivePartnerHandler);

module.exports = router;