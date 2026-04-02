const express = require("express");
const { requireAuth, requireRole } = require("../../../shared/middleware/auth.middleware");
const { ALL_ROLE_CODES, ROLE_CODES } = require("../../../shared/constants/roles");
const {
  createPartnerHandler,
  listPartnersHandler,
  getPartnerImportMappingHandler,
  importPartnersHandler,
  getPartnerHandler,
  getPartnerQualificationHandler,
  listPartnerContactsHandler,
  createPartnerContactHandler,
  updatePartnerContactHandler,
  deletePartnerContactHandler,
  getPartnerTimelineHandler,
  upsertPartnerQualificationHandler,
  listDiscoveryNoteTemplatesHandler,
  listDiscoveryNotesHandler,
  createDiscoveryNoteHandler,
  updateDiscoveryNoteHandler,
  updatePartnerHandler,
  archivePartnerHandler,
  deletePartnerHandler,
  transitionPartnerHandler,
} = require("../controllers/partners.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", listPartnersHandler);
router.get("/import/mapping", getPartnerImportMappingHandler);
router.post("/import", requireRole([ROLE_CODES.VP_HEAD]), importPartnersHandler);
router.post("/", requireRole(ALL_ROLE_CODES), createPartnerHandler);
router.get("/:partnerId", getPartnerHandler);
router.get("/:partnerId/qualification", getPartnerQualificationHandler);
router.get("/:partnerId/contacts", listPartnerContactsHandler);
router.get("/:partnerId/timeline", getPartnerTimelineHandler);
router.get("/:partnerId/discovery-notes/templates", listDiscoveryNoteTemplatesHandler);
router.get("/:partnerId/discovery-notes", listDiscoveryNotesHandler);
router.post("/:partnerId/contacts", requireRole(ALL_ROLE_CODES), createPartnerContactHandler);
router.put("/:partnerId/contacts/:contactId", requireRole(ALL_ROLE_CODES), updatePartnerContactHandler);
router.delete("/:partnerId/contacts/:contactId", requireRole(ALL_ROLE_CODES), deletePartnerContactHandler);
router.post("/:partnerId/discovery-notes", requireRole(ALL_ROLE_CODES), createDiscoveryNoteHandler);
router.put("/:partnerId/discovery-notes/:noteId", requireRole(ALL_ROLE_CODES), updateDiscoveryNoteHandler);
router.put("/:partnerId/qualification", requireRole(ALL_ROLE_CODES), upsertPartnerQualificationHandler);
router.put("/:partnerId", requireRole(ALL_ROLE_CODES), updatePartnerHandler);
router.delete("/:partnerId", requireRole([ROLE_CODES.VP_HEAD]), deletePartnerHandler);
router.post("/:partnerId/transition", requireRole(ALL_ROLE_CODES), transitionPartnerHandler);
router.post("/:partnerId/archive", requireRole(ALL_ROLE_CODES), archivePartnerHandler);

module.exports = router;
