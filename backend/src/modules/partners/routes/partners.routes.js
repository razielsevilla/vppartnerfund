const express = require("express");
const { requireAuth } = require("../../../shared/middleware/auth.middleware");
const {
  createPartnerHandler,
  listPartnersHandler,
  getPartnerHandler,
  getPartnerQualificationHandler,
  getPartnerTimelineHandler,
  upsertPartnerQualificationHandler,
  updatePartnerHandler,
  archivePartnerHandler,
  transitionPartnerHandler,
} = require("../controllers/partners.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", listPartnersHandler);
router.post("/", createPartnerHandler);
router.get("/:partnerId", getPartnerHandler);
router.get("/:partnerId/qualification", getPartnerQualificationHandler);
router.get("/:partnerId/timeline", getPartnerTimelineHandler);
router.put("/:partnerId/qualification", upsertPartnerQualificationHandler);
router.put("/:partnerId", updatePartnerHandler);
router.post("/:partnerId/transition", transitionPartnerHandler);
router.post("/:partnerId/archive", archivePartnerHandler);

module.exports = router;