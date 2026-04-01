const express = require("express");
const { requireAuth, requireRole } = require("../../../shared/middleware/auth.middleware");
const {
  getMasterDataHandler,
  updateWorkflowPhasesHandler,
  updateTaxonomyHandler,
  listAuditLogsHandler,
} = require("../controllers/settings.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/master-data", getMasterDataHandler);
router.get("/audit-log", listAuditLogsHandler);
router.put("/workflow-phases", requireRole(["admin"]), updateWorkflowPhasesHandler);
router.put("/taxonomies/:taxonomyKey", requireRole(["admin"]), updateTaxonomyHandler);

module.exports = router;
