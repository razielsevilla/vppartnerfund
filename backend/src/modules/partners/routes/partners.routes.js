const express = require("express");
const { requireAuth } = require("../../../shared/middleware/auth.middleware");
const {
  createPartnerHandler,
  listPartnersHandler,
  getPartnerHandler,
  updatePartnerHandler,
  archivePartnerHandler,
  transitionPartnerHandler,
} = require("../controllers/partners.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", listPartnersHandler);
router.post("/", createPartnerHandler);
router.get("/:partnerId", getPartnerHandler);
router.put("/:partnerId", updatePartnerHandler);
router.post("/:partnerId/transition", transitionPartnerHandler);
router.post("/:partnerId/archive", archivePartnerHandler);

module.exports = router;